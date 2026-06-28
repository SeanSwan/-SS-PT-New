import { describe, expect, it, vi } from 'vitest';
import { getScheduleAiToolSchema } from '../../services/schedule-ai/scheduleAiToolSchemas.mjs';
import { generateScheduleAiProposal } from '../../services/schedule-ai/scheduleAiProposalEngine.mjs';

const TRAINER = { id: 20, role: 'trainer' };

function providerTurnWithTool(type) {
  return vi.fn(async () => ({
    ok: true,
    result: {
      provider: 'fallback',
      model: 'deterministic',
      content: 'Recovery advisory prepared.',
      toolCalls: [getScheduleAiToolSchema(type)],
    },
    failoverTrace: ['fallback:success'],
  }));
}

describe('schedule AI proposal engine recovery advisory', () => {
  it('attaches read-only recovery advisory output without opening an execution path', async () => {
    const routeTurn = providerTurnWithTool('recovery_safety_advisory');
    const recoveryAdvisor = vi.fn(() => ({
      ok: true,
      type: 'recovery_safety_advisory',
      executionPolicy: 'read_only',
      mutatesData: false,
      hardBlockAllowed: true,
      advisoryMode: 'trainer_review_required',
      dataCompleteness: { level: 'high', enoughForHardBlock: true },
      risk: { level: 'high', score: 82 },
      scheduleGuidance: { decision: 'trainer_review', affectedRegions: ['lower_back'] },
      evidence: { activePainRegions: [{ bodyRegion: 'lower_back', painLevel: 8 }] },
      recommendations: ['Review recovery before adding load.'],
    }));
    const auditWriter = vi.fn(async () => true);
    const context = {
      surface: 'universal_master_schedule',
      clientId: 12,
      plannedSession: { id: 88, plannedFocusRegions: ['lower_back'] },
      recentSessions: [{ id: 1, status: 'completed', intensity: 9, duration: 60 }],
      painEntries: [{ id: 301, isActive: true, bodyRegion: 'lower_back', painLevel: 8 }],
    };

    const outcome = await generateScheduleAiProposal({
      actor: TRAINER,
      message: 'Check recovery risk before scheduling this client',
      context,
      routeTurn,
      recoveryAdvisor,
      auditWriter,
      now: new Date('2026-06-28T12:00:00Z'),
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.proposal).toMatchObject({
      action: 'recovery_safety_advisory',
      status: 'read_only',
      executionPolicy: 'read_only',
      manualOnly: false,
      targetClientId: 12,
      targetSessionId: 88,
      confirmation: {
        required: false,
        canExecute: false,
        mode: 'read_only',
      },
      recoveryAdvisory: {
        advisoryMode: 'trainer_review_required',
        hardBlockAllowed: true,
        risk: { level: 'high', score: 82 },
        scheduleGuidance: { decision: 'trainer_review' },
      },
    });
    expect(recoveryAdvisor).toHaveBeenCalledWith(expect.objectContaining({
      actor: TRAINER,
      plannedSession: context.plannedSession,
      recentSessions: context.recentSessions,
      painEntries: context.painEntries,
    }));
    expect(auditWriter).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'success',
      commandType: 'schedule_ai:recovery_safety_advisory',
      requiresConfirmation: false,
      confirmationState: 'none',
      params: expect.objectContaining({
        action: 'recovery_safety_advisory',
        recoveryRiskLevel: 'high',
        recoveryDataCompleteness: 'high',
      }),
    }));
  });
});