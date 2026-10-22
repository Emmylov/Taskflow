import { Router, type IRouter, type Response } from "express";
import { and, count, desc, eq, gte, gt, ne, sql } from "drizzle-orm";
import {
  CreateOrderRequestBody,
  CreateOrderRequestResponse,
  GetOrderStatusParams,
  GetOrderStatusResponse,
  GetOrdersResponse,
  GetPaymentConfigResponse,
} from "@workspace/api-zod";
import {
  db,
  taskflowActivityEventsTable,
  taskflowConversationsTable,
  taskflowMessagesTable,
  taskflowPaymentSettingsTable,
  taskflowOrdersTable,
  taskflowInvoicesTable,
  taskflowTasksTable,
  taskflowReviewsTable,
  taskflowCreditAccountsTable,
  taskflowCreditLedgerTable,
} from "@workspace/db";
import { taskflowCatalogBySlug } from "../lib/taskflowCatalog";
import { dueDateFromOffset, ensureTaskflowTemplates, getTemplateFromOrderSnapshot, snapshotForOrderItem, templateFromRecord } from "../lib/taskflowTemplates";
import { notifyCustomerOfOrder, notifyOwnerOfOrder, notifyOwnerOfOrderAction } from "../lib/ownerNotifications";
import { hasPlatformAdminAccess } from "../lib/ownerAccess";
import { calculateOrderTotal, calculatePromotion, type PromotionResult } from "../lib/orderPricing";
import { dispatchAutomationEvent, getBrandAutomationPayload } from "../lib/automation";

const router: IRouter = Router();
const currency = "usd" as const;
const deliveryFeeCents = 18_000;
class InsufficientCreditsError extends Error {}
async function isOwner(req: Express.Request): Promise<boolean> {
  return hasPlatformAdminAccess(req.user?.id, req.user?.email);
}

function requireUser(req: Express.Request, res: Response): req is Express.Request & Express.AuthedRequest {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to continue." });
    return false;
  }
  return true;
}

function getPaymentConfig() {
  return { paymentModel: "invoice_later" as const, depositPercent: 100 };
}

type TransferDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingDetails: string;
  bankAddress: string;
  transferInstructions: string;
  currency: string;
};

async function getTransferDetails(): Promise<TransferDetails | null> {
  const [settings] = await db.select().from(taskflowPaymentSettingsTable).where(eq(taskflowPaymentSettingsTable.id, "default"));
  if (!settings || !settings.bankName || !settings.accountName || !settings.accountNumber) return null;
  return {
    bankName: settings.bankName,
    accountName: settings.accountName,
    accountNumber: settings.accountNumber,
    routingDetails: settings.routingDetails,
    bankAddress: settings.bankAddress,
    transferInstructions: settings.transferInstructions,
    currency: settings.currency,
  };
}

async function getUnreadCount(orderId: string, viewerRole: "owner" | "customer") {
  const [conversation] = await db.select().from(taskflowConversationsTable).where(eq(taskflowConversationsTable.orderId, orderId));
  if (!conversation) return 0;
  const lastReadAt = viewerRole === "owner" ? conversation.ownerLastReadAt : conversation.customerLastReadAt;
  const where = lastReadAt
    ? and(eq(taskflowMessagesTable.conversationId, conversation.id), ne(taskflowMessagesTable.authorRole, viewerRole), gt(taskflowMessagesTable.createdAt, lastReadAt))
    : and(eq(taskflowMessagesTable.conversationId, conversation.id), ne(taskflowMessagesTable.authorRole, viewerRole));
  const [result] = await db.select({ value: count() }).from(taskflowMessagesTable).where(where);
  return Number(result?.value ?? 0);
}

const milestoneDefinitions = [
  { key: "request_received", label: "Brief received", description: "Your project request is in the workspace." },
  { key: "in_review", label: "Scope review", description: "The team is reviewing the brief and next steps." },
  { key: "awaiting_approval", label: "Approval needed", description: "A proposed scope or price is waiting for your response." },
  { key: "in_progress", label: "Work in progress", description: "The project is actively being delivered." },
  { key: "delivered", label: "Delivery ready", description: "The latest work is ready for review or handoff." },
  { key: "closed", label: "Project closed", description: "This project has been wrapped up." },
] as const;

function buildMilestones(requestStatus: string) {
  const activeIndex = Math.max(0, milestoneDefinitions.findIndex((milestone) => milestone.key === requestStatus));
  return milestoneDefinitions.map((milestone, index) => ({
    ...milestone,
    state: index < activeIndex ? "complete" : index === activeIndex ? "current" : "upcoming",
  }));
}

async function recordOrderActivity(orderId: string, actorUserId: string | null, eventType: string, summary: string, metadata: Record<string, unknown> = {}) {
  await db.insert(taskflowActivityEventsTable).values({ orderId, actorUserId, eventType, summary, metadata });
}

async function toOrderStatus(order: typeof taskflowOrdersTable.$inferSelect, viewerRole: "owner" | "customer") {
  const transferDetails = order.paymentStatus === "pending" || order.paymentStatus === "paid"
    ? await getTransferDetails()
    : null;
  return {
    orderId: order.id,
    paymentStatus: order.paymentStatus,
    requestStatus: order.requestStatus,
    paymentModel: order.paymentModel,
    amountDueCents: order.amountDueCents,
    totalCents: order.totalCents,
    currency: order.currency,
    requestedCustomPriceCents: order.requestedCustomPriceCents,
    requestedCustomPriceReason: order.requestedCustomPriceReason,
    customPriceStatus: order.customPriceStatus,
    customerPriceDecision: order.customerPriceDecision,
    customerPriceFeedback: order.customerPriceFeedback,
    milestones: buildMilestones(order.requestStatus),
    paymentReference: order.paymentReference,
    paymentRequestedAt: order.paymentRequestedAt,
    paidAt: order.paidAt,
    transferDetails,
    unreadCount: await getUnreadCount(order.id, viewerRole),
  };
}

router.get("/payment-config", (_req, res): void => {
  const { paymentModel, depositPercent } = getPaymentConfig();
  void getTransferDetails().then((transferDetails) => {
    res.json(GetPaymentConfigResponse.parse({ paymentModel, depositPercent, currency, transferConfigured: Boolean(transferDetails) }));
  });
});

type CartInput = {
  items: Array<{ slug: string; option: string; brief?: string; quantity: number }>;
};

async function getPromotionForUser(userId: string, subtotalCents: number, customPrice = false): Promise<PromotionResult> {
  const [result] = await db.select({ value: count() }).from(taskflowOrdersTable).where(eq(taskflowOrdersTable.customerUserId, userId));
  return calculatePromotion(subtotalCents, Number(result?.value ?? 0) === 0, customPrice);
}

router.get("/account/promotion-preview", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const subtotalCents = Number(req.query.subtotalCents);
  const customPrice = req.query.customPrice === "true";
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0 || subtotalCents > 10_000_000) {
    res.status(400).json({ error: "Enter a valid project subtotal." });
    return;
  }
  res.json(await getPromotionForUser(req.user.id, subtotalCents, customPrice));
});

async function normalizeItems(input: CartInput, res: Response) {
  const normalizedItems = [];
  let subtotalCents = 0;
  let itemCount = 0;
  for (const item of input.items) {
    const catalogItem = taskflowCatalogBySlug.get(item.slug);
    if (!catalogItem || catalogItem.soon || !catalogItem.options.includes(item.option)) {
      res.status(400).json({ error: `The selected service or scope is unavailable: ${item.slug}.` });
      return null;
    }
    itemCount += item.quantity;
    const optionIndex = catalogItem.options.indexOf(item.option);
    const unitPriceCents = catalogItem.scopePriceCents[optionIndex] ?? catalogItem.priceCents;
    subtotalCents += unitPriceCents * item.quantity;
    normalizedItems.push({
      slug: catalogItem.slug,
      name: catalogItem.name,
      option: item.option,
      brief: item.brief ?? "",
      quantity: item.quantity,
      unitPriceCents,
      estimatedDeliveryCostCents: Math.round(unitPriceCents * 0.42),
    });
  }
  return { normalizedItems, subtotalCents, itemCount };
}

router.post("/orders/requests", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = CreateOrderRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!req.user.email) {
    res.status(400).json({ error: "Your account needs an email before placing a request." });
    return;
  }
  const input = parsed.data;
  if (input.requestedCustomPriceCents && !input.requestedCustomPriceReason?.trim()) {
    res.status(400).json({ error: "Tell us why you are proposing this project price." });
    return;
  }
  const normalized = await normalizeItems(input, res);
  if (!normalized) return;
  const deliveryFee = input.deliveryOption === "express" ? deliveryFeeCents : 0;
  if (input.deliveryOption === "express" && (normalized.itemCount > 5 || normalized.subtotalCents > 300_000)) {
    res.status(400).json({ error: "Express delivery is unavailable for a large project load." });
    return;
  }
  const promotion = await getPromotionForUser(req.user.id, normalized.subtotalCents, Boolean(input.requestedCustomPriceCents));
  const totalCents = calculateOrderTotal(normalized.subtotalCents, deliveryFee, promotion.discountCents);
  const templateRecords = await ensureTaskflowTemplates();
  const templates = new Map(templateRecords.map((record) => [record.slug, templateFromRecord(record)]));
  const templateSnapshot = normalized.normalizedItems.map((item) => snapshotForOrderItem(item, templates));
  let order: typeof taskflowOrdersTable.$inferSelect;
  let creditsUsed = 0;
  let remainingCredits: number | null = null;
  try {
    const created = await db.transaction(async (tx) => {
      const [creditAccount] = await tx.select().from(taskflowCreditAccountsTable)
        .where(eq(taskflowCreditAccountsTable.userId, req.user.id)).limit(1);
      const now = new Date();
      const expired = Boolean(creditAccount?.periodEndsAt && creditAccount.periodEndsAt <= now);
      const usesCredits = Boolean(creditAccount && !expired && creditAccount.status === "active");
      if (expired && creditAccount) {
        await tx.update(taskflowCreditAccountsTable).set({
          status: "expired",
          creditsBalance: 0,
          updatedAt: now,
        }).where(eq(taskflowCreditAccountsTable.userId, req.user.id));
      }
      if (usesCredits && (creditAccount?.creditsBalance ?? 0) < normalized.itemCount) {
        throw new InsufficientCreditsError("This request needs more credits than your current balance.");
      }
      const [createdOrder] = await tx.insert(taskflowOrdersTable).values({
        customerUserId: req.user.id,
        customerName: input.customerName.trim(),
        customerEmail: req.user.email!.toLowerCase(),
        company: input.company.trim(),
        notes: input.notes.trim(),
        project: input.project,
        items: normalized.normalizedItems,
        templateSnapshot,
        deliveryOption: input.deliveryOption,
        paymentModel: "invoice_later",
        subtotalCents: normalized.subtotalCents,
        discountCents: promotion.discountCents,
        promotionCode: promotion.code,
        promotionLabel: promotion.eligible ? promotion.label : null,
        deliveryFeeCents: deliveryFee,
        totalCents,
        amountDueCents: 0,
        currency,
        paymentStatus: "not_requested",
        requestStatus: "request_received",
        requestedCustomPriceCents: input.requestedCustomPriceCents ?? null,
        requestedCustomPriceReason: input.requestedCustomPriceReason?.trim() || null,
        customPriceStatus: input.requestedCustomPriceCents ? "requested" : "none",
      }).returning();
      let creditsRemaining: number | null = creditAccount?.creditsBalance ?? null;
      if (usesCredits) {
        const [updatedAccount] = await tx.update(taskflowCreditAccountsTable)
          .set({
            creditsBalance: sql`${taskflowCreditAccountsTable.creditsBalance} - ${normalized.itemCount}`,
            updatedAt: now,
          })
          .where(and(
            eq(taskflowCreditAccountsTable.userId, req.user.id),
            eq(taskflowCreditAccountsTable.status, "active"),
            gte(taskflowCreditAccountsTable.creditsBalance, normalized.itemCount),
          ))
          .returning({ creditsBalance: taskflowCreditAccountsTable.creditsBalance });
        if (!updatedAccount) throw new InsufficientCreditsError("Your credit balance changed. Review it and try again.");
        creditsRemaining = updatedAccount.creditsBalance;
        await tx.insert(taskflowCreditLedgerTable).values({
          userId: req.user.id,
          orderId: createdOrder.id,
          planKey: creditAccount?.planKey ?? null,
          entryType: "request",
          creditsDelta: -normalized.itemCount,
          idempotencyKey: `request:${createdOrder.id}`,
          metadata: { serviceUnits: normalized.itemCount },
        });
      }
      return { order: createdOrder, creditsUsed: usesCredits ? normalized.itemCount : 0, remainingCredits: creditsRemaining };
    });
    order = created.order;
    creditsUsed = created.creditsUsed;
    remainingCredits = created.remainingCredits;
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      res.status(409).json({ error: `${error.message} Choose fewer service units or update your monthly credit plan.` });
      return;
    }
    throw error;
  }

  await db.insert(taskflowConversationsTable).values({
    orderId: order.id,
    customerUserId: req.user.id,
  });
  const taskValues = normalized.normalizedItems.flatMap((item, itemIndex) => {
    const template = getTemplateFromOrderSnapshot(order, item);
    return Array.from({ length: item.quantity }, (_, quantityIndex) => template.tasks.filter((task) => !task.archived).map((task, taskIndex) => ({
      orderId: order.id,
      serviceSlug: item.slug,
      templateKey: `${template.key}:v${template.version}:${task.key}`,
      templateVersion: template.version,
      title: item.quantity > 1 ? `${task.title} · ${item.option} ${quantityIndex + 1}` : `${task.title} · ${item.option}`,
      description: task.description,
      priority: task.priority,
      dueAt: dueDateFromOffset(order.createdAt, task.dueOffsetDays),
      sortOrder: itemIndex * 1000 + quantityIndex * 100 + taskIndex,
    }))).flat();
  });
  if (taskValues.length) await db.insert(taskflowTasksTable).values(taskValues);
  await db.insert(taskflowInvoicesTable).values({
    orderId: order.id,
    invoiceNumber: `TF-${new Date().getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`,
    status: "draft",
    amountCents: totalCents,
    currency,
  });
  await recordOrderActivity(order.id, req.user.id, "project_created", "Customer submitted a new project request.");
  if (creditsUsed > 0) {
    await recordOrderActivity(order.id, req.user.id, "credits_used", `${creditsUsed} request credit${creditsUsed === 1 ? "" : "s"} used for service units.`, {
      creditsUsed,
      remainingCredits,
    });
  }

  let ownerNotificationStatus: "sent" | "failed" = "sent";
  try {
    await notifyOwnerOfOrder({
      orderId: order.id,
      customerName: input.customerName,
      customerEmail: req.user.email,
      company: input.company,
      totalCents,
      serviceNames: normalized.normalizedItems.map((item) => `${item.name} · ${item.option}`),
      requestedCustomPriceCents: input.requestedCustomPriceCents,
      requestedCustomPriceReason: input.requestedCustomPriceReason,
    });
  } catch (error) {
    ownerNotificationStatus = "failed";
    req.log.error({ err: error, orderId: order.id }, "Owner order notification failed");
  }
  await db.update(taskflowOrdersTable).set({
    ownerNotificationStatus,
    updatedAt: new Date(),
  }).where(eq(taskflowOrdersTable.id, order.id));
  void getBrandAutomationPayload(req.user.id)
    .then((brandKit) => dispatchAutomationEvent({
      event: "project.created",
      orderId: order.id,
      projectName: input.project.name || input.company || "New project",
      customerName: input.customerName,
      customerEmail: req.user!.email,
      company: input.company,
      project: input.project,
      notes: input.notes,
      items: normalized.normalizedItems,
      deliveryOption: input.deliveryOption,
      estimatedTotalCents: totalCents,
      creditsUsed,
      brandKit,
    }, req.log))
    .catch((error) => req.log.warn({ err: error instanceof Error ? error.message : "automation payload unavailable", orderId: order.id }, "Project automation dispatch failed"));

  res.status(201).json(CreateOrderRequestResponse.parse({
    orderId: order.id,
    requestStatus: order.requestStatus,
    totalCents,
    currency,
    ownerNotificationStatus,
    creditsUsed,
    remainingCredits,
  }));
});

router.get("/orders", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const owner = await isOwner(req);
  const rows = await db.select().from(taskflowOrdersTable)
    .where(owner ? undefined : eq(taskflowOrdersTable.customerUserId, req.user.id))
    .orderBy(desc(taskflowOrdersTable.createdAt));
  res.json(GetOrdersResponse.parse(await Promise.all(rows.map((order) => toOrderStatus(order, owner ? "owner" : "customer")))));
});

router.get("/orders/:orderId", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = GetOrderStatusParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const owner = await isOwner(req);
  const [order] = await db.select().from(taskflowOrdersTable).where(
    owner
      ? eq(taskflowOrdersTable.id, parsed.data.orderId)
      : and(eq(taskflowOrdersTable.id, parsed.data.orderId), eq(taskflowOrdersTable.customerUserId, req.user.id)),
  );
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(GetOrderStatusResponse.parse(await toOrderStatus(order, owner ? "owner" : "customer")));
});

router.get("/owner/payment-settings", async (req, res): Promise<void> => {
  if (!requireUser(req, res) || !await isOwner(req)) {
    if (req.isAuthenticated()) res.status(403).json({ error: "Owner access required." });
    return;
  }
  const [settings] = await db.select().from(taskflowPaymentSettingsTable).where(eq(taskflowPaymentSettingsTable.id, "default"));
  res.json(settings ?? {
    id: "default",
    bankName: "",
    accountName: "",
    accountNumber: "",
    routingDetails: "",
    bankAddress: "",
    transferInstructions: "",
    currency,
  });
});

router.put("/owner/payment-settings", async (req, res): Promise<void> => {
  if (!requireUser(req, res) || !await isOwner(req)) {
    if (req.isAuthenticated()) res.status(403).json({ error: "Owner access required." });
    return;
  }
  const fields = ["bankName", "accountName", "accountNumber", "routingDetails", "bankAddress", "transferInstructions", "currency"] as const;
  const values = Object.fromEntries(fields.map((field) => [field, typeof req.body?.[field] === "string" ? req.body[field].trim() : ""])) as Record<typeof fields[number], string>;
  if (!values.bankName || !values.accountName || !values.accountNumber) {
    res.status(400).json({ error: "Bank name, account name, and account number are required." });
    return;
  }
  const [settings] = await db.insert(taskflowPaymentSettingsTable).values({
    id: "default",
    ...values,
    updatedBy: req.user.id,
  }).onConflictDoUpdate({
    target: taskflowPaymentSettingsTable.id,
    set: { ...values, updatedBy: req.user.id, updatedAt: new Date() },
  }).returning();
  res.json(settings);
});

async function getOrderForOwner(orderId: string, req: Express.Request, res: Response) {
  if (!requireUser(req, res) || !await isOwner(req)) {
    if (req.isAuthenticated()) res.status(403).json({ error: "Owner access required." });
    return null;
  }
  const [order] = await db.select().from(taskflowOrdersTable).where(eq(taskflowOrdersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return null;
  }
  return order;
}

router.post("/orders/:orderId/status", async (req, res): Promise<void> => {
  const order = await getOrderForOwner(req.params.orderId, req, res);
  if (!order) return;
  const allowed = ["request_received", "in_review", "awaiting_approval", "in_progress", "delivered", "closed"];
  if (!allowed.includes(req.body?.requestStatus)) {
    res.status(400).json({ error: "Invalid request status." });
    return;
  }
  await db.update(taskflowOrdersTable).set({ requestStatus: req.body.requestStatus, updatedAt: new Date() }).where(eq(taskflowOrdersTable.id, order.id));
  await recordOrderActivity(order.id, req.user!.id, "status_changed", `Project status changed to ${req.body.requestStatus.replaceAll("_", " ")}.`, { requestStatus: req.body.requestStatus });
  void dispatchAutomationEvent({
    event: "project.status_changed",
    orderId: order.id,
    projectName: String((order.project as Record<string, unknown>)?.name ?? order.company ?? "Project"),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    requestStatus: req.body.requestStatus,
  }, req.log);
  try {
    await notifyCustomerOfOrder({ order, subject: `TaskFlow project update · ${req.body.requestStatus.replaceAll("_", " ")}`, headline: "Your project status changed", copy: `Your project is now ${req.body.requestStatus.replaceAll("_", " ")}.` });
  } catch (error) {
    req.log.warn({ err: error, orderId: order.id }, "Customer status notification failed");
  }
  res.json({ ok: true });
});

router.post("/orders/:orderId/price-offer", async (req, res): Promise<void> => {
  const order = await getOrderForOwner(req.params.orderId, req, res);
  if (!order) return;
  if (req.body?.decision === "declined") {
    await db.update(taskflowOrdersTable).set({
      customPriceStatus: "declined",
      requestStatus: "in_review",
      updatedAt: new Date(),
    }).where(eq(taskflowOrdersTable.id, order.id));
    await recordOrderActivity(order.id, req.user!.id, "price_declined", "Owner declined the customer price proposal.");
    void dispatchAutomationEvent({
      event: "price_offer.declined",
      orderId: order.id,
      projectName: String((order.project as Record<string, unknown>)?.name ?? order.company ?? "Project"),
      amountCents: order.requestedCustomPriceCents,
    }, req.log);
    try {
      await notifyCustomerOfOrder({ order, subject: "TaskFlow price proposal needs a new plan", headline: "Your price proposal was not accepted", copy: "The owner has not accepted the proposed total. Reply in your project chat so you can agree a scope and price that works." });
    } catch (error) {
      req.log.warn({ err: error, orderId: order.id }, "Customer price rejection notification failed");
    }
    res.json({ ok: true, decision: "declined" });
    return;
  }
  const amountCents = Number(req.body?.amountCents);
  if (!Number.isInteger(amountCents) || amountCents < 100) {
    res.status(400).json({ error: "Enter a valid price in cents." });
    return;
  }
  await db.update(taskflowOrdersTable).set({
    totalCents: amountCents,
    amountDueCents: 0,
    customPriceStatus: "accepted",
    requestStatus: "awaiting_approval",
    updatedAt: new Date(),
  }).where(eq(taskflowOrdersTable.id, order.id));
  await recordOrderActivity(order.id, req.user!.id, "price_offered", `Owner proposed a project total of $${Math.round(amountCents / 100).toLocaleString("en-US")}.`, { amountCents });
  void dispatchAutomationEvent({
    event: "price_offer.sent",
    orderId: order.id,
    projectName: String((order.project as Record<string, unknown>)?.name ?? order.company ?? "Project"),
    amountCents,
    currency: order.currency,
  }, req.log);
  try {
    await notifyCustomerOfOrder({ order, subject: "TaskFlow price proposal is ready", headline: "A price proposal is ready for your project", copy: `The proposed project total is $${Math.round(amountCents / 100).toLocaleString("en-US")}. Reply in your project chat if you would like to discuss it.` });
  } catch (error) {
    req.log.warn({ err: error, orderId: order.id }, "Customer price notification failed");
  }
  res.json({ ok: true, totalCents: amountCents });
});

router.post("/orders/:orderId/payment-request", async (req, res): Promise<void> => {
  const order = await getOrderForOwner(req.params.orderId, req, res);
  if (!order) return;
  const transferDetails = await getTransferDetails();
  if (!transferDetails) {
    res.status(400).json({ error: "Add bank-transfer details before requesting payment." });
    return;
  }
  const amountCents = Number(req.body?.amountCents ?? order.totalCents);
  if (!Number.isInteger(amountCents) || amountCents < 100) {
    res.status(400).json({ error: "Enter a valid payment amount in cents." });
    return;
  }
  await db.update(taskflowOrdersTable).set({
    totalCents: amountCents,
    amountDueCents: amountCents,
    paymentStatus: "pending",
    paymentRequestedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(taskflowOrdersTable.id, order.id));
  await db.update(taskflowInvoicesTable).set({
    status: "sent",
    amountCents,
    issuedAt: new Date(),
    dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  }).where(eq(taskflowInvoicesTable.orderId, order.id));
  await recordOrderActivity(order.id, req.user!.id, "payment_requested", `Owner requested a bank transfer of $${Math.round(amountCents / 100).toLocaleString("en-US")}.`, { amountCents });
  void dispatchAutomationEvent({
    event: "payment.requested",
    orderId: order.id,
    projectName: String((order.project as Record<string, unknown>)?.name ?? order.company ?? "Project"),
    amountCents,
    currency: transferDetails.currency,
    paymentStatus: "pending",
  }, req.log);
  try {
    await notifyCustomerOfOrder({ order, subject: "TaskFlow payment details are ready", headline: "Payment by bank transfer", copy: `Please transfer $${Math.round(amountCents / 100).toLocaleString("en-US")} ${transferDetails.currency.toUpperCase()} using the details in your TaskFlow account.` });
  } catch (error) {
    req.log.warn({ err: error, orderId: order.id }, "Customer payment notification failed");
  }
  res.json({ ok: true, amountDueCents: amountCents, transferDetails });
});

router.post("/orders/:orderId/mark-paid", async (req, res): Promise<void> => {
  const order = await getOrderForOwner(req.params.orderId, req, res);
  if (!order) return;
  await db.update(taskflowOrdersTable).set({
    paymentStatus: "paid",
    paymentReference: typeof req.body?.reference === "string" ? req.body.reference.trim() : null,
    paidAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(taskflowOrdersTable.id, order.id));
  await db.update(taskflowInvoicesTable).set({
    status: "paid",
    paidAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(taskflowInvoicesTable.orderId, order.id));
  await recordOrderActivity(order.id, req.user!.id, "payment_marked_paid", "Owner marked the bank transfer as paid.");
  void dispatchAutomationEvent({
    event: "payment.marked_paid",
    orderId: order.id,
    projectName: String((order.project as Record<string, unknown>)?.name ?? order.company ?? "Project"),
    amountCents: order.amountDueCents || order.totalCents,
    currency: order.currency,
    paymentStatus: "paid",
  }, req.log);
  res.json({ ok: true });
});

async function getOrderForCustomer(orderId: string, req: Express.Request, res: Response) {
  if (!requireUser(req, res)) return null;
  const [order] = await db.select().from(taskflowOrdersTable).where(and(
    eq(taskflowOrdersTable.id, orderId),
    eq(taskflowOrdersTable.customerUserId, req.user!.id),
  ));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return null;
  }
  return order;
}

router.post("/orders/:orderId/approve-price", async (req, res): Promise<void> => {
  const order = await getOrderForCustomer(req.params.orderId, req, res);
  if (!order) return;
  if (order.customPriceStatus !== "accepted") {
    res.status(400).json({ error: "There is no price proposal ready for approval." });
    return;
  }
  await db.update(taskflowOrdersTable).set({
    customerPriceDecision: "approved",
    customerPriceFeedback: null,
    requestStatus: "in_review",
    updatedAt: new Date(),
  }).where(eq(taskflowOrdersTable.id, order.id));
  await recordOrderActivity(order.id, req.user!.id, "price_approved", "Customer approved the proposed project total.");
  void dispatchAutomationEvent({
    event: "price_offer.approved",
    orderId: order.id,
    projectName: String((order.project as Record<string, unknown>)?.name ?? order.company ?? "Project"),
    amountCents: order.totalCents,
    currency: order.currency,
  }, req.log);
  try {
    await notifyOwnerOfOrderAction({ order, headline: "Customer approved the project price", copy: "The customer approved the proposed total. Open TaskFlow to request payment or continue the project." });
  } catch (error) {
    req.log.warn({ err: error, orderId: order.id }, "Owner price approval notification failed");
  }
  res.json({ ok: true, customerPriceDecision: "approved" });
});

router.post("/orders/:orderId/request-price-change", async (req, res): Promise<void> => {
  const order = await getOrderForCustomer(req.params.orderId, req, res);
  if (!order) return;
  const feedback = typeof req.body?.feedback === "string" ? req.body.feedback.trim() : "";
  if (!feedback || feedback.length > 2000) {
    res.status(400).json({ error: "Tell the owner what you would like to change." });
    return;
  }
  await db.update(taskflowOrdersTable).set({
    customerPriceDecision: "change_requested",
    customerPriceFeedback: feedback,
    requestStatus: "in_review",
    updatedAt: new Date(),
  }).where(eq(taskflowOrdersTable.id, order.id));
  await recordOrderActivity(order.id, req.user!.id, "price_change_requested", "Customer requested a change to the proposed project total.", { feedback });
  void dispatchAutomationEvent({
    event: "price_offer.change_requested",
    orderId: order.id,
    projectName: String((order.project as Record<string, unknown>)?.name ?? order.company ?? "Project"),
    feedback,
  }, req.log);
  try {
    await notifyOwnerOfOrderAction({ order, headline: "Customer requested a price change", copy: feedback });
  } catch (error) {
    req.log.warn({ err: error, orderId: order.id }, "Owner price change notification failed");
  }
  res.json({ ok: true, customerPriceDecision: "change_requested" });
});

router.post("/orders/:orderId/review", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const rating = Number(req.body?.rating);
  const testimonial = typeof req.body?.testimonial === "string" ? req.body.testimonial.trim() : "";
  const permissionToPublish = req.body?.permissionToPublish === true;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !testimonial || testimonial.length > 2000) {
    res.status(400).json({ error: "Add a rating from 1 to 5 and a testimonial up to 2,000 characters." });
    return;
  }
  const [order] = await db.select().from(taskflowOrdersTable).where(and(eq(taskflowOrdersTable.id, req.params.orderId), eq(taskflowOrdersTable.customerUserId, req.user.id)));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const [review] = await db.insert(taskflowReviewsTable).values({
    orderId: order.id,
    customerUserId: req.user.id,
    rating,
    testimonial,
    permissionToPublish,
  }).onConflictDoUpdate({
    target: taskflowReviewsTable.orderId,
    set: { rating, testimonial, permissionToPublish },
  }).returning();
  res.json(review);
});

router.get("/reviews", async (_req, res): Promise<void> => {
  const reviews = await db.select({
    id: taskflowReviewsTable.id,
    rating: taskflowReviewsTable.rating,
    testimonial: taskflowReviewsTable.testimonial,
    createdAt: taskflowReviewsTable.createdAt,
  }).from(taskflowReviewsTable).where(eq(taskflowReviewsTable.permissionToPublish, true)).orderBy(desc(taskflowReviewsTable.createdAt)).limit(12);
  res.json(reviews);
});

export default router;