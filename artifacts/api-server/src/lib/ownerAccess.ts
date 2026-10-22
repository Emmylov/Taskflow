import { and, eq } from "drizzle-orm";
import { db, taskflowOrdersTable, taskflowPlatformHandoverTable, taskflowSpecialistAssessmentsTable, taskflowTasksTable, taskflowTeamMembersTable } from "@workspace/db";

const defaultOwnerEmail = "emmanuellaiyayi5@gmail.com";

export function getOwnerEmails(): string[] {
  return Array.from(new Set(
    (process.env.TASKFLOW_OWNER_EMAILS ?? defaultOwnerEmail)
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ));
}

export async function getPlatformOwnerEmails(): Promise<string[]> {
  const [settings] = await db.select({ masterAdminEmail: taskflowPlatformHandoverTable.masterAdminEmail })
    .from(taskflowPlatformHandoverTable)
    .where(eq(taskflowPlatformHandoverTable.id, "default"))
    .limit(1);
  if (settings?.masterAdminEmail) return [settings.masterAdminEmail.trim().toLowerCase()];
  return getOwnerEmails();
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  return Boolean(email && getOwnerEmails().includes(email.toLowerCase()));
}

export async function getMasterAdminEmail(): Promise<string> {
  const [settings] = await db.select({ masterAdminEmail: taskflowPlatformHandoverTable.masterAdminEmail })
    .from(taskflowPlatformHandoverTable)
    .where(eq(taskflowPlatformHandoverTable.id, "default"))
    .limit(1);
  return settings?.masterAdminEmail?.toLowerCase() ?? getOwnerEmails()[0] ?? "";
}

export async function hasSuperAdminAccess(userId: string | undefined, email: string | null | undefined): Promise<boolean> {
  if (!userId || !email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const [settings] = await db.select({ masterAdminEmail: taskflowPlatformHandoverTable.masterAdminEmail })
    .from(taskflowPlatformHandoverTable)
    .where(eq(taskflowPlatformHandoverTable.id, "default"))
    .limit(1);
  if (settings?.masterAdminEmail) {
    return normalizedEmail === settings.masterAdminEmail.trim().toLowerCase();
  }
  return isOwnerEmail(normalizedEmail);
}

export async function hasPlatformAdminAccess(userId: string | undefined, email: string | null | undefined): Promise<boolean> {
  if (await hasSuperAdminAccess(userId, email)) return true;
  if (!userId) return false;
  const [member] = await db.select({ role: taskflowTeamMembersTable.role, status: taskflowTeamMembersTable.status })
    .from(taskflowTeamMembersTable)
    .where(eq(taskflowTeamMembersTable.userId, userId))
    .limit(1);
  return member?.role === "admin" && member.status === "active";
}

export async function hasPassedSkillsAssessment(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const [member] = await db.select({ category: taskflowTeamMembersTable.coreSkillCategory, status: taskflowTeamMembersTable.status })
    .from(taskflowTeamMembersTable)
    .where(eq(taskflowTeamMembersTable.userId, userId))
    .limit(1);
  if (!member || member.status !== "active" || !member.category) return false;
  const [assessment] = await db.select({ category: taskflowSpecialistAssessmentsTable.category, passedAt: taskflowSpecialistAssessmentsTable.passedAt })
    .from(taskflowSpecialistAssessmentsTable)
    .where(eq(taskflowSpecialistAssessmentsTable.userId, userId))
    .limit(1);
  return assessment?.category === member.category && Boolean(assessment.passedAt);
}

export async function isActiveCreativeSpecialist(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const [member] = await db.select({ role: taskflowTeamMembersTable.role, status: taskflowTeamMembersTable.status })
    .from(taskflowTeamMembersTable)
    .where(eq(taskflowTeamMembersTable.userId, userId))
    .limit(1);
  return member?.role === "specialist" && member.status === "active";
}

export async function hasAssignedTaskOnOrder(userId: string | undefined, orderId: string): Promise<boolean> {
  if (!userId || !(await isActiveCreativeSpecialist(userId)) || !(await hasPassedSkillsAssessment(userId))) return false;
  const [task] = await db.select({ id: taskflowTasksTable.id })
    .from(taskflowTasksTable)
    .where(and(
      eq(taskflowTasksTable.orderId, orderId),
      eq(taskflowTasksTable.assigneeUserId, userId),
    ))
    .limit(1);
  return Boolean(task);
}

export async function hasAssignedTaskForBrandOwner(userId: string | undefined, brandOwnerId: string): Promise<boolean> {
  if (!userId || !(await isActiveCreativeSpecialist(userId)) || !(await hasPassedSkillsAssessment(userId))) return false;
  const [task] = await db.select({ id: taskflowTasksTable.id })
    .from(taskflowTasksTable)
    .innerJoin(taskflowOrdersTable, eq(taskflowTasksTable.orderId, taskflowOrdersTable.id))
    .where(and(
      eq(taskflowTasksTable.assigneeUserId, userId),
      eq(taskflowOrdersTable.customerUserId, brandOwnerId),
    ))
    .limit(1);
  return Boolean(task);
}