import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { strToU8, zipSync } from "fflate";
import {
  CreateBrandVaultAssetBody,
  CreateBrandVaultAssetResponse,
  GetBrandVaultResponse,
  UpdateBrandVaultBody,
  UpdateBrandVaultResponse,
} from "@workspace/api-zod";
import { db, taskflowBrandAssetsTable, taskflowBrandKitsTable, taskflowOrdersTable, taskflowTasksTable, usersTable } from "@workspace/db";
import { hasPlatformAdminAccess, isActiveCreativeSpecialist } from "../lib/ownerAccess";
import { signObjectUrl } from "../lib/objectStorage";

const router: IRouter = Router();
const privateRoot = () => process.env.PRIVATE_OBJECT_DIR?.replace(/\/$/, "");
const toStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function requireUser(req: Express.Request, res: Response): req is Express.Request & Express.AuthedRequest {
  if (req.isAuthenticated()) return true;
  res.status(401).json({ error: "Sign in to manage your brand vault." });
  return false;
}

async function readVault(userId: string) {
  const [kit] = await db.select().from(taskflowBrandKitsTable).where(eq(taskflowBrandKitsTable.userId, userId)).limit(1);
  const assets = await db.select().from(taskflowBrandAssetsTable)
    .where(eq(taskflowBrandAssetsTable.userId, userId))
    .orderBy(asc(taskflowBrandAssetsTable.createdAt));
  return GetBrandVaultResponse.parse({
    brandName: kit?.brandName ?? "",
    description: kit?.description ?? "",
    colors: toStringArray(kit?.colors),
    fonts: toStringArray(kit?.fonts),
    voiceGuidelines: kit?.voiceGuidelines ?? "",
    assets: assets.map((asset) => ({
      id: asset.id,
      category: asset.category,
      displayName: asset.displayName,
      downloadUrl: `/api/storage${asset.objectPath}`,
      fileName: asset.fileName,
      contentType: asset.contentType,
      fileSize: asset.fileSize,
      createdAt: asset.createdAt,
    })),
  });
}

router.get("/account/brand-vault", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  let userId = req.query.userId === "self" || typeof req.query.userId !== "string" ? req.user.id : req.query.userId;
  if (typeof req.query.taskId === "string") {
    if (!await isActiveCreativeSpecialist(req.user.id)) {
      res.status(403).json({ error: "Active specialist access required." });
      return;
    }
    const [assigned] = await db.select({
      taskId: taskflowTasksTable.id,
      customerUserId: taskflowOrdersTable.customerUserId,
    }).from(taskflowTasksTable)
      .innerJoin(taskflowOrdersTable, eq(taskflowTasksTable.orderId, taskflowOrdersTable.id))
      .where(and(
        eq(taskflowTasksTable.id, req.query.taskId),
        eq(taskflowTasksTable.assigneeUserId, req.user.id),
      ))
      .limit(1);
  if (!assigned?.customerUserId) {
      res.status(403).json({ error: "This task is not assigned to you." });
      return;
    }
    userId = assigned.customerUserId;
  }
  if (userId !== req.user.id && !await hasPlatformAdminAccess(req.user.id, req.user.email)
    && typeof req.query.taskId !== "string") {
    res.status(403).json({ error: "You cannot view another customer's brand vault." });
    return;
  }
  res.json(await readVault(userId));
});

router.put("/account/brand-vault", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = UpdateBrandVaultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Check the brand name, colors, fonts, and voice guidelines." });
    return;
  }
  const values = {
    userId: req.user.id,
    brandName: parsed.data.brandName.trim(),
    description: parsed.data.description?.trim() ?? "",
    colors: parsed.data.colors.map((color) => color.trim()).filter(Boolean),
    fonts: parsed.data.fonts.map((font) => font.trim()).filter(Boolean),
    voiceGuidelines: parsed.data.voiceGuidelines.trim(),
  };
  await db.insert(taskflowBrandKitsTable).values(values).onConflictDoUpdate({
    target: taskflowBrandKitsTable.userId,
    set: { ...values, updatedAt: new Date() },
  });
  res.json(UpdateBrandVaultResponse.parse(await readVault(req.user.id)));
});

router.post("/account/brand-vault/assets", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = CreateBrandVaultAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Brand asset details are invalid." });
    return;
  }
  const rawPath = parsed.data.objectPath.replace(/^\/objects\//, "").replace(/^\.private\//, "");
  if (rawPath.includes("..") || !rawPath.startsWith(`brand-vault/${req.user.id}/`)) {
    res.status(400).json({ error: "The uploaded file does not belong to this brand vault." });
    return;
  }
  const [existing] = await db.select({ id: taskflowBrandAssetsTable.id })
    .from(taskflowBrandAssetsTable)
    .where(eq(taskflowBrandAssetsTable.userId, req.user.id))
    .limit(50);
  if (existing && (await db.select({ id: taskflowBrandAssetsTable.id }).from(taskflowBrandAssetsTable).where(eq(taskflowBrandAssetsTable.userId, req.user.id))).length >= 50) {
    res.status(400).json({ error: "A brand vault can contain up to 50 assets." });
    return;
  }
  const [asset] = await db.insert(taskflowBrandAssetsTable).values({
    userId: req.user.id,
    category: parsed.data.category,
    displayName: parsed.data.displayName.trim(),
    objectPath: `/objects/${rawPath}`,
    fileName: parsed.data.fileName.trim(),
    contentType: parsed.data.contentType.trim(),
    fileSize: parsed.data.fileSize,
  }).returning();
  const response = await readVault(req.user.id);
  const created = response.assets.find((item) => item.id === asset.id);
  res.status(201).json(CreateBrandVaultAssetResponse.parse(created));
});

router.delete("/account/brand-vault/assets/:assetId", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const [asset] = await db.select().from(taskflowBrandAssetsTable).where(and(
    eq(taskflowBrandAssetsTable.id, req.params.assetId),
    eq(taskflowBrandAssetsTable.userId, req.user.id),
  )).limit(1);
  if (!asset) {
    res.status(404).json({ error: "Brand asset not found." });
    return;
  }
  const privateDir = privateRoot();
  if (!privateDir) {
    res.status(503).json({ error: "Private file storage is not configured." });
    return;
  }
  try {
    const relativePath = asset.objectPath.replace(/^\/objects\//, "");
    const deleteUrl = await signObjectUrl(`${privateDir}/${relativePath}`, "DELETE");
    const response = await fetch(deleteUrl, { method: "DELETE", signal: AbortSignal.timeout(30_000) });
    if (!response.ok && response.status !== 404) throw new Error("The private file could not be removed.");
    await db.delete(taskflowBrandAssetsTable).where(eq(taskflowBrandAssetsTable.id, asset.id));
    res.status(204).end();
  } catch (error) {
    req.log.warn({ err: error instanceof Error ? error.message : "Storage delete failed" }, "Brand asset removal failed");
    res.status(503).json({ error: "Brand asset could not be removed right now." });
  }
});

function zipName(name: string): string {
  return name.normalize("NFKD").replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "asset";
}

async function fetchPrivateAsset(objectPath: string, userId: string): Promise<Uint8Array> {
  const privateDir = privateRoot();
  if (!privateDir) throw new Error("Private file storage is not configured.");
  const storedPath = objectPath.replace(/^\/objects\//, "");
  if (!storedPath.startsWith(`brand-vault/${userId}/`) || storedPath.includes("..")) throw new Error("Invalid brand asset path.");
  const candidates = [
    objectPath,
    `${privateDir}/${storedPath}`,
    `${privateDir}/${storedPath.replace(/^\.private\//, "")}`,
  ].filter((candidate, index, all) => all.indexOf(candidate) === index);
  for (const path of candidates) {
    try {
      const signedUrl = await signObjectUrl(path, "GET");
      const response = await fetch(signedUrl, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) continue;
      const data = new Uint8Array(await response.arrayBuffer());
      if (data.byteLength > 100_000_000) throw new Error("Brand assets are too large to package.");
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("too large")) throw error;
    }
  }
  throw new Error("A brand asset could not be downloaded from private storage.");
}

router.get("/owner/brand-vault/:userId/export", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  if (!await hasPlatformAdminAccess(req.user.id, req.user.email)) {
    res.status(403).json({ error: "Owner access required." });
    return;
  }
  const userId = req.params.userId;
  const [user] = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Brand vault not found." });
    return;
  }
  const [kit] = await db.select().from(taskflowBrandKitsTable).where(eq(taskflowBrandKitsTable.userId, userId)).limit(1);
  const assets = await db.select().from(taskflowBrandAssetsTable)
    .where(eq(taskflowBrandAssetsTable.userId, userId))
    .orderBy(asc(taskflowBrandAssetsTable.createdAt));
  const totalBytes = assets.reduce((sum, asset) => sum + asset.fileSize, 0);
  if (totalBytes > 100_000_000) {
    res.status(413).json({ error: "This brand vault is too large to package in one export." });
    return;
  }

  try {
    const files: Record<string, Uint8Array> = {};
    const brandName = kit?.brandName || "Unnamed brand";
    const colors = toStringArray(kit?.colors);
    const fonts = toStringArray(kit?.fonts);
    const voiceGuidelines = kit?.voiceGuidelines ?? "";
    const brief = [
      `# Creative Brief Package: ${brandName}`,
      "",
      `Client: ${[user.firstName, user.lastName].filter(Boolean).join(" ") || "TaskFlow customer"}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Colors",
      ...(colors.length ? colors.map((color) => `- ${color}`) : ["- Not provided"]),
      "",
      "## Fonts",
      ...(fonts.length ? fonts.map((font) => `- ${font}`) : ["- Not provided"]),
      "",
      "## Voice guidelines",
      voiceGuidelines || "Not provided.",
      "",
      "## Included assets",
      ...(assets.length ? assets.map((asset) => `- ${asset.displayName} (${asset.category}) — ${asset.fileName}`) : ["- No uploaded assets"]),
      "",
      "TaskFlow request credits cover request capacity only. Service work is scoped and invoiced separately.",
    ].join("\n");
    files["Creative_Brief.md"] = strToU8(brief);
    files["Colors_and_Fonts/brand-kit.json"] = strToU8(JSON.stringify({
      brandName,
      colors,
      fonts,
      voiceGuidelines,
    }, null, 2));
    let duplicate = 1;
    for (const asset of assets) {
      const folder = asset.category === "logo"
        ? "Logos"
        : asset.category === "colors_and_fonts"
          ? "Colors_and_Fonts"
          : "Raw_Brand_Assets";
      const baseName = zipName(asset.fileName);
      const suffix = duplicate++;
      files[`${folder}/${suffix}-${baseName}`] = await fetchPrivateAsset(asset.objectPath, userId);
    }
    const archive = zipSync(files, { level: 5 });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="taskflow-brand-brief-${userId.slice(0, 8)}.zip"`);
    res.setHeader("Content-Length", archive.byteLength);
    res.send(Buffer.from(archive));
  } catch (error) {
    req.log.error({ err: error instanceof Error ? error.message : "Brand vault export failed" }, "Brand vault export failed");
    res.status(500).json({ error: "The automated brief could not be packaged. Please try again." });
  }
});

export default router;
