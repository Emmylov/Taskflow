import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db, taskflowInvoicesTable, taskflowOrdersTable } from "@workspace/db";
import { hasPlatformAdminAccess } from "../lib/ownerAccess";

const router: IRouter = Router();

async function requireOwner(req: Request, res: Response): Promise<boolean> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to access revenue operations." });
    return false;
  }
  if (!await hasPlatformAdminAccess(req.user?.id, req.user?.email)) {
    res.status(403).json({ error: "Owner access required." });
    return false;
  }
  return true;
}

function orderItems(order: typeof taskflowOrdersTable.$inferSelect) {
  return Array.isArray(order.items) ? order.items as Array<{
    slug?: string;
    name?: string;
    option?: string;
    quantity?: number;
    unitPriceCents?: number;
    estimatedDeliveryCostCents?: number;
  }> : [];
}

function estimatedCost(order: typeof taskflowOrdersTable.$inferSelect) {
  return orderItems(order).reduce((total, item) => {
    const quantity = Number(item.quantity ?? 1);
    const unitCost = Number(item.estimatedDeliveryCostCents ?? Math.round(Number(item.unitPriceCents ?? 0) * 0.42));
    return total + unitCost * quantity;
  }, 0);
}

router.get("/owner/revenue", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const rows = await db.select({
    order: taskflowOrdersTable,
    invoice: taskflowInvoicesTable,
  }).from(taskflowOrdersTable)
    .leftJoin(taskflowInvoicesTable, eq(taskflowInvoicesTable.orderId, taskflowOrdersTable.id))
    .orderBy(desc(taskflowOrdersTable.createdAt));

  const repeatClients = new Map<string, { email: string; name: string; company: string; projects: number; revenueCents: number; lastProjectAt: Date }>();
  const serviceProfitability = new Map<string, { slug: string; name: string; revenueCents: number; estimatedCostCents: number; projects: number }>();
  let quotedCents = 0;
  let paidCents = 0;
  let outstandingCents = 0;
  let estimatedCostCents = 0;

  const projects = rows.map(({ order, invoice }) => {
    const costCents = estimatedCost(order);
    estimatedCostCents += costCents;
    quotedCents += order.totalCents;
    if (order.paymentStatus === "paid") paidCents += order.totalCents;
    if (order.paymentStatus !== "paid" && order.requestStatus !== "closed") outstandingCents += order.totalCents;
    const email = order.customerEmail.toLowerCase();
    const existingClient = repeatClients.get(email);
    repeatClients.set(email, {
      email,
      name: order.customerName,
      company: order.company,
      projects: (existingClient?.projects ?? 0) + 1,
      revenueCents: (existingClient?.revenueCents ?? 0) + (order.paymentStatus === "paid" ? order.totalCents : 0),
      lastProjectAt: existingClient?.lastProjectAt && existingClient.lastProjectAt > order.createdAt ? existingClient.lastProjectAt : order.createdAt,
    });
    for (const item of orderItems(order)) {
      const slug = item.slug || "other";
      const current = serviceProfitability.get(slug);
      const itemRevenue = Number(item.unitPriceCents ?? 0) * Number(item.quantity ?? 1);
      const itemCost = Number(item.estimatedDeliveryCostCents ?? Math.round(Number(item.unitPriceCents ?? 0) * 0.42)) * Number(item.quantity ?? 1);
      serviceProfitability.set(slug, {
        slug,
        name: item.name || slug,
        revenueCents: (current?.revenueCents ?? 0) + (order.paymentStatus === "paid" ? itemRevenue : 0),
        estimatedCostCents: (current?.estimatedCostCents ?? 0) + itemCost,
        projects: (current?.projects ?? 0) + 1,
      });
    }
    const invoiceNumber = invoice?.invoiceNumber ?? `TF-${order.createdAt.getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`;
    const invoiceStatus = invoice?.status ?? (order.paymentStatus === "paid" ? "paid" : order.paymentStatus === "pending" ? "sent" : "draft");
    return {
      orderId: order.id,
      clientName: order.customerName,
      clientEmail: order.customerEmail,
      company: order.company,
      projectName: (order.project as { name?: string } | null)?.name || order.company || "Untitled project",
      requestStatus: order.requestStatus,
      quoteCents: order.totalCents,
      paymentStatus: order.paymentStatus,
      invoiceNumber,
      invoiceStatus,
      issuedAt: invoice?.issuedAt ?? null,
      dueAt: invoice?.dueAt ?? null,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      estimatedCostCents: costCents,
      estimatedProfitCents: (order.paymentStatus === "paid" ? order.totalCents : 0) - costCents,
      services: orderItems(order).map((item) => item.name || item.slug).filter(Boolean),
    };
  });

  res.json({
    summary: {
      quotedCents,
      paidCents,
      outstandingCents,
      estimatedCostCents,
      estimatedProfitCents: paidCents - estimatedCostCents,
      projectCount: projects.length,
      activeProjectCount: projects.filter((project) => !["closed", "delivered"].includes(project.requestStatus)).length,
      repeatClientCount: Array.from(repeatClients.values()).filter((client) => client.projects > 1).length,
    },
    projects,
    repeatClients: Array.from(repeatClients.values()).filter((client) => client.projects > 1).sort((a, b) => b.projects - a.projects),
    serviceProfitability: Array.from(serviceProfitability.values()).sort((a, b) => b.revenueCents - a.revenueCents),
  });
});

export default router;