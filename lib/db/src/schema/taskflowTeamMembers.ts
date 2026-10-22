import { pgTable, text, timestamp, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const taskflowTeamMembersTable = pgTable("taskflow_team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  role: text("role").notNull().default("specialist"),
  coreSkillCategory: text("core_skill_category"),
  status: text("status").notNull().default("invited"),
  userId: varchar("user_id").references(() => usersTable.id),
  invitedBy: varchar("invited_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  emailUnique: uniqueIndex("taskflow_team_members_email_idx").on(table.email),
}));

export type TaskflowTeamMember = typeof taskflowTeamMembersTable.$inferSelect;
export type NewTaskflowTeamMember = typeof taskflowTeamMembersTable.$inferInsert;