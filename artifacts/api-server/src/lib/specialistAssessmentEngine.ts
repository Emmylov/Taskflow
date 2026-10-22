export const assessmentPassPercent = 80;
export const assessmentQuestionCount = 10;
export const assessmentLockoutMs = 24 * 60 * 60 * 1000;

export type SkillCategory = 'video' | 'social' | 'copy' | 'design';
export type AssessmentQuestionDefinition = {
  id: string;
  prompt: string;
  options: readonly [string, string, string];
  answer: 0 | 1 | 2;
};
export type AssessmentChallenge = {
  questionIds: string[];
  optionOrders: number[][];
};
export type AssessmentAnswer = { questionId: string; selectedOption: number };

export const assessmentQuestionBanks: Record<SkillCategory, readonly AssessmentQuestionDefinition[]> = {
  video: [
    { id: 'video-01', prompt: 'What should the first seconds of a short ad do?', options: ['Earn attention with a relevant hook', 'Show every product feature', 'Start with a long logo animation'], answer: 0 },
    { id: 'video-02', prompt: 'A social video is viewed without sound. What helps most?', options: ['A longer music intro', 'Captions that preserve the message', 'More transition effects'], answer: 1 },
    { id: 'video-03', prompt: 'A client asks for three ad variations. What is the strongest test?', options: ['Change everything in every version', 'Export the same cut three times', 'Change one meaningful variable at a time'], answer: 2 },
    { id: 'video-04', prompt: 'Before delivery, what is a useful final check?', options: ['Only check the thumbnail', 'Check framing, audio, captions, and export dimensions', 'Rely on the editing timeline preview'], answer: 1 },
    { id: 'video-05', prompt: 'A brief has no call to action. What should you do?', options: ['Choose a discount without asking', 'Remove the ending', 'Ask the client to confirm the intended next step'], answer: 2 },
    { id: 'video-06', prompt: 'A brief requests vertical and widescreen edits. What is best?', options: ['Reframe each version and inspect safe areas', 'Crop the vertical edit from the center automatically', 'Stretch one export to both ratios'], answer: 0 },
    { id: 'video-07', prompt: 'The supplied music track has unclear usage rights. What should you do?', options: ['Use it because the client supplied it', 'Confirm permission or choose an approved track', 'Remove attribution from the export'], answer: 1 },
    { id: 'video-08', prompt: 'A client says the edit feels slow but gives no timecodes. What is a good next step?', options: ['Add transitions to every cut', 'Ask which section or audience response feels slow', 'Shorten every shot by the same amount'], answer: 1 },
    { id: 'video-09', prompt: 'Which test gives the clearest comparison between two hooks?', options: ['Change the hook while keeping other elements consistent', 'Change the hook, offer, length, and music together', 'Publish the same version twice'], answer: 0 },
    { id: 'video-10', prompt: 'The exported video has clipped dialogue. What should happen before delivery?', options: ['Lower all audio until it is barely audible', 'Add a disclaimer in the delivery note', 'Recheck the mix on headphones and speakers, then export again'], answer: 2 },
    { id: 'video-11', prompt: 'A client asks for a revision that conflicts with the approved brief. What should you do?', options: ['Make the change silently', 'Clarify the new direction and confirm its scope', 'Ignore the request'], answer: 1 },
    { id: 'video-12', prompt: 'What makes an editing project handoff useful?', options: ['Organized source files, labeled exports, and a short version note', 'Only a flattened final export', 'A folder of unnamed temporary renders'], answer: 0 },
  ],
  social: [
    { id: 'social-01', prompt: 'What makes a social post useful to its audience?', options: ['A clear point matched to the audience and platform', 'As many hashtags as possible', 'A generic trend copied verbatim'], answer: 0 },
    { id: 'social-02', prompt: 'How should a post’s call to action be chosen?', options: ['Use the same urgent CTA every time', 'Omit it from every post', 'Match it to the post goal and audience readiness'], answer: 2 },
    { id: 'social-03', prompt: 'A campaign includes multiple platforms. What should stay consistent?', options: ['Identical formatting on every platform', 'Core message, adapted to each platform', 'Only the color palette'], answer: 1 },
    { id: 'social-04', prompt: 'A client shares a performance metric with no source. What is best?', options: ['Publish it as a verified fact', 'Add a larger number to make it persuasive', 'Confirm the source and context before making it a claim'], answer: 2 },
    { id: 'social-05', prompt: 'What is a helpful content calendar entry?', options: ['A date with no other context', 'Topic, format, audience, timing, and intended action', 'A list of unrelated trending topics'], answer: 1 },
    { id: 'social-06', prompt: 'A trend does not fit the client’s audience or voice. What should you do?', options: ['Adapt it only if it supports the brand’s goal', 'Copy it exactly to avoid missing out', 'Post it from the client account without approval'], answer: 0 },
    { id: 'social-07', prompt: 'A post includes an image with important information. What improves access?', options: ['Put all details only in the image', 'Add clear alt text and include essential details in the caption', 'Use smaller type to fit more text'], answer: 1 },
    { id: 'social-08', prompt: 'A customer leaves a complaint in the comments. What is the safest response?', options: ['Argue publicly until they agree', 'Hide all negative feedback', 'Respond calmly and move private account details to a secure channel'], answer: 2 },
    { id: 'social-09', prompt: 'You are comparing two post concepts. What should you measure?', options: ['The metric tied to the agreed campaign goal', 'Only total likes regardless of the goal', 'Whichever result looks best after posting'], answer: 0 },
    { id: 'social-10', prompt: 'What should be checked before scheduling a post?', options: ['Only whether the image is colorful', 'Copy, tags, links, timing, and final approval', 'Whether it uses every trending hashtag'], answer: 1 },
    { id: 'social-11', prompt: 'A product claim is not in the approved source material. What should you do?', options: ['Phrase it as a guarantee', 'Ask the client to substantiate or approve the claim', 'Publish it and correct it only if challenged'], answer: 1 },
    { id: 'social-12', prompt: 'A platform’s character limit is exceeded. What is the best edit?', options: ['Remove context until the post fits', 'Use unexplained abbreviations', 'Preserve the key meaning and action in a platform-appropriate edit'], answer: 2 },
  ],
  copy: [
    { id: 'copy-01', prompt: 'What is the first priority when writing from a client brief?', options: ['Clarify the audience, offer, and desired action', 'Use the longest possible headline', 'Add claims not in the brief'], answer: 0 },
    { id: 'copy-02', prompt: 'How should brand voice guidelines be used?', options: ['Repeat the same catchphrase in every paragraph', 'Apply them while keeping the message clear', 'Ignore them if a trend is popular'], answer: 1 },
    { id: 'copy-03', prompt: 'A statistic is missing a citation. What should happen?', options: ['Publish it because it sounds plausible', 'Attribute it to an unnamed expert', 'Request a source or remove the claim'], answer: 2 },
    { id: 'copy-04', prompt: 'What makes a landing page headline effective?', options: ['It uses several unrelated promises', 'It states a relevant benefit clearly', 'It hides the offer until the footer'], answer: 1 },
    { id: 'copy-05', prompt: 'A draft is over the requested length. What is the best edit?', options: ['Shrink the text until it is unreadable', 'Add more qualifiers', 'Keep the essential message and remove repetition'], answer: 2 },
    { id: 'copy-06', prompt: 'A brief asks for a “bold” tone but gives no examples. What should you do?', options: ['Ask for a reference or clarify what bold means to the brand', 'Use aggressive language by default', 'Ignore the tone request'], answer: 0 },
    { id: 'copy-07', prompt: 'Which approach is best for search-focused writing?', options: ['Repeat the target phrase in every sentence', 'Answer the reader’s question clearly and use terms naturally', 'Add unrelated keywords in hidden text'], answer: 1 },
    { id: 'copy-08', prompt: 'A draft makes a health or financial promise without evidence. What should you do?', options: ['Make the promise sound stronger', 'Keep it because it is persuasive', 'Remove or substantiate it and get the required approval'], answer: 2 },
    { id: 'copy-09', prompt: 'A headline performs poorly. What is the most useful next step?', options: ['Check the audience and goal, then test one clear alternative', 'Rewrite every page without reviewing results', 'Add more exclamation marks'], answer: 0 },
    { id: 'copy-10', prompt: 'What should be checked in a final proofread?', options: ['Only spelling in the headline', 'Names, links, facts, formatting, and the requested action', 'Whether every sentence has the same length'], answer: 1 },
    { id: 'copy-11', prompt: 'The client’s notes conflict about the offer. What should you do?', options: ['Choose whichever offer sounds larger', 'Leave both offers in the final copy', 'Ask which offer is current before writing a claim'], answer: 2 },
    { id: 'copy-12', prompt: 'How should copy change across email and a short social caption?', options: ['Keep the central message but fit each format and reading context', 'Use identical length and structure everywhere', 'Remove the call to action from both'], answer: 0 },
  ],
  design: [
    { id: 'design-01', prompt: 'What should guide a design’s visual hierarchy?', options: ['The audience’s most important decision or information', 'Making every element equally prominent', 'The designer’s favorite effect'], answer: 0 },
    { id: 'design-02', prompt: 'What should be checked before handing off a social graphic?', options: ['Only the desktop preview', 'Platform dimensions, contrast, readability, and export', 'Whether the source file opens on your computer'], answer: 1 },
    { id: 'design-03', prompt: 'A client’s brand colors have low text contrast. What should you do?', options: ['Use the colors unchanged for all text', 'Remove all brand color', 'Preserve the brand feel while proposing accessible contrast'], answer: 2 },
    { id: 'design-04', prompt: 'What is a useful way to respond to vague design feedback?', options: ['Guess and make unrelated changes', 'Ask what outcome or audience reaction should change', 'Ignore the feedback'], answer: 1 },
    { id: 'design-05', prompt: 'A design includes a licensed image with unclear usage rights. What is best?', options: ['Deliver it and let the client decide later', 'Remove the attribution', 'Confirm the license or replace it with approved imagery'], answer: 2 },
    { id: 'design-06', prompt: 'A layout must work on mobile and desktop. What should you do?', options: ['Check hierarchy and spacing at both sizes', 'Shrink the desktop artboard until it fits', 'Keep all elements at fixed desktop positions'], answer: 0 },
    { id: 'design-07', prompt: 'What is a good export handoff for a social campaign?', options: ['One screenshot of the design file', 'Clearly named files in the requested formats and dimensions', 'An uncompressed working folder with no labels'], answer: 1 },
    { id: 'design-08', prompt: 'A design feels crowded. What is the best first adjustment?', options: ['Add more decorative elements', 'Reduce the text size until everything fits', 'Prioritize content and create more spacing between groups'], answer: 2 },
    { id: 'design-09', prompt: 'A logo is placed over a complex photograph. What improves legibility?', options: ['Use an approved clear-space treatment or alternate background', 'Add a glow effect without checking contrast', 'Stretch the logo larger'], answer: 0 },
    { id: 'design-10', prompt: 'A client supplies brand tokens and a new design request. What should you do?', options: ['Replace the system with personal preferences', 'Use the supplied tokens consistently and flag conflicts', 'Ignore the system for each new asset'], answer: 1 },
    { id: 'design-11', prompt: 'A graphic uses color alone to distinguish status. What should be added?', options: ['More saturated colors', 'A gradient behind each status', 'Labels, icons, or another non-color cue'], answer: 2 },
    { id: 'design-12', prompt: 'The brief requests a print-ready file. What should be confirmed?', options: ['Required dimensions, bleed, color profile, and export format', 'Only whether it looks good on a phone', 'Whether the file has the smallest possible size'], answer: 0 },
  ],
};

export function isSkillCategory(value: string | null | undefined): value is SkillCategory {
  return value === 'video' || value === 'social' || value === 'copy' || value === 'design';
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createAssessmentChallenge(category: SkillCategory, random: () => number = Math.random): AssessmentChallenge {
  const questionIds = shuffle(assessmentQuestionBanks[category], random)
    .slice(0, assessmentQuestionCount)
    .map((question) => question.id);
  return {
    questionIds,
    optionOrders: questionIds.map(() => shuffle([0, 1, 2], random)),
  };
}

export function isValidAssessmentChallenge(
  category: SkillCategory,
  challenge: AssessmentChallenge | null | undefined,
): challenge is AssessmentChallenge {
  if (!challenge || !Array.isArray(challenge.questionIds) || !Array.isArray(challenge.optionOrders)) return false;
  if (challenge.questionIds.length !== assessmentQuestionCount || challenge.optionOrders.length !== assessmentQuestionCount) return false;
  if (new Set(challenge.questionIds).size !== assessmentQuestionCount) return false;
  const ids = new Set(assessmentQuestionBanks[category].map((question) => question.id));
  return challenge.questionIds.every((id, index) =>
    ids.has(id) &&
    Array.isArray(challenge.optionOrders[index]) &&
    challenge.optionOrders[index].length === 3 &&
    new Set(challenge.optionOrders[index]).size === 3 &&
    challenge.optionOrders[index].every((option) => Number.isInteger(option) && option >= 0 && option <= 2),
  );
}

export function getAssessmentQuestions(category: SkillCategory, challenge: AssessmentChallenge) {
  if (!isValidAssessmentChallenge(category, challenge)) throw new Error('Assessment challenge is invalid.');
  const bank = new Map(assessmentQuestionBanks[category].map((question) => [question.id, question]));
  return challenge.questionIds.map((id, index) => {
    const question = bank.get(id)!;
    return {
      id: question.id,
      prompt: question.prompt,
      options: challenge.optionOrders[index].map((optionIndex) => question.options[optionIndex]),
    };
  });
}

export function gradeAssessment(category: SkillCategory, challenge: AssessmentChallenge, answers: AssessmentAnswer[]) {
  if (!isValidAssessmentChallenge(category, challenge)) throw new Error('Assessment challenge is invalid.');
  if (!Array.isArray(answers) || answers.length !== assessmentQuestionCount) throw new Error('Submit one answer for every question.');
  const answerMap = new Map<string, number>();
  for (const answer of answers) {
    if (!answer || typeof answer.questionId !== 'string' || !Number.isInteger(answer.selectedOption) || answer.selectedOption < 0 || answer.selectedOption > 2) {
      throw new Error('An assessment answer is invalid.');
    }
    if (answerMap.has(answer.questionId)) throw new Error('Each question can only be answered once.');
    answerMap.set(answer.questionId, answer.selectedOption);
  }
  if (challenge.questionIds.some((id) => !answerMap.has(id)) || answerMap.size !== challenge.questionIds.length) {
    throw new Error('Answers do not match the active assessment.');
  }
  const bank = new Map(assessmentQuestionBanks[category].map((question) => [question.id, question]));
  const correct = challenge.questionIds.reduce((total, id, index) => {
    const question = bank.get(id)!;
    const displayedCorrectIndex = challenge.optionOrders[index].indexOf(question.answer);
    return total + (answerMap.get(id) === displayedCorrectIndex ? 1 : 0);
  }, 0);
  const scorePercent = Math.round((correct / assessmentQuestionCount) * 100);
  const passed = scorePercent >= assessmentPassPercent;
  return { correct, scorePercent, passed };
}

export function getAssessmentOutcome(scorePercent: number, submittedAt: Date) {
  const passed = scorePercent >= assessmentPassPercent;
  return {
    passed,
    passedAt: passed ? submittedAt : null,
    lockedUntil: passed ? null : new Date(submittedAt.getTime() + assessmentLockoutMs),
  };
}
