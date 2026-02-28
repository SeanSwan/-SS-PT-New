/**
 * Provider Cost Tracker Tests — Phase 7
 * ======================================
 * 19 tests covering: normalizeAttemptMetrics, computePercentile,
 * aggregateProviderMetrics, rankProviders.
 *
 * Run: cd backend && npx vitest run tests/unit/providerCostTracker.test.mjs
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeAttemptMetrics,
  computePercentile,
  aggregateProviderMetrics,
  rankProviders,
} from '../../services/ai/providerCostTracker.mjs';

// ── normalizeAttemptMetrics ─────────────────────────────────────────────────

describe('normalizeAttemptMetrics', () => {
  it('1 — normalizes successful attempt with all fields (incl. scenarioId, iteration)', () => {
    const raw = {
      scenarioId: 'ab_simple_01',
      iteration: 2,
      provider: 'openai',
      model: 'gpt-4o',
      success: true,
      errorCode: null,
      errorType: null,
      latencyMs: 450,
      promptTokens: 100,
      completionTokens: 200,
    };
    const result = normalizeAttemptMetrics(raw);
    expect(result.scenarioId).toBe('ab_simple_01');
    expect(result.iteration).toBe(2);
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o');
    expect(result.success).toBe(true);
    expect(result.errorCode).toBeNull();
    expect(result.errorType).toBeNull();
    expect(result.latencyMs).toBe(450);
    expect(result.promptTokens).toBe(100);
    expect(result.completionTokens).toBe(200);
    expect(result.totalTokens).toBe(300);
    expect(result.estimatedCostUsd).toBeTypeOf('number');
    expect(result.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('2 — fills estimatedCostUsd for known model (gpt-4o)', () => {
    const result = normalizeAttemptMetrics({
      provider: 'openai',
      model: 'gpt-4o',
      success: true,
      latencyMs: 100,
      promptTokens: 1000,
      completionTokens: 500,
    });
    // gpt-4o: input $0.005/1k, output $0.015/1k → 1000*0.005/1000 + 500*0.015/1000 = 0.005 + 0.0075 = 0.0125
    expect(result.estimatedCostUsd).toBeCloseTo(0.0125, 6);
  });

  it('3 — returns null estimatedCostUsd for unknown model', () => {
    const result = normalizeAttemptMetrics({
      provider: 'venice',
      model: 'some-unknown-model-xyz',
      success: true,
      latencyMs: 100,
      promptTokens: 100,
      completionTokens: 200,
    });
    expect(result.estimatedCostUsd).toBeNull();
  });

  it('4 — normalizes failed attempt with errorCode/errorType', () => {
    const result = normalizeAttemptMetrics({
      scenarioId: 'ab_fail_01',
      iteration: 0,
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      success: false,
      errorCode: 'PROVIDER_TIMEOUT',
      errorType: 'timeout',
      latencyMs: 30000,
      promptTokens: null,
      completionTokens: null,
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PROVIDER_TIMEOUT');
    expect(result.errorType).toBe('timeout');
    expect(result.promptTokens).toBeNull();
    expect(result.completionTokens).toBeNull();
    expect(result.totalTokens).toBeNull();
    expect(result.estimatedCostUsd).toBeNull();
  });

  it('5 — coerces undefined/NaN tokens to null', () => {
    const result = normalizeAttemptMetrics({
      provider: 'openai',
      model: 'gpt-4o',
      success: true,
      latencyMs: 100,
      promptTokens: undefined,
      completionTokens: NaN,
    });
    expect(result.promptTokens).toBeNull();
    expect(result.completionTokens).toBeNull();
    expect(result.totalTokens).toBeNull();
  });

  it('5b — coerces empty/missing model to null, estimatedCostUsd = null', () => {
    const result1 = normalizeAttemptMetrics({
      provider: 'venice',
      model: '',
      success: false,
      errorCode: 'PROVIDER_AUTH',
      latencyMs: 0,
    });
    expect(result1.model).toBeNull();
    expect(result1.estimatedCostUsd).toBeNull();

    const result2 = normalizeAttemptMetrics({
      provider: 'venice',
      success: false,
      errorCode: 'PROVIDER_AUTH',
      latencyMs: 0,
    });
    expect(result2.model).toBeNull();
    expect(result2.estimatedCostUsd).toBeNull();
  });
});

// ── computePercentile ───────────────────────────────────────────────────────

describe('computePercentile', () => {
  it('6 — correct p50 for odd-length array', () => {
    // [10, 20, 30, 40, 50] → p50 = 30 (index = ceil(0.5*5)-1 = 2)
    expect(computePercentile([10, 20, 30, 40, 50], 50)).toBe(30);
  });

  it('7 — correct p95/p99 for 100-element array', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    expect(computePercentile(values, 95)).toBe(95);
    expect(computePercentile(values, 99)).toBe(99);
  });

  it('8 — returns 0 for empty array', () => {
    expect(computePercentile([], 50)).toBe(0);
  });

  it('9 — returns single element for length-1 array', () => {
    expect(computePercentile([42], 50)).toBe(42);
    expect(computePercentile([42], 99)).toBe(42);
  });

  it('9b — clamps p=0 to first element', () => {
    expect(computePercentile([10, 20, 30], 0)).toBe(10);
  });

  it('9c — clamps p>100 to last element', () => {
    expect(computePercentile([10, 20, 30], 150)).toBe(30);
  });

  it('9d — unsorted input produces same result as sorted (defensive sort)', () => {
    const unsorted = [30, 10, 20];
    const sorted = [10, 20, 30];
    expect(computePercentile(unsorted, 50)).toBe(computePercentile(sorted, 50));
    expect(computePercentile(unsorted, 95)).toBe(computePercentile(sorted, 95));
  });
});

// ── aggregateProviderMetrics ────────────────────────────────────────────────

describe('aggregateProviderMetrics', () => {
  const makeAttempt = (overrides = {}) => normalizeAttemptMetrics({
    scenarioId: 'test_01',
    iteration: 0,
    provider: 'openai',
    model: 'gpt-4o',
    success: true,
    latencyMs: 100,
    promptTokens: 100,
    completionTokens: 200,
    ...overrides,
  });

  it('10 — correct successRate/failRate from mixed results', () => {
    const attempts = [
      makeAttempt({ success: true }),
      makeAttempt({ success: true }),
      makeAttempt({ success: false, errorCode: 'PROVIDER_TIMEOUT', errorType: 'timeout' }),
    ];
    const agg = aggregateProviderMetrics(attempts);
    expect(agg.totalRuns).toBe(3);
    expect(agg.successRate).toBeCloseTo(2 / 3, 6);
    expect(agg.failRate).toBeCloseTo(1 / 3, 6);
    expect(agg.hasSuccessfulRuns).toBe(true);
  });

  it('11 — latency percentiles from successful attempts only', () => {
    const attempts = [
      makeAttempt({ success: true, latencyMs: 100 }),
      makeAttempt({ success: true, latencyMs: 200 }),
      makeAttempt({ success: true, latencyMs: 300 }),
      makeAttempt({ success: false, latencyMs: 99999, errorCode: 'PROVIDER_TIMEOUT' }),
    ];
    const agg = aggregateProviderMetrics(attempts);
    expect(agg.avgLatencyMs).toBe(200);
    expect(agg.p50LatencyMs).toBe(200);
    // 99999 from failed attempt should NOT pollute latency stats
    expect(agg.p95LatencyMs).toBe(300);
  });

  it('12 — avgCostUsd and totalCostUsd from non-null costs only', () => {
    const attempts = [
      makeAttempt({ success: true, promptTokens: 1000, completionTokens: 500 }),
      makeAttempt({ success: true, promptTokens: 1000, completionTokens: 500 }),
    ];
    const agg = aggregateProviderMetrics(attempts);
    expect(agg.avgCostUsd).toBeTypeOf('number');
    expect(agg.avgCostUsd).toBeGreaterThan(0);
    expect(agg.totalCostUsd).toBeGreaterThan(0);
    expect(agg.totalCostUsd).toBeCloseTo(agg.avgCostUsd * 2, 10);
  });

  it('12b — all-null costs → avgCostUsd=null, totalCostUsd=0', () => {
    const attempts = [
      makeAttempt({ success: true, model: 'unknown-model-xyz', promptTokens: 100, completionTokens: 200 }),
      makeAttempt({ success: true, model: 'unknown-model-xyz', promptTokens: 100, completionTokens: 200 }),
    ];
    const agg = aggregateProviderMetrics(attempts);
    expect(agg.hasSuccessfulRuns).toBe(true);
    expect(agg.avgCostUsd).toBeNull();
    expect(agg.totalCostUsd).toBe(0);
  });

  it('13 — zero-success provider gets null latency/cost, hasSuccessfulRuns=false', () => {
    const attempts = [
      makeAttempt({ success: false, errorCode: 'PROVIDER_AUTH', errorType: 'auth' }),
      makeAttempt({ success: false, errorCode: 'PROVIDER_AUTH', errorType: 'auth' }),
    ];
    const agg = aggregateProviderMetrics(attempts);
    expect(agg.hasSuccessfulRuns).toBe(false);
    expect(agg.successRate).toBe(0);
    expect(agg.failRate).toBe(1);
    expect(agg.avgLatencyMs).toBeNull();
    expect(agg.p50LatencyMs).toBeNull();
    expect(agg.p95LatencyMs).toBeNull();
    expect(agg.p99LatencyMs).toBeNull();
    expect(agg.avgCostUsd).toBeNull();
    expect(agg.totalCostUsd).toBe(0);
  });
});

// ── rankProviders ───────────────────────────────────────────────────────────

describe('rankProviders', () => {
  it('14 — ranks by successRate desc → p95 asc → avgCost asc → name asc', () => {
    const aggregations = [
      { provider: 'venice', successRate: 1.0, p95LatencyMs: 500, avgCostUsd: 0.001 },
      { provider: 'openai', successRate: 1.0, p95LatencyMs: 200, avgCostUsd: 0.01 },
      { provider: 'anthropic', successRate: 0.5, p95LatencyMs: 300, avgCostUsd: 0.005 },
      { provider: 'gemini', successRate: 1.0, p95LatencyMs: 200, avgCostUsd: 0.002 },
    ];

    const ranked = rankProviders(aggregations);
    // openai & gemini: same successRate=1.0, same p95=200; gemini cheaper → gemini first
    // venice: successRate=1.0 but p95=500 → after openai/gemini
    // anthropic: successRate=0.5 → last
    expect(ranked[0].provider).toBe('gemini');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].provider).toBe('openai');
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].provider).toBe('venice');
    expect(ranked[2].rank).toBe(3);
    expect(ranked[3].provider).toBe('anthropic');
    expect(ranked[3].rank).toBe(4);

    // Null metrics sort last — provider with null p95 treated as worst
    const withNull = [
      { provider: 'a', successRate: 1.0, p95LatencyMs: 100, avgCostUsd: 0.01 },
      { provider: 'b', successRate: 1.0, p95LatencyMs: null, avgCostUsd: 0.001 },
    ];
    const rankedNull = rankProviders(withNull);
    expect(rankedNull[0].provider).toBe('a');
    expect(rankedNull[1].provider).toBe('b');
  });
});
