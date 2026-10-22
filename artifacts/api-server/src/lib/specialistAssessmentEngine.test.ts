import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessmentLockoutMs,
  assessmentPassPercent,
  assessmentQuestionBanks,
  assessmentQuestionCount,
  createAssessmentChallenge,
  getAssessmentOutcome,
  getAssessmentQuestions,
  gradeAssessment,
  isSkillCategory,
  isValidAssessmentChallenge,
  type AssessmentAnswer,
  type SkillCategory,
} from './specialistAssessmentEngine.ts';

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function answersForScore(category: SkillCategory, challenge: ReturnType<typeof createAssessmentChallenge>, correctCount: number): AssessmentAnswer[] {
  const bank = new Map(assessmentQuestionBanks[category].map((question) => [question.id, question]));
  return challenge.questionIds.map((questionId, index) => {
    const question = bank.get(questionId)!;
    const correctDisplayedOption = challenge.optionOrders[index].indexOf(question.answer);
    return {
      questionId,
      selectedOption: index < correctCount ? correctDisplayedOption : (correctDisplayedOption + 1) % 3,
    };
  });
}

test('each specialist category has a broad bank and receives a stable 10-question challenge', () => {
  for (const category of Object.keys(assessmentQuestionBanks) as SkillCategory[]) {
    assert.ok(assessmentQuestionBanks[category].length >= 12);
    const first = createAssessmentChallenge(category, seededRandom(143));
    const sameAttempt = createAssessmentChallenge(category, seededRandom(143));
    assert.deepEqual(first, sameAttempt);
    assert.equal(first.questionIds.length, assessmentQuestionCount);
    assert.equal(new Set(first.questionIds).size, assessmentQuestionCount);
    assert.equal(isValidAssessmentChallenge(category, first), true);
  }
});

test('question and option order changes between attempts without exposing answer keys', () => {
  for (const category of Object.keys(assessmentQuestionBanks) as SkillCategory[]) {
    const first = createAssessmentChallenge(category, seededRandom(11));
    const second = createAssessmentChallenge(category, seededRandom(29));
    assert.notDeepEqual(first, second);
    const questions = getAssessmentQuestions(category, first);
    assert.equal(questions.length, assessmentQuestionCount);
    assert.ok(questions.every((question) => question.options.length === 3 && !('answer' in question)));
    assert.ok(first.optionOrders.every((order) => new Set(order).size === 3 && order.every((index) => index >= 0 && index <= 2)));
  }
});

test('the pass threshold is 80 percent and scoring uses server-side option mappings', () => {
  const challenge = createAssessmentChallenge('video', seededRandom(83));
  const passing = gradeAssessment('video', challenge, answersForScore('video', challenge, 8));
  const failing = gradeAssessment('video', challenge, answersForScore('video', challenge, 7));
  assert.equal(assessmentPassPercent, 80);
  assert.deepEqual({ correct: passing.correct, score: passing.scorePercent, passed: passing.passed }, { correct: 8, score: 80, passed: true });
  assert.deepEqual({ correct: failing.correct, score: failing.scorePercent, passed: failing.passed }, { correct: 7, score: 70, passed: false });
});

test('submissions reject incomplete, duplicate, unknown, or out-of-range answers', () => {
  const challenge = createAssessmentChallenge('design', seededRandom(197));
  const correct = answersForScore('design', challenge, assessmentQuestionCount);
  assert.throws(() => gradeAssessment('design', challenge, correct.slice(1)), /one answer/);
  assert.throws(() => gradeAssessment('design', challenge, correct.map((answer, index) => index === 0 ? correct[1] : answer)), /once/);
  assert.throws(() => gradeAssessment('design', challenge, correct.map((answer, index) => index === 0 ? { ...answer, questionId: 'copy-unknown' } : answer)), /active assessment/);
  assert.throws(() => gradeAssessment('design', challenge, correct.map((answer, index) => index === 0 ? { ...answer, selectedOption: 3 } : answer)), /invalid/);
});

test('failed attempts lock for exactly 24 hours while passing attempts do not lock', () => {
  const submittedAt = new Date('2026-06-01T12:00:00.000Z');
  const failure = getAssessmentOutcome(79, submittedAt);
  const pass = getAssessmentOutcome(80, submittedAt);
  assert.equal(assessmentLockoutMs, 24 * 60 * 60 * 1000);
  assert.equal(failure.passed, false);
  assert.equal(failure.lockedUntil?.getTime(), submittedAt.getTime() + assessmentLockoutMs);
  assert.equal(pass.passed, true);
  assert.equal(pass.lockedUntil, null);
  assert.equal(pass.passedAt, submittedAt);
});

test('only supported specialist categories are accepted', () => {
  assert.equal(isSkillCategory('video'), true);
  assert.equal(isSkillCategory('social'), true);
  assert.equal(isSkillCategory('copy'), true);
  assert.equal(isSkillCategory('design'), true);
  assert.equal(isSkillCategory('admin'), false);
  assert.equal(isSkillCategory(null), false);
});
