import { jsonb, pgTable, text, timestamp, integer, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const taskflowServiceTemplatesTable = pgTable("taskflow_service_templates", {
  slug: text("slug").primaryKey(),
  version: integer("version").notNull().default(1),
  template: jsonb("template").notNull(),
  updatedBy: varchar("updated_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TaskflowServiceTemplateRecord = typeof taskflowServiceTemplatesTable.$inferSelect;
export type NewTaskflowServiceTemplateRecord = typeof taskflowServiceTemplatesTable.$inferInsert;