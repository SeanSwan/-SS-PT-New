/**
 * Onboarding State Reader
 * =======================
 *
 * Shared read helper for Swan Coach onboarding command dispatchers. Returns the
 * latest questionnaire and baseline rows only; callers decide how to summarize.
 */

import { getAllModels } from '../../../models/index.mjs';

const latestQuestionnaireQuery = (clientId) => ({
  where: { userId: clientId },
  order: [['createdAt', 'DESC']],
});

const latestBaselineQuery = (clientId) => ({
  where: { userId: clientId },
  order: [['takenAt', 'DESC']],
});

export const readLatestOnboardingState = async ({ clientId, models = getAllModels() }) => {
  const { ClientOnboardingQuestionnaire, ClientBaselineMeasurements } = models;

  const [questionnaire, baseline] = await Promise.all([
    ClientOnboardingQuestionnaire.findOne(latestQuestionnaireQuery(clientId)),
    ClientBaselineMeasurements.findOne(latestBaselineQuery(clientId)),
  ]);

  return { questionnaire, baseline };
};
