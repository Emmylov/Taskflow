import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { taskflowOrdersTable } from "./taskflowOrders";
import { usersTable } from "./auth";
import { taskflowTasksTable } from "./taskflowTasks";

export const taskflowDeliverablesTable = pgTable("taskflow_deliverables", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => taskflowOrdersTable.id),
  taskId: uuid("task_id").references(() => taskflowTasksTable.id),
  uploadedByUserId: varchar("uploaded_by_user_id").notNull().references(() => usersTable.id),
  deliverableKey: text("deliverable_key").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  objectPath: text("object_path").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  fileSize: integer("file_size").notNull(),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("submitted"),
  customerFeedback: text("customer_feedback"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TaskflowDeliverable = typeof taskflowDeliverablesTable.$inferSelect;
export type NewTaskflowDeliverable = typeof taskflowDeliverablesTable.$inferInsert;