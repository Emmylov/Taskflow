import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { GetAccountRoleResponse, UpdateAccountRoleBody, UpdateAccountRoleResponse } from "@workspace/api-zod";
import { db, taskflowTeamMembersTable, usersTable } from "@workspace/db";
import { hasSuperAdminAccess } from "../lib/ownerAccess";

const router: IRouter = Router();
const intents = new Set(["one_off", "long_term", "not_sure"]);
const skillCategories = new Set(["video", "social", "copy", "design"]);

function requireUser(req: Express.Request, res: Response): req is Express.Request & Express.AuthedRequest {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to continue." });
    return false;
  }
  return true;
}

router.get("/account/onboarding", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const [user] = await db.select({
    onboardingCompleted: usersTable.onboardingCompleted,
    customerIntent: usersTable.customerIntent,
    onboardingCompletedAt: usersTable.onboardingCompletedAt,
  }).from(usersTable).where(eq(usersTable.id, req.user.id));
  res.json(user ?? { onboardingCompleted: false, customerIntent: null, onboardingCompletedAt: null });
});

router.put("/account/onboarding", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const intent = typeof req.body?.customerIntent === "string" ? req.body.customerIntent : "";
  if (!intents.has(intent)) {
    res.status(400).json({ error: "Choose how you expect to work with TaskFlow." });
    return;
  }
  const [user] = await db.update(usersTable).set({
    onboardingCompleted: true,
    customerIntent: intent,
    onboardingCompletedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(usersTable.id, req.user.id)).returning({
    onboardingCompleted: usersTable.onboardingCompleted,
    customerIntent: usersTable.customerIntent,
    onboardingCompletedAt: usersTable.onboardingCompletedAt,
  });
  res.json(user);
});

router.get("/account/role", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const email = req.user.email?.trim().toLowerCase() ?? "";
  const [user] = await db.select({ onboardingCompleted: usersTable.onboardingCompleted })
    .from(usersTable).where(eq(usersTable.id, req.user.id));
  if (await hasSuperAdminAccess(req.user.id, email)) {
    res.json(GetAccountRoleResponse.parse({
      role: "admin",
      accessStatus: "active",
      coreSkillCategory: null,
      onboardingCompleted: true,
      isSuperAdmin: true,
    }));
    return;
  }
  const [member] = email
    ? await db.select().from(taskflowTeamMembersTable).where(eq(taskflowTeamMembersTable.email, email)).limit(1)
    : [];
  if (member && member.status !== "removed") {
    const accepted = member.status === "active" && member.userId === req.user.id;
    res.json(GetAccountRoleResponse.parse({
      role: member.role === "admin" ? "admin" : "specialist",
      accessStatus: accepted ? "active" : "invited",
      coreSkillCategory: member.coreSkillCategory ?? null,
      onboardingCompleted: accepted && (member.role === "admin" || Boolean(member.coreSkillCategory)),
      isSuperAdmin: false,
    }));
    return;
  }
  res.json(GetAccountRoleResponse.parse({
    role: "client",
    accessStatus: "none",
    coreSkillCategory: null,
    onboardingCompleted: Boolean(user?.onboardingCompleted),
    isSuperAdmin: false,
  }));
});

router.put("/account/role", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = UpdateAccountRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a valid TaskFlow role." });
    return;
  }
  const email = req.user.email?.trim().toLowerCase() ?? "";
  const { role, coreSkillCategory } = parsed.data;
  if (role === "client") {
    const [member] = email
      ? await db.select().from(taskflowTeamMembersTable).where(eq(taskflowTeamMembersTable.email, email)).limit(1)
      : [];
    if (await hasSuperAdminAccess(req.user.id, email) || (member && member.status !== "removed")) {
      res.status(409).json({ error: "This account has an owner-issued team role." });
      return;
    }
    const [user] = await db.select({ onboardingCompleted: usersTable.onboardingCompleted })
      .from(usersTable).where(eq(usersTable.id, req.user.id));
    res.json(UpdateAccountRoleResponse.parse({
      role: "client",
      accessStatus: "none",
      coreSkillCategory: null,
      onboardingCompleted: Boolean(user?.onboardingCompleted),
      isSuperAdmin: false,
    }));
    return;
  }
  if (role === "admin" && await hasSuperAdminAccess(req.user.id, email)) {
    res.json(UpdateAccountRoleResponse.parse({
      role: "admin",
      accessStatus: "active",
      coreSkillCategory: null,
      onboardingCompleted: true,
      isSuperAdmin: true,
    }));
    return;
  }
  const [member] = email
    ? await db.select().from(taskflowTeamMembersTable).where(eq(taskflowTeamMembersTable.email, email)).limit(1)
    : [];
  if (!member || member.status === "removed") {
    res.status(403).json({ error: "Ask a TaskFlow owner to invite this email address." });
    return;
  }
  if (member.role !== role) {
    res.status(409).json({ error: "The invitation is for a different TaskFlow role." });
    return;
  }
  if (member.userId && member.userId !== req.user.id) {
    res.status(409).json({ error: "This invitation is already linked to another account." });
    return;
  }
  if (role === "specialist" && (!coreSkillCategory || !skillCategories.has(coreSkillCategory))) {
    res.status(400).json({ error: "Choose your core creative skill." });
    return;
  }
  const [accepted] = await db.update(taskflowTeamMembersTable).set({
    status: "active",
    userId: req.user.id,
    coreSkillCategory: role === "specialist" ? coreSkillCategory : null,
    updatedAt: new Date(),
  }).where(eq(taskflowTeamMembersTable.id, member.id)).returning();
  res.json(UpdateAccountRoleResponse.parse({
    role,
    accessStatus: "active",
    coreSkillCategory: accepted.coreSkillCategory ?? null,
    onboardingCompleted: role === "admin" || Boolean(accepted.coreSkillCategory),
    isSuperAdmin: await hasSuperAdminAccess(req.user.id, email),
  }));
});

export default router;