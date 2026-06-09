/**
 * Onboarding Status Dispatcher
 * ============================
 *
 * PII-safe Swan Coach read command for a client's onboarding and movement
 * screen readiness. Returns IDs and status summaries only.
 */

import { calculateCompletionPercentage } from '../../../utils/onboardingHelpers.mjs';
import { toDateOnly } from '../../clientTrainingSafeReadValueService.mjs';
import { resolveCommandClientId } from './clientScope.mjs';
import { readLatestOnboardingState } from './onboardingStateReader.mjs';

const getMovementScreenStatus = (baseline) => {
  if (!baseline) return 'pending';
  return baseline.nasmAssessmentScore !== null && baseline.nasmAssessmentScore !== undefined
    ? 'completed'
    : 'recorded';
};

const buildMissingQuestionnaireStatus = ({ clientId, baseline }) => ({
  clientId,
  questionnaireId: null,
  status: 'not_started',
  completionPercentage: 0,
  primaryGoal: null,
  trainingTier: null,
  healthRisk: null,
  movementScreenStatus: baseline ? 'recorded' : 'pending',
  baselineRecorded: Boolean(baseline),
  lastUpdatedAt: null,
});

const nullableField = (record, field) => record[field] ?? null;

const latestQuestionnaireDate = (questionnaire) => (
  toDateOnly(questionnaire.updatedAt ?? questionnaire.createdAt)
);

const buildQuestionnaireStatus = ({ clientId, questionnaire, baseline }) => ({
  clientId,
  questionnaireId: nullableField(questionnaire, 'id'),
  status: nullableField(questionnaire, 'status'),
  completionPercentage: calculateCompletionPercentage(questionnaire.responsesJson),
  primaryGoal: nullableField(questionnaire, 'primaryGoal'),
  trainingTier: nullableField(questionnaire, 'trainingTier'),
  healthRisk: nullableField(questionnaire, 'healthRisk'),
  movementScreenStatus: getMovementScreenStatus(baseline),
  baselineRecorded: Boolean(baseline),
  lastUpdatedAt: latestQuestionnaireDate(questionnaire),
});

export const dispatchViewOnboardingStatus = async (params = {}, ctx = {}) => {
  const clientId = resolveCommandClientId(params, ctx);
  const { questionnaire, baseline } = await readLatestOnboardingState({ clientId });

  if (!questionnaire) {
    return buildMissingQuestionnaireStatus({ clientId, baseline });
  }

  return buildQuestionnaireStatus({ clientId, questionnaire, baseline });
};
