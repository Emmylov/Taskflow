import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  CreateBillingCheckoutBody,
  CreateBillingCheckoutResponse,
  GetAccountCreditsResponse,
  GetBillingPlansResponse,
} from "@workspace/api-zod";
import { db, taskflowBillingCheckoutsTable, taskflowCreditAccountsTable, taskflowCreditLedgerTable } from "@workspace/db";
import { getWhopClient } from "../lib/whopClient";

const router: IRouter = Router();
type PlanKey = "starter" | "growth" | "scale";
const plans: Array<{ key: PlanKey; title: string; monthlyPriceUsd: number; monthlyCredits: number; features: string[]; environmentKey: string }> = [
  { key: "starter", title: "Starter Agency", monthlyPriceUsd: 299, monthlyCredits: 10, features: ["10 request credits each month", "Service invoices stay separate"], environmentKey: "WHOP_PLAN_STARTER" },
  { key: "growth", title: "Growth Retainer", monthlyPriceUsd: 799, monthlyCredits: 30, features: ["30 request credits each month", "Service invoices stay separate"], environmentKey: "WHOP_PLAN_GROWTH" },
  { key: "scale", title: "Scale Unlimited", monthlyPriceUsd: 1499, monthlyCredits: 75, features: ["75 request credits each month", "5-day express coordination", "Service invoices stay separate"], environmentKey: "WHOP_PLAN_SCALE" },
];

function requireUser(req: Express.Request, res: Response): req is Express.Request & Express.AuthedRequest {
  if (req.isAuthenticated()) return true;
  res.status(401).json({ error: "Sign in to manage request credits." });
  return false;
}

router.get("/billing/plans", (_req, res): void => {
  res.json(GetBillingPlansResponse.parse(plans.map(({ environmentKey, ...plan }) => ({
    ...plan,
    checkoutReady: Boolean(process.env.WHOP_COMPANY_ID && process.env[environmentKey]),
  }))));
});

router.post("/billing/checkout", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = CreateBillingCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a valid monthly credit plan." });
    return;
  }
  const plan = plans.find((item) => item.key === parsed.data.planKey);
  const planId = plan ? process.env[plan.environmentKey] : undefined;
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!plan || !planId || !companyId) {
    res.status(503).json({ error: "Whop checkout is not ready yet. The connected account needs company and plan permissions." });
    return;
  }

  let returnUrl: URL;
  try {
    returnUrl = new URL(parsed.data.returnUrl);
    const origin = req.get("origin");
    const localHttp = returnUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(returnUrl.hostname);
    if (!origin || new URL(origin).origin !== returnUrl.origin || (returnUrl.protocol !== "https:" && !localHttp)) {
      res.status(400).json({ error: "Return to this TaskFlow page after checkout." });
      return;
    }
  } catch {
    res.status(400).json({ error: "Return URL is invalid." });
    return;
  }

  const reference = randomUUID();
  try {
    const whop = await getWhopClient();
    const checkout = await whop.checkoutConfigurations.create({
      account_id: companyId,
      plan_id: planId,
      redirect_url: returnUrl.toString(),
      metadata: {
        taskflow_user_id: req.user.id,
        taskflow_plan_key: plan.key,
        taskflow_checkout_ref: reference,
      },
    });
    if (!checkout.id || !checkout.purchase_url) throw new Error("Whop did not return a hosted checkout URL.");
    await db.insert(taskflowBillingCheckoutsTable).values({
      userId: req.user.id,
      planKey: plan.key,
      reference,
      checkoutConfigurationId: checkout.id,
      status: "pending",
    });
    res.json(CreateBillingCheckoutResponse.parse({ purchaseUrl: checkout.purchase_url }));
  } catch (error) {
    req.log.warn({ err: error instanceof Error ? error.message : "Whop checkout unavailable" }, "Whop checkout could not be created");
    res.status(503).json({ error: "Whop checkout is temporarily unavailable. Check the connected account's billing permissions." });
  }
});

async function refreshCreditsFromWhop(userId: string, email: string): Promise<void> {
  const companyId = process.env.WHOP_COMPANY_ID;
  const planIdToTier = new Map(plans.flatMap((plan) => {
    const planId = process.env[plan.environmentKey];
    return planId ? [[planId, plan] as const] : [];
  }));
  if (!companyId || !planIdToTier.size) return;

  const whop = await getWhopClient();
  const response = await whop.payments.list({
    account_id: companyId,
    query: email,
    order: "created_at",
    direction: "desc",
    first: 50,
  });
  const recent = (response.data ?? []) as Array<Record<string, any>>;
  for (const payment of recent) {
    const metadata = payment.metadata as Record<string, unknown> | undefined;
    const plan = planIdToTier.get(String(payment.plan?.id ?? payment.plan_id ?? ""));
    if (!plan || metadata?.taskflow_user_id !== userId || metadata?.taskflow_plan_key !== plan.key) continue;
    if (payment.status !== "succeeded" && payment.status !== "paid") continue;
    const paymentId = String(payment.id ?? "");
    const membershipId = String(payment.membership?.id ?? payment.membership_id ?? "");
    if (!paymentId || !membershipId) continue;

    const membership = await whop.memberships.retrieve({ id: membershipId }) as unknown as Record<string, any>;
    if (membership.status !== "active" || String(membership.plan?.id ?? membership.plan_id ?? "") !== process.env[plan.environmentKey]) continue;
    const memberEmail = String(membership.user?.email ?? membership.member?.email ?? payment.user?.email ?? "").toLowerCase();
    if (memberEmail && memberEmail !== email.toLowerCase()) continue;

    await db.transaction(async (tx) => {
      const idempotencyKey = `whop-payment:${paymentId}`;
      const [existing] = await tx.select({ id: taskflowCreditLedgerTable.id })
        .from(taskflowCreditLedgerTable)
        .where(eq(taskflowCreditLedgerTable.idempotencyKey, idempotencyKey))
        .limit(1);
      if (existing) return;
      const [account] = await tx.select().from(taskflowCreditAccountsTable)
        .where(eq(taskflowCreditAccountsTable.userId, userId))
        .limit(1);
      const delta = plan.monthlyCredits - (account?.creditsBalance ?? 0);
      await tx.insert(taskflowCreditLedgerTable).values({
        userId,
        planKey: plan.key,
        entryType: "monthly_grant",
        creditsDelta: delta,
        idempotencyKey,
        metadata: { paymentId, membershipId },
      });
      await tx.insert(taskflowCreditAccountsTable).values({
        userId,
        whopMembershipId: membershipId,
        planKey: plan.key,
        creditsBalance: plan.monthlyCredits,
        status: "active",
        periodStartsAt: payment.created_at ? new Date(payment.created_at) : new Date(),
        periodEndsAt: membership.expires_at ? new Date(membership.expires_at) : null,
      }).onConflictDoUpdate({
        target: taskflowCreditAccountsTable.userId,
        set: {
          whopMembershipId: membershipId,
          planKey: plan.key,
          creditsBalance: plan.monthlyCredits,
          status: "active",
          periodStartsAt: payment.created_at ? new Date(payment.created_at) : new Date(),
          periodEndsAt: membership.expires_at ? new Date(membership.expires_at) : null,
          updatedAt: new Date(),
        },
      });
      await tx.update(taskflowBillingCheckoutsTable).set({ status: "verified", verifiedAt: new Date() })
        .where(and(
          eq(taskflowBillingCheckoutsTable.userId, userId),
          eq(taskflowBillingCheckoutsTable.reference, String(metadata?.taskflow_checkout_ref ?? "")),
        ));
    });
    return;
  }
}

router.get("/account/credits", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  try {
    await refreshCreditsFromWhop(req.user.id, req.user.email ?? "");
  } catch (error) {
    req.log.warn({ err: error instanceof Error ? error.message : "Whop sync failed" }, "Request credit refresh failed");
    const [existing] = await db.select().from(taskflowCreditAccountsTable).where(eq(taskflowCreditAccountsTable.userId, req.user.id)).limit(1);
    if (!existing) {
      res.status(503).json({ error: "Request credits could not be verified with Whop. Please try again." });
      return;
    }
  }
  const [account] = await db.select().from(taskflowCreditAccountsTable).where(eq(taskflowCreditAccountsTable.userId, req.user.id)).limit(1);
  const expired = Boolean(account?.periodEndsAt && account.periodEndsAt.getTime() <= Date.now());
  res.json(GetAccountCreditsResponse.parse({
    balance: expired ? 0 : account?.creditsBalance ?? 0,
    planKey: expired ? null : account?.planKey ?? null,
    active: Boolean(account && account.status === "active" && !expired),
    periodEndsAt: expired ? null : account?.periodEndsAt ?? null,
  }));
});

export default router;
