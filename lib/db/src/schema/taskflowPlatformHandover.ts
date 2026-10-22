import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const taskflowPlatformHandoverTable = pgTable("taskflow_platform_handover", {
  id: varchar("id", { length: 32 }).primaryKey(),
  masterAdminEmail: text("master_admin_email").notNull(),
  stripePublicKeyCiphertext: text("stripe_public_key_ciphertext"),
  stripeSecretKeyCiphertext: text("stripe_secret_key_ciphertext"),
  paystackPublicKeyCiphertext: text("paystack_public_key_ciphertext"),
  paystackSecretKeyCiphertext: text("paystack_secret_key_ciphertext"),
  webhookEndpointsCiphertext: text("webhook_endpoints_ciphertext"),
  updatedBy: varchar("updated_by").references(() => usersTable.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformHandoverSettings = typeof taskflowPlatformHandoverTable.$inferSelect;
