import { integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const taskflowSpecialistAssessmentsTable = pgTable("taskflow_specialist_assessments", {
  userId: varchar("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 32 }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  challenge: jsonb("challenge").$type<{ questionIds: string[]; optionOrders: number[][] } | null>(),
  scorePercent: integer("score_percent"),
  passedAt: timestamp("passed_at", { withTimezone: true }),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SpecialistAssessment = typeof taskflowSpecialistAssessmentsTable.$inferSelect;
