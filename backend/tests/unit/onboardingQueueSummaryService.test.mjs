/**
 * Onboarding queue summary service contracts.
 * ===========================================
 * Locks queue progress to questionnaire response truth instead of a stale or
 * non-existent persisted completionPercentage field.
 */
import { describe, expect, it } from 'vitest';
import {
  buildAdminOnboardingClient,
  buildOnboardingQueueEntry,
} from '../../services/onboardingQueueSummaryService.mjs';

describe('onboardingQueueSummaryService', () => {
  it('derives questionnaire completion from responsesJson for queue summaries', () => {
    const entry = buildOnboardingQueueEntry({
      id: 42,
      firstName: 'Ava',
      lastName: 'Strong',
      email: 'ava@example.test',
      onboardingQuestionnaires: [{
        status: 'in_progress',
        completionPercentage: 0,
        primaryGoal: 'strength',
        responsesJson: {
          fullName: 'Ava Strong',
          email: 'ava@example.test',
          primaryGoal: 'strength',
          commitmentLevel: 7,
        },
        createdAt: '2026-06-01T12:00:00.000Z',
      }],
      baselineMeasurements: [],
    });

    const summary = buildAdminOnboardingClient(entry);

    expect(summary.questionnaire).toMatchObject({
      status: 'in_progress',
      completionPercentage: 5,
      primaryGoal: 'strength',
    });
  });
});
