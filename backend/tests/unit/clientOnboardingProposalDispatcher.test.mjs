import { beforeEach, describe, expect, it, vi } from 'vitest';

const createCoachActionProposalDraft = vi.fn(async ({ type, payload }) => ({
  id: 'proposal-1',
  type,
  payload,
  status: 'PENDING',
  title: 'Review client onboarding draft',
}));

vi.mock('../../services/ai/coachActionProposalService.mjs', async () => {
  const actual = await vi.importActual('../../services/ai/coachActionProposalService.mjs');
  return {
    ...actual,
    createCoachActionProposalDraft,
  };
});

const dispatcher = await import('../../services/ai/dispatchers/clientOnboardingProposalDispatcher.mjs');

describe('clientOnboardingProposalDispatcher', () => {
  beforeEach(() => {
    createCoachActionProposalDraft.mockClear();
  });

  it('keeps broad onboarding and coverage payload fields in the review draft', async () => {
    await dispatcher.dispatchCreateExternalClientProposal({
      firstName: 'Omar',
      lastName: 'Stone',
      clientSource: 'move_fitness',
      healthConcerns: 'No current pain.',
      communicationStyle: 'short cues',
      nutritionPrefs: { style: 'high protein' },
      preferredTrainingDays: ['Monday', 'Thursday'],
      questionnaireResponses: { primaryGoal: 'Strength' },
      coverageUpdates: [{ fieldKey: 'blood_pressure', status: 'ask_client_later' }],
    }, {
      user: { id: 7, role: 'trainer' },
      options: { conversationId: 'thread-1' },
    });

    expect(createCoachActionProposalDraft).toHaveBeenCalledTimes(1);
    const payload = createCoachActionProposalDraft.mock.calls[0][0].payload.data;
    expect(payload.healthConcerns).toBe('No current pain.');
    expect(payload.communicationStyle).toBe('short cues');
    expect(payload.nutritionPrefs).toEqual({ style: 'high protein' });
    expect(payload.preferredTrainingDays).toEqual(['Monday', 'Thursday']);
    expect(payload.questionnaireResponses.primaryGoal).toBe('Strength');
    expect(payload.coverageUpdates[0].status).toBe('ask_client_later');
  });
});
