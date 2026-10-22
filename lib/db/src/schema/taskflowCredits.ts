import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { taskflowOrdersTable } from "./taskflowOrders";
import { usersTable } from "./auth";

export const taskflowCreditAccountsTable = pgTable("taskflow_credit_accounts", {
  userId: varchar("user_id").primaryKey().references(() => usersTable.id),
  whopMembershipId: text("whop_membership_id").unique(),
  planKey: text("plan_key"),
  creditsBalance: integer("credits_balance").notNull().default(0),
  status: text("status").notNull().default("inactive"),
  periodStartsAt: timestamp("period_starts_at", { withTimezone: true }),
  periodEndsAt: timestamp("period_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const taskflowCreditLedgerTable = pgTable("taskflow_credit_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  orderId: uuid("order_id").references(() => taskflowOrdersTable.id),
  planKey: text("plan_key"),
  entryType: text("entry_type").notNull(),
  creditsDelta: integer("credits_delta").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskflowBillingCheckoutsTable = pgTable("taskflow_billing_checkouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  planKey: text("plan_key").notNull(),
  reference: text("reference").notNull().unique(),
  checkoutConfigurationId: text("checkout_configuration_id").notNull().unique(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export type TaskflowCreditAccount = typeof taskflowCreditAccountsTable.$inferSelect;
export type NewTaskflowCreditAccount = typeof taskflowCreditAccountsTable.$inferInsert;
