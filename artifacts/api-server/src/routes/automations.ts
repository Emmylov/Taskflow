import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { GetOwnerAutomationsResponse, UpdateOwnerAutomationBody, UpdateOwnerAutomationResponse } from "@workspace/api-zod";
import { db, taskflowAutomationSettingsTable } from "@workspace/db";
import { hasPlatformAdminAccess } from "../lib/ownerAccess";
import { automationProviders, encryptEndpoint, validateWebhookEndpoint } from "../lib/automation";

const router: IRouter = Router();

async function requireOwner(req: Express.Request, res: Response): Promise<boolean> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to manage automations." });
    return false;
  }
  if (!await hasPlatformAdminAccess(req.user?.id, req.user?.email)) {
    res.status(403).json({ error: "Owner access required." });
    return false;
  }
  return true;
}

router.get("/owner/automations", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const settings = await db.select().from(taskflowAutomationSettingsTable);
  const byProvider = new Map(settings.map((setting) => [setting.provider, setting]));
  res.json(GetOwnerAutomationsResponse.parse(automationProviders.map(({ key, label }) => ({
    provider: key,
    label,
    active: byProvider.get(key)?.active ?? false,
    configured: Boolean(byProvider.get(key)?.endpointCiphertext),
  }))));
});

router.put("/owner/automations", async (req, res): Promise<void> => {
  if (!await requireOwner(req, res)) return;
  const parsed = UpdateOwnerAutomationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Automation settings are invalid." });
    return;
  }
  const provider = automationProviders.find((item) => item.key === parsed.data.provider);
  if (!provider) {
    res.status(400).json({ error: "Choose a supported automation provider." });
    return;
  }
  const [existing] = await db.select().from(taskflowAutomationSettingsTable)
    .where(eq(taskflowAutomationSettingsTable.provider, provider.key)).limit(1);
  if (parsed.data.clearEndpoint) {
    await db.delete(taskflowAutomationSettingsTable).where(eq(taskflowAutomationSettingsTable.provider, provider.key));
    res.json(UpdateOwnerAutomationResponse.parse({ provider: provider.key, label: provider.label, active: false, configured: false }));
    return;
  }
  let endpointCiphertext = existing?.endpointCiphertext;
  if (parsed.data.endpoint) {
    try {
      const endpoint = await validateWebhookEndpoint(parsed.data.endpoint);
      endpointCiphertext = encryptEndpoint(endpoint.toString());
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Webhook endpoint is invalid." });
      return;
    }
  }
  if (parsed.data.active && !endpointCiphertext) {
    res.status(400).json({ error: "Add a webhook endpoint before enabling this automation." });
    return;
  }
  if (!endpointCiphertext) {
    res.json(UpdateOwnerAutomationResponse.parse({ provider: provider.key, label: provider.label, active: false, configured: false }));
    return;
  }
  await db.insert(taskflowAutomationSettingsTable).values({
    provider: provider.key,
    endpointCiphertext,
    active: parsed.data.active,
    updatedBy: req.user!.id,
  }).onConflictDoUpdate({
    target: taskflowAutomationSettingsTable.provider,
    set: { endpointCiphertext, active: parsed.data.active, updatedBy: req.user!.id, updatedAt: new Date() },
  });
  res.json(UpdateOwnerAutomationResponse.parse({
    provider: provider.key,
    label: provider.label,
    active: parsed.data.active,
    configured: true,
  }));
});

export default router;
