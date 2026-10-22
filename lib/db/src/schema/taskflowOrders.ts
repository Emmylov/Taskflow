import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const taskflowOrdersTable = pgTable("taskflow_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerUserId: varchar("customer_user_id").references(() => usersTable.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  company: text("company").notNull().default(""),
  notes: text("notes").notNull().default(""),
  project: jsonb("project").notNull(),
  items: jsonb("items").notNull(),
  templateSnapshot: jsonb("template_snapshot").notNull().default([]),
  deliveryOption: text("delivery_option").notNull(),
  paymentModel: text("payment_model").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  discountCents: integer("discount_cents").notNull().default(0),
  promotionCode: text("promotion_code"),
  promotionLabel: text("promotion_label"),
  deliveryFeeCents: integer("delivery_fee_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  amountDueCents: integer("amount_due_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentReference: text("payment_reference"),
  paymentRequestedAt: timestamp("payment_requested_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  requestStatus: text("request_status").notNull().default("request_received"),
  ownerNotificationStatus: text("owner_notification_status").notNull().default("pending"),
  requestedCustomPriceCents: integer("requested_custom_price_cents"),
  requestedCustomPriceReason: text("requested_custom_price_reason"),
  customPriceStatus: text("custom_price_status").notNull().default("none"),
  customerPriceDecision: text("customer_price_decision").notNull().default("pending"),
  customerPriceFeedback: text("customer_price_feedback"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TaskflowOrder = typeof taskflowOrdersTable.$inferSelect;
export type NewTaskflowOrder = typeof taskflowOrdersTable.$inferInsert;