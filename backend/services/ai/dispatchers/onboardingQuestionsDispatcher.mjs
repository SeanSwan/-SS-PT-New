/**
 * ============================================================================
 * FILE: dispatchers/onboardingQuestionsDispatcher.mjs
 * PURPOSE: PII-safe interactive onboarding guidance for Swan Coach commands
 * OWNER: Codex | CREATED: 2026-06-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Reads the latest onboarding questionnaire and baseline state, then returns
 *   the next missing interview step without echoing the client's answers.
 */

import {
  calculateCompletionPercentage,
  computeDerivedFields,
} from '../../../utils/onboardingHelpers.mjs';
import { resolveCommandClientId } from './clientScope.mjs';
import { readLatestOnboardingState } from './onboardingStateReader.mjs';

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const hasValue = (value) => value !== null && value !== undefined;

const hasAnyText = (values) => values.some(hasText);

const NEXT_STEP_RULES = Object.freeze([
  ['hasFullName', 'fullName'],
  ['hasEmail', 'email'],
  ['hasPrimaryGoal', 'primaryGoal'],
  ['hasTrainingTier', 'trainingTier'],
  ['hasCommitmentLevel', 'commitmentLevel'],
  ['baselineRecorded', 'movementScreen'],
]);

const nextMissingKey = (flags) => {
  const missingStep = NEXT_STEP_RULES.find(([flag]) => !flags[flag]);
  return missingStep?.[1] ?? 'complete';
};

const buildQuestionFlags = ({ responses, derived, questionnaire, baseline }) => ({
  hasFullName: hasText(responses.fullName),
  hasEmail: hasText(responses.email),
  hasPrimaryGoal: hasAnyText([derived.primaryGoal, questionnaire?.primaryGoal]),
  hasTrainingTier: hasAnyText([derived.trainingTier, questionnaire?.trainingTier]),
  hasCommitmentLevel: hasValue(derived.commitmentLevel),
  baselineRecorded: Boolean(baseline),
});

const readResponses = (questionnaire) => questionnaire?.responsesJson || {};

const buildQuestionResult = ({
  clientId,
  questionnaire,
  responses,
  flags,
  nextQuestionKey,
}) => ({
  clientId,
  questionnaireId: questionnaire?.id ?? null,
  status: questionnaire?.status ?? 'not_started',
  interactive: true,
  completionPercentage: calculateCompletionPercentage(responses),
  ...flags,
  nextQuestionKey,
  interviewComplete: nextQuestionKey === 'complete',
});

/**
 * Dispatcher for onboarding_questions.
 *
 * @param {{ clientId: number }} params
 * @param {{ resolvedClient?: { id?: number|string } }} ctx
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchOnboardingQuestions(params = {}, ctx = {}) {
  const clientId = resolveCommandClientId(params, ctx);
  const { questionnaire, baseline } = await readLatestOnboardingState({ clientId });

  const responses = readResponses(questionnaire);
  const derived = computeDerivedFields(responses);
  const flags = buildQuestionFlags({ responses, derived, questionnaire, baseline });
  const nextQuestionKey = nextMissingKey(flags);

  return buildQuestionResult({
    clientId,
    questionnaire,
    responses,
    flags,
    nextQuestionKey,
  });
}
