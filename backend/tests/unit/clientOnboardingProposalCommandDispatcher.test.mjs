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
    title: type === 'clarification' ? 'Answer Coach clarification' : 'Review client onboarding draft',
  }));
  vi.doMock('../../services/ai/coachActionProposalService.mjs', () => ({
    COACH_PROPOSAL_TYPE: {
      CLIENT_ONBOARDING: 'client_onboarding',
      CLARIFICATION: 'clarification',
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
      trainingGoal: 'Build strength without knee pain',
      preferredContactMethod: 'Text after 5pm',
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
          clientSource: 'swanstudios',
          trainingGoal: 'Build strength without knee pain',
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
    const draftJson = JSON.stringify(createCoachActionProposalDraft.mock.calls[0][0].payload);
    expect(draftJson).not.toContain('ava@example.test');
    expect(draftJson).not.toContain('555-0100');
    expect(draftJson).not.toContain('preferredContactMethod');
    expect(draftJson).toContain('Build strength without knee pain');
    expect(JSON.stringify(result)).not.toContain('ava@example.test');
    expect(JSON.stringify(result)).not.toContain('Ava');
  });

  it('strips nested contact fields from structured onboarding data before proposal review', async () => {
    const { dispatchCreateClientProposal, createCoachActionProposalDraft } = await loadDispatchers();

    await dispatchCreateClientProposal({
      firstName: 'Ava',
      lastName: 'Stone',
      clientSource: 'swanstudios',
      nutritionPrefs: {
        proteinTarget: 'high',
        deliveryAddress: '123 Hidden Street',
      },
      preferredTrainingDays: [
        { day: 'Monday', phone: '555-9999', window: 'morning' },
      ],
      questionnaireResponses: {
        readiness: {
          goal: 'strength',
          email: 'nested@example.test',
        },
        emergencyContact: {
          name: 'Private Contact',
          phone: '555-1212',
        },
      },
      coverageUpdates: [
        {
          fieldKey: 'contact_communication_preferences',
          status: 'ask_client_later',
          value: { email: 'coverage@example.test', bestWindow: 'after work' },
        },
        {
          fieldKey: 'goals_outcomes',
          status: 'known',
          value: { primaryGoal: 'strength' },
        },
      ],
    }, {
      user: { id: 7, role: 'admin' },
      options: { conversationId: 'conv-nested' },
    });

    const payload = createCoachActionProposalDraft.mock.calls[0][0].payload;
    const payloadJson = JSON.stringify(payload);
    expect(payloadJson).not.toContain('nested@example.test');
    expect(payloadJson).not.toContain('coverage@example.test');
    expect(payloadJson).not.toContain('555-9999');
    expect(payloadJson).not.toContain('555-1212');
    expect(payloadJson).not.toContain('123 Hidden Street');
    expect(payloadJson).toContain('strength');
    expect(payloadJson).toContain('after work');
    expect(payload.data.questionnaireResponses).toMatchObject({
      readiness: { goal: 'strength' },
    });
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

  it('turns missing client source into a clarification instead of a paid draft', async () => {
    const { dispatchCreateClientProposal, createCoachActionProposalDraft } = await loadDispatchers();

    const result = await dispatchCreateClientProposal({
      firstName: 'Mia',
      lastName: 'Reed',
    }, {
      user: { id: 8, role: 'trainer' },
      options: { conversationId: 'conv-source' },
    });

    expect(createCoachActionProposalDraft).toHaveBeenCalledWith(expect.objectContaining({
      type: 'clarification',
      payload: {
        question: expect.stringContaining('client source'),
        options: ['move_fitness', 'swanstudios', 'external'],
      },
    }));
    expect(JSON.stringify(createCoachActionProposalDraft.mock.calls[0][0])).not.toContain('clientSource');
    expect(result).toMatchObject({
      proposalId: 'proposal-123',
      proposalType: 'clarification',
      hasPreparedDraft: false,
      reviewRequired: false,
      proposalTitle: 'Answer Coach clarification',
      source: 'coach_action_proposals',
    });
  });

  it('turns invalid client source into a clarification instead of silently reclassifying it', async () => {
    const { dispatchCreateClientProposal, createCoachActionProposalDraft } = await loadDispatchers();

    await dispatchCreateClientProposal({
      firstName: 'Mia',
      lastName: 'Reed',
      clientSource: 'direct',
    }, {
      user: { id: 8, role: 'trainer' },
      options: {},
    });

    expect(createCoachActionProposalDraft).toHaveBeenCalledWith(expect.objectContaining({
      type: 'clarification',
      payload: {
        question: expect.stringContaining('client source'),
        options: ['move_fitness', 'swanstudios', 'external'],
      },
    }));
    expect(JSON.stringify(createCoachActionProposalDraft.mock.calls[0][0])).not.toContain('"clientSource":"swanstudios"');
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
