import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { taskflowOrdersTable } from "./taskflowOrders";
import { usersTable } from "./auth";

export const taskflowActivityEventsTable = pgTable("taskflow_activity_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => taskflowOrdersTable.id),
  actorUserId: varchar("actor_user_id").references(() => usersTable.id),
  eventType: text("event_type").notNull(),
  summary: text("summary").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TaskflowActivityEvent = typeof taskflowActivityEventsTable.$inferSelect;