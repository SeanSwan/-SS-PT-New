/**
 * ============================================================================
 * FILE: backend/services/bootcamp/bootcampBrain.mjs
 * PURPOSE: Layer 2 of the three-layer architecture — JUDGMENT over a pool
 *          Layer 1 already made legal. SWA-105 Slice 4.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * THE CONTRACT (master prompt §6.1, hardened by the consult panel):
 *  - The brain ORDERS AND SUBSETS the legal pool. It may NEVER introduce an
 *    exercise — its output is validated as a subset of input keys (Layer 3),
 *    and anything else is discarded wholesale, not repaired.
 *  - The brain never narrates (P4). Its judgment surfaces as ORDER; reasons
 *    stay structured chips derived elsewhere.
 *  - Rule 8: the LLM sees exercise KEYS and aggregate context only — no
 *    client names, no PII. The prompt is built from keys, day type, and counts.
 *  - FAIL-OPEN with a paper trail: any LLM failure (timeout, garbage, flag
 *    off, no provider) falls back to the deterministic heuristic and records
 *    WHY in `fallbackReason` — Kimi R5's instrumentation demand: without it
 *    the brain can be down for three weeks unnoticed.
 *
 * The heuristic brain is not a stub. It encodes the two judgment rules the
 * regression suite (Kimi R5) holds every brain to:
 *  1. FATIGUE SEQUENCING — avoid back-to-back same-pattern picks; prefer the
 *     opposing pattern next (squat→hinge, push→pull).
 *  2. FRESHNESS — recently-taught exercises rank later, never first.
 * An LLM that cannot beat this baseline on those metrics is decorative.
 */

import { OPPOSING_PATTERN } from '../../../shared/bootcamp-core/taxonomy.mjs';

const DEFAULT_TIMEOUT_MS = 8000;

/** Deterministic judgment. Pure; rng only breaks ties. */
export function heuristicBrain({ pool, recentKeys = new Set() }) {
  const remaining = [...pool];
  const ordered = [];
  let lastPattern = null;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const ex = remaining[i];
      const pattern = ex.coreMovement?.pattern ?? null;
      let score = 0;
      if (pattern && lastPattern && pattern === lastPattern) score -= 40;      // fatigue: same pattern twice
      if (pattern && lastPattern && OPPOSING_PATTERN[lastPattern] === pattern) score += 25; // opposing preferred
      if (recentKeys.has(ex.key)) score -= 30;                                  // freshness
      if ((ex.setupTimeSec ?? 0) <= 5) score += 5;                              // flow: quick setups earlier
      score -= i * 0.01;                                                        // stable tie-break
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    const [pick] = remaining.splice(bestIdx, 1);
    ordered.push(pick);
    lastPattern = pick.coreMovement?.pattern ?? lastPattern;
  }

  // ENFORCE the "recently-taught, never first" invariant the header claims —
  // the -30 score only DISCOURAGES it, so when every candidate scored poorly a
  // recent one can still land at position 0. If the head is recent and a
  // non-recent exercise exists anywhere, promote the first non-recent to front.
  // (Opus 5 review §2.8: an asserted invariant that the code doesn't enforce is
  // a Rule-75 over-claim; enforce it rather than soften the claim.)
  if (ordered.length > 1 && recentKeys.has(ordered[0].key)) {
    const firstFresh = ordered.findIndex((ex) => !recentKeys.has(ex.key));
    if (firstFresh > 0) {
      const [fresh] = ordered.splice(firstFresh, 1);
      ordered.unshift(fresh);
    }
  }
  return ordered;
}

/**
 * Layer 3 for brain output: the returned key list must be a non-empty subset
 * of the pool with no inventions and no duplicates. Anything else -> null
 * (discard wholesale; a "repaired" hallucination is still a hallucination).
 */
export function validateBrainOrdering(keys, pool) {
  if (!Array.isArray(keys) || keys.length === 0) return null;
  const legal = new Map(pool.map((ex) => [ex.key, ex]));
  const seen = new Set();
  const ordered = [];
  for (const key of keys) {
    if (typeof key !== 'string' || !legal.has(key) || seen.has(key)) return null;
    seen.add(key);
    ordered.push(legal.get(key));
  }
  // Subset is allowed; the tail keeps heuristic order so nothing is lost.
  for (const ex of pool) if (!seen.has(ex.key)) ordered.push(ex);
  return ordered;
}

function buildBrainPrompt({ pool, dayTypeId, headcount, mode }) {
  // Keys + aggregate context ONLY (Rule 8). No names, no notes, no history text.
  return [
    `Order these exercise keys for a ${dayTypeId} group class`
      + (headcount ? ` of ${headcount} people` : '') + '.',
    'Rules: alternate movement patterns (never the same twice in a row);',
    'push recently-used keys later; quick-setup exercises earlier.',
    mode === 'open_gym'
      ? 'No equipment profile is set: assume common gym equipment and list every assumption you make.'
      : 'Equipment is pre-filtered; do not reason about it.',
    'Reply ONLY with JSON: {"orderedKeys": [...], "assumptions": [...]}.',
    `Keys: ${pool.map((ex) => ex.key).join(', ')}`,
  ].join('\n');
}

function sanitizeAssumptions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a) => typeof a === 'string' && a.trim().length > 0 && a.length <= 200)
    .slice(0, 8);
}

/**
 * Order the pool with the configured brain.
 *
 * @param {object} args
 * @param {Array} args.pool          Layer-1-legal, contract-annotated exercises
 * @param {string} args.dayTypeId
 * @param {Set<string>} [args.recentKeys]
 * @param {number|null} [args.headcount]
 * @param {'strict'|'open_gym'} [args.mode]
 * @param {Function|null} [args.completionFn]  async (prompt) => string. Injected
 *        for tests; production wiring resolves a provider lazily. Null = no LLM.
 * @param {object} [args.env]        process.env override for tests
 * @returns {Promise<{pool: Array, brainUsed: 'heuristic'|'llm',
 *                    fallbackReason: string|null, declaredAssumptions: string[]}>}
 */
export async function orderPoolWithBrain({
  pool, dayTypeId, recentKeys = new Set(), headcount = null, mode = 'strict',
  completionFn = null, env = process.env,
}) {
  const heuristic = () => heuristicBrain({ pool, recentKeys });

  const wantLlm = env.SWAN_BOOTCAMP_BRAIN === 'llm';
  if (!wantLlm) {
    return { pool: heuristic(), brainUsed: 'heuristic', fallbackReason: null, declaredAssumptions: [] };
  }
  if (typeof completionFn !== 'function') {
    return { pool: heuristic(), brainUsed: 'heuristic', fallbackReason: 'no_provider', declaredAssumptions: [] };
  }

  const timeoutMs = Number(env.SWAN_BOOTCAMP_BRAIN_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  try {
    const raw = await Promise.race([
      completionFn(buildBrainPrompt({ pool, dayTypeId, headcount, mode })),
      new Promise((_, reject) => setTimeout(() => reject(new Error('brain_timeout')), timeoutMs)),
    ]);
    const match = String(raw).match(/\{[\s\S]*\}/);
    if (!match) {
      return { pool: heuristic(), brainUsed: 'heuristic', fallbackReason: 'unparseable_reply', declaredAssumptions: [] };
    }
    const parsed = JSON.parse(match[0]);
    const ordered = validateBrainOrdering(parsed.orderedKeys, pool);
    if (!ordered) {
      return { pool: heuristic(), brainUsed: 'heuristic', fallbackReason: 'invalid_ordering', declaredAssumptions: [] };
    }
    return {
      pool: ordered,
      brainUsed: 'llm',
      fallbackReason: null,
      declaredAssumptions: mode === 'open_gym' ? sanitizeAssumptions(parsed.assumptions) : [],
    };
  } catch (err) {
    const reason = err?.message === 'brain_timeout' ? 'timeout' : 'provider_error';
    return { pool: heuristic(), brainUsed: 'heuristic', fallbackReason: reason, declaredAssumptions: [] };
  }
}

/**
 * Judgment metrics — the regression suite's ruler (Kimi R5). A brain that does
 * not beat the identity baseline on these is decorative.
 */
export function judgmentMetrics(ordered, { recentKeys = new Set(), window = 10 } = {}) {
  const head = ordered.slice(0, window);
  let sameAdjacent = 0;
  for (let i = 1; i < head.length; i += 1) {
    const a = head[i - 1].coreMovement?.pattern;
    const b = head[i].coreMovement?.pattern;
    if (a && b && a === b) sameAdjacent += 1;
  }
  const recentInHead = head.filter((ex) => recentKeys.has(ex.key)).length;
  return { sameAdjacent, recentInHead };
}
