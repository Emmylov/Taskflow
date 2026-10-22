import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, taskflowSpecialistAssessmentsTable, taskflowTeamMembersTable } from "@workspace/db";
import { hasPassedSkillsAssessment, isActiveCreativeSpecialist } from "../lib/ownerAccess";
import {
  createAssessmentChallenge,
  getAssessmentOutcome,
  getAssessmentQuestions,
  gradeAssessment,
  isSkillCategory,
  isValidAssessmentChallenge,
  type SkillCategory,
} from "../lib/specialistAssessmentEngine";

const router: IRouter = Router();

function requireUser(req: Express.Request, res: Response): req is Express.Request & Express.AuthedRequest {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to continue." });
    return false;
  }
  return true;
}

async function getSpecialistCategory(userId: string): Promise<SkillCategory | null> {
  if (!await isActiveCreativeSpecialist(userId)) return null;
  const [member] = await db.select({ category: taskflowTeamMembersTable.coreSkillCategory })
    .from(taskflowTeamMembersTable)
    .where(eq(taskflowTeamMembersTable.userId, userId))
    .limit(1);
  return isSkillCategory(member?.category) ? member.category : null;
}

async function buildAssessment(userId: string, category: SkillCategory) {
  const [record] = await db.select().from(taskflowSpecialistAssessmentsTable)
    .where(eq(taskflowSpecialistAssessmentsTable.userId, userId)).limit(1);
  let current = record?.category === category ? record : undefined;
  if (current?.passedAt) {
    return {
      category,
      status: "passed",
      questions: [],
      scorePercent: current.scorePercent ?? null,
      attempts: current.attempts,
      passedAt: current.passedAt.toISOString(),
      lockoutUntil: null,
    };
  }
  if (current?.lockedUntil && current.lockedUntil.getTime() > Date.now()) {
    return {
      category,
      status: "locked",
      questions: [],
      scorePercent: current.scorePercent ?? null,
      attempts: current.attempts,
      passedAt: null,
      lockoutUntil: current.lockedUntil.toISOString(),
    };
  }
  let challenge = current?.lockedUntil ? null : current?.challenge;
  if (!isValidAssessmentChallenge(category, challenge)) {
    challenge = createAssessmentChallenge(category);
    const now = new Date();
    const [saved] = await db.insert(taskflowSpecialistAssessmentsTable).values({
      userId,
      category,
      challenge,
      attempts: current?.attempts ?? 0,
      scorePercent: current?.scorePercent ?? null,
      passedAt: null,
      lockedUntil: null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: taskflowSpecialistAssessmentsTable.userId,
      set: {
        category,
        challenge,
        attempts: current?.attempts ?? 0,
        scorePercent: current?.scorePercent ?? null,
        passedAt: null,
        lockedUntil: null,
        updatedAt: now,
      },
    }).returning();
    current = saved;
  }
  return {
    category,
    status: current?.attempts ? "ready" : "not_started",
    questions: getAssessmentQuestions(category, challenge),
    scorePercent: current?.scorePercent ?? null,
    attempts: current?.attempts ?? 0,
    passedAt: current?.passedAt?.toISOString() ?? null,
    lockoutUntil: null,
  };
}

router.get("/specialist/assessment", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const category = await getSpecialistCategory(req.user.id);
  if (!category) {
    res.status(403).json({ error: "An active specialist invitation is required." });
    return;
  }
  res.json(await buildAssessment(req.user.id, category));
});

router.post("/specialist/assessment/submit", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const category = await getSpecialistCategory(req.user.id);
  if (!category) {
    res.status(403).json({ error: "An active specialist invitation is required." });
    return;
  }
  const answers = req.body?.answers;
  if (!Array.isArray(answers)) {
    res.status(400).json({ error: "Submit one answer for every assessment question." });
    return;
  }
  await buildAssessment(req.user.id, category);
  const [record] = await db.select().from(taskflowSpecialistAssessmentsTable)
    .where(eq(taskflowSpecialistAssessmentsTable.userId, req.user.id)).limit(1);
  const current = record?.category === category ? record : undefined;
  if (current?.passedAt) {
    res.json(await buildAssessment(req.user.id, category));
    return;
  }
  if (current?.lockedUntil && current.lockedUntil.getTime() > Date.now()) {
    res.status(423).json({ error: "Assessment is locked until the lockout expires.", lockoutUntil: current.lockedUntil.toISOString() });
    return;
  }
  if (!isValidAssessmentChallenge(category, current?.challenge)) {
    res.status(409).json({ error: "The assessment changed. Reload the page and try again." });
    return;
  }
  let scorePercent: number;
  try {
    scorePercent = gradeAssessment(category, current.challenge, answers).scorePercent;
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Assessment answers are invalid." });
    return;
  }
  const outcome = getAssessmentOutcome(scorePercent, new Date());
  const attempts = (current?.attempts ?? 0) + 1;
  const now = new Date();
  await db.update(taskflowSpecialistAssessmentsTable).set({
    category,
    challenge: null,
    attempts,
    scorePercent,
    passedAt: outcome.passedAt,
    lockedUntil: outcome.lockedUntil,
    updatedAt: now,
  }).where(eq(taskflowSpecialistAssessmentsTable.userId, req.user.id));
  res.json(await buildAssessment(req.user.id, category));
});

export default router;
