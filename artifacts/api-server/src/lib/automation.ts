import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { eq } from "drizzle-orm";
import { db, taskflowAutomationSettingsTable, taskflowBrandAssetsTable, taskflowBrandKitsTable } from "@workspace/db";
import { signObjectUrl } from "./objectStorage";

export const automationProviders = [
  { key: "zapier", label: "Zapier" },
  { key: "make", label: "Make.com" },
  { key: "figma", label: "Figma asset-injection relay" },
  { key: "canva", label: "Canva asset-injection relay" },
  { key: "slack", label: "Slack" },
  { key: "discord", label: "Discord" },
] as const;

export type AutomationProvider = typeof automationProviders[number]["key"];
type Logger = { warn: (object: Record<string, unknown>, message: string) => void };

function encryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured.");
  return createHash("sha256").update(secret).digest();
}

export function encryptEndpoint(endpoint: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(endpoint, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}.${cipher.getAuthTag().toString("hex")}.${ciphertext.toString("hex")}`;
}

function decryptEndpoint(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(".");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Stored webhook endpoint is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

function privateAddress(address: string): boolean {
  if (address === "::1" || address === "::" || address.toLowerCase().startsWith("fe80:") || address.toLowerCase().startsWith("fc") || address.toLowerCase().startsWith("fd")) return true;
  if (address.startsWith("::ffff:")) return privateAddress(address.slice(7));
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
}

export async function validateWebhookEndpoint(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a valid webhook URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || !url.hostname || url.hostname.endsWith(".local")) {
    throw new Error("Webhook endpoints must use HTTPS and cannot include credentials or fragments.");
  }
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) {
    throw new Error("Webhook endpoint must resolve to a public address.");
  }
  return url;
}

export async function getBrandAutomationPayload(userId: string) {
  const [kit] = await db.select().from(taskflowBrandKitsTable).where(eq(taskflowBrandKitsTable.userId, userId)).limit(1);
  const assets = await db.select().from(taskflowBrandAssetsTable).where(eq(taskflowBrandAssetsTable.userId, userId));
  const privateDir = process.env.PRIVATE_OBJECT_DIR?.replace(/\/$/, "");
  const publicAssets = privateDir ? await Promise.all(assets.map(async (asset) => {
    const relative = asset.objectPath.replace(/^\/objects\//, "");
    const signed = await signObjectUrl(`${privateDir}/${relative}`, "GET");
    return {
      displayName: asset.displayName,
      category: asset.category,
      fileName: asset.fileName,
      contentType: asset.contentType,
      downloadUrl: signed,
    };
  })) : [];
  return {
    brandName: kit?.brandName ?? "",
    colors: Array.isArray(kit?.colors) ? kit.colors : [],
    fonts: Array.isArray(kit?.fonts) ? kit.fonts : [],
    voiceGuidelines: kit?.voiceGuidelines ?? "",
    assets: publicAssets,
  };
}

function shouldSend(provider: AutomationProvider, eventType: string): boolean {
  if (provider === "figma" || provider === "canva") return eventType === "project.created" || eventType === "deliverable.submitted";
  return true;
}

function eventSummary(payload: Record<string, unknown>): string {
  const event = String(payload.event ?? "TaskFlow update").replace(/[._]/g, " ");
  const headline = `TaskFlow ${event.charAt(0).toUpperCase()}${event.slice(1)}: ${String(payload.projectName ?? "Project")}`;
  const details: string[] = [];
  const subject = payload.taskTitle ?? payload.title;
  if (typeof subject === "string" && subject.trim()) details.push(`Item: ${subject.trim()}`);
  const status = payload.status ?? payload.requestStatus ?? payload.paymentStatus;
  if (typeof status === "string" && status.trim()) details.push(`Status: ${status.replaceAll("_", " ")}`);
  if (typeof payload.amountCents === "number" && Number.isFinite(payload.amountCents)) {
    const currency = typeof payload.currency === "string" ? payload.currency.toUpperCase() : "USD";
    let amount = `${currency} ${(payload.amountCents / 100).toFixed(2)}`;
    try {
      amount = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(payload.amountCents / 100);
    } catch {
      // Keep the explicit currency and amount if an unfamiliar currency code is supplied.
    }
    details.push(`Amount: ${amount}`);
  }
  return [headline, ...details].join("\n");
}

function bodyForProvider(provider: AutomationProvider, payload: Record<string, unknown>): Record<string, unknown> {
  const summary = eventSummary(payload);
  if (provider === "slack") {
    const safeSummary = summary.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const [headline, ...details] = safeSummary.split("\n");
    const text = [`*${headline}*`, ...details].join("\n");
    return { text, blocks: [{ type: "section", text: { type: "mrkdwn", text } }] };
  }
  if (provider === "discord") return { content: summary, allowed_mentions: { parse: [] } };
  return payload;
}

export async function dispatchAutomationEvent(
  providerPayload: Record<string, unknown>,
  logger?: Logger,
): Promise<void> {
  let settings: typeof taskflowAutomationSettingsTable.$inferSelect[];
  try {
    settings = await db.select().from(taskflowAutomationSettingsTable)
      .where(eq(taskflowAutomationSettingsTable.active, true));
  } catch (error) {
    logger?.warn({ err: error instanceof Error ? error.message : "settings unavailable" }, "TaskFlow automation settings could not be loaded");
    return;
  }
  await Promise.all(settings.map(async (setting) => {
    const provider = setting.provider as AutomationProvider;
    if (!automationProviders.some((item) => item.key === provider) || !shouldSend(provider, String(providerPayload.event))) return;
    try {
      const endpoint = await validateWebhookEndpoint(decryptEndpoint(setting.endpointCiphertext));
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(bodyForProvider(provider, providerPayload)),
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) logger?.warn({ provider, status: response.status }, "TaskFlow automation delivery failed");
    } catch (error) {
      logger?.warn({ provider, error: error instanceof Error ? error.message : "delivery failed" }, "TaskFlow automation delivery failed");
    }
  }));
}
