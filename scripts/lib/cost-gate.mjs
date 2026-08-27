/**
 * Cost Gate + Cost Summary for the AI Village orchestrator
 * ========================================================
 * Sean's directive 2026-06-15: "approval gates to protect overspending… keep an
 * eye on credits." This module gives the Village three spend controls:
 *
 *   1. Pre-run ESTIMATE   — a conservative upper-bound cost for the run, with a
 *                           per-stage breakdown of which PAID models will run.
 *   2. CONFIRM gate       — refuses to spend unattended: interactive y/n on a TTY,
 *                           or requires SWAN_VILLAGE_CONFIRM=yes when non-interactive
 *                           (fail-closed — never auto-spends without explicit opt-in).
 *   3. Hard CAP           — SWAN_VILLAGE_MAX_USD aborts BEFORE spending if the
 *                           estimate exceeds the cap, and is re-checked mid-run before
 *                           the single most expensive call (the synthesis judge).
 *
 * Plus a post-run PER-MODEL COST SUMMARY (models used · calls · tokens · $ each ·
 * total) printed and written to cost-summary.md so credits are always visible.
 *
 * Pricing note: only PAID models carry a rate here; free US/EU models (Nemotron,
 * Trinity, Gemini Flash) are $0. The post-run summary uses the REAL per-result
 * costUSD the orchestrator already tracks — this module's PRICING is only for the
 * pre-run estimate. Keep PRICING in sync with the cost branches in
 * validation-orchestrator.mjs `runValidator`.
 *
 * @module cost-gate
 */

import { createInterface } from 'node:readline';
// The consult ledger. Static import is safe: spend-ledger.mjs imports nothing from
// here, so there is no cycle (verified). Reconciling these two was SWA-218 — until
// 2026-08-26 the Village and the ledger had zero references to each other.
import { spentOnTopic, spentToday, CAPS as LEDGER_CAPS } from './spend-ledger.mjs';

/** Known PAID model pricing ($ per 1M tokens). Anything absent is treated as free ($0). */
export const PRICING = {
  'anthropic/claude-sonnet-4.6': { in: 3.0, out: 15.0 },
  'minimax/minimax-m2.7':        { in: 0.30, out: 1.20 },
  'z-ai/glm-5.2':                { in: 1.20, out: 4.10 },  // design-debate lead (verified 2026-06-20)
  'gemini-3.1-pro-preview':      { in: 2.0, out: 12.0 },
};

const DEFAULT_MAX_OUTPUT_TOKENS = 4096;      // matches callOpenRouter max_tokens
const DEFAULT_MAX_DEBATE_ROUNDS = 25;        // matches recursive-consensus MAX_ROUNDS (worst case)
const DEFAULT_TYPICAL_DEBATE_ROUNDS = 3;     // debates usually converge in a few rounds (typical case)
const DEFAULT_DEBATE_COUNT = 3;              // representative number of specialty debates

/**
 * Resolve the price for a model. `extra` lets the caller inject runtime-configured
 * prices (e.g. the env-overridable Fusion judge) that aren't in the static map.
 * @returns {{in:number, out:number}}
 */
export function priceFor(model, extra = {}) {
  return extra[model] || PRICING[model] || { in: 0, out: 0 };
}

/**
 * Standing hard-cap floor ($) applied when SWAN_VILLAGE_MAX_USD is unset or invalid
 * (Sean 2026-07-04: "make sure we don't overspend"). A normal Village run estimates
 * well under this; raise it per-run via SWAN_VILLAGE_MAX_USD for a deliberately larger pass.
 */
export const DEFAULT_MAX_USD = 8;

/** Read the spend-gate config from the environment. */
export function resolveBudget(env = process.env) {
  const capRaw = env.SWAN_VILLAGE_MAX_USD;
  const capUSD = capRaw != null && capRaw !== '' ? Number(capRaw) : null;
  return {
    capUSD: Number.isFinite(capUSD) ? capUSD : DEFAULT_MAX_USD,
    preApproved: String(env.SWAN_VILLAGE_CONFIRM || '').toLowerCase() === 'yes',
  };
}

const tok = (chars) => Math.ceil((chars || 0) / 4);

/**
 * Conservative pre-run cost estimate. Free models contribute $0. Debates are
 * variable (1..maxRounds) so the estimate assumes the worst case (maxRounds) to
 * keep the cap fail-safe. Pure function — exported for testing.
 *
 * @param {Object} a
 * @param {Array<{name?:string, model:string}>} a.tracks - Phase-1 tracks
 * @param {number} a.inputChars - size of the code/doc bundle fed to each track
 * @param {{model:string}|null} [a.judge] - synthesis judge (or null if disabled)
 * @param {boolean} [a.debatesEnabled] - whether Phase 2/3 debates will run
 * @param {Record<string,{in:number,out:number}>} [a.extraPricing] - runtime prices
 * @param {number} [a.maxOutputTokens]
 * @param {number} [a.debateCount]
 * @param {number} [a.maxDebateRounds]
 * @param {number} [a.typicalDebateRounds]
 * @returns {{ low:number, high:number, totalUSD:number, breakdown: Array<{stage:string, model:string, costUSD:number}> }}
 *          low = typical run, high = worst case (= totalUSD, used for the hard-cap check).
 */
export function estimateRunCost({
  tracks = [],
  inputChars = 0,
  judge = null,
  debatesEnabled = false,
  extraPricing = {},
  maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
  debateCount = DEFAULT_DEBATE_COUNT,
  maxDebateRounds = DEFAULT_MAX_DEBATE_ROUNDS,
  typicalDebateRounds = DEFAULT_TYPICAL_DEBATE_ROUNDS,
}) {
  const inTok = tok(inputChars);
  const breakdown = [];
  let fixed = 0; // phase1 + judge — deterministic (one call each)

  const add = (stage, model, costUSD) => {
    if (costUSD > 0) { breakdown.push({ stage, model, costUSD }); fixed += costUSD; }
  };

  // Phase 1 — each paid track: full input once + capped output.
  for (const t of tracks) {
    const p = priceFor(t.model, extraPricing);
    add('phase1', t.model, (inTok / 1e6) * p.in + (maxOutputTokens / 1e6) * p.out);
  }

  // Synthesis judge — input ≈ all analyst outputs (≈ tracks × capped output) + own output.
  if (judge) {
    const p = priceFor(judge.model, extraPricing);
    const judgeIn = tracks.length * maxOutputTokens;
    add('judge', judge.model, (judgeIn / 1e6) * p.in + (maxOutputTokens / 1e6) * p.out);
  }

  // Debates — variable round count → a typical..worst range. Representative paid
  // pairing (Sonnet rates) so the worst case never under-estimates the cap.
  let debLow = 0, debHigh = 0;
  if (debatesEnabled) {
    const rep = priceFor('anthropic/claude-sonnet-4.6', extraPricing);
    const perRound = (inTok / 1e6) * rep.in + (maxOutputTokens / 1e6) * rep.out;
    debLow = perRound * typicalDebateRounds * debateCount;
    debHigh = perRound * maxDebateRounds * debateCount;
    if (debHigh > 0) breakdown.push({ stage: 'debates', model: `debate panel (${typicalDebateRounds}-${maxDebateRounds} rounds ea)`, costUSD: debHigh });
  }

  const high = fixed + debHigh;
  return { low: fixed + debLow, high, totalUSD: high, breakdown };
}

/** Roll up real per-result costs by model. Pure function — exported for testing. */
export function aggregateCostByModel(results = []) {
  const map = new Map();
  for (const r of results) {
    if (!r || !r.model) continue;
    const key = r.model;
    const cur = map.get(key) || { model: key, calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 };
    cur.calls += 1;
    cur.inputTokens += r.inputTokens || 0;
    cur.outputTokens += r.outputTokens || 0;
    cur.costUSD += r.costUSD || 0;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.costUSD - a.costUSD);
}

const usd = (n) => `$${(n || 0).toFixed(4)}`;

/** Human-readable per-model cost summary for the console. Pure function. */
export function formatCostSummary(results = []) {
  const rows = aggregateCostByModel(results);
  const total = rows.reduce((s, r) => s + r.costUSD, 0);
  const paid = rows.filter((r) => r.costUSD > 0);
  const lines = ['  ── Cost summary (credits used) ──'];
  if (!rows.length) return '  ── Cost summary ── (no model calls recorded)';
  for (const r of rows) {
    const free = r.costUSD === 0 ? ' (free)' : '';
    lines.push(`    ${r.model.padEnd(42)} ${String(r.calls).padStart(2)}× ${usd(r.costUSD).padStart(10)}${free}`);
  }
  lines.push(`    ${'TOTAL'.padEnd(42)} ${String(rows.reduce((s, r) => s + r.calls, 0)).padStart(2)}× ${usd(total).padStart(10)}`);
  lines.push(`    paid models: ${paid.length} · free models: ${rows.length - paid.length}`);
  return lines.join('\n');
}

/** Markdown version of the cost summary for the cost-summary.md artifact. */
export function formatCostSummaryMarkdown(results = []) {
  const rows = aggregateCostByModel(results);
  const total = rows.reduce((s, r) => s + r.costUSD, 0);
  let md = `# Cost Summary — credits used this run\n\n`;
  md += `| Model | Calls | Input tok | Output tok | Cost |\n|---|---:|---:|---:|---:|\n`;
  for (const r of rows) {
    md += `| ${r.model} | ${r.calls} | ${r.inputTokens.toLocaleString()} | ${r.outputTokens.toLocaleString()} | ${usd(r.costUSD)} |\n`;
  }
  md += `| **TOTAL** | ${rows.reduce((s, r) => s + r.calls, 0)} | | | **${usd(total)}** |\n`;
  return md;
}

/** Render the estimate as a console block. */
export function formatEstimate(estimate, capUSD) {
  const lines = ['  ── Pre-run cost gate ──'];
  if (!estimate.breakdown.length) {
    lines.push('    Estimated paid spend: $0.00 (all free models)');
  } else {
    for (const b of estimate.breakdown) lines.push(`    ${b.stage.padEnd(10)} ${b.model.padEnd(42)} ~${usd(b.costUSD)}`);
    const range = (estimate.low != null && estimate.low < estimate.high)
      ? `~${usd(estimate.low)} (typical) – ${usd(estimate.high)} (worst case)`
      : `~${usd(estimate.high ?? estimate.totalUSD)}`;
    lines.push(`    ${'ESTIMATE'.padEnd(53)} ${range}`);
  }
  lines.push(`    Hard cap (SWAN_VILLAGE_MAX_USD): ${capUSD == null ? 'not set' : usd(capUSD)}`);
  return lines.join('\n');
}

/**
 * Interactive (or pre-approved) spend confirmation.
 * - SWAN_VILLAGE_CONFIRM=yes  → proceed without prompting.
 * - TTY                       → prompt y/N.
 * - non-TTY & not pre-approved → DECLINE (fail-closed; never auto-spend).
 *
 * @returns {Promise<boolean>}
 */
export async function confirmSpend({ estimate, capUSD, env = process.env, input = process.stdin, output = process.stdout } = {}) {
  const { preApproved } = resolveBudget(env);
  // Nothing to pay for → no confirmation needed.
  if (!estimate || estimate.totalUSD <= 0) return true;
  if (preApproved) return true;
  if (!input.isTTY) return false; // fail-closed when unattended

  const rl = createInterface({ input, output });
  try {
    const answer = await new Promise((res) => rl.question(
      `    Proceed with ~${usd(estimate.totalUSD)} estimated spend${capUSD != null ? ` (cap ${usd(capUSD)})` : ''}? [y/N] `,
      res,
    ));
    return /^y(es)?$/i.test(String(answer).trim());
  } finally {
    rl.close();
  }
}

/**
 * Decide whether a run may proceed: estimate → cap check → confirm.
 * Returns { proceed, reason, capUSD, estimate }. Does NOT exit the process.
 */
export async function evaluateSpendGate({
  tracks, inputChars, judge, debatesEnabled, extraPricing,
  topic = 'village', env = process.env, log = () => {},
  ledger = null,
}) {
  const { capUSD } = resolveBudget(env);
  const estimate = estimateRunCost({ tracks, inputChars, judge, debatesEnabled, extraPricing });
  log(formatEstimate(estimate, capUSD));

  if (capUSD != null && estimate.totalUSD > capUSD) {
    return { proceed: false, reason: `estimate ${usd(estimate.totalUSD)} exceeds hard cap ${usd(capUSD)} — raise SWAN_VILLAGE_MAX_USD or narrow the run`, capUSD, estimate };
  }

  // --- CUMULATIVE caps, reconciled with the consult ledger (SWA-218) ---------
  //
  // Until 2026-08-26 this gate and scripts/lib/spend-ledger.mjs did not know each
  // other existed: zero references to recordSpend or spend-ledger in the whole
  // orchestrator. So a Village run was checked ONLY against its own per-run ceiling,
  // and consult spend earlier the same day was invisible to it — in both directions.
  //
  // That is precisely the hole the ledger was built for. Sean's original words:
  // no single call was outrageous, "four reasonable calls in a row are what blew the
  // budget." A per-run ceiling alone would have approved every one of them, and a
  // Village run is one of the largest single calls in the system.
  //
  // NOTE WHICH CAPS APPLY. perTopic and perDay do. **perCall deliberately does NOT** —
  // it is $1.00, sized for one consult, while a legitimate Village run costs more.
  // Enforcing it here would refuse every honest run, and a gate that cries wolf is
  // one the human learns to wave through. That failure mode is named in the guard's
  // own comments and is worse than the hole being closed.
  // The whole cumulative check is wrapped, not just the module load. An earlier
  // draft guarded only the import and a test caught it immediately: a ledger whose
  // READ throws propagated straight out of the gate and would have crashed the run.
  // Fail-open means fail-open at every step that can fail, or it is just a slogan.
  const cumulative = (() => {
    const cum = readCumulative(ledger);
    if (!cum) return null;
    try {
      const onTopic = cum.spentOnTopic(topic) || 0;
      const onDay = cum.spentToday() || 0;
      return { onTopic, onDay, caps: cum.CAPS };
    } catch (err) {
      log(`  [ledger] cumulative check SKIPPED — ${err?.message}. This run is capped only per-run.`);
      return null;
    }
  })();

  if (cumulative) {
    const { onTopic, onDay, caps } = cumulative;
    const projTopic = onTopic + estimate.totalUSD;
    const projDay = onDay + estimate.totalUSD;
    log(`  [ledger] topic "${topic}": ${usd(onTopic)} spent + ${usd(estimate.totalUSD)} est = ${usd(projTopic)} (cap ${usd(caps.perTopic)})`);
    log(`  [ledger] today: ${usd(onDay)} spent + ${usd(estimate.totalUSD)} est = ${usd(projDay)} (cap ${usd(caps.perDay)})`);
    if (projTopic > caps.perTopic) {
      return { proceed: false, reason: `topic "${topic}" would reach ${usd(projTopic)}, over the ${usd(caps.perTopic)} per-topic cap — this run plus what was already spent on it`, capUSD, estimate };
    }
    if (projDay > caps.perDay) {
      return { proceed: false, reason: `today would reach ${usd(projDay)}, over the ${usd(caps.perDay)} daily cap`, capUSD, estimate };
    }
  }
  const ok = await confirmSpend({ estimate, capUSD, env });
  return {
    proceed: ok,
    reason: ok ? 'approved' : 'declined (set SWAN_VILLAGE_CONFIRM=yes for unattended runs, or answer y at the prompt)',
    capUSD,
    estimate,
  };
}

/**
 * Load the shared consult ledger, or null if it cannot be reached.
 *
 * Injectable (`ledger`) so the tests can drive the cap logic without touching real
 * spend state, and so a future caller can pass a stub.
 *
 * FAIL-OPEN, AND SAYING SO. If the ledger module cannot be loaded, this returns null
 * and the cumulative check is SKIPPED — the run proceeds on its per-run cap alone.
 * That is the pre-2026-08-26 behaviour, so a bug here can never be worse than what
 * shipped before; it just stops being better. The alternative — refusing every
 * Village run because a library failed to import — would brick a paid feature over a
 * cost check, which the guard's own doctrine calls more expensive than the spend it
 * prevents. An ABSENT ledger file is not an error: it legitimately means nothing has
 * been spent yet, and readLedger() already returns [] for it.
 */
function readCumulative(injected) {
  if (injected) return injected;
  try {
    return { spentOnTopic, spentToday, CAPS: LEDGER_CAPS };
  } catch {
    return null;
  }
}

/**
 * Write a finished run's ACTUAL cost into the shared consult ledger (SWA-218).
 *
 * Lives here, not inline in the 3,000-line orchestrator, so it can actually be
 * tested — running the real Village costs money, so an untestable write path would
 * ship on "it looks right", which is how the disconnect lasted this long.
 *
 * One row PER MODEL rather than one per run: it matches the ledger's shape, matches
 * cost-summary.md, and makes "which seat cost that?" answerable later.
 *
 * @param {Array} results   orchestrator results ({ model, status, costUSD })
 * @param {string} topic    normalized via topicFromPath by the CALLER — one normalizer
 * @param {Function} record injectable recordSpend, for tests
 * @returns {{recorded:number, skipped:number, error:string|null}}
 */
export function recordRunSpend(results, topic, record) {
  let recorded = 0;
  let skipped = 0;
  try {
    for (const r of results || []) {
      // Only SUCCESS rows cost money. An errored track that never returned a
      // completion is not spend, and booking it would inflate the caps toward
      // false refusals — the cry-wolf direction.
      if (!r || r.status !== 'SUCCESS') { skipped += 1; continue; }
      // `usd` is passed through UNTOUCHED, including undefined. recordSpend() treats
      // an unpriceable value as WORST CASE against the caps, so a call nobody could
      // price pushes toward refusal instead of booking a confident, false $0.00.
      record({ model: r.model || r.name || 'unknown', topic, usd: r.costUSD, note: 'ai-village' });
      recorded += 1;
    }
    return { recorded, skipped, error: null };
  } catch (err) {
    // NON-FATAL. The money is already spent; losing the run's report as well would
    // be strictly worse. The caller logs this loudly.
    return { recorded, skipped, error: err?.message || String(err) };
  }
}

/** True when accumulated spend has already blown the cap (mid-run guard). */
export function isOverCap(accumulatedUSD, capUSD) {
  return capUSD != null && (accumulatedUSD || 0) > capUSD;
}
