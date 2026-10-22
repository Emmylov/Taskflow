import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, taskflowBrandAssetsTable, taskflowOrdersTable, usersTable } from "@workspace/db";
import { hasAssignedTaskForBrandOwner, hasAssignedTaskOnOrder, hasPlatformAdminAccess, hasSuperAdminAccess } from "../lib/ownerAccess";
import { signObjectUrl } from "../lib/objectStorage";

const router: IRouter = Router();
function requireUser(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to upload or view project files." });
    return false;
  }
  return true;
}

async function canAccessOrder(req: Request, orderId: string): Promise<boolean> {
  if (await hasPlatformAdminAccess(req.user?.id, req.user?.email)) return true;
  if (!req.user?.id) return false;
  const [order] = await db.select({ id: taskflowOrdersTable.id }).from(taskflowOrdersTable).where(and(
    eq(taskflowOrdersTable.id, orderId),
    eq(taskflowOrdersTable.customerUserId, req.user.id),
  ));
  return Boolean(order) || await hasAssignedTaskOnOrder(req.user.id, orderId);
}

async function canAccessProfile(req: Request, userId: string): Promise<boolean> {
  if (await hasPlatformAdminAccess(req.user?.id, req.user?.email) || req.user?.id === userId) return true;
  const [target] = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  return Boolean(target?.email && await hasSuperAdminAccess(target.id, target.email));
}

router.post("/storage/uploads/request-url", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const { name, size, contentType, orderId } = req.body ?? {};
  if (typeof name !== "string" || !name.trim() || !Number.isInteger(size) || size < 1 || size > 25_000_000 || typeof contentType !== "string" || !contentType.trim() || typeof orderId !== "string") {
    res.status(400).json({ error: "Provide a project, file name, size up to 25 MB, and content type." });
    return;
  }
  try {
    if (!await canAccessOrder(req, orderId)) {
      res.status(403).json({ error: "You cannot upload to this project." });
      return;
    }
    const privateDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR is not configured.");
    const privatePrefix = privateDir.replace(/\/$/, "");
    const objectPath = `${privatePrefix}/orders/${orderId}/${randomUUID()}`;
    const uploadURL = await signObjectUrl(objectPath, "PUT");
    res.json({
      uploadURL,
      objectPath: `/objects/${objectPath.slice(privatePrefix.length + 1)}`,
      metadata: { name: name.trim(), size, contentType: contentType.trim(), orderId },
    });
  } catch (error) {
    req.log.error({ err: error }, "File upload URL generation failed");
    res.status(500).json({ error: "File upload is temporarily unavailable." });
  }
});

router.post("/storage/profile/uploads/request-url", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const { name, size, contentType } = req.body ?? {};
  if (typeof name !== "string" || !name.trim() || !Number.isInteger(size) || size < 1 || size > 5_000_000 || typeof contentType !== "string" || !contentType.startsWith("image/")) {
    res.status(400).json({ error: "Choose an image up to 5 MB." });
    return;
  }
  try {
    const privateDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR is not configured.");
    const privatePrefix = privateDir.replace(/\/$/, "");
    const objectPath = `${privatePrefix}/profiles/${req.user!.id}/${randomUUID()}`;
    const uploadURL = await signObjectUrl(objectPath, "PUT");
    res.json({
      uploadURL,
      objectPath: `/objects/${objectPath.slice(privatePrefix.length + 1)}`,
      metadata: { name: name.trim(), size, contentType: contentType.trim() },
    });
  } catch (error) {
    req.log.error({ err: error }, "Profile image upload URL generation failed");
    res.status(500).json({ error: "Profile image upload is temporarily unavailable." });
  }
});

router.post("/storage/brand-vault/uploads/request-url", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const { name, size, contentType, category } = req.body ?? {};
  const categories = ["logo", "colors_and_fonts", "raw_brand_asset"];
  if (typeof name !== "string" || !name.trim() || !Number.isInteger(size) || size < 1 || size > 30_000_000
    || typeof contentType !== "string" || !contentType.trim() || !categories.includes(category)) {
    res.status(400).json({ error: "Choose a valid brand asset up to 30 MB." });
    return;
  }
  try {
    const privateDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR is not configured.");
    const privatePrefix = privateDir.replace(/\/$/, "");
    const objectPath = `${privatePrefix}/brand-vault/${req.user!.id}/${randomUUID()}`;
    const uploadURL = await signObjectUrl(objectPath, "PUT");
    res.json({
      uploadURL,
      objectPath: `/objects/${objectPath.slice(privatePrefix.length + 1)}`,
      metadata: { name: name.trim(), size, contentType: contentType.trim(), category },
    });
  } catch (error) {
    req.log.error({ err: error }, "Brand vault upload URL generation failed");
    res.status(500).json({ error: "Brand asset upload is temporarily unavailable." });
  }
});

router.get("/storage/objects/*path", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  try {
    const privateDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR is not configured.");
    const raw = req.params.path;
    const rawPath = Array.isArray(raw) ? raw.join("/") : raw;
    const relativePath = rawPath.replace(/^\.private\//, "");
    if (!relativePath || relativePath.includes("..")) {
      res.status(400).json({ error: "Invalid object path." });
      return;
    }
    const [scope, ownerId] = relativePath.split("/");
    if (scope === "orders") {
      if (!ownerId || !await canAccessOrder(req, ownerId)) {
        res.status(403).json({ error: "You cannot view this project file." });
        return;
      }
    } else if (scope === "brand-vault") {
      const [assetOwnerId] = relativePath.slice("brand-vault/".length).split("/");
      const [asset] = await db.select({ id: taskflowBrandAssetsTable.id, objectPath: taskflowBrandAssetsTable.objectPath })
        .from(taskflowBrandAssetsTable)
        .where(and(eq(taskflowBrandAssetsTable.userId, assetOwnerId), eq(taskflowBrandAssetsTable.objectPath, `/objects/${relativePath}`)))
        .limit(1);
      if (!asset || (!await hasPlatformAdminAccess(req.user?.id, req.user?.email)
        && req.user?.id !== assetOwnerId
        && !await hasAssignedTaskForBrandOwner(req.user?.id, assetOwnerId))) {
        res.status(403).json({ error: "You cannot view this brand asset." });
        return;
      }
    } else {
      res.status(403).json({ error: "You cannot view this private file." });
      return;
    }
    const signedURL = await signObjectUrl(`${privateDir.replace(/\/$/, "")}/${relativePath}`, "GET");
    res.redirect(signedURL);
  } catch (error) {
    req.log.error({ err: error }, "File download failed");
    res.status(404).json({ error: "File not found." });
  }
});

router.get("/storage/profile/:userId", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const userId = req.params.userId;
  if (!await canAccessProfile(req, userId)) {
    res.status(403).json({ error: "You cannot view this profile image." });
    return;
  }
  const [user] = await db.select({ profileImageUrl: usersTable.profileImageUrl }).from(usersTable).where(eq(usersTable.id, userId));
  const objectPath = user?.profileImageUrl;
  if (!objectPath || !objectPath.startsWith("/objects/")) {
    res.status(404).end();
    return;
  }
  try {
    const privateDir = process.env.PRIVATE_OBJECT_DIR;
    const storedPath = objectPath.replace(/^\/objects\//, "");
    if (!privateDir || !storedPath.includes(`/profiles/${userId}/`) && !storedPath.startsWith(`profiles/${userId}/`)) {
      res.status(404).end();
      return;
    }
    const candidates = [
      objectPath,
      `${privateDir.replace(/\/$/, "")}/${storedPath}`,
      `${privateDir.replace(/\/$/, "")}/${storedPath.replace(/^\.private\//, "")}`,
    ].filter((candidate, index, all) => all.indexOf(candidate) === index);
    let objectResponse: globalThis.Response | null = null;
    for (const candidate of candidates) {
      try {
        const signedURL = await signObjectUrl(candidate, "GET");
        const response = await fetch(signedURL);
        if (response.ok) {
          objectResponse = response;
          break;
        }
      } catch {
        // Try the next compatible representation of the stored object path.
      }
    }
    if (!objectResponse) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", objectResponse.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(Buffer.from(await objectResponse.arrayBuffer()));
  } catch (error) {
    req.log.error({ err: error }, "Profile image download failed");
    res.status(404).end();
  }
});

export default router;