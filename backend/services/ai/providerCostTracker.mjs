/**
 * Provider Cost Tracker — Phase 7
 * ================================
 * Pure-math module: normalize attempt metrics, compute percentiles,
 * aggregate per-provider stats, rank providers.
 *
 * No I/O. Imports only estimateCost from costConfig.mjs.
 *
 * ┌──────────────────────┐
 * │  normalizeAttemptMetrics  │ ← raw attempt → AttemptMetrics
 * │  computePercentile        │ ← values[], p  → number
 * │  aggregateProviderMetrics │ ← attempts[]   → ProviderAggregation
 * │  rankProviders            │ ← aggregations → RankedProvider[]
 * └──────────────────────┘
 */
import { estimateCost } from './costConfig.mjs';

// ── Types (JSDoc) ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} AttemptMetrics
 * @property {string}      scenarioId        — links attempt to dataset scenario
 * @property {number}      iteration         — 0-indexed iteration number
 * @property {string}      provider
 * @property {string|null} model             — null for unconfigured live-mode providers
 * @property {boolean}     success
 * @property {string|null} errorCode         — AiProviderErrorCode if failure
 * @property {string|null} errorType         — e.g. 'timeout', 'auth'
 * @property {number}      latencyMs
 * @property {number|null} promptTokens
 * @property {number|null} completionTokens
 * @property {number|null} totalTokens
 * @property {number|null} estimatedCostUsd
 */

/**
 * @typedef {Object} ProviderAggregation
 * @property {string}      provider
 * @property {number}      totalRuns
 * @property {boolean}     hasSuccessfulRuns — false if all attempts failed
 * @property {number}      successRate       — 0.0 to 1.0
 * @property {number}      failRate          — 0.0 to 1.0
 * @property {number|null} avgLatencyMs      — null if no successful runs
 * @property {number|null} p50LatencyMs
 * @property {number|null} p95LatencyMs
 * @property {number|null} p99LatencyMs
 * @property {number|null} avgCostUsd        — null if no successful runs OR all successful runs have unknown cost
 * @property {number}      totalCostUsd      — 0 if no successful runs
 */

/**
 * @typedef {ProviderAggregation & { rank: number }} RankedProvider
 */

// ── Helpers ─────────────────────────────────────────────────────────────────

/** @param {unknown} v @returns {number|null} */
function safeFiniteNumber(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** @param {unknown} v @returns {string|null} */
function safeNonEmptyString(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

// ── normalizeAttemptMetrics ─────────────────────────────────────────────────

/**
 * Normalize raw attempt data into a clean AttemptMetrics shape.
 *
 * @param {Object} raw
 * @returns {AttemptMetrics}
 */
export function normalizeAttemptMetrics(raw) {
  const provider = String(raw.provider || 'unknown');
  const model = safeNonEmptyString(raw.model);
  const promptTokens = safeFiniteNumber(raw.promptTokens);
  const completionTokens = safeFiniteNumber(raw.completionTokens);
  const totalTokens = safeFiniteNumber(raw.totalTokens)
    ?? (promptTokens != null && completionTokens != null ? promptTokens + completionTokens : null);

  return {
    scenarioId: String(raw.scenarioId || 'unknown'),
    iteration: Number.isInteger(raw.iteration) ? raw.iteration : 0,
    provider,
    model,
    success: Boolean(raw.success),
    errorCode: safeNonEmptyString(raw.errorCode),
    errorType: safeNonEmptyString(raw.errorType),
    latencyMs: safeFiniteNumber(raw.latencyMs) ?? 0,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd: estimateCost(model, promptTokens, completionTokens),
  };
}

// ── computePercentile ───────────────────────────────────────────────────────

/**
 * Compute percentile using nearest-rank method.
 * Defensively sorts input — callers need not pre-sort.
 *
 * @param {number[]} values
 * @param {number} p — percentile [0, 100]
 * @returns {number} — 0 for empty array
 */
export function computePercentile(values, p) {
  if (!values || values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);

  // Clamp p to [0, 100]
  const pClamped = Math.max(0, Math.min(100, p));

  if (sorted.length === 1) return sorted[0];

  // Nearest-rank: index = ceil(p/100 * N) - 1, clamped to [0, N-1]
  const idx = Math.min(
    Math.max(Math.ceil((pClamped / 100) * sorted.length) - 1, 0),
    sorted.length - 1
  );
  return sorted[idx];
}

// ── aggregateProviderMetrics ────────────────────────────────────────────────

/**
 * Aggregate attempt metrics for a single provider.
 *
 * Latency/cost stats from successful attempts only.
 * Cost stats use only non-null estimatedCostUsd values.
 *
 * @param {AttemptMetrics[]} attempts — all attempts for one provider
 * @returns {ProviderAggregation}
 */
export function aggregateProviderMetrics(attempts) {
  const provider = attempts[0]?.provider || 'unknown';
  const totalRuns = attempts.length;
  const successfulAttempts = attempts.filter(a => a.success);
  const hasSuccessfulRuns = successfulAttempts.length > 0;
  const successRate = totalRuns > 0 ? successfulAttempts.length / totalRuns : 0;
  const failRate = 1 - successRate;

  // Latency stats — successful attempts only
  let avgLatencyMs = null;
  let p50LatencyMs = null;
  let p95LatencyMs = null;
  let p99LatencyMs = null;

  if (hasSuccessfulRuns) {
    const latencies = successfulAttempts.map(a => a.latencyMs);
    avgLatencyMs = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;
    p50LatencyMs = computePercentile(latencies, 50);
    p95LatencyMs = computePercentile(latencies, 95);
    p99LatencyMs = computePercentile(latencies, 99);
  }

  // Cost stats — successful attempts with non-null estimatedCostUsd only
  const costsWithValues = successfulAttempts
    .map(a => a.estimatedCostUsd)
    .filter(c => c != null);

  let avgCostUsd = null;
  let totalCostUsd = 0;

  if (costsWithValues.length > 0) {
    totalCostUsd = costsWithValues.reduce((sum, v) => sum + v, 0);
    avgCostUsd = totalCostUsd / costsWithValues.length;
  }

  return {
    provider,
    totalRuns,
    hasSuccessfulRuns,
    successRate,
    failRate,
    avgLatencyMs,
    p50LatencyMs,
    p95LatencyMs,
    p99LatencyMs,
    avgCostUsd,
    totalCostUsd,
  };
}

// ── rankProviders ───────────────────────────────────────────────────────────

/**
 * Rank providers by:
 *   1. successRate desc
 *   2. p95LatencyMs asc (null treated as worst — sorts after any real number)
 *   3. avgCostUsd asc (null treated as worst — sorts after any real number)
 *   4. provider name asc (deterministic tie-break)
 *
 * @param {ProviderAggregation[]} aggregations
 * @returns {RankedProvider[]}
 */
export function rankProviders(aggregations) {
  const sorted = [...aggregations].sort((a, b) => {
    // 1. successRate desc
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;

    // 2. p95LatencyMs asc (null = worst = Infinity for comparison only)
    const aP95 = a.p95LatencyMs ?? Infinity;
    const bP95 = b.p95LatencyMs ?? Infinity;
    if (aP95 !== bP95) return aP95 - bP95;

    // 3. avgCostUsd asc (null = worst = Infinity for comparison only)
    const aCost = a.avgCostUsd ?? Infinity;
    const bCost = b.avgCostUsd ?? Infinity;
    if (aCost !== bCost) return aCost - bCost;

    // 4. provider name asc
    return a.provider.localeCompare(b.provider);
  });

  return sorted.map((agg, i) => ({ ...agg, rank: i + 1 }));
}
