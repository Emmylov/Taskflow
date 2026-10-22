import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  CreateDeliverableCommentBody,
  CreateDeliverableCommentResponse,
  CreateOrderDeliverableBody,
  CreateOrderDeliverableParams,
  CreateOrderDeliverableResponse,
  GetDeliverableCommentsResponse,
  GetOrderDeliverablesParams,
  GetOrderDeliverablesResponse,
  ReviewOrderDeliverableBody,
  ReviewOrderDeliverableParams,
  ReviewOrderDeliverableResponse,
} from "@workspace/api-zod";
import { db, taskflowActivityEventsTable, taskflowDeliverableCommentsTable, taskflowDeliverablesTable, taskflowOrdersTable, taskflowTasksTable, usersTable } from "@workspace/db";
import { hasAssignedTaskOnOrder, hasPassedSkillsAssessment, hasPlatformAdminAccess, isActiveCreativeSpecialist } from "../lib/ownerAccess";
import { dispatchAutomationEvent } from "../lib/automation";

const router: IRouter = Router();

function requireUser(req: Request, res: Response): req is Request & Express.AuthedRequest {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to access project deliverables." });
    return false;
  }
  return true;
}

async function getAccessibleOrder(orderId: string, req: Request) {
  const isAdmin = await hasPlatformAdminAccess(req.user?.id, req.user?.email);
  if (isAdmin) return db.select().from(taskflowOrdersTable).where(eq(taskflowOrdersTable.id, orderId));
  const [customerOrder] = await db.select().from(taskflowOrdersTable).where(and(
    eq(taskflowOrdersTable.id, orderId),
    eq(taskflowOrdersTable.customerUserId, req.user!.id),
  ));
  if (customerOrder) return [customerOrder];
  if (await hasAssignedTaskOnOrder(req.user?.id, orderId)) {
    return db.select().from(taskflowOrdersTable).where(eq(taskflowOrdersTable.id, orderId));
  }
  return [];
}

async function recordActivity(orderId: string, actorUserId: string, eventType: string, summary: string, metadata: Record<string, unknown> = {}) {
  await db.insert(taskflowActivityEventsTable).values({ orderId, actorUserId, eventType, summary, metadata });
}

function normalizeOrderObjectPath(objectPath: string, orderId: string) {
  const rawPath = objectPath.replace(/^\/objects\//, "").replace(/^\.private\//, "");
  if (!rawPath.startsWith(`orders/${orderId}/`) || rawPath.includes("..")) return null;
  return `/objects/${rawPath}`;
}

function toDeliverableResponse(deliverable: typeof taskflowDeliverablesTable.$inferSelect) {
  return {
    id: deliverable.id,
    orderId: deliverable.orderId,
    deliverableKey: deliverable.deliverableKey,
    title: deliverable.title,
    description: deliverable.description,
    downloadUrl: `/api/storage${deliverable.objectPath}`,
    fileName: deliverable.fileName,
    contentType: deliverable.contentType,
    fileSize: deliverable.fileSize,
    version: deliverable.version,
    status: deliverable.status,
    customerFeedback: deliverable.customerFeedback,
    approvedAt: deliverable.approvedAt,
    createdAt: deliverable.createdAt,
    updatedAt: deliverable.updatedAt,
  };
}

router.get("/orders/:orderId/deliverables", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = GetOrderDeliverablesParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Project id is invalid." });
    return;
  }
  const [order] = await getAccessibleOrder(parsed.data.orderId, req);
  if (!order) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const rows = await db.select().from(taskflowDeliverablesTable)
    .where(eq(taskflowDeliverablesTable.orderId, order.id))
    .orderBy(desc(taskflowDeliverablesTable.createdAt));
  res.json(GetOrderDeliverablesResponse.parse(rows.map(toDeliverableResponse)));
});

router.post("/orders/:orderId/deliverables", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const isAdmin = await hasPlatformAdminAccess(req.user.id, req.user.email);
  const isSpecialist = await isActiveCreativeSpecialist(req.user.id);
  if (!isAdmin && !isSpecialist) {
    res.status(403).json({ error: "Only an admin or assigned creative specialist can submit deliverables." });
    return;
  }
  if (isSpecialist && !await hasPassedSkillsAssessment(req.user.id)) {
    res.status(403).json({ error: "Pass the specialist skills assessment before accessing project briefs." });
    return;
  }
  const params = CreateOrderDeliverableParams.safeParse(req.params);
  const body = CreateOrderDeliverableBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Deliverable details are invalid." });
    return;
  }
  const [order] = await getAccessibleOrder(params.data.orderId, req);
  if (!order) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  let taskId: string | null = body.data.taskId ?? null;
  if (isSpecialist) {
    if (!taskId) {
      res.status(400).json({ error: "Choose the assigned task this deliverable completes." });
      return;
    }
    const [task] = await db.select({ id: taskflowTasksTable.id }).from(taskflowTasksTable).where(and(
      eq(taskflowTasksTable.id, taskId),
      eq(taskflowTasksTable.orderId, order.id),
      eq(taskflowTasksTable.assigneeUserId, req.user.id),
    )).limit(1);
    if (!task) {
      res.status(403).json({ error: "This task is not assigned to you." });
      return;
    }
  } else if (taskId) {
    const [task] = await db.select({ id: taskflowTasksTable.id }).from(taskflowTasksTable).where(and(
      eq(taskflowTasksTable.id, taskId),
      eq(taskflowTasksTable.orderId, order.id),
    )).limit(1);
    if (!task) {
      res.status(400).json({ error: "The selected task does not belong to this project." });
      return;
    }
  }
  const objectPath = normalizeOrderObjectPath(body.data.objectPath, order.id);
  if (!objectPath) {
    res.status(400).json({ error: "The uploaded file does not belong to this project." });
    return;
  }
  const [latest] = await db.select({ version: taskflowDeliverablesTable.version })
    .from(taskflowDeliverablesTable)
    .where(and(
      eq(taskflowDeliverablesTable.orderId, order.id),
      eq(taskflowDeliverablesTable.deliverableKey, body.data.deliverableKey.trim()),
    ))
    .orderBy(desc(taskflowDeliverablesTable.version))
    .limit(1);
  const [deliverable] = await db.insert(taskflowDeliverablesTable).values({
    orderId: order.id,
    taskId,
    uploadedByUserId: req.user.id,
    deliverableKey: body.data.deliverableKey.trim(),
    title: body.data.title.trim(),
    description: body.data.description?.trim() || "",
    objectPath,
    fileName: body.data.fileName.trim(),
    contentType: body.data.contentType.trim(),
    fileSize: body.data.fileSize,
    version: (latest?.version ?? 0) + 1,
    status: "submitted",
    customerFeedback: null,
    approvedAt: null,
  }).returning();
  if (taskId) {
    await db.update(taskflowTasksTable).set({
      status: "ready_for_review",
      completedAt: null,
      updatedAt: new Date(),
    }).where(eq(taskflowTasksTable.id, taskId));
  }
  await recordActivity(order.id, req.user.id, "deliverable_submitted", `TaskFlow submitted "${deliverable.title}" v${deliverable.version} for review.`, {
    deliverableId: deliverable.id,
    version: deliverable.version,
  });
  void dispatchAutomationEvent({
    event: "deliverable.submitted",
    orderId: order.id,
    deliverableId: deliverable.id,
    title: deliverable.title,
    version: deliverable.version,
    customerName: order.customerName,
    projectName: String((order.project as Record<string, unknown>)?.name ?? order.company ?? "Project"),
  }, req.log);
  res.status(201).json(CreateOrderDeliverableResponse.parse(toDeliverableResponse(deliverable)));
});

router.post("/orders/:orderId/deliverables/:deliverableId/review", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  if (await hasPlatformAdminAccess(req.user.id, req.user.email) || await isActiveCreativeSpecialist(req.user.id)) {
    res.status(403).json({ error: "Only the customer can review a deliverable." });
    return;
  }
  const params = ReviewOrderDeliverableParams.safeParse(req.params);
  const body = ReviewOrderDeliverableBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Deliverable review is invalid." });
    return;
  }
  const [order] = await getAccessibleOrder(params.data.orderId, req);
  if (!order) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const [deliverable] = await db.select().from(taskflowDeliverablesTable).where(and(
    eq(taskflowDeliverablesTable.id, params.data.deliverableId),
    eq(taskflowDeliverablesTable.orderId, order.id),
  ));
  if (!deliverable) {
    res.status(404).json({ error: "Deliverable not found." });
    return;
  }
  const feedback = body.data.feedback?.trim() || null;
  if (body.data.status === "changes_requested" && !feedback) {
    res.status(400).json({ error: "Add feedback when requesting changes." });
    return;
  }
  await db.update(taskflowDeliverablesTable).set({
    status: body.data.status,
    customerFeedback: feedback,
    approvedAt: body.data.status === "approved" ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(taskflowDeliverablesTable.id, deliverable.id));
  if (deliverable.taskId) {
    await db.update(taskflowTasksTable).set({
      status: body.data.status === "approved" ? "done" : "in_progress",
      completedAt: body.data.status === "approved" ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(taskflowTasksTable.id, deliverable.taskId));
  }
  let projectCompleted = false;
  if (body.data.status === "approved") {
    const versions = await db.select().from(taskflowDeliverablesTable)
      .where(eq(taskflowDeliverablesTable.orderId, order.id))
      .orderBy(desc(taskflowDeliverablesTable.version), desc(taskflowDeliverablesTable.createdAt));
    const latestByKey = new Map<string, typeof versions[number]>();
    for (const row of versions) if (!latestByKey.has(row.deliverableKey)) latestByKey.set(row.deliverableKey, row);
    projectCompleted = latestByKey.size > 0 && [...latestByKey.values()].every((row) => row.status === "approved");
    if (projectCompleted && order.requestStatus !== "closed") {
      await db.update(taskflowOrdersTable).set({ requestStatus: "delivered", updatedAt: new Date() })
        .where(eq(taskflowOrdersTable.id, order.id));
      await recordActivity(order.id, req.user.id, "project_completed", "Customer approved all current deliverables. The project is marked complete.");
    } else {
      projectCompleted = false;
    }
  }
  await recordActivity(order.id, req.user.id, body.data.status === "approved" ? "deliverable_approved" : "deliverable_changes_requested",
    body.data.status === "approved"
      ? `Customer approved "${deliverable.title}" v${deliverable.version}.`
      : `Customer requested changes to "${deliverable.title}" v${deliverable.version}.`,
    { deliverableId: deliverable.id, feedback },
  );
  const projectName = String((order.project as Record<string, unknown>)?.name ?? order.company ?? "Project");
  void dispatchAutomationEvent({
    event: body.data.status === "approved" ? "deliverable.approved" : "deliverable.changes_requested",
    orderId: order.id,
    deliverableId: deliverable.id,
    title: deliverable.title,
    version: deliverable.version,
    status: body.data.status,
    projectName,
    feedback,
  }, req.log);
  if (projectCompleted) {
    void dispatchAutomationEvent({
      event: "project.completed",
      orderId: order.id,
      projectName,
    }, req.log);
  }
  res.json(ReviewOrderDeliverableResponse.parse({ ok: true, status: body.data.status, projectCompleted }));
});

router.get("/orders/:orderId/deliverables/:deliverableId/comments", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const [order] = await getAccessibleOrder(req.params.orderId, req);
  if (!order) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const [deliverable] = await db.select({ id: taskflowDeliverablesTable.id })
    .from(taskflowDeliverablesTable)
    .where(and(eq(taskflowDeliverablesTable.id, req.params.deliverableId), eq(taskflowDeliverablesTable.orderId, order.id)))
    .limit(1);
  if (!deliverable) {
    res.status(404).json({ error: "Deliverable not found." });
    return;
  }
  const rows = await db.select({
    comment: taskflowDeliverableCommentsTable,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    email: usersTable.email,
  }).from(taskflowDeliverableCommentsTable)
    .innerJoin(usersTable, eq(usersTable.id, taskflowDeliverableCommentsTable.authorUserId))
    .where(eq(taskflowDeliverableCommentsTable.deliverableId, deliverable.id))
    .orderBy(asc(taskflowDeliverableCommentsTable.createdAt));
  res.json(GetDeliverableCommentsResponse.parse(rows.map(({ comment, firstName, lastName, email }) => ({
    id: comment.id,
    orderId: comment.orderId,
    deliverableId: comment.deliverableId,
    authorName: [firstName, lastName].filter(Boolean).join(" ") || email || "TaskFlow user",
    body: comment.body,
    markerType: comment.markerType,
    timestampMs: comment.timestampMs,
    x: comment.xBasisPoints === null ? null : comment.xBasisPoints / 10_000,
    y: comment.yBasisPoints === null ? null : comment.yBasisPoints / 10_000,
    createdAt: comment.createdAt,
  }))));
});

router.post("/orders/:orderId/deliverables/:deliverableId/comments", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = CreateDeliverableCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Comment details are invalid." });
    return;
  }
  const [order] = await getAccessibleOrder(req.params.orderId, req);
  if (!order) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const [deliverable] = await db.select().from(taskflowDeliverablesTable).where(and(
    eq(taskflowDeliverablesTable.id, req.params.deliverableId),
    eq(taskflowDeliverablesTable.orderId, order.id),
  )).limit(1);
  if (!deliverable) {
    res.status(404).json({ error: "Deliverable not found." });
    return;
  }
  const input = parsed.data;
  if ((input.markerType === "timestamp" && input.timestampMs === undefined)
    || (input.markerType === "point" && (input.x === undefined || input.y === undefined))) {
    res.status(400).json({ error: "Choose a timestamp or both marker coordinates." });
    return;
  }
  const [comment] = await db.insert(taskflowDeliverableCommentsTable).values({
    orderId: order.id,
    deliverableId: deliverable.id,
    authorUserId: req.user.id,
    body: input.body.trim(),
    markerType: input.markerType,
    timestampMs: input.timestampMs ?? null,
    xBasisPoints: input.x === undefined ? null : Math.round(input.x * 10_000),
    yBasisPoints: input.y === undefined ? null : Math.round(input.y * 10_000),
  }).returning();
  await recordActivity(order.id, req.user.id, "deliverable_comment", `Comment added to "${deliverable.title}".`, {
    deliverableId: deliverable.id,
    markerType: comment.markerType,
    timestampMs: comment.timestampMs,
    x: input.x ?? null,
    y: input.y ?? null,
  });
  void dispatchAutomationEvent({
    event: "deliverable.comment",
    orderId: order.id,
    deliverableId: deliverable.id,
    projectName: String((order.project as Record<string, unknown>)?.name ?? order.company ?? "Project"),
    customerName: order.customerName,
    comment: input.body.trim(),
    markerType: input.markerType,
    timestampMs: input.timestampMs ?? null,
    x: input.x ?? null,
    y: input.y ?? null,
  }, req.log);
  const [user] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1);
  res.status(201).json(CreateDeliverableCommentResponse.parse({
    id: comment.id,
    orderId: comment.orderId,
    deliverableId: comment.deliverableId,
    authorName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "TaskFlow user",
    body: comment.body,
    markerType: comment.markerType,
    timestampMs: comment.timestampMs,
    x: comment.xBasisPoints === null ? null : comment.xBasisPoints / 10_000,
    y: comment.yBasisPoints === null ? null : comment.yBasisPoints / 10_000,
    createdAt: comment.createdAt,
  }));
});

export default router;