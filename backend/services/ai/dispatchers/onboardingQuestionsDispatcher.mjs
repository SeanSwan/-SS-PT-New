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

import { getAllModels } from '../../../models/index.mjs';
import {
  calculateCompletionPercentage,
  computeDerivedFields,
} from '../../../utils/onboardingHelpers.mjs';

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const nextMissingKey = (flags) => {
  if (!flags.hasFullName) return 'fullName';
  if (!flags.hasEmail) return 'email';
  if (!flags.hasPrimaryGoal) return 'primaryGoal';
  if (!flags.hasTrainingTier) return 'trainingTier';
  if (!flags.hasCommitmentLevel) return 'commitmentLevel';
  if (!flags.baselineRecorded) return 'movementScreen';
  return 'complete';
};

/**
 * Dispatcher for onboarding_questions.
 *
 * @param {{ clientId: number }} params
 * @param {{ resolvedClient?: { id?: number|string } }} ctx
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchOnboardingQuestions(params = {}, ctx = {}) {
  const { ClientOnboardingQuestionnaire, ClientBaselineMeasurements } = getAllModels();
  const clientId = Number(ctx.resolvedClient?.id ?? params.clientId);
  const [questionnaire, baseline] = await Promise.all([
    ClientOnboardingQuestionnaire.findOne({
      where: { userId: clientId },
      order: [['createdAt', 'DESC']],
    }),
    ClientBaselineMeasurements.findOne({
      where: { userId: clientId },
      order: [['takenAt', 'DESC']],
    }),
  ]);

  const responses = questionnaire?.responsesJson || {};
  const derived = computeDerivedFields(responses);
  const flags = {
    hasFullName: hasText(responses.fullName),
    hasEmail: hasText(responses.email),
    hasPrimaryGoal: hasText(derived.primaryGoal || questionnaire?.primaryGoal),
    hasTrainingTier: hasText(derived.trainingTier || questionnaire?.trainingTier),
    hasCommitmentLevel: derived.commitmentLevel !== null
      && derived.commitmentLevel !== undefined,
    baselineRecorded: Boolean(baseline),
  };
  const nextQuestionKey = nextMissingKey(flags);

  return {
    clientId,
    questionnaireId: questionnaire?.id ?? null,
    status: questionnaire?.status ?? 'not_started',
    interactive: true,
    completionPercentage: calculateCompletionPercentage(responses),
    ...flags,
    nextQuestionKey,
    interviewComplete: nextQuestionKey === 'complete',
  };
}
