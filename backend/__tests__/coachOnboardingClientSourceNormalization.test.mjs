import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateCoachActionProposalDraft = vi.fn();

vi.mock('../services/ai/coachActionProposalService.mjs', () => ({
  COACH_PROPOSAL_TYPE: {
    CLIENT_ONBOARDING: 'client_onboarding',
    CLARIFICATION: 'clarification',
  },
  createCoachActionProposalDraft: mockCreateCoachActionProposalDraft,
}));

vi.mock('../database.mjs', () => ({
  default: { transaction: vi.fn() },
}));

vi.mock('../models/index.mjs', () => ({
  getClientProgress: vi.fn(),
  getClientTrainerAssignment: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../services/claimTokenService.mjs', () => ({
  generateClaimToken: vi.fn(),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const {
  dispatchCreateClientProposal,
  dispatchCreateExternalClientProposal,
} = await import('../services/ai/dispatchers/clientOnboardingProposalDispatcher.mjs');
const {
  getApprovedOnboardingAvailableSessions,
  normalizeCoachOnboardingDraft,
} = await import('../services/coachClientOnboardingApprovalService.mjs');
const { classifyActionBlock } = await import('../services/ai/coachActionProposalClassifier.mjs');

const PROPOSAL_TYPES = {
  CLIENT_ONBOARDING: 'client_onboarding',
  CLARIFICATION: 'clarification',
  WORKOUT_LOG: 'workout_log',
  CLIENT_DATA_UPDATE: 'client_data_update',
  FRONTEND_DISPATCH: 'frontend_dispatch',
  SPLIT_PLAN: 'split_plan',
};

const ctx = {
  user: { id: 7, role: 'admin' },
  options: { conversationId: 'conversation-1', sequelize: null },
};

beforeEach(() => {
  mockCreateCoachActionProposalDraft.mockReset();
  mockCreateCoachActionProposalDraft.mockResolvedValue({
    id: 'proposal-1',
    type: 'client_onboarding',
    status: 'PENDING',
    title: 'Review client onboarding draft',
  });
});

describe('Swan Coach onboarding client source normalization', () => {
  it('prepares a client onboarding draft for dictated Move Fitness source text', async () => {
    const result = await dispatchCreateClientProposal({
      firstName: 'Jackie',
      lastName: 'Reed',
      clientSource: ' Move Fitness ',
    }, ctx);

    expect(result.hasPreparedDraft).toBe(true);
    expect(mockCreateCoachActionProposalDraft).toHaveBeenCalledWith(expect.objectContaining({
      type: 'client_onboarding',
      payload: {
        data: expect.objectContaining({
          firstName: 'Jackie',
          lastName: 'Reed',
          clientSource: 'move_fitness',
        }),
      },
    }));
  });

  it('preserves external source text instead of falling back to Move Fitness', async () => {
    await dispatchCreateExternalClientProposal({
      firstName: 'Ari',
      lastName: 'Lane',
      clientSource: ' External ',
    }, ctx);

    expect(mockCreateCoachActionProposalDraft).toHaveBeenCalledWith(expect.objectContaining({
      payload: {
        data: expect.objectContaining({ clientSource: 'external' }),
      },
    }));
  });

  it('classifies human-formatted clientSource action blocks as onboarding drafts', () => {
    const classified = classifyActionBlock({
      action: 'coach_action_proposal',
      proposal_type: 'client_onboarding',
      payload: {
        firstName: 'Jackie',
        lastName: 'Reed',
        clientSource: 'Move Fitness',
      },
    }, { id: 'conversation-1' }, { proposalTypes: PROPOSAL_TYPES, schemaVersion: '2026-06-08' });

    expect(classified.type).toBe('client_onboarding');
    expect(classified.payload.data.clientSource).toBe('move_fitness');
  });

  it('normalizes approved onboarding drafts before applying session policy', () => {
    const draft = normalizeCoachOnboardingDraft({
      payload: {
        data: {
          firstName: 'Jackie',
          lastName: 'Reed',
          clientSource: ' Move Fitness ',
          availableSessions: 12,
        },
      },
    });

    expect(draft.clientSource).toBe('move_fitness');
    expect(getApprovedOnboardingAvailableSessions(draft)).toBe(0);
  });
});
