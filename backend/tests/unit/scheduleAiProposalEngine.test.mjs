import { describe, expect, it, vi } from 'vitest';
import { getScheduleAiToolSchema } from '../../services/schedule-ai/scheduleAiToolSchemas.mjs';
import { generateScheduleAiProposal } from '../../services/schedule-ai/scheduleAiProposalEngine.mjs';

const ADMIN = { id: 10, role: 'admin' };
const TRAINER = { id: 20, role: 'trainer' };
const CLIENT = { id: 30, role: 'client' };

function providerTurnWithTool(type) {
  return vi.fn(async () => ({
    ok: true,
    result: {
      provider: 'fallback',
      model: 'deterministic',
      content: 'Draft prepared for review.',
      toolCalls: [getScheduleAiToolSchema(type)],
    },
    failoverTrace: ['fallback:success'],
  }));
}

describe('schedule AI proposal engine', () => {
  it('turns booking intent into a non-mutating confirmation-gated proposal', async () => {
    const routeTurn = providerTurnWithTool('draft_booking');
    const auditWriter = vi.fn(async () => true);

    const outcome = await generateScheduleAiProposal({
      actor: ADMIN,
      message: 'Book Client #12 with Trainer #8 tomorrow at 10am',
      context: {
        surface: 'universal_master_schedule',
        clientId: 12,
        trainerId: 8,
        expectedScheduleVersion: 'v1',
        currentScheduleVersion: 'v1',
      },
      routeTurn,
      auditWriter,
      now: new Date('2026-06-28T12:00:00Z'),
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.type).toBe('proposal_generated');
    expect(outcome.proposal).toMatchObject({
      action: 'draft_booking',
      status: 'pending_review',
      executionPolicy: 'proposal_only',
      targetClientId: 12,
      targetTrainerId: 8,
      confirmation: {
        required: true,
        state: 'pending',
        canExecute: false,
        mode: 'manual_review',
      },
      risk: {
        category: 'schedule_write',
        level: 'medium',
        mutatesData: false,
      },
    });
    expect(outcome.proposal.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(routeTurn).toHaveBeenCalledTimes(1);
    expect(auditWriter).toHaveBeenCalledWith(expect.objectContaining({
      userId: 10,
      userRole: 'admin',
      outcome: 'confirmation_required',
      commandType: 'schedule_ai:draft_booking',
      targetClientId: 12,
      requiresConfirmation: true,
      confirmationState: 'pending',
      operationId: outcome.proposal.id,
      params: expect.objectContaining({
        action: 'draft_booking',
        riskCategory: 'schedule_write',
        messageLength: 48,
      }),
    }));
    expect(JSON.stringify(auditWriter.mock.calls[0][0].params)).not.toContain('Book Client');
  });

  it('blocks stale context before calling a provider', async () => {
    const routeTurn = vi.fn();
    const auditWriter = vi.fn(async () => true);

    const outcome = await generateScheduleAiProposal({
      actor: TRAINER,
      message: 'Move session 44 to Friday',
      context: {
        surface: 'universal_master_schedule',
        clientId: 12,
        expectedScheduleVersion: 'calendar-v1',
        currentScheduleVersion: 'calendar-v2',
      },
      routeTurn,
      auditWriter,
    });

    expect(outcome).toMatchObject({
      ok: false,
      type: 'stale_context',
      code: 'SCHEDULE_AI_STALE_CONTEXT',
    });
    expect(routeTurn).not.toHaveBeenCalled();
    expect(auditWriter).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'failed',
      commandType: 'schedule_ai:stale_context',
      errorCode: 'SCHEDULE_AI_STALE_CONTEXT',
      confirmationState: 'none',
    }));
  });

  it('denies client schedule-write proposals after provider classification', async () => {
    const routeTurn = providerTurnWithTool('draft_cancel');
    const auditWriter = vi.fn(async () => true);

    const outcome = await generateScheduleAiProposal({
      actor: CLIENT,
      message: 'Cancel my appointment tomorrow',
      context: { surface: 'client_schedule', clientId: 30 },
      routeTurn,
      auditWriter,
    });

    expect(outcome).toMatchObject({
      ok: false,
      type: 'denied',
      code: 'SCHEDULE_AI_PROPOSAL_DENIED',
    });
    expect(outcome.proposal).toBeNull();
    expect(auditWriter).toHaveBeenCalledWith(expect.objectContaining({
      userId: 30,
      userRole: 'client',
      outcome: 'denied',
      commandType: 'schedule_ai:draft_cancel',
      targetClientId: 30,
      requiresConfirmation: false,
    }));
  });

  it('keeps payment review manual-only and non-executable', async () => {
    const routeTurn = providerTurnWithTool('open_payment_review');
    const auditWriter = vi.fn(async () => true);

    const outcome = await generateScheduleAiProposal({
      actor: ADMIN,
      message: 'Review payment recovery for session 99',
      context: { surface: 'universal_master_schedule', clientId: 18, sessionId: 99 },
      routeTurn,
      auditWriter,
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.proposal).toMatchObject({
      action: 'open_payment_review',
      executionPolicy: 'manual_only',
      manualOnly: true,
      targetClientId: 18,
      targetSessionId: 99,
      confirmation: {
        required: true,
        canExecute: false,
        mode: 'manual_review',
        reason: 'MANUAL_PAYMENT_REVIEW_REQUIRED',
      },
      risk: {
        category: 'billing_review',
        level: 'high',
        mutatesData: false,
      },
    });
  });

  it('returns a degraded response and audit when no provider can classify the request', async () => {
    const auditWriter = vi.fn(async () => true);
    const routeTurn = vi.fn(async () => ({
      ok: false,
      degraded: true,
      errors: [{ provider: 'local_gpu', code: 'PROVIDER_TIMEOUT' }],
      failoverTrace: ['local_gpu:PROVIDER_TIMEOUT'],
    }));

    const outcome = await generateScheduleAiProposal({
      actor: ADMIN,
      message: 'What needs review today?',
      context: { surface: 'universal_master_schedule' },
      routeTurn,
      auditWriter,
    });

    expect(outcome).toMatchObject({
      ok: false,
      type: 'degraded',
      code: 'SCHEDULE_AI_PROVIDER_DEGRADED',
    });
    expect(auditWriter).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'failed',
      commandType: 'schedule_ai:provider_degraded',
      errorCode: 'SCHEDULE_AI_PROVIDER_DEGRADED',
    }));
  });
});
