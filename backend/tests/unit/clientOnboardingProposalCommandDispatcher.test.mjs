/**
 * clientOnboardingProposalCommandDispatcher.test.mjs
 * =================================================
 * Locks legacy create-client commands to the Coach proposal review lane.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatchers() {
  vi.resetModules();
  const createCoachActionProposalDraft = vi.fn(async ({ type }) => ({
    id: 'proposal-123',
    type,
    status: 'PENDING',
    title: 'Review client onboarding draft',
  }));
  vi.doMock('../../services/ai/coachActionProposalService.mjs', () => ({
    COACH_PROPOSAL_TYPE: {
      CLIENT_ONBOARDING: 'client_onboarding',
    },
    createCoachActionProposalDraft,
  }));

  const mod = await import('../../services/ai/dispatchers/clientOnboardingProposalDispatcher.mjs');
  return { ...mod, createCoachActionProposalDraft };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('client onboarding proposal command dispatchers', () => {
  it('prepares a SwanStudios client onboarding proposal without echoing PII', async () => {
    const { dispatchCreateClientProposal, createCoachActionProposalDraft } = await loadDispatchers();

    const result = await dispatchCreateClientProposal({
      firstName: 'Ava',
      lastName: 'Stone',
      email: 'ava@example.test',
      phone: '555-0100',
      clientSource: 'swanstudios',
    }, {
      user: { id: 7, role: 'admin' },
      options: { conversationId: 'conv-1' },
    });

    expect(createCoachActionProposalDraft).toHaveBeenCalledWith(expect.objectContaining({
      type: 'client_onboarding',
      user: { id: 7, role: 'admin' },
      conversation: { id: 'conv-1', targetUserId: null },
      payload: {
        data: {
          firstName: 'Ava',
          lastName: 'Stone',
          email: 'ava@example.test',
          phone: '555-0100',
          clientSource: 'swanstudios',
        },
      },
    }));
    expect(result).toMatchObject({
      proposalId: 'proposal-123',
      proposalType: 'client_onboarding',
      proposalStatus: 'PENDING',
      status: 'PENDING',
      hasPreparedDraft: true,
      reviewRequired: true,
      proposalTitle: 'Review client onboarding draft',
      reviewRoute: '/dashboard/admin/coach-assistant?proposal=proposal-123',
      source: 'coach_action_proposals',
    });
    expect(JSON.stringify(result)).not.toContain('ava@example.test');
    expect(JSON.stringify(result)).not.toContain('Ava');
  });

  it('defaults external client onboarding proposals to Move Fitness free tracking', async () => {
    const { dispatchCreateExternalClientProposal, createCoachActionProposalDraft } = await loadDispatchers();

    const result = await dispatchCreateExternalClientProposal({
      firstName: 'Mia',
      lastName: 'Reed',
    }, {
      user: { id: 8, role: 'trainer' },
      options: {},
    });

    expect(createCoachActionProposalDraft).toHaveBeenCalledWith(expect.objectContaining({
      payload: {
        data: {
          firstName: 'Mia',
          lastName: 'Reed',
          clientSource: 'move_fitness',
        },
      },
    }));
    expect(result.reviewRoute).toBe('/dashboard/trainer/coach-assistant?proposal=proposal-123');
  });

  it('rejects proposal preparation outside trainer/admin roles', async () => {
    const { dispatchCreateClientProposal } = await loadDispatchers();

    await expect(dispatchCreateClientProposal({
      firstName: 'Ava',
      lastName: 'Stone',
      email: 'ava@example.test',
    }, {
      user: { id: 9, role: 'client' },
    })).rejects.toThrow('Only trainers and admins');
  });
});
