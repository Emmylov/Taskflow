import { eq } from "drizzle-orm";
import {
  db,
  taskflowServiceTemplatesTable,
  type TaskflowServiceTemplateRecord,
} from "@workspace/db";
import {
  getTaskflowServiceTemplate,
  taskflowCatalog,
  type TaskflowServiceTemplate,
} from "./taskflowCatalog";

const priorities = ["low", "normal", "high"] as const;

function normalizeTemplate(value: unknown, fallback: TaskflowServiceTemplate): TaskflowServiceTemplate {
  const candidate = value && typeof value === "object" ? value as Partial<TaskflowServiceTemplate> : {};
  const priority = priorities.includes(candidate.defaultPriority as typeof priorities[number])
    ? candidate.defaultPriority as typeof priorities[number]
    : fallback.defaultPriority;
  const offset = Number(candidate.defaultDueOffsetDays);
  return {
    key: fallback.key,
    defaultPriority: priority,
    defaultDueOffsetDays: Number.isInteger(offset) && offset >= 0 ? offset : fallback.defaultDueOffsetDays,
    tasks: Array.isArray(candidate.tasks) ? candidate.tasks.map((task, index) => {
      const item = task && typeof task === "object" ? task as Partial<TaskflowServiceTemplate["tasks"][number]> : {};
      const taskPriority = priorities.includes(item.priority as typeof priorities[number])
        ? item.priority as typeof priorities[number]
        : priority;
      const dueOffsetDays = Number(item.dueOffsetDays);
      return {
        key: typeof item.key === "string" && item.key.trim() ? item.key.trim() : `${fallback.key}-step-${index + 1}`,
        title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Untitled step",
        description: typeof item.description === "string" ? item.description.trim() : "",
        priority: taskPriority,
        dueOffsetDays: Number.isInteger(dueOffsetDays) && dueOffsetDays >= 0 ? dueOffsetDays : offset,
        archived: item.archived === true,
      };
    }) : fallback.tasks,
    deliverables: Array.isArray(candidate.deliverables) ? candidate.deliverables.map((deliverable, index) => {
      const item = deliverable && typeof deliverable === "object" ? deliverable as Partial<TaskflowServiceTemplate["deliverables"][number]> : {};
      const deliverablePriority = priorities.includes(item.defaultPriority as typeof priorities[number])
        ? item.defaultPriority as typeof priorities[number]
        : "high";
      const dueOffsetDays = Number(item.dueOffsetDays);
      return {
        key: typeof item.key === "string" && item.key.trim() ? item.key.trim() : `${fallback.key}-deliverable-${index + 1}`,
        title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Untitled deliverable",
        description: typeof item.description === "string" ? item.description.trim() : "",
        defaultPriority: deliverablePriority,
        dueOffsetDays: Number.isInteger(dueOffsetDays) && dueOffsetDays >= 0 ? dueOffsetDays : fallback.defaultDueOffsetDays,
        archived: item.archived === true,
      };
    }) : fallback.deliverables,
  };
}

export function templateFromRecord(record: TaskflowServiceTemplateRecord): TaskflowServiceTemplate & { version: number } {
  const catalogItem = taskflowCatalog.find((item) => item.slug === record.slug);
  const fallback = getTaskflowServiceTemplate(record.slug, catalogItem?.name ?? record.slug);
  return { ...normalizeTemplate(record.template, fallback), version: record.version };
}

export async function ensureTaskflowTemplates(): Promise<Array<TaskflowServiceTemplateRecord>> {
  const records = await db.select().from(taskflowServiceTemplatesTable);
  const existing = new Set(records.map((record) => record.slug));
  const missing = taskflowCatalog
    .filter((item) => !item.soon && !existing.has(item.slug))
    .map((item) => {
      const template = getTaskflowServiceTemplate(item.slug, item.name);
      return {
        slug: item.slug,
        version: 1,
        template,
      };
    });
  if (missing.length) {
    await db.insert(taskflowServiceTemplatesTable).values(missing).onConflictDoNothing();
    return db.select().from(taskflowServiceTemplatesTable);
  }
  return records;
}

export async function getTaskflowTemplate(slug: string, serviceName: string) {
  const fallback = getTaskflowServiceTemplate(slug, serviceName);
  const [record] = await db.select().from(taskflowServiceTemplatesTable).where(eq(taskflowServiceTemplatesTable.slug, slug));
  return record ? templateFromRecord(record) : { ...fallback, version: 1 };
}

export type TaskflowTemplateSnapshot = {
  serviceSlug: string;
  version: number;
  template: TaskflowServiceTemplate;
};

export function snapshotForOrderItem(
  item: { slug: string; name: string },
  templates: Map<string, TaskflowServiceTemplate & { version: number }>,
): TaskflowTemplateSnapshot {
  const template = templates.get(item.slug) ?? { ...getTaskflowServiceTemplate(item.slug, item.name), version: 1 };
  return { serviceSlug: item.slug, version: template.version, template };
}

export function getTemplateFromOrderSnapshot(
  order: { templateSnapshot?: unknown },
  item: { slug: string; name: string },
) {
  const snapshots = Array.isArray(order.templateSnapshot) ? order.templateSnapshot as TaskflowTemplateSnapshot[] : [];
  const snapshot = snapshots.find((candidate) => candidate?.serviceSlug === item.slug);
  return snapshot?.template ? { ...snapshot.template, version: snapshot.version } : { ...getTaskflowServiceTemplate(item.slug, item.name), version: 1 };
}

export function dueDateFromOffset(createdAt: Date, offsetDays: number) {
  const dueAt = new Date(createdAt);
  dueAt.setDate(dueAt.getDate() + Math.max(0, offsetDays));
  return dueAt;
}