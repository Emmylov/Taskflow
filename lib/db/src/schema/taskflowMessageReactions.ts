import { pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { taskflowMessagesTable } from "./taskflowConversations";
import { usersTable } from "./auth";

export const taskflowMessageReactionsTable = pgTable("taskflow_message_reactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").notNull().references(() => taskflowMessagesTable.id),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  emoji: varchar("emoji", { length: 16 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  messageUserEmojiUnique: uniqueIndex("taskflow_message_reactions_message_user_emoji_idx").on(table.messageId, table.userId, table.emoji),
}));

export type TaskflowMessageReaction = typeof taskflowMessageReactionsTable.$inferSelect;