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
// R-H26: the SAME day-type enum the Sprint create/update contracts validate against, so the two
// seams R-H26 names cannot drift apart. The `dayTypeContract` registry is built from
// `SWAN_DAY_TYPES`, which describes itself as a registry rather than THE registry and rejects
// `custom` - validating against it split the vocabulary in two (found in round 158).
import { DAY_TYPES } from './bootcampTemplateRules.mjs';

const DEFAULT_TIMEOUT_MS = 8000;

/** Reply cap, also disclosed to the provider as an output bound (R-H27). */
const MAX_REPLY_CHARS = 64_000;

/** R-H26: the Brain seam's CLOSED mode enum. Anything else is contained to `strict`. */
const BRAIN_MODES = Object.freeze(['strict', 'open_gym']);

/** R-H27 occupancy: unsettled optional Brain provider operations in THIS process (0 or 1). */
let unsettledOptionalBrainOps = 0;

/**
 * How long the occupancy survives a DEADLINE without provider settlement (R-H27, hostile review 171).
 *
 * The slot is held until the provider settles - that is the requirement, and it is what stops a
 * timed-out-but-running adapter from being double-spent. But "until settlement" cannot be unbounded: a
 * provider that NEVER settles (permitted by the documented contract, which does not include `signal`)
 * would hold the process's only slot forever, so every later Brain call returns `brain_busy` with the
 * adapter never invoked again, and only a restart clears it. After the deadline we abort, then give the
 * adapter this bounded grace period to honour that abort, then release the slot so a healthy adapter is
 * reachable again.
 */
const OCCUPANCY_GRACE_MS = 1_500;

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

function buildBrainPrompt({ tokens, tokenToKey, pool, recentKeys, dayTypeId, headcount, mode }) {
  // R-H26: NEVER DISPATCH UNSUPPORTED TEXT. Keys already travel as opaque `ex_0..ex_N` because a
  // trainer-authored key can carry PII or a newline (see the note below). The day type and the
  // headcount were interpolated RAW and carried the very same vector, so the seam validates them HERE,
  // at the one place that interpolates, rather than trusting any caller:
  //   * the day type must be a member of the SHARED `DAY_TYPES` enum - the one the Sprint
  //     create/update contracts already validate against - else the literal `unknown`;
  //   * the headcount must be a finite number, clamped to 1..500, else omitted entirely;
  //   * the mode is contained to its closed enum, so a near-miss like `open_gym ` cannot open the
  //     assumption channel, which is the channel that invites invented equipment facts.

  const safeDayTypeId = DAY_TYPES.includes(dayTypeId) ? dayTypeId : 'unknown';
  // `Number(null)` is 0, NOT NaN, so an absent headcount used to clamp UP to 1 and the prompt announced
  // "of 1 people" as though it were a fact. Absence must stay absent.
  const headcountAbsent = headcount === null || headcount === undefined || headcount === '';
  const parsedHeadcount = headcountAbsent ? NaN : Number(headcount);
  const safeHeadcount = Number.isFinite(parsedHeadcount)
    ? Math.min(500, Math.max(1, Math.trunc(parsedHeadcount)))
    : null;
  const safeMode = BRAIN_MODES.includes(mode) ? mode : 'strict';

  // R-H26 WIRE PAYLOAD: the opaque tokens PLUS the per-exercise decision facts the register names - a
  // canonical movement-pattern ID or `unknown`, a recent boolean, and a setup bucket on the register's
  // OWN boundaries (0-5, 6-20, over 20 seconds). Without them the prompt instructed the model to "push
  // recently-used keys later" and to prefer "quick-setup exercises" while showing it neither fact, so
  // two of its own rules were unfollowable. The boundaries are deliberately NOT the five-bucket
  // `SETUP_TIME_CATEGORIES` from `bootcampConstants.mjs`, which answers a different question.
  const byKey = new Map(pool.map((ex) => [ex.key, ex]));
  const setupBucket = (seconds) => {
    const secs = Number(seconds);
    if (!Number.isFinite(secs)) return 'unknown';
    if (secs <= 5) return '0-5';
    if (secs <= 20) return '6-20';
    return 'over-20';
  };
  const facts = tokens.map((token) => {
    const ex = byKey.get(tokenToKey.get(token)) ?? {};
    return `${token}: pattern=${ex.coreMovement?.pattern || 'unknown'}`
      + ` recent=${recentKeys?.has(ex.key) ? 'yes' : 'no'}`
      + ` setup=${setupBucket(ex.setupTimeSec)}`;
  });
  // Keys + aggregate context ONLY (Rule 8). No names, no notes, no history text.
  return [
    `Order these exercise keys for a ${safeDayTypeId} group class`
      + (safeHeadcount ? ` of ${safeHeadcount} people` : '') + '.',
    'Rules: alternate movement patterns (never the same twice in a row);',
    'push recently-used keys later; quick-setup exercises earlier.',
    safeMode === 'open_gym'
      ? 'No equipment profile is set: assume common gym equipment and list every assumption you make.'
      : 'Equipment is pre-filtered; do not reason about it.',
    'Reply ONLY with JSON: {"orderedKeys": [...], "assumptions": [...]}.',
    // OPAQUE TOKENS, never raw keys (Kimi security F2). Exercise keys are
    // trainer-authored free text — a key like `johns-post-op-knee-rehab` is
    // client PII, and a key containing newlines is a prompt-injection vector.
    // The model sees ex_0..ex_N; the caller maps back after validation. This
    // kills both the PII side-channel and key-borne injection in one move.
    `Keys: ${tokens.join(', ')}`,
    // One line per token: the facts above, keyed by the opaque token the model must speak back.
    `Facts: ${facts.join('; ')}`,
  ].join('\n');
}

/** Bidirectional opaque-token map so raw keys never touch the LLM wire. */
function buildTokenMap(pool) {
  const tokenToKey = new Map();
  const tokens = pool.map((ex, i) => {
    const token = `ex_${i}`;
    tokenToKey.set(token, ex.key);
    return token;
  });
  return { tokens, tokenToKey };
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

  // Clamp the timeout to a sane band (Kimi F4): env is ops-set, but defense in
  // depth against a mis-set 99999999 that would let a hung provider pin a
  // request for a day.
  const rawTimeout = Number(env.SWAN_BOOTCAMP_BRAIN_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const timeoutMs = Math.min(30_000, Math.max(1_000, rawTimeout));
  const { tokens, tokenToKey } = buildTokenMap(pool);

  // R-H27 OCCUPANCY: at most ONE unsettled optional Brain provider operation per server process.
  // A second concurrent request gets a deterministic fallback WITHOUT reaching the adapter. The slot
  // is released when the PROVIDER settles — not when the race returns — which is why a timed-out but
  // still-running adapter keeps holding it. That is the requirement stated plainly ("do not release
  // the occupancy merely because Promise.race returned"), and it is per-process containment, NOT
  // cluster-wide spend control.
  //
  // PRECISION, added after the round-178 hostile review: this counter holds UNRELEASED SLOTS, not a
  // count of running providers. The release happens either on settlement or after OCCUPANCY_GRACE_MS,
  // so an adapter that ignores the abort can still be running when the slot is freed - the review
  // measured maxLive = 2 in exactly that case. A fixed delay is not evidence of cancellation.
  if (unsettledOptionalBrainOps >= 1) {
    return { pool: heuristic(), brainUsed: 'heuristic', fallbackReason: 'brain_busy', declaredAssumptions: [] };
  }
  // Constructed BEFORE the increment: it used to sit between the increment and the release attachment
  // and outside the `try`, so a throw here wedged the counter with no provider promise in existence.
  const controller = new AbortController();
  let occupancyReleased = false;
  // SINGLE-RELEASE GUARD: a grace release followed by a late settlement must not decrement twice, or the
  // counter could drift below the truth and let two providers run at once.
  const releaseOccupancy = () => {
    if (occupancyReleased) return;
    occupancyReleased = true;
    unsettledOptionalBrainOps = Math.max(0, unsettledOptionalBrainOps - 1);
  };
  unsettledOptionalBrainOps += 1;
  let timer = null;
  let graceTimer = null;
  try {
    // R-H27 ABORT: the provider callback receives a SECOND options argument carrying an AbortSignal
    // plus the request/output bounds. One attempt, no retry.
    const providerPromise = Promise.resolve().then(() => completionFn(
      buildBrainPrompt({ tokens, tokenToKey, pool, recentKeys, dayTypeId, headcount, mode }),
      { signal: controller.signal, maxOutputChars: MAX_REPLY_CHARS, attempt: 1 },
    ));
    // Release at ACTUAL settlement. The rejection handler is doing double duty: it stops a late
    // provider failure from surfacing as an unhandled rejection once the race has already returned.
    providerPromise.then(releaseOccupancy, releaseOccupancy);
    const raw = await Promise.race([
      providerPromise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          // Abort where supported. An adapter that ignores the signal is unharmed; one that honours
          // it stops work the caller has already given up on.
          controller.abort();
          // Bounded hold (see OCCUPANCY_GRACE_MS): release the slot after the grace period even if the
          // adapter never settles, so one hung call cannot disable the Brain for the process lifetime.
          // `unref` keeps this timer from holding the event loop open. If the provider settles first,
          // the single-release guard makes this a no-op.
          graceTimer = setTimeout(releaseOccupancy, OCCUPANCY_GRACE_MS);
          if (typeof graceTimer.unref === 'function') graceTimer.unref();
          reject(new Error('brain_timeout'));
        }, timeoutMs);
      }),
    ]);
    // Cap the response BEFORE the regex/parse (Kimi F4): an unbounded body is a
    // memory/CPU event per request. 64KB is generous for a key ordering.
    const rawStr = String(raw);
    if (rawStr.length > MAX_REPLY_CHARS) {
      return { pool: heuristic(), brainUsed: 'heuristic', fallbackReason: 'oversized_reply', declaredAssumptions: [] };
    }
    const match = rawStr.match(/\{[\s\S]*\}/);
    if (!match) {
      return { pool: heuristic(), brainUsed: 'heuristic', fallbackReason: 'unparseable_reply', declaredAssumptions: [] };
    }
    const parsed = JSON.parse(match[0]);
    // Map opaque tokens back to real keys before validation — the model only
    // ever spoke tokens. An unknown token maps to undefined and fails the
    // subset check, which is the correct rejection.
    const mappedKeys = Array.isArray(parsed.orderedKeys)
      ? parsed.orderedKeys.map((t) => tokenToKey.get(t))
      : null;
    const ordered = validateBrainOrdering(mappedKeys, pool);
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
  } finally {
    // Clear the race timer on every settle (Kimi F4) — a leaked timer keeps the
    // event loop alive after the request resolved.
    if (timer) clearTimeout(timer);
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
