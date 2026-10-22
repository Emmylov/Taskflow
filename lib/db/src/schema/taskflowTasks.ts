import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { taskflowOrdersTable } from "./taskflowOrders";
import { usersTable } from "./auth";

export const taskflowTasksTable = pgTable("taskflow_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => taskflowOrdersTable.id),
  serviceSlug: text("service_slug").notNull().default(""),
  templateKey: text("template_key").notNull().default(""),
  templateVersion: integer("template_version").notNull().default(0),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("normal"),
  assigneeUserId: varchar("assignee_user_id").references(() => usersTable.id),
  dueAt: timestamp("due_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TaskflowTask = typeof taskflowTasksTable.$inferSelect;
export type NewTaskflowTask = typeof taskflowTasksTable.$inferInsert;