/**
 * AI usage meter — cost baseline for SWA-179
 * ===========================================
 * Routing traffic to cheaper models is unfalsifiable without a baseline, so
 * measurement lands first. These tests exist because the naive version of this
 * feature is worse than not building it:
 *
 *   `estimateCost()` matches models by EXACT key, and providers do not return
 *   the keys the table holds. Anthropic returns `claude-sonnet-4-20250514`
 *   against a table holding `claude-sonnet-4-6`; OpenAI appends a dated
 *   suffix. A naive wiring reports ~$0 for the two most expensive providers,
 *   which would make "cheap-model routing saves nothing" look measured.
 *
 * So the load-bearing properties are: dated model ids still price, prefix
 * resolution picks the LONGEST match (never `gpt-4` for a `gpt-4o-mini-*`
 * call), and anything still unpriced is COUNTED rather than silently zeroed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const {
  resolvePricedModel, estimateCallCost, recordAiUsage, getAiUsageSummary, resetAiUsageMeter,
} = await import('../../services/ai/aiUsageMeter.mjs');

beforeEach(() => resetAiUsageMeter());

describe('model price resolution survives real provider model ids', () => {
  it('resolves an exact key', () => {
    expect(resolvePricedModel('gpt-4o-mini')).toBe('gpt-4o-mini');
  });

  it('resolves OpenAI dated ids by prefix', () => {
    expect(resolvePricedModel('gpt-4o-mini-2024-07-18')).toBe('gpt-4o-mini');
    expect(resolvePricedModel('gpt-4o-2024-08-06')).toBe('gpt-4o');
  });

  it('picks the LONGEST prefix — the mispricing that would matter most', () => {
    // 'gpt-4' and 'gpt-4o' and 'gpt-4o-mini' all prefix-match a mini call.
    // Choosing 'gpt-4' would price it 200x too high and make cheap-model
    // routing look pointless — the exact conclusion this data will inform.
    expect(resolvePricedModel('gpt-4o-mini-2024-07-18')).toBe('gpt-4o-mini');

    const mini = estimateCallCost('gpt-4o-mini-2024-07-18', 1_000_000, 0).costUsd;
    const gpt4 = estimateCallCost('gpt-4', 1_000_000, 0).costUsd;
    expect(mini).toBeLessThan(gpt4);
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(resolvePricedModel('  GPT-4O-Mini  ')).toBe('gpt-4o-mini');
  });

  it('returns null for a model the table does not cover', () => {
    expect(resolvePricedModel('claude-sonnet-4-20250514')).toBeNull();
    expect(resolvePricedModel('some-future-model')).toBeNull();
    expect(resolvePricedModel('')).toBeNull();
    expect(resolvePricedModel(null)).toBeNull();
  });

  it('flags prefix-priced calls as NOT exact, so precision is knowable', () => {
    expect(estimateCallCost('gpt-4o-mini', 100, 100).exact).toBe(true);
    expect(estimateCallCost('gpt-4o-mini-2024-07-18', 100, 100).exact).toBe(false);
  });
});

describe('an unpriced call is a visible number, never a silent zero', () => {
  it('counts unpriced calls and names the models', () => {
    recordAiUsage({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514', // real id; table has claude-sonnet-4-6
      tokenUsage: { inputTokens: 1000, outputTokens: 500 },
    });

    const s = getAiUsageSummary();
    expect(s.overall.calls).toBe(1);
    expect(s.overall.unpricedCalls).toBe(1);
    expect(s.overall.estimatedCostUsd).toBe(0);
    // The alarm: cost reads 0 ONLY because pricing is missing, and says so.
    expect(s.unpricedModels['claude-sonnet-4-20250514']).toBe(1);
  });

  it('still records tokens for unpriced calls — usage is known even when cost is not', () => {
    recordAiUsage({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      tokenUsage: { inputTokens: 1000, outputTokens: 500 },
    });
    const s = getAiUsageSummary();
    expect(s.overall.inputTokens).toBe(1000);
    expect(s.overall.outputTokens).toBe(500);
  });
});

describe('accumulation', () => {
  it('accrues cost across calls and splits by provider|model', () => {
    recordAiUsage({ provider: 'openai', model: 'gpt-4o-mini', tokenUsage: { inputTokens: 1000, outputTokens: 1000 } });
    recordAiUsage({ provider: 'openai', model: 'gpt-4o-mini', tokenUsage: { inputTokens: 1000, outputTokens: 1000 } });
    recordAiUsage({ provider: 'gemini', model: 'gemini-2.5-flash', tokenUsage: { inputTokens: 1000, outputTokens: 1000 } });

    const s = getAiUsageSummary();
    expect(s.overall.calls).toBe(3);
    expect(s.overall.estimatedCostUsd).toBeGreaterThan(0);
    expect(s.byBucket['openai|gpt-4o-mini'].calls).toBe(2);
    expect(s.byBucket['gemini|gemini-2.5-flash'].calls).toBe(1);
    // gpt-4o-mini and gemini-2.5-flash are priced identically per the table,
    // so two mini calls must cost exactly twice one gemini call.
    expect(s.byBucket['openai|gpt-4o-mini'].estimatedCostUsd)
      .toBeCloseTo(s.byBucket['gemini|gemini-2.5-flash'].estimatedCostUsd * 2, 8);
  });

  it('counts failed calls — a flapping provider must not look free', () => {
    recordAiUsage({ provider: 'gemini', model: null, tokenUsage: null, ok: false });
    const s = getAiUsageSummary();
    expect(s.overall.calls).toBe(1);
    expect(s.overall.failedCalls).toBe(1);
  });

  it('tracks prefix-priced calls separately from exact ones', () => {
    recordAiUsage({ provider: 'openai', model: 'gpt-4o-mini', tokenUsage: { inputTokens: 10, outputTokens: 10 } });
    recordAiUsage({ provider: 'openai', model: 'gpt-4o-mini-2024-07-18', tokenUsage: { inputTokens: 10, outputTokens: 10 } });
    expect(getAiUsageSummary().overall.prefixPricedCalls).toBe(1);
  });

  it('bounds bucket growth so an odd model string cannot grow memory forever', () => {
    for (let i = 0; i < 200; i += 1) {
      recordAiUsage({ provider: 'openai', model: `model-variant-${i}`, tokenUsage: { inputTokens: 1, outputTokens: 1 } });
    }
    const s = getAiUsageSummary();
    expect(Object.keys(s.byBucket).length).toBeLessThanOrEqual(65); // MAX_BUCKETS + __other__
    expect(s.bucketOverflow).toBeGreaterThan(0);
    expect(s.overall.calls).toBe(200); // overall totals stay exact
  });

  it('resets cleanly', () => {
    recordAiUsage({ provider: 'openai', model: 'gpt-4o-mini', tokenUsage: { inputTokens: 10, outputTokens: 10 } });
    resetAiUsageMeter();
    const s = getAiUsageSummary();
    expect(s.overall.calls).toBe(0);
    expect(s.since).toBeNull();
  });
});

describe('privacy — the meter records metadata, never content (Rule 8)', () => {
  it('never stores prompt or response text, even when handed some', () => {
    recordAiUsage({
      provider: 'openai',
      model: 'gpt-4o-mini',
      tokenUsage: { inputTokens: 10, outputTokens: 10 },
      // Fields the meter must ignore rather than absorb:
      content: 'client has a torn rotator cuff',
      messages: [{ role: 'user', content: 'PII goes here' }],
      userId: 84,
    });

    const serialized = JSON.stringify(getAiUsageSummary());
    expect(serialized).not.toContain('rotator cuff');
    expect(serialized).not.toContain('PII goes here');
    expect(serialized).not.toContain('84');
  });

  it('logs metadata only — no content keys reach the logger', async () => {
    const logger = (await import('../../utils/logger.mjs')).default;
    logger.info.mockClear();

    recordAiUsage({
      provider: 'openai',
      model: 'gpt-4o-mini',
      tokenUsage: { inputTokens: 10, outputTokens: 10 },
      content: 'secret clinical note',
    });

    const [, payload] = logger.info.mock.calls.at(-1);
    expect(JSON.stringify(payload)).not.toContain('secret clinical note');
    expect(Object.keys(payload).sort()).toEqual(
      ['estimatedCostUsd', 'inputTokens', 'model', 'ok', 'outputTokens', 'priced', 'pricedAs', 'provider'],
    );
  });
});
