import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { taskflowOrdersTable } from "./taskflowOrders";
import { usersTable } from "./auth";

export const taskflowConversationsTable = pgTable("taskflow_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => taskflowOrdersTable.id),
  customerUserId: varchar("customer_user_id").notNull().references(() => usersTable.id),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow(),
  customerLastReadAt: timestamp("customer_last_read_at", { withTimezone: true }),
  ownerLastReadAt: timestamp("owner_last_read_at", { withTimezone: true }),
  customerTypingAt: timestamp("customer_typing_at", { withTimezone: true }),
  ownerTypingAt: timestamp("owner_typing_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const taskflowMessagesTable = pgTable("taskflow_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => taskflowConversationsTable.id),
  authorUserId: varchar("author_user_id").notNull().references(() => usersTable.id),
  authorRole: text("author_role").notNull(),
  body: text("body").notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentContentType: text("attachment_content_type"),
  attachmentSize: integer("attachment_size"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TaskflowConversation = typeof taskflowConversationsTable.$inferSelect;
export type TaskflowMessage = typeof taskflowMessagesTable.$inferSelect;