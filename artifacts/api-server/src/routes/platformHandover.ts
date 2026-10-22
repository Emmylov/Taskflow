import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, taskflowAutomationSettingsTable, taskflowOrdersTable, taskflowPlatformHandoverTable, taskflowTeamMembersTable, usersTable } from "@workspace/db";
import { hasSuperAdminAccess } from "../lib/ownerAccess";

const router: IRouter = Router();
const settingId = "default";
const keyNames = ["stripePublicKey", "stripeSecretKey", "paystackPublicKey", "paystackSecretKey"] as const;
type ProviderKey = typeof keyNames[number];

function requireUser(req: Express.Request, res: Response): req is Express.Request & Express.AuthedRequest {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to manage platform handover." });
    return false;
  }
  return true;
}

async function requireSuperAdmin(req: Express.Request, res: Response): Promise<boolean> {
  if (!requireUser(req, res)) return false;
  if (!await hasSuperAdminAccess(req.user.id, req.user.email)) {
    res.status(403).json({ error: "Super admin access required." });
    return false;
  }
  return true;
}

function encryptionKey(): Buffer | null {
  const secret = process.env.PLATFORM_CREDENTIALS_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  return secret ? createHash("sha256").update(secret).digest() : null;
}

function encrypt(value: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function isConfigured(stored: string | null | undefined, envName: string): boolean {
  return Boolean(stored || process.env[envName]);
}

router.get("/owner/platform-readiness", async (req, res): Promise<void> => {
  if (!await requireSuperAdmin(req, res)) return;
  const [settings, automations, users, orders, teamMembers] = await Promise.all([
    db.select().from(taskflowPlatformHandoverTable).where(eq(taskflowPlatformHandoverTable.id, settingId)).limit(1),
    db.select().from(taskflowAutomationSettingsTable),
    db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable),
    db.select({ id: taskflowOrdersTable.id }).from(taskflowOrdersTable),
    db.select({ userId: taskflowTeamMembersTable.userId }).from(taskflowTeamMembersTable),
  ]);
  const setting = settings[0];
  const webhookListCiphertext = setting?.webhookEndpointsCiphertext;
  const configuredWebhooks = webhookListCiphertext ? 1 : 0;
  const teamIds = new Set(teamMembers.map((member) => member.userId).filter(Boolean));
  const explicitClientCount = users.filter((user) => !teamIds.has(user.id) && user.email?.trim().toLowerCase() !== setting?.masterAdminEmail?.trim().toLowerCase()).length;
  res.json({
    generatedAt: new Date().toISOString(),
    masterAdminEmail: setting?.masterAdminEmail ?? req.user!.email ?? "",
    providers: [
      {
        provider: "stripe",
        publicKeyConfigured: isConfigured(setting?.stripePublicKeyCiphertext, "STRIPE_PUBLIC_KEY"),
        secretKeyConfigured: isConfigured(setting?.stripeSecretKeyCiphertext, "STRIPE_SECRET_KEY"),
      },
      {
        provider: "paystack",
        publicKeyConfigured: isConfigured(setting?.paystackPublicKeyCiphertext, "PAYSTACK_PUBLIC_KEY"),
        secretKeyConfigured: isConfigured(setting?.paystackSecretKeyCiphertext, "PAYSTACK_SECRET_KEY"),
      },
    ],
    webhooks: {
      configured: automations.filter((row) => Boolean(row.endpointCiphertext)).length + configuredWebhooks,
      active: automations.filter((row) => row.active).length,
    },
    data: { clients: explicitClientCount, projects: orders.length, teamMembers: teamMembers.length },
  });
});

router.put("/owner/platform-handover", async (req, res): Promise<void> => {
  if (!await requireSuperAdmin(req, res)) return;
  const key = encryptionKey();
  if (!key) {
    res.status(503).json({ error: "Secure credential storage is unavailable. Configure SESSION_SECRET before saving keys." });
    return;
  }
  const email = typeof req.body?.masterAdminEmail === "string" ? req.body.masterAdminEmail.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Enter a valid master admin email." });
    return;
  }
  for (const keyName of keyNames) {
    if (req.body?.[keyName] !== undefined && (typeof req.body[keyName] !== "string" || req.body[keyName].length > (keyName.endsWith("SecretKey") ? 2000 : 500))) {
      res.status(400).json({ error: "Payment provider credentials must be text within the allowed length." });
      return;
    }
  }
  const webhookEndpoints = req.body?.webhookEndpoints;
  if (webhookEndpoints !== undefined && (!Array.isArray(webhookEndpoints) || webhookEndpoints.length > 20 || webhookEndpoints.some((url: unknown) => typeof url !== "string" || url.length > 2000 || !/^https:\/\//i.test(url)))) {
    res.status(400).json({ error: "Webhook endpoints must be HTTPS URLs, with at most 20 entries." });
    return;
  }
  const [existing] = await db.select().from(taskflowPlatformHandoverTable)
    .where(eq(taskflowPlatformHandoverTable.id, settingId)).limit(1);
  const encryptedUpdates: Partial<typeof taskflowPlatformHandoverTable.$inferInsert> = {};
  const columns: Record<ProviderKey, keyof typeof taskflowPlatformHandoverTable.$inferInsert> = {
    stripePublicKey: "stripePublicKeyCiphertext",
    stripeSecretKey: "stripeSecretKeyCiphertext",
    paystackPublicKey: "paystackPublicKeyCiphertext",
    paystackSecretKey: "paystackSecretKeyCiphertext",
  };
  for (const keyName of keyNames) {
    const value = req.body?.[keyName];
    if (typeof value === "string" && value.trim()) {
      const fieldName = columns[keyName];
      (encryptedUpdates as Record<string, unknown>)[fieldName] = encrypt(value.trim(), key);
    }
  }
  if (webhookEndpoints !== undefined) encryptedUpdates.webhookEndpointsCiphertext = webhookEndpoints.length ? encrypt(JSON.stringify(webhookEndpoints), key) : null;
  const patch = { masterAdminEmail: email, ...encryptedUpdates, updatedBy: req.user!.id, updatedAt: new Date() };
  await db.insert(taskflowPlatformHandoverTable).values({
    id: settingId,
    stripePublicKeyCiphertext: existing?.stripePublicKeyCiphertext ?? null,
    stripeSecretKeyCiphertext: existing?.stripeSecretKeyCiphertext ?? null,
    paystackPublicKeyCiphertext: existing?.paystackPublicKeyCiphertext ?? null,
    paystackSecretKeyCiphertext: existing?.paystackSecretKeyCiphertext ?? null,
    webhookEndpointsCiphertext: existing?.webhookEndpointsCiphertext ?? null,
    ...patch,
  })
    .onConflictDoUpdate({ target: taskflowPlatformHandoverTable.id, set: patch });
  const [saved] = await db.select().from(taskflowPlatformHandoverTable)
    .where(eq(taskflowPlatformHandoverTable.id, settingId)).limit(1);
  res.json({
    ok: true,
    masterAdminEmail: saved.masterAdminEmail,
    providers: [
      { provider: "stripe", publicKeyConfigured: isConfigured(saved.stripePublicKeyCiphertext, "STRIPE_PUBLIC_KEY"), secretKeyConfigured: isConfigured(saved.stripeSecretKeyCiphertext, "STRIPE_SECRET_KEY") },
      { provider: "paystack", publicKeyConfigured: isConfigured(saved.paystackPublicKeyCiphertext, "PAYSTACK_PUBLIC_KEY"), secretKeyConfigured: isConfigured(saved.paystackSecretKeyCiphertext, "PAYSTACK_SECRET_KEY") },
    ],
  });
});

export default router;
