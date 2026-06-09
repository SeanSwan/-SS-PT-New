/**
 * onboardingQueueSummaryService.mjs
 * =================================
 * Shared read helpers for admin and Swan Coach onboarding queue views.
 *
 * Purpose:
 * - Keep the User -> questionnaire/baseline include contract in one place.
 * - Normalize queue and movement status consistently across admin UI and Coach commands.
 * - Return safe summary rows; no writes and no LLM prompt construction happens here.
 */

import {
  calculateCompletionPercentage,
  normalizeJsonObject,
  normalizeOnboardingQueueStatus,
} from '../utils/onboardingHelpers.mjs';

export const buildOnboardingQueueIncludes = ({
  ClientOnboardingQuestionnaire,
  ClientBaselineMeasurements,
}) => [
  {
    model: ClientOnboardingQuestionnaire,
    as: 'onboardingQuestionnaires',
    required: false,
    order: [['createdAt', 'DESC']],
    limit: 1,
  },
  {
    model: ClientBaselineMeasurements,
    as: 'baselineMeasurements',
    required: false,
    order: [['createdAt', 'DESC']],
    limit: 1,
  },
];

const firstRelatedRecord = (records) => (
  Array.isArray(records) ? records[0] || null : null
);

const hasValue = (value) => value !== null && value !== undefined;

const getMovementStatus = (latestBaseline) => (
  hasValue(latestBaseline?.nasmAssessmentScore) ? 'completed' : 'pending'
);

const filterMatches = (filterValue, entryValue) => (
  !filterValue || filterValue === 'all' || entryValue === filterValue
);

export const buildOnboardingQueueEntry = (user) => {
  const latestQuestionnaire = firstRelatedRecord(user.onboardingQuestionnaires);
  const latestBaseline = firstRelatedRecord(user.baselineMeasurements);
  const queueStatus = normalizeOnboardingQueueStatus(latestQuestionnaire?.status);

  return {
    user,
    latestQuestionnaire,
    latestBaseline,
    userId: user.id,
    queueStatus,
    movementStatus: getMovementStatus(latestBaseline),
    packageName: null,
  };
};

export const onboardingQueueEntryMatches = (entry, { statusFilter, packageFilter } = {}) => (
  filterMatches(statusFilter, entry.queueStatus)
    && filterMatches(packageFilter, entry.packageName)
);

const buildClientIdentity = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
});

const buildPackageSummary = (packageName) => ({
  name: packageName || 'No Package',
});

const buildQuestionnaireSummary = (questionnaire) => {
  if (!questionnaire) return null;

  const responses = normalizeJsonObject(questionnaire.responsesJson) ?? {};

  return {
    status: questionnaire.status,
    completionPercentage: calculateCompletionPercentage(responses),
    primaryGoal: questionnaire.primaryGoal,
    createdAt: questionnaire.createdAt,
  };
};

const buildMovementScreenSummary = (baseline, movementStatus) => (
  baseline
    ? {
        nasmAssessmentScore: baseline.nasmAssessmentScore,
        status: movementStatus,
        createdAt: baseline.createdAt,
      }
    : {
        nasmAssessmentScore: null,
        status: 'pending',
      }
);

export const buildAdminOnboardingClient = (entry) => ({
  userId: entry.user.id,
  client: buildClientIdentity(entry.user),
  package: buildPackageSummary(entry.packageName),
  questionnaire: buildQuestionnaireSummary(entry.latestQuestionnaire),
  movementScreen: buildMovementScreenSummary(entry.latestBaseline, entry.movementStatus),
});
