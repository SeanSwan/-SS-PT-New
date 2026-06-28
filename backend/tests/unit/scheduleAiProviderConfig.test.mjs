import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildScheduleAiProviderOrder,
  getScheduleAiProviderHealth,
  resolveScheduleAiProviderConfig,
} from '../../services/schedule-ai/scheduleAiProviderConfig.mjs';

const ENV_KEYS = [
  'SCHEDULE_AI_PROVIDER_MODE',
  'SCHEDULE_AI_DISABLE_ALL',
  'SCHEDULE_AI_DISABLE_CLOUD',
  'SCHEDULE_AI_DISABLE_LOCAL_GPU',
  'SCHEDULE_AI_DISABLE_WRITE_PROPOSALS',
  'SCHEDULE_AI_DISABLE_BILLING_PROPOSALS',
  'SCHEDULE_AI_TIMEOUT_MS',
  'SCHEDULE_AI_GLOBAL_TIMEOUT_MS',
];

describe('schedule AI provider config', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it('defaults to deterministic fallback only with write and billing proposals disabled', () => {
    const config = resolveScheduleAiProviderConfig();

    expect(config.mode).toBe('fallback_only');
    expect(config.providerOrder).toEqual(['fallback']);
    expect(config.killSwitches.allAiDisabled).toBe(false);
    expect(config.killSwitches.writeProposalsDisabled).toBe(true);
    expect(config.killSwitches.billingProposalsDisabled).toBe(true);
  });

  it('honors hybrid local-first mode while kill-switching cloud providers', () => {
    process.env.SCHEDULE_AI_PROVIDER_MODE = 'hybrid_local_first';
    process.env.SCHEDULE_AI_DISABLE_CLOUD = 'true';

    const config = resolveScheduleAiProviderConfig();

    expect(config.mode).toBe('hybrid_local_first');
    expect(config.providerOrder).toEqual(['local_gpu', 'fallback']);
    expect(config.killSwitches.cloudDisabled).toBe(true);
  });

  it('always keeps fallback as the final reliability floor', () => {
    expect(buildScheduleAiProviderOrder({
      mode: 'hybrid_cloud_first',
      killSwitches: { cloudDisabled: false, localGpuDisabled: false, allAiDisabled: false },
    })).toEqual(['gemini_cloud', 'local_gpu', 'fallback']);

    expect(buildScheduleAiProviderOrder({
      mode: 'gemini_cloud',
      killSwitches: { cloudDisabled: false, localGpuDisabled: false, allAiDisabled: false },
    })).toEqual(['gemini_cloud', 'fallback']);
  });

  it('reports provider health without calling provider generation', () => {
    const config = {
      mode: 'hybrid_cloud_first',
      providerOrder: ['gemini_cloud', 'local_gpu', 'fallback'],
      killSwitches: { cloudDisabled: false, localGpuDisabled: false, allAiDisabled: false },
      timeouts: { providerMs: 1000, globalMs: 3000 },
    };
    const health = getScheduleAiProviderHealth(config, {
      gemini_cloud: { isConfigured: () => true },
      local_gpu: { isConfigured: () => false },
      fallback: { isConfigured: () => true },
    });

    expect(health.mode).toBe('hybrid_cloud_first');
    expect(health.providers).toEqual([
      { name: 'gemini_cloud', configured: true, available: true },
      { name: 'local_gpu', configured: false, available: false },
      { name: 'fallback', configured: true, available: true },
    ]);
  });
});
