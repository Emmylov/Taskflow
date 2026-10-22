import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { taskflowOrdersTable } from "./taskflowOrders";
import { usersTable } from "./auth";

export const taskflowPaymentSettingsTable = pgTable("taskflow_payment_settings", {
  id: varchar("id", { length: 32 }).primaryKey().default("default"),
  bankName: text("bank_name").notNull().default(""),
  accountName: text("account_name").notNull().default(""),
  accountNumber: text("account_number").notNull().default(""),
  routingDetails: text("routing_details").notNull().default(""),
  bankAddress: text("bank_address").notNull().default(""),
  transferInstructions: text("transfer_instructions").notNull().default(""),
  currency: text("currency").notNull().default("usd"),
  updatedBy: varchar("updated_by").references(() => usersTable.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const taskflowReviewsTable = pgTable("taskflow_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().unique().references(() => taskflowOrdersTable.id),
  customerUserId: varchar("customer_user_id").notNull().references(() => usersTable.id),
  rating: integer("rating").notNull(),
  testimonial: text("testimonial").notNull(),
  permissionToPublish: boolean("permission_to_publish").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TaskflowPaymentSettings = typeof taskflowPaymentSettingsTable.$inferSelect;
export type NewTaskflowPaymentSettings = typeof taskflowPaymentSettingsTable.$inferInsert;
export type TaskflowReview = typeof taskflowReviewsTable.$inferSelect;