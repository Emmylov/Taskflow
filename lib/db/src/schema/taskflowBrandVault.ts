import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { taskflowOrdersTable } from "./taskflowOrders";
import { taskflowDeliverablesTable } from "./taskflowDeliverables";

export const taskflowBrandKitsTable = pgTable("taskflow_brand_kits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => usersTable.id),
  brandName: text("brand_name").notNull().default(""),
  description: text("description").notNull().default(""),
  colors: jsonb("colors").notNull().default([]),
  fonts: jsonb("fonts").notNull().default([]),
  voiceGuidelines: text("voice_guidelines").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskflowBrandAssetsTable = pgTable("taskflow_brand_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  category: text("category").notNull(),
  displayName: text("display_name").notNull(),
  objectPath: text("object_path").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskflowAutomationSettingsTable = pgTable("taskflow_automation_settings", {
  provider: text("provider").primaryKey(),
  endpointCiphertext: text("endpoint_ciphertext").notNull(),
  active: boolean("active").notNull().default(true),
  updatedBy: varchar("updated_by").notNull().references(() => usersTable.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const taskflowDeliverableCommentsTable = pgTable("taskflow_deliverable_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => taskflowOrdersTable.id),
  deliverableId: uuid("deliverable_id").notNull().references(() => taskflowDeliverablesTable.id),
  authorUserId: varchar("author_user_id").notNull().references(() => usersTable.id),
  body: text("body").notNull(),
  markerType: text("marker_type").notNull().default("general"),
  timestampMs: integer("timestamp_ms"),
  xBasisPoints: integer("x_basis_points"),
  yBasisPoints: integer("y_basis_points"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
