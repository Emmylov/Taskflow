import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

function requireUser(req: Express.Request, res: Response): req is Express.Request & Express.AuthedRequest {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to update your profile." });
    return false;
  }
  return true;
}

function profileImageUrl(userId: string, storedValue: string | null): string | null {
  if (!storedValue) return null;
  return storedValue.startsWith("/objects/") ? `/api/storage/profile/${userId}` : storedValue;
}

router.get("/account/profile", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const [user] = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    profileImageUrl: usersTable.profileImageUrl,
  }).from(usersTable).where(eq(usersTable.id, req.user.id));
  if (!user) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  res.json({ ...user, profileImageUrl: profileImageUrl(user.id, user.profileImageUrl) });
});

router.put("/account/profile", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const value = req.body?.profileImageUrl;
  if (value !== null && (typeof value !== "string" || value.length > 300 || !value.startsWith("/objects/"))) {
    res.status(400).json({ error: "Profile image must be uploaded through TaskFlow." });
    return;
  }
  const [user] = await db.update(usersTable).set({
    profileImageUrl: value,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, req.user.id)).returning({
    id: usersTable.id,
    email: usersTable.email,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    profileImageUrl: usersTable.profileImageUrl,
  });
  if (!user) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  res.json({ ...user, profileImageUrl: profileImageUrl(user.id, user.profileImageUrl) });
});

export default router;