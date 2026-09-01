/**
 * AI Usage Meter — per-call cost accounting for the chat path
 * ============================================================
 * SWA-179 slice 1. Routing traffic to cheaper models is unfalsifiable without
 * a baseline, so measurement lands before any routing decision.
 *
 * Two problems this exists to solve, both discovered while wiring it:
 *
 * 1. The chat path computed NO cost. `services/ai/adapters/*` call
 *    `normalizeTokenUsage()` which populates `estimatedCostUsd`, but
 *    `aiChatService` builds its `tokenUsage` objects inline and never imports
 *    `costConfig`. The cost machinery existed and the surface that actually
 *    serves chat did not use it.
 *
 * 2. `estimateCost()` looks models up by EXACT key, and providers do not
 *    return the keys the table holds:
 *      - Anthropic returns `claude-sonnet-4-20250514`; the table has
 *        `claude-sonnet-4-6` → miss.
 *      - OpenAI appends a dated suffix (`gpt-4o-mini-2024-07-18`) → miss.
 *    Wiring it naively would have reported ~$0 for the two most expensive
 *    providers. **Telemetry that under-reports is worse than none** — it would
 *    have made "cheap model routing saves nothing" look true.
 *
 * So: resolve by longest-prefix, and COUNT what still cannot be priced.
 * An unpriced call is a visible number, never a silent zero.
 *
 * Privacy (Rule 8): records provider, model id, token counts and cost ONLY.
 * No prompt text, no response text, no user or client identifiers.
 */
import { MODEL_COSTS, estimateCost } from './costConfig.mjs';
import logger from '../../utils/logger.mjs';

/** Distinct provider|model buckets retained before overflow is pooled. */
const MAX_BUCKETS = 64;

/**
 * Resolve a provider-reported model id to a key in MODEL_COSTS.
 *
 * Exact match first, then LONGEST prefix — longest so that `gpt-4o-mini-<date>`
 * resolves to `gpt-4o-mini` rather than to `gpt-4`, which would price it ~200x
 * too high. Ordering matters more than the match itself here.
 *
 * @param {string} model
 * @returns {string|null} a MODEL_COSTS key, or null when nothing covers it
 */
export function resolvePricedModel(model) {
  if (!model || typeof model !== 'string') return null;
  const id = model.trim().toLowerCase();
  if (!id) return null;
  if (MODEL_COSTS[id]) return id;

  let best = null;
  for (const key of Object.keys(MODEL_COSTS)) {
    const k = key.toLowerCase();
    if (id.startsWith(k) && (best === null || k.length > best.length)) best = k;
  }
  return best;
}

/**
 * Cost for a call, with the resolution recorded so a caller can tell
 * "priced exactly" from "priced by prefix" from "not priced at all".
 *
 * @param {string} model
 * @param {number|null} inputTokens
 * @param {number|null} outputTokens
 * @returns {{ costUsd: number|null, pricedAs: string|null, priced: boolean, exact: boolean }}
 */
export function estimateCallCost(model, inputTokens, outputTokens) {
  const pricedAs = resolvePricedModel(model);
  if (!pricedAs) return { costUsd: null, pricedAs: null, priced: false, exact: false };

  const costUsd = estimateCost(pricedAs, inputTokens, outputTokens);
  return {
    costUsd,
    pricedAs,
    priced: costUsd !== null,
    exact: typeof model === 'string' && model.trim().toLowerCase() === pricedAs,
  };
}

const emptyTotals = () => ({
  calls: 0,
  failedCalls: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  unpricedCalls: 0,
  prefixPricedCalls: 0,
});

let meter = {
  since: null,
  overall: emptyTotals(),
  byBucket: new Map(),
  unpricedModels: new Map(),
  bucketOverflow: 0,
};

/** Test seam and deploy-boundary reset. */
export function resetAiUsageMeter() {
  meter = {
    since: null,
    overall: emptyTotals(),
    byBucket: new Map(),
    unpricedModels: new Map(),
    bucketOverflow: 0,
  };
}

function bucketFor(provider, model) {
  const key = `${provider || 'unknown'}|${model || 'unknown'}`;
  if (meter.byBucket.has(key)) return meter.byBucket.get(key);

  if (meter.byBucket.size >= MAX_BUCKETS) {
    meter.bucketOverflow += 1;
    const pooled = meter.byBucket.get('__other__') || emptyTotals();
    meter.byBucket.set('__other__', pooled);
    return pooled;
  }

  const fresh = emptyTotals();
  meter.byBucket.set(key, fresh);
  return fresh;
}

/**
 * Record one AI call.
 *
 * `nowIso` is injected rather than read from the clock so tests are
 * deterministic; callers normally omit it.
 *
 * @param {{
 *   provider: string,
 *   model?: string|null,
 *   tokenUsage?: { inputTokens?: number|null, outputTokens?: number|null }|null,
 *   ok?: boolean,
 *   nowIso?: string,
 * }} entry
 * @returns {{ costUsd: number|null, priced: boolean, pricedAs: string|null }}
 */
export function recordAiUsage(entry = {}) {
  const { provider, model = null, tokenUsage = null, ok = true, nowIso } = entry;

  const inT = Number.isFinite(Number(tokenUsage?.inputTokens)) ? Number(tokenUsage.inputTokens) : 0;
  const outT = Number.isFinite(Number(tokenUsage?.outputTokens)) ? Number(tokenUsage.outputTokens) : 0;
  const { costUsd, pricedAs, priced, exact } = estimateCallCost(model, inT || null, outT || null);

  if (!meter.since) meter.since = nowIso || new Date().toISOString();

  const bucket = bucketFor(provider, model);
  for (const t of [meter.overall, bucket]) {
    t.calls += 1;
    if (!ok) t.failedCalls += 1;
    t.inputTokens += inT;
    t.outputTokens += outT;
    if (priced) t.costUsd += costUsd;
    else t.unpricedCalls += 1;
    if (priced && !exact) t.prefixPricedCalls += 1;
  }

  if (!priced && model) {
    // Surfaced, not swallowed: an unpriced model means the cost table has
    // drifted behind the deployment, and every dashboard reading below it.
    meter.unpricedModels.set(model, (meter.unpricedModels.get(model) || 0) + 1);
  }

  // Metadata only — never prompt or response content (Rule 8).
  logger.info('[AIUsage] call', {
    provider,
    model,
    pricedAs,
    priced,
    ok,
    inputTokens: inT,
    outputTokens: outT,
    estimatedCostUsd: costUsd,
  });

  return { costUsd, priced, pricedAs };
}

const round6 = (n) => Math.round(n * 1e6) / 1e6;

const shapeTotals = (t) => ({
  calls: t.calls,
  failedCalls: t.failedCalls,
  inputTokens: t.inputTokens,
  outputTokens: t.outputTokens,
  estimatedCostUsd: round6(t.costUsd),
  unpricedCalls: t.unpricedCalls,
  prefixPricedCalls: t.prefixPricedCalls,
});

/**
 * Rolling summary since process start (or last reset).
 *
 * In-memory by design for slice 1: it resets on deploy. The durable record is
 * the per-call `[AIUsage]` log line — persistence is a later slice and needs a
 * schema decision, which is not something to take unilaterally.
 */
export function getAiUsageSummary() {
  const byBucket = {};
  for (const [key, totals] of meter.byBucket.entries()) byBucket[key] = shapeTotals(totals);

  const unpricedModels = {};
  for (const [model, count] of meter.unpricedModels.entries()) unpricedModels[model] = count;

  return {
    since: meter.since,
    inMemoryOnly: true,
    overall: shapeTotals(meter.overall),
    byBucket,
    // Non-empty means the cost table has drifted and every figure above it is
    // an UNDER-estimate. Treat as a data-quality alarm, not a footnote.
    unpricedModels,
    bucketOverflow: meter.bucketOverflow,
  };
}
