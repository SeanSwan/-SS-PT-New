/**
 * Onboarding State Reader
 * =======================
 *
 * Shared read helper for Swan Coach onboarding command dispatchers. Returns the
 * latest questionnaire and baseline rows only; callers decide how to summarize.
 */

import { getAllModels } from '../../../models/index.mjs';

export const readLatestOnboardingState = async ({ clientId, models = getAllModels() }) => {
  const { ClientOnboardingQuestionnaire, ClientBaselineMeasurements } = models;

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

  return { questionnaire, baseline };
};
