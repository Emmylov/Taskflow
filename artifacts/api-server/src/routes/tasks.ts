import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db, taskflowActivityEventsTable, taskflowOrdersTable, taskflowServiceTemplatesTable, taskflowTasksTable, taskflowTeamMembersTable, usersTable } from "@workspace/db";
import { getMasterAdminEmail, getPlatformOwnerEmails, hasPassedSkillsAssessment, hasPlatformAdminAccess, isActiveCreativeSpecialist } from "../lib/ownerAccess";
import { getTaskflowServiceTemplate, taskflowCatalog } from "../lib/taskflowCatalog";
import { dueDateFromOffset, ensureTaskflowTemplates, getTemplateFromOrderSnapshot, templateFromRecord } from "../lib/taskflowTemplates";
import { dispatchAutomationEvent } from "../lib/automation";

const router: IRouter = Router();
const taskStatuses = ["todo", "in_progress", "blocked", "ready_for_review", "done"] as const;
const taskPriorities = ["low", "normal", "high", "urgent"] as const;

async function requireOwner(req: Request, res: Response): Promise<boolean> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to access production tasks." });
    return false;
  }
  if (!await hasPlatformAdminAccess(req.user?.id, req.user?.email)) {
    res.status(403).json({ error: "Owner access required." });
    return false;
  }
  return true;
}

function projectName(order: typeof taskflowOrdersTable.$inferSelect) {
  const project = order.project as { name?: string; website?: string } | null;
  return project?.name || order.company || order.customerName || "Untitled project";
}

function taskResponse(task: typeof taskflowTasksTable.$inferSelect, order: typeof taskflowOrdersTable.$inferSelect, assignee?: typeof usersTable.$inferSelect | null) {
  return {
    ...task,
    dueAt: task.dueAt,
    order: {
      id: order.id,
      name: projectName(order),
      customerName: order.customerName,
      customerUserId: order.customerUserId,
      company: order.company,
      requestStatus: order.requestStatus,
      paymentStatus: order.paymentStatus,
    },
    assignee: assignee ? {
      id: assignee.id,
      name: [assignee.firstName, assignee.lastName].filter(Boolean).join(" ") || assignee.email || "Team member",
      email: assignee.email,
    } : null,
  };
}

async function getOwnerOrder(orderId: string) {
  const [order] = await db.select().from(taskflowOrdersTable).where(eq(taskflowOrdersTable.id, orderId));
  return order;
}

async function getAllowedAssigneeIds() {
  const [users, members, ownerEmails] = await Promise.all([
    db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable),
    db.select({ userId: taskflowTeamMembersTable.userId, status: taskflowTeamMembersTable.status }).from(taskflowTeamMembersTable),
    getPlatformOwnerEmails(),
  ]);
  const memberIds = new Set(members.filter((member) => member.status === "active" && member.userId).map((member) => member.userId));
  return new Set(users.filter((user) => (user.email && ownerEmails.includes(user.email.toLowerCase())) || memberIds.has(user.id)).map((user) => user.id));
}

async function ensureTemplateTasks(order: typeof taskflowOrdersTable.$inferSelect) {
  const existing = await db.select({ id: taskflowTasksTable.id }).from(taskflowTasksTable).where(eq(taskflowTasksTable.orderId, order.id)).limit(1);
  if (existing.length) return;
  const items = Array.isArray(order.items) ? order.items as Array<{ slug?: string; name?: string; option?: string; quantity?: number }> : [];
  const taskValues = items.flatMap((item, itemIndex) => {
    if (!item.slug || !item.name) return [];
    const template = getTemplateFromOrderSnapshot(order, { slug: item.slug, name: item.name });
    return Array.from({ length: Math.max(1, Number(item.quantity ?? 1)) }, (_, quantityIndex) => template.tasks.filter((task) => !task.archived).map((task, taskIndex) => ({
      orderId: order.id,
      serviceSlug: item.slug!,
      templateKey: `${template.key}:v${template.version}:${task.key}`,
      templateVersion: template.version,
      title: Number(item.quantity ?? 1) > 1 ? `${task.title} · ${item.option || "Scope"} ${quantityIndex + 1}` : `${task.title} · ${item.option || "Scope"}`,
      description: task.description,
      priority: task.priority,
      dueAt: dueDateFromOffset(order.createdAt, task.dueOffsetDays),
      sortOrder: itemIndex * 1000 + quantityIndex * 100 + taskIndex,
    }))).flat();
  });
  if (taskValues.length) await db.insert(taskflowTasksTable).values(taskValues);
}

async function getTask(taskId: string, orderId?: string) {
  const conditions = orderId
    ? and(eq(taskflowTasksTable.id, taskId), eq(taskflowTasksTable.orderId, orderId))
    : eq(taskflowTasksTable.id, taskId);
  const [row] = await db.select({
    task: taskflowTasksTable,
    order: taskflowOrdersTable,
  }).from(taskflowTasksTable).innerJoin(taskflowOrdersTable, eq(taskflowTasksTable.orderId, taskflowOrdersTable.id)).where(conditions);
  return row;
}

async function recordTaskActivity(orderId: string, actorUserId: string, eventType: string, summary: string, metadata: Record<string, unknown>) {
  await db.insert(taskflowActivityEventsTable).values({ orderId, actorUserId, eventType, summary, metadata });
}

router.get("/owner/assignees", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
  }).from(usersTable);
  const members = await db.select().from(taskflowTeamMembersTable);
  const allowedUserIds = new Set(members.filter((member) => member.status === "active" && member.userId).map((member) => member.userId));
  const ownerEmails = await getPlatformOwnerEmails();
  const owners = users.filter((user) => (user.email && ownerEmails.includes(user.email.toLowerCase())) || allowedUserIds.has(user.id));
  res.json(owners.map((user) => ({
    ...user,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Team member",
  })));
});

router.get("/owner/templates", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const records = await ensureTaskflowTemplates();
  const recordsBySlug = new Map(records.map((record) => [record.slug, record]));
  res.json(taskflowCatalog.filter((item) => !item.soon).map((item) => ({
    slug: item.slug,
    name: item.name,
    options: item.options,
    template: { ...templateFromRecord(recordsBySlug.get(item.slug)!), version: recordsBySlug.get(item.slug)!.version },
  })));
});

function parseTemplateInput(value: unknown, slug: string, serviceName: string) {
  const current = getTaskflowServiceTemplate(slug, serviceName);
  if (!value || typeof value !== "object") return { error: "Add a template object." } as const;
  const body = value as Record<string, unknown>;
  const priorityValues = ["low", "normal", "high"];
  const defaultPriority = priorityValues.includes(String(body.defaultPriority)) ? String(body.defaultPriority) : current.defaultPriority;
  const defaultDueOffsetDays = Number(body.defaultDueOffsetDays);
  if (!Number.isInteger(defaultDueOffsetDays) || defaultDueOffsetDays < 0 || defaultDueOffsetDays > 365) {
    return { error: "Default due-date offsets must be whole days from 0 to 365." } as const;
  }
  if (!Array.isArray(body.tasks) || !Array.isArray(body.deliverables)) return { error: "Add checklist steps and deliverable slots." } as const;
  const keys = new Set<string>();
  const tasks = body.tasks.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error(`Checklist step ${index + 1} is invalid.`);
    const task = raw as Record<string, unknown>;
    const key = typeof task.key === "string" ? task.key.trim() : "";
    const title = typeof task.title === "string" ? task.title.trim() : "";
    if (!key || !title || keys.has(key)) throw new Error("Checklist step keys and titles must be unique and non-empty.");
    keys.add(key);
    const stepPriority = priorityValues.includes(String(task.priority)) ? String(task.priority) : defaultPriority;
    const dueOffsetDays = Number(task.dueOffsetDays);
    if (!Number.isInteger(dueOffsetDays) || dueOffsetDays < 0 || dueOffsetDays > 365) throw new Error("Checklist due-date offsets must be whole days from 0 to 365.");
    return { key, title: title.slice(0, 200), description: typeof task.description === "string" ? task.description.trim().slice(0, 2000) : "", priority: stepPriority, dueOffsetDays, archived: task.archived === true };
  });
  const deliverableKeys = new Set<string>();
  const deliverables = body.deliverables.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error(`Deliverable slot ${index + 1} is invalid.`);
    const deliverable = raw as Record<string, unknown>;
    const key = typeof deliverable.key === "string" ? deliverable.key.trim() : "";
    const title = typeof deliverable.title === "string" ? deliverable.title.trim() : "";
    if (!key || !title || deliverableKeys.has(key)) throw new Error("Deliverable slot keys and titles must be unique and non-empty.");
    deliverableKeys.add(key);
    const deliverablePriority = priorityValues.includes(String(deliverable.defaultPriority)) ? String(deliverable.defaultPriority) : "high";
    const dueOffsetDays = Number(deliverable.dueOffsetDays);
    if (!Number.isInteger(dueOffsetDays) || dueOffsetDays < 0 || dueOffsetDays > 365) throw new Error("Deliverable due-date offsets must be whole days from 0 to 365.");
    return { key, title: title.slice(0, 200), description: typeof deliverable.description === "string" ? deliverable.description.trim().slice(0, 2000) : "", defaultPriority: deliverablePriority, dueOffsetDays, archived: deliverable.archived === true };
  });
  return { template: { key: current.key, defaultPriority, defaultDueOffsetDays, tasks, deliverables } } as const;
}

router.put("/owner/templates/:slug", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const catalogItem = taskflowCatalog.find((item) => item.slug === req.params.slug && !item.soon);
  if (!catalogItem) {
    res.status(404).json({ error: "Service template not found." });
    return;
  }
  try {
    const parsed = parseTemplateInput(req.body, catalogItem.slug, catalogItem.name);
    if ("error" in parsed) {
      res.status(400).json(parsed);
      return;
    }
    const [existing] = await db.select().from(taskflowServiceTemplatesTable).where(eq(taskflowServiceTemplatesTable.slug, catalogItem.slug));
    const nextVersion = (existing?.version ?? 0) + 1;
    const [updated] = await db.insert(taskflowServiceTemplatesTable).values({
      slug: catalogItem.slug,
      version: nextVersion,
      template: parsed.template,
      updatedBy: req.user!.id,
    }).onConflictDoUpdate({
      target: taskflowServiceTemplatesTable.slug,
      set: {
        template: parsed.template,
        version: nextVersion,
        updatedBy: req.user!.id,
        updatedAt: new Date(),
      },
    }).returning();
    res.json({ slug: catalogItem.slug, name: catalogItem.name, options: catalogItem.options, template: { ...parsed.template, version: updated.version } });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "The template could not be saved." });
  }
});

router.get("/owner/team-members", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const members = await db.select().from(taskflowTeamMembersTable);
  const users = await db.select({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName, lastName: usersTable.lastName }).from(usersTable);
  res.json(members.filter((member) => member.status !== "removed").map((member) => {
    const user = users.find((candidate) => candidate.id === member.userId);
    return { ...member, name: member.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || member.email, userId: member.userId };
  }));
});

router.post("/owner/team-members", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 120) : "";
  const role = req.body?.role === "admin" ? "admin" : req.body?.role === "specialist" || !req.body?.role ? "specialist" : null;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ error: "Enter a valid team member email." });
    return;
  }
  if (!role) {
    res.status(400).json({ error: "Choose either Creative Specialist or Platform Admin." });
    return;
  }
  if (email === (await getMasterAdminEmail()).toLowerCase()) {
    res.status(400).json({ error: "That account is already an owner." });
    return;
  }
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  const [member] = await db.insert(taskflowTeamMembersTable).values({
    email,
    name,
    role,
    coreSkillCategory: null,
    status: user ? "active" : "invited",
    userId: user?.id ?? null,
    invitedBy: req.user!.id,
  }).onConflictDoUpdate({
    target: taskflowTeamMembersTable.email,
    set: { name, role, coreSkillCategory: null, status: user ? "active" : "invited", userId: user?.id ?? null, updatedAt: new Date() },
  }).returning();
  res.status(201).json(member);
});

router.delete("/owner/team-members/:memberId", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const [member] = await db.delete(taskflowTeamMembersTable).where(eq(taskflowTeamMembersTable.id, req.params.memberId)).returning();
  if (!member) {
    res.status(404).json({ error: "Team member not found." });
    return;
  }
  if (member.userId) await db.update(taskflowTasksTable).set({ assigneeUserId: null, updatedAt: new Date() }).where(eq(taskflowTasksTable.assigneeUserId, member.userId));
  res.json({ ok: true });
});

router.get("/owner/tasks", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const activeOrders = await db.select().from(taskflowOrdersTable).where(ne(taskflowOrdersTable.requestStatus, "closed"));
  for (const order of activeOrders) await ensureTemplateTasks(order);
  const rows = await db.select({
    task: taskflowTasksTable,
    order: taskflowOrdersTable,
  }).from(taskflowTasksTable)
    .innerJoin(taskflowOrdersTable, eq(taskflowTasksTable.orderId, taskflowOrdersTable.id))
    .where(ne(taskflowOrdersTable.requestStatus, "closed"))
    .orderBy(asc(taskflowTasksTable.dueAt), desc(taskflowTasksTable.createdAt));
  const assigneeIds = Array.from(new Set(rows.map(({ task }) => task.assigneeUserId).filter(Boolean))) as string[];
  const assignees = assigneeIds.length ? await db.select().from(usersTable) : [];
  res.json(rows.map(({ task, order }) => taskResponse(task, order, assignees.find((assignee) => assignee.id === task.assigneeUserId))));
});

router.get("/orders/:orderId/tasks", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const order = await getOwnerOrder(req.params.orderId);
  if (!order) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const rows = await db.select().from(taskflowTasksTable)
    .where(eq(taskflowTasksTable.orderId, order.id))
    .orderBy(asc(taskflowTasksTable.sortOrder), asc(taskflowTasksTable.createdAt));
  res.json(rows.map((task) => taskResponse(task, order)));
});

router.post("/orders/:orderId/tasks", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const order = await getOwnerOrder(req.params.orderId);
  if (!order) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title || title.length > 200) {
    res.status(400).json({ error: "Add a task title up to 200 characters." });
    return;
  }
  const status = taskStatuses.includes(req.body?.status) ? req.body.status : "todo";
  const priority = taskPriorities.includes(req.body?.priority) ? req.body.priority : "normal";
  const dueAt = typeof req.body?.dueAt === "string" && req.body.dueAt ? new Date(req.body.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    res.status(400).json({ error: "The due date is invalid." });
    return;
  }
  const assigneeUserId = typeof req.body?.assigneeUserId === "string" && req.body.assigneeUserId ? req.body.assigneeUserId : null;
  if (assigneeUserId && !(await getAllowedAssigneeIds()).has(assigneeUserId)) {
    res.status(400).json({ error: "Choose an active TaskFlow team member." });
    return;
  }
  const [task] = await db.insert(taskflowTasksTable).values({
    orderId: order.id,
    serviceSlug: typeof req.body?.serviceSlug === "string" ? req.body.serviceSlug : "",
    templateKey: "manual",
    title,
    description: typeof req.body?.description === "string" ? req.body.description.trim() : "",
    status,
    priority,
    assigneeUserId,
    dueAt,
  }).returning();
  await recordTaskActivity(order.id, req.user!.id, "task_created", `Task "${task.title}" added to production.`, {
    taskId: task.id,
    status: task.status,
    priority: task.priority,
  });
  void dispatchAutomationEvent({
    event: "task.created",
    orderId: order.id,
    projectName: projectName(order),
    taskId: task.id,
    taskTitle: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt,
  }, req.log);
  res.status(201).json(taskResponse(task, order));
});

router.patch("/orders/:orderId/tasks/:taskId", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const row = await getTask(req.params.taskId, req.params.orderId);
  if (!row) {
    res.status(404).json({ error: "Task not found." });
    return;
  }
  const changes: Partial<typeof taskflowTasksTable.$inferInsert> = {};
  if (typeof req.body?.title === "string" && req.body.title.trim()) changes.title = req.body.title.trim().slice(0, 200);
  if (typeof req.body?.description === "string") changes.description = req.body.description.trim().slice(0, 2000);
  if (taskStatuses.includes(req.body?.status)) {
    changes.status = req.body.status;
    changes.completedAt = req.body.status === "done" ? new Date() : null;
  }
  if (taskPriorities.includes(req.body?.priority)) changes.priority = req.body.priority;
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "assigneeUserId")) {
    const assigneeUserId = typeof req.body.assigneeUserId === "string" && req.body.assigneeUserId ? req.body.assigneeUserId : null;
    if (assigneeUserId && !(await getAllowedAssigneeIds()).has(assigneeUserId)) {
      res.status(400).json({ error: "Choose an active TaskFlow team member." });
      return;
    }
    changes.assigneeUserId = assigneeUserId;
  }
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "dueAt")) {
    if (req.body.dueAt === null || req.body.dueAt === "") changes.dueAt = null;
    else if (typeof req.body.dueAt === "string" && !Number.isNaN(new Date(req.body.dueAt).getTime())) changes.dueAt = new Date(req.body.dueAt);
    else {
      res.status(400).json({ error: "The due date is invalid." });
      return;
    }
  }
  const [task] = await db.update(taskflowTasksTable).set({ ...changes, updatedAt: new Date() }).where(eq(taskflowTasksTable.id, row.task.id)).returning();
  const changedFields = Object.keys(changes);
  if (changedFields.length) {
    await recordTaskActivity(row.order.id, req.user!.id, "task_updated", `Task "${task.title}" updated.`, {
      taskId: task.id,
      fields: changedFields,
      status: task.status,
      priority: task.priority,
    });
    void dispatchAutomationEvent({
      event: "task.updated",
      orderId: row.order.id,
      projectName: projectName(row.order),
      taskId: task.id,
      taskTitle: task.title,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt,
      fieldsChanged: changedFields,
    }, req.log);
  }
  res.json(taskResponse(task, row.order));
});

router.get("/specialist/tasks", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to view assigned tasks." });
    return;
  }
  if (!await isActiveCreativeSpecialist(req.user?.id)) {
    res.status(403).json({ error: "Active creative specialist access required." });
    return;
  }
  if (!await hasPassedSkillsAssessment(req.user?.id)) {
    res.status(403).json({ error: "Pass the specialist skills assessment before accessing project briefs." });
    return;
  }
  const activeOrders = await db.select().from(taskflowOrdersTable).where(ne(taskflowOrdersTable.requestStatus, "closed"));
  for (const order of activeOrders) await ensureTemplateTasks(order);
  const rows = await db.select({
    task: taskflowTasksTable,
    order: taskflowOrdersTable,
  }).from(taskflowTasksTable)
    .innerJoin(taskflowOrdersTable, eq(taskflowTasksTable.orderId, taskflowOrdersTable.id))
    .where(and(
      eq(taskflowTasksTable.assigneeUserId, req.user!.id),
      ne(taskflowOrdersTable.requestStatus, "closed"),
    ))
    .orderBy(asc(taskflowTasksTable.dueAt), desc(taskflowTasksTable.createdAt));
  res.json(rows.map(({ task, order }) => taskResponse(task, order)));
});

router.patch("/specialist/tasks/:taskId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to update assigned tasks." });
    return;
  }
  if (!await isActiveCreativeSpecialist(req.user?.id)) {
    res.status(403).json({ error: "Active creative specialist access required." });
    return;
  }
  if (!await hasPassedSkillsAssessment(req.user?.id)) {
    res.status(403).json({ error: "Pass the specialist skills assessment before accessing project briefs." });
    return;
  }
  if (req.body?.status !== "in_progress" && req.body?.status !== "blocked" && req.body?.status !== "ready_for_review") {
    res.status(400).json({ error: "Choose in production, ready for review, or blocked." });
    return;
  }
  const row = await getTask(req.params.taskId);
  if (!row) {
    res.status(404).json({ error: "Task not found." });
    return;
  }
  if (row.task.assigneeUserId !== req.user!.id) {
    res.status(403).json({ error: "This task is not assigned to you." });
    return;
  }
  const [task] = await db.update(taskflowTasksTable).set({
    status: req.body.status,
    completedAt: null,
    updatedAt: new Date(),
  }).where(eq(taskflowTasksTable.id, row.task.id)).returning();
  await recordTaskActivity(row.order.id, req.user!.id, "task_updated", `Task "${task.title}" moved to ${task.status.replaceAll("_", " ")}.`, {
    taskId: task.id,
    status: task.status,
  });
  res.json(taskResponse(task, row.order));
});

export default router;