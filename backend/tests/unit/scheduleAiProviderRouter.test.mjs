import { describe, expect, it, vi } from 'vitest';
import { createScheduleAiFallbackAdapter } from '../../services/schedule-ai/adapters/scheduleAiFallbackAdapter.mjs';
import { routeScheduleAiTurn } from '../../services/schedule-ai/scheduleAiProviderRouter.mjs';

const actor = { id: 7, role: 'admin' };

describe('schedule AI provider router', () => {
  it('uses deterministic fallback as the default conversational reliability floor', async () => {
    const outcome = await routeScheduleAiTurn({
      actor,
      message: 'What needs my attention today?',
      context: { surface: 'universal_master_schedule' },
      config: { mode: 'fallback_only' },
      adapters: { fallback: createScheduleAiFallbackAdapter() },
      auditWriter: vi.fn(async () => true),
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.result.provider).toBe('fallback');
    expect(outcome.result.toolCalls[0]).toMatchObject({
      type: 'show_attention_queue',
      mutatesData: false,
      executionPolicy: 'read_only',
    });
    expect(outcome.failoverTrace).toEqual(['fallback:success']);
  });

  it('enforces the schedule-write proposal kill switch after provider classification', async () => {
    const outcome = await routeScheduleAiTurn({
      actor,
      message: 'Book Client #12 tomorrow at 3 PM.',
      context: { surface: 'universal_master_schedule' },
      config: {
        mode: 'fallback_only',
        killSwitches: { writeProposalsDisabled: true, billingProposalsDisabled: true },
      },
      adapters: { fallback: createScheduleAiFallbackAdapter() },
      auditWriter: vi.fn(async () => true),
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.result.toolCalls[0]).toMatchObject({
      type: 'manual_schedule_review',
      mutatesData: false,
      executionPolicy: 'manual_only',
      riskLevel: 'schedule_write',
    });
  });
  it('falls back when local and cloud providers fail or are unavailable', async () => {
    const local = {
      name: 'local_gpu',
      isConfigured: () => true,
      generateTurn: vi.fn(async () => {
        const err = new Error('local down');
        err.code = 'PROVIDER_NETWORK';
        throw err;
      }),
    };
    const gemini = {
      name: 'gemini_cloud',
      isConfigured: () => false,
      generateTurn: vi.fn(),
    };

    const outcome = await routeScheduleAiTurn({
      actor,
      message: 'Find three openings for Client #12 next week.',
      context: { surface: 'universal_master_schedule' },
      config: { mode: 'hybrid_local_first' },
      adapters: { local_gpu: local, gemini_cloud: gemini, fallback: createScheduleAiFallbackAdapter() },
      auditWriter: vi.fn(async () => true),
    });

    expect(local.generateTurn).toHaveBeenCalledTimes(1);
    expect(gemini.generateTurn).not.toHaveBeenCalled();
    expect(outcome.ok).toBe(true);
    expect(outcome.result.provider).toBe('fallback');
    expect(outcome.failoverTrace).toEqual([
      'local_gpu:PROVIDER_NETWORK',
      'gemini_cloud:not_configured',
      'fallback:success',
    ]);
  });

  it('audits hashes and sanitized payload metadata without raw PII', async () => {
    const auditWriter = vi.fn(async () => true);
    const gemini = {
      name: 'gemini_cloud',
      isConfigured: () => true,
      generateTurn: vi.fn(async (payload) => ({
        provider: 'gemini_cloud',
        model: 'gemini-test',
        content: `I can draft options for ${payload.message}.`,
        toolCalls: [],
        latencyMs: 12,
        finishReason: 'stop',
        tokenUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, estimatedCostUsd: null },
      })),
    };

    await routeScheduleAiTurn({
      actor,
      message: 'Book Sarah Connor tomorrow.',
      context: {
        sessions: [{ client: { id: 12, firstName: 'Sarah', lastName: 'Connor', email: 'sarah@example.com' } }],
      },
      config: { mode: 'gemini_cloud' },
      adapters: { gemini_cloud: gemini, fallback: createScheduleAiFallbackAdapter() },
      auditWriter,
    });

    const providerPayload = gemini.generateTurn.mock.calls[0][0];
    const auditEntry = auditWriter.mock.calls.at(-1)[0];
    expect(providerPayload.message).toContain('Client #12');
    expect(JSON.stringify(providerPayload)).not.toMatch(/Sarah|Connor|sarah@example/);
    expect(auditEntry.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(auditEntry.outputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(auditEntry)).not.toMatch(/Sarah|Connor|sarah@example/);
  });
});
