import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { taskflowOrdersTable } from "./taskflowOrders";

export const taskflowInvoicesTable = pgTable("taskflow_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().unique().references(() => taskflowOrdersTable.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  status: text("status").notNull().default("draft"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TaskflowInvoice = typeof taskflowInvoicesTable.$inferSelect;
export type NewTaskflowInvoice = typeof taskflowInvoicesTable.$inferInsert;