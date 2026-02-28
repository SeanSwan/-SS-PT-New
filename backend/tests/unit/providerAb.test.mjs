/**
 * Provider A/B Tests — Phase 7
 * ==============================
 * 27 tests covering: Mock Adapter Factory, A/B Dataset, A/B Runner,
 * computeAbExitCode, Live-mode, A/B Report.
 *
 * Run: cd backend && npx vitest run tests/unit/providerAb.test.mjs
 */
import { describe, it, expect } from 'vitest';
import { createMockAdapter } from '../../eval/ab/mockAdapterFactory.mjs';
import { AB_SCENARIOS, AB_DATASET_VERSION } from '../../eval/ab/abDataset.mjs';
import { runAbSuite, computeAbExitCode } from '../../eval/ab/abRunner.mjs';
import { formatAbJsonReport, formatAbMarkdownReport } from '../../eval/ab/abReport.mjs';

// ── Mock Adapter Factory ────────────────────────────────────────────────────

describe('Mock Adapter Factory', () => {
  it('15 — returns adapter-shaped object (name, isConfigured, generateWorkoutDraft)', () => {
    const adapter = createMockAdapter('openai', {
      model: 'gpt-4o',
      responses: { success: true, latencyMs: 100, inputTokens: 50, outputTokens: 150 },
    });
    expect(adapter.name).toBe('openai');
    expect(typeof adapter.isConfigured).toBe('function');
    expect(typeof adapter.generateWorkoutDraft).toBe('function');
    expect(adapter.isConfigured()).toBe(true);
  });

  it('16 — successful mock returns valid AiProviderResult shape', async () => {
    const adapter = createMockAdapter('openai', {
      model: 'gpt-4o',
      responses: { success: true, latencyMs: 250, inputTokens: 100, outputTokens: 300 },
    });
    const result = await adapter.generateWorkoutDraft({});
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o');
    expect(result.latencyMs).toBe(250);
    expect(result.finishReason).toBe('stop');
    expect(result.rawText).toBeTruthy();
    expect(result.tokenUsage).toBeDefined();
    expect(result.tokenUsage.inputTokens).toBe(100);
    expect(result.tokenUsage.outputTokens).toBe(300);
  });

  it('17 — failed mock throws AiProviderError with configured errorCode', async () => {
    const adapter = createMockAdapter('anthropic', {
      model: 'claude-sonnet-4-6',
      responses: { success: false, latencyMs: 0, inputTokens: 0, outputTokens: 0, errorCode: 'PROVIDER_TIMEOUT', errorMessage: 'timed out' },
    });
    await expect(adapter.generateWorkoutDraft({})).rejects.toMatchObject({
      provider: 'anthropic',
      code: 'PROVIDER_TIMEOUT',
    });
  });

  it('18 — array responses cycle across calls', async () => {
    const adapter = createMockAdapter('gemini', {
      model: 'gemini-2.0-flash',
      responses: [
        { success: true, latencyMs: 100, inputTokens: 50, outputTokens: 100 },
        { success: false, latencyMs: 0, inputTokens: 0, outputTokens: 0, errorCode: 'PROVIDER_TIMEOUT' },
      ],
    });
    const result1 = await adapter.generateWorkoutDraft({});
    expect(result1.latencyMs).toBe(100);

    await expect(adapter.generateWorkoutDraft({})).rejects.toMatchObject({
      code: 'PROVIDER_TIMEOUT',
    });

    // Cycles back to first response
    const result3 = await adapter.generateWorkoutDraft({});
    expect(result3.latencyMs).toBe(100);
  });
});

// ── A/B Dataset ─────────────────────────────────────────────────────────────

describe('A/B Dataset', () => {
  it('19 — has at least 8 scenarios', () => {
    expect(AB_SCENARIOS.length).toBeGreaterThanOrEqual(8);
  });

  it('20 — all scenarios have required fields', () => {
    for (const s of AB_SCENARIOS) {
      expect(s.id).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.prompt).toBeTruthy();
      expect(s.systemMessage).toBeTruthy();
      expect(s.mockResponses).toBeDefined();
    }
  });

  it('21 — all scenario IDs are unique', () => {
    const ids = AB_SCENARIOS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('22 — all mockResponses reference valid provider names', () => {
    const validProviders = new Set(['openai', 'anthropic', 'gemini', 'venice']);
    for (const s of AB_SCENARIOS) {
      for (const providerName of Object.keys(s.mockResponses)) {
        expect(validProviders.has(providerName)).toBe(true);
      }
    }
  });
});

// ── A/B Runner ──────────────────────────────────────────────────────────────

describe('A/B Runner', () => {
  it('23 — produces rankings for all 4 providers in mock mode', async () => {
    const result = await runAbSuite(AB_SCENARIOS);
    expect(result.rankings).toHaveLength(4);
    const providers = result.rankings.map(r => r.provider).sort();
    expect(providers).toEqual(['anthropic', 'gemini', 'openai', 'venice']);
    expect(result.mode).toBe('mock');
    expect(result.attempts.length).toBe(AB_SCENARIOS.length * 4); // 8 scenarios × 4 providers
  });

  it('24 — providers filter restricts output', async () => {
    const result = await runAbSuite(AB_SCENARIOS, { providers: ['openai', 'venice'] });
    expect(result.rankings).toHaveLength(2);
    const providers = result.rankings.map(r => r.provider).sort();
    expect(providers).toEqual(['openai', 'venice']);
    expect(result.config.providers).toEqual(['openai', 'venice']);
  });

  it('25 — throws on empty scenarios array', async () => {
    await expect(runAbSuite([])).rejects.toThrow(/non-empty/);
  });

  it('26 — throws on unknown provider in config', async () => {
    await expect(
      runAbSuite(AB_SCENARIOS, { providers: ['openai', 'fakeprovider'] })
    ).rejects.toThrow(/Unknown providers.*fakeprovider/);
  });

  it('26b — throws on iterations ≤ 0 or non-integer', async () => {
    await expect(
      runAbSuite(AB_SCENARIOS, { iterations: 0 })
    ).rejects.toThrow(/positive integer/);
    await expect(
      runAbSuite(AB_SCENARIOS, { iterations: -3 })
    ).rejects.toThrow(/positive integer/);
    await expect(
      runAbSuite(AB_SCENARIOS, { iterations: 1.5 })
    ).rejects.toThrow(/positive integer/);
  });

  it('27 — summary highlights exclude providers with zero success rate', async () => {
    // ab_multi_fail_01 has OpenAI + Gemini failing. With only that scenario,
    // OpenAI and Gemini should not be cheapest/fastest/most reliable
    const failScenario = AB_SCENARIOS.find(s => s.id === 'ab_multi_fail_01');
    const result = await runAbSuite([failScenario]);

    // OpenAI and Gemini fail → should not appear as cheapest/fastest/most reliable
    expect(result.summary.cheapestProvider).not.toBe('openai');
    expect(result.summary.cheapestProvider).not.toBe('gemini');
    expect(result.summary.fastestProvider).not.toBe('openai');
    expect(result.summary.fastestProvider).not.toBe('gemini');
  });

  it('29 — normalizes provider list (trim, lowercase, dedupe)', async () => {
    const result = await runAbSuite(AB_SCENARIOS, {
      providers: [' OpenAI ', 'VENICE', 'openai', '  venice  '],
    });
    expect(result.config.providers).toEqual(['openai', 'venice']);
    expect(result.rankings).toHaveLength(2);
  });

  it('29b — throws on empty provider list after normalization', async () => {
    await expect(
      runAbSuite(AB_SCENARIOS, { providers: ['', '   '] })
    ).rejects.toThrow(/at least one valid provider/);
  });
});

// ── computeAbExitCode ───────────────────────────────────────────────────────

describe('computeAbExitCode', () => {
  it('28 — returns 0 on normal run', async () => {
    const result = await runAbSuite(AB_SCENARIOS);
    expect(computeAbExitCode(result)).toBe(0);
  });

  it('28b — returns 1 on empty attempts', () => {
    expect(computeAbExitCode({ attempts: [], rankings: [{ provider: 'x' }] })).toBe(1);
  });

  it('28c — returns 1 on empty rankings', () => {
    expect(computeAbExitCode({ attempts: [{ provider: 'x' }], rankings: [] })).toBe(1);
  });
});

// ── Live-mode unconfigured ──────────────────────────────────────────────────

describe('Live-mode unconfigured', () => {
  // Helper: create adapterResolver where some providers are unconfigured
  function makePartialResolver(configuredProviders) {
    return (providerName) => {
      if (configuredProviders.includes(providerName)) {
        // Return a configured mock adapter
        return createMockAdapter(providerName, {
          model: 'test-model',
          responses: { success: true, latencyMs: 100, inputTokens: 50, outputTokens: 100 },
        });
      }
      // Return adapter with isConfigured → false
      return {
        name: providerName,
        isConfigured: () => false,
        generateWorkoutDraft: async () => { throw new Error('should not be called'); },
      };
    };
  }

  it('30 — emits PROVIDER_AUTH failure attempts for unconfigured provider', async () => {
    const scenarios = [AB_SCENARIOS[0]]; // 1 scenario
    const result = await runAbSuite(scenarios, {
      live: true,
      providers: ['openai', 'venice'],
      adapterResolver: makePartialResolver(['openai']), // only openai configured
    });

    const veniceAttempts = result.attempts.filter(a => a.provider === 'venice');
    expect(veniceAttempts).toHaveLength(1);
    expect(veniceAttempts[0].success).toBe(false);
    expect(veniceAttempts[0].errorCode).toBe('PROVIDER_AUTH');
    expect(veniceAttempts[0].errorType).toBe('auth');
  });

  it('31 — unconfigured provider appears in rankings with 0% successRate', async () => {
    const scenarios = [AB_SCENARIOS[0]];
    const result = await runAbSuite(scenarios, {
      live: true,
      providers: ['openai', 'venice'],
      adapterResolver: makePartialResolver(['openai']),
    });

    const veniceRank = result.rankings.find(r => r.provider === 'venice');
    expect(veniceRank).toBeDefined();
    expect(veniceRank.successRate).toBe(0);
    expect(veniceRank.hasSuccessfulRuns).toBe(false);
  });

  it('32 — suite completes successfully with mix of configured and unconfigured', async () => {
    const scenarios = [AB_SCENARIOS[0]];
    const result = await runAbSuite(scenarios, {
      live: true,
      providers: ['openai', 'venice'],
      adapterResolver: makePartialResolver(['openai']),
    });

    expect(computeAbExitCode(result)).toBe(0);
    expect(result.rankings).toHaveLength(2);

    const openaiRank = result.rankings.find(r => r.provider === 'openai');
    expect(openaiRank.successRate).toBe(1);
  });
});

// ── Live-mode resolver failures ─────────────────────────────────────────────

describe('Live-mode resolver', () => {
  it('33 — adapterResolver that throws → deterministic PROVIDER_AUTH attempts', async () => {
    const scenarios = [AB_SCENARIOS[0]];
    const result = await runAbSuite(scenarios, {
      live: true,
      providers: ['openai'],
      adapterResolver: () => { throw new Error('resolver crashed'); },
    });

    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].success).toBe(false);
    expect(result.attempts[0].errorCode).toBe('PROVIDER_AUTH');
    expect(computeAbExitCode(result)).toBe(0);
  });

  it('34 — adapterResolver returns null → deterministic PROVIDER_AUTH attempts', async () => {
    const scenarios = [AB_SCENARIOS[0]];
    const result = await runAbSuite(scenarios, {
      live: true,
      providers: ['openai'],
      adapterResolver: () => null,
    });

    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].success).toBe(false);
    expect(result.attempts[0].errorCode).toBe('PROVIDER_AUTH');
  });

  it('35a — adapterResolver returns adapter where isConfigured() throws → deterministic PROVIDER_AUTH', async () => {
    const scenarios = [AB_SCENARIOS[0]];
    const result = await runAbSuite(scenarios, {
      live: true,
      providers: ['openai'],
      adapterResolver: () => ({
        name: 'openai',
        isConfigured: () => { throw new Error('isConfigured boom'); },
        generateWorkoutDraft: async () => ({ provider: 'openai', model: 'gpt-4o', rawText: '{}', latencyMs: 100 }),
      }),
    });

    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].success).toBe(false);
    expect(result.attempts[0].errorCode).toBe('PROVIDER_AUTH');
    expect(computeAbExitCode(result)).toBe(0);
  });

  it('35b — adapterResolver returns malformed object → deterministic PROVIDER_AUTH attempts', async () => {
    const scenarios = [AB_SCENARIOS[0]];
    const result = await runAbSuite(scenarios, {
      live: true,
      providers: ['openai'],
      adapterResolver: () => ({ name: 'openai' }), // missing isConfigured + generateWorkoutDraft
    });

    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].success).toBe(false);
    expect(result.attempts[0].errorCode).toBe('PROVIDER_AUTH');
  });
});

// ── A/B Report ──────────────────────────────────────────────────────────────

describe('A/B Report', () => {
  it('36 — JSON has all provenance fields (incl. promptVersion, ruleEngineVersion)', async () => {
    const result = await runAbSuite(AB_SCENARIOS);
    const json = formatAbJsonReport(result);

    expect(json.phase).toBe('Phase 7 — Provider A/B & Cost Tracker');
    expect(json.version).toBe('1.0.0');
    expect(json.datasetVersion).toBe(AB_DATASET_VERSION);
    expect(json.promptVersion).toBeTruthy();
    expect(json.ruleEngineVersion).toBeTruthy();
    expect(json.timestamp).toBeTruthy();
    expect(json.mode).toBe('mock');
    expect(json.config).toBeDefined();
    expect(json.config.providers).toEqual(['anthropic', 'gemini', 'openai', 'venice']);
    expect(json.config.iterations).toBe(1);
    expect(json.rankings).toHaveLength(4);
    expect(json.perProviderDetail).toBeDefined();
    expect(json.summary).toBeDefined();
    expect(json.attempts).toBeDefined();
  });

  it('37 — Markdown contains rankings table, iteration column, and summary', async () => {
    const result = await runAbSuite(AB_SCENARIOS);
    const json = formatAbJsonReport(result);
    const md = formatAbMarkdownReport(json);

    expect(md).toContain('## Provider Rankings');
    expect(md).toContain('| Rank | Provider |');
    expect(md).toContain('## Summary');
    expect(md).toContain('Cheapest Provider');
    expect(md).toContain('Fastest Provider');
    expect(md).toContain('## Per-Scenario Breakdown');
    expect(md).toContain('| Scenario ID | Iteration |');
    expect(md).toContain('## Provenance');
    expect(md).toContain('Prompt Version');
    expect(md).toContain('Rule Engine Version');
  });
});
