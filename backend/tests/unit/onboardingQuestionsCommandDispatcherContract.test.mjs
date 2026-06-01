/**
 * Onboarding questions command dispatcher contracts
 * =================================================
 * Locks the interactive onboarding question command to PII-safe next-step hints.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({ questionnaire = null, baseline = null } = {}) {
  vi.resetModules();

  const questionnaireFindOne = vi.fn(async () => questionnaire);
  const baselineFindOne = vi.fn(async () => baseline);
  const ClientOnboardingQuestionnaire = { findOne: questionnaireFindOne };
  const ClientBaselineMeasurements = { findOne: baselineFindOne };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({
      ClientOnboardingQuestionnaire,
      ClientBaselineMeasurements,
    }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return { ...dispatcher, questionnaireFindOne, baselineFindOne };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('onboarding questions command dispatcher', () => {
  it('returns the next missing onboarding step without echoing private answers', async () => {
    const { dispatch, hasDispatcher, questionnaireFindOne, baselineFindOne } = await loadDispatcher({
      questionnaire: {
        id: 901,
        userId: 42,
        status: 'in_progress',
        responsesJson: {
          fullName: 'Ava Strong',
          email: 'ava@example.test',
          primaryGoal: 'strength',
          commitmentLevel: 7,
        },
        createdAt: new Date('2026-05-31T12:00:00.000Z'),
      },
      baseline: null,
    });

    expect(hasDispatcher('onboarding_questions')).toBe(true);

    const result = await dispatch('onboarding_questions', { clientId: 42 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42, firstName: 'Ava', email: 'ava@example.test' },
    });

    expect(questionnaireFindOne).toHaveBeenCalledWith({
      where: { userId: 42 },
      order: [['createdAt', 'DESC']],
    });
    expect(baselineFindOne).toHaveBeenCalledWith({
      where: { userId: 42 },
      order: [['takenAt', 'DESC']],
    });
    expect(result).toEqual({
      clientId: 42,
      questionnaireId: 901,
      status: 'in_progress',
      interactive: true,
      completionPercentage: 5,
      hasFullName: true,
      hasEmail: true,
      hasPrimaryGoal: true,
      hasTrainingTier: false,
      hasCommitmentLevel: true,
      baselineRecorded: false,
      nextQuestionKey: 'trainingTier',
      interviewComplete: false,
    });
    expect(JSON.stringify(result)).not.toContain('Ava Strong');
    expect(JSON.stringify(result)).not.toContain('ava@example.test');
    expect(JSON.stringify(result)).not.toContain('strength');
  });
});
