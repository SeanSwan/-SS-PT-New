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

import { normalizeOnboardingQueueStatus } from '../utils/onboardingHelpers.mjs';

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

export const buildAdminOnboardingClient = (entry) => {
  const {
    user,
    latestQuestionnaire,
    latestBaseline,
    movementStatus,
    packageName,
  } = entry;

  return {
    userId: user.id,
    client: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
    package: {
      name: packageName || 'No Package',
    },
    questionnaire: latestQuestionnaire
      ? {
          status: latestQuestionnaire.status,
          completionPercentage: latestQuestionnaire.completionPercentage || 0,
          primaryGoal: latestQuestionnaire.primaryGoal,
          createdAt: latestQuestionnaire.createdAt,
        }
      : null,
    movementScreen: latestBaseline
      ? {
          nasmAssessmentScore: latestBaseline.nasmAssessmentScore,
          status: movementStatus,
          createdAt: latestBaseline.createdAt,
        }
      : {
          nasmAssessmentScore: null,
          status: 'pending',
        },
  };
};
