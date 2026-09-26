/**
 * ledger.mjs — the Ledger's arithmetic. R6 / `AC6.1` / `AC6.2` / `AC6.3`, `T-E-03`, `T-I-06`.
 *
 * SPLIT FROM `ledgerTrend.mjs` FOR RULE 4, ON A REAL SEAM: that file answers *"what did the
 * operator throw away, and what does it say about the slots and facets?"* and this one answers
 * *"what did it cost versus what we said it would?"*. Different sources, different failure
 * modes, different files. The trend is re-exported below so a caller that wants the whole
 * Ledger still has one import.
 *
 * TWO SOURCES, TWO DIFFERENT QUESTIONS, AND THEY ARE NOT THE SAME LEDGER.
 *
 *   1. `rejected_all` comes from ASTRA'S OWN compile registry (`core/session.mjs`), where
 *      `setOutcome()` writes it. It is NOT a field on the Forge variant record.
 *   2. Cost comes from the FORGE VARIANT LEDGER (`.ai-workflow/forge-runs/runs.jsonl`), read
 *      through that store's own API (`shared/variantRun.mjs`), never by parsing the file — A0
 *      §5's `U2`: *"Astra reads through these modules, never by parsing files."*
 *
 * `02-BLUEPRINT.md` §3 has one row for this module and it is wrong on all three field names:
 * it says `core/ledger.mjs` reads *"`outcome`, `estimatedCents`, `actualCents`"* from the
 * variant store. Measured: the store's record has **no `outcome`** (that is Astra's), and
 * **neither `estimatedCents` nor `actualCents` exists anywhere in the shipped code** — the
 * contract `docs/ai-workflow/design-brain/forge-compiler-contract.md` §7 SPECIFIED those two
 * fields and the implementation shipped `costUsd` instead. Recorded as `C50`.
 *
 * WHY THE ESTIMATE IS A CHECKED MIRROR AND NOT A CALL.
 *
 * `AC6.2` wants the estimate and the actual shown side by side. The actual is on the record.
 * The estimate is `unitCost()` in `scripts/forge.mjs:48`, and Astra **cannot call it**: it is
 * not exported, and `forge.mjs` runs its CLI dispatcher at import, so importing it would run
 * the program. Re-deriving the rule in Astra is therefore unavoidable — and re-deriving it
 * silently would make this a SECOND SOURCE for one number, which is precisely the defect
 * `T-I-09` names (*"identical output from one source"*).
 *
 * So the mirror is PINNED. `estimateRule()` opens `forge.mjs` and requires the rule's own
 * text to still be there — the constant, the priced filter, and the window. If any is gone,
 * the estimate is reported `INCONCLUSIVE` with a named reason and **no number is shown**.
 * That is the same honesty mechanism the Law and State boards use (`lawBoard.mjs`,
 * `capabilities.mjs`): a claim whose support has vanished degrades loudly instead of
 * continuing to assert.
 *
 * THE RECONSTRUCTION IS EXACT, NOT APPROXIMATE. `unitCost(root)` returns the mean of the last
 * twenty priced runs *present in the ledger at the time it is called*. Forge calls it before
 * a generation, so the estimate in force for run `i` is a deterministic function of runs
 * `0..i-1`. Walking the ledger in order and recomputing that prefix mean reproduces exactly
 * what forge printed, which is what makes per-record drift a real measurement rather than a
 * plausible story. `a6-ledger.test.mjs` asserts the reconstruction against the rule for a
 * synthetic ledger in both directions.
 */

import { readFileSync } from 'node:fs';

import { REPO_ROOT } from './paths.mjs';
// Imported for LOCAL USE (buildLedger calls it) and re-exported, because `export … from`
// alone creates no local binding — the house lesson from A4b's Rule 4 splits.
import { rejectedAllTrend } from './ledgerTrend.mjs';

export { rejectedAllTrend };
export { OUTCOMES, REJECTED_ALL, TREND_MIN_REJECTED } from './ledgerTrend.mjs';

// ---------------------------------------------------------------------------
// AC6.2 — cost drift, and the pinned mirror of forge's estimate rule
// ---------------------------------------------------------------------------

/**
 * The three pieces of `scripts/forge.mjs` this module MIRRORS.
 *
 * Each is an exact substring of the shipped file. They are the enforcement expressions, not
 * names — the same rule `lawBoard.mjs` follows after mutation `M2` showed that a marker which
 * is merely a NAME keeps resolving after the thing it names is deleted.
 */
export const ESTIMATE_MARKERS = Object.freeze([
  { what: 'the measured fallback constant', marker: 'const MEASURED_FALLBACK = 0.003736;' },
  { what: 'the priced filter', marker: "r.status === 'ok' && typeof r.costUsd === 'number'" },
  { what: 'the 20-run window', marker: 'priced.slice(-20)' },
]);

/** The fallback forge uses with no history. Mirrored, and pinned by the marker above. */
export const MEASURED_FALLBACK_USD = 0.003736;

/** Forge's window, mirrored, and pinned by the marker above. */
export const ESTIMATE_WINDOW = 20;

/**
 * Is the rule this module mirrors still the rule in `forge.mjs`?
 *
 * Returns `{ ok, missing: [...] }`. `file` is injectable so the DEGRADATION can be shown
 * firing — a guard that cannot be demonstrated to fail is indistinguishable from one that
 * always passes (`A5`'s `D45`).
 */
export function estimateRule(file = `${REPO_ROOT}/scripts/forge.mjs`) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch (e) {
    return {
      ok: false,
      source: 'scripts/forge.mjs',
      missing: ESTIMATE_MARKERS.map((m) => m.what),
      reason: `E_LEDGER_RULE_UNREADABLE: ${e.code || e.message} — the estimate rule could not be `
        + 'read, so no estimate is shown. An unreadable rule is not an unchanged rule.',
    };
  }
  const missing = ESTIMATE_MARKERS.filter((m) => !src.includes(m.marker)).map((m) => m.what);
  return {
    ok: missing.length === 0,
    source: 'scripts/forge.mjs',
    missing,
    reason: missing.length
      ? `E_LEDGER_RULE_DRIFT: forge.mjs no longer contains ${missing.join('; ')}. The estimate `
        + 'below is a MIRROR of that rule, so it is withheld rather than shown as if it were forge\'s.'
      : null,
  };
}

/** The priced runs, in ledger order — the same filter forge applies. */
const pricedOf = (runs) => runs.filter((r) => r?.status === 'ok' && typeof r?.costUsd === 'number');

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

/**
 * Cost drift: for every priced generation, what forge PREDICTED it would cost versus what it
 * actually did. PURE.
 *
 * `rule` is the `estimateRule()` result. When it is not `ok`, every `estimatedUsd` is `null`
 * and the pane shows the actuals alone — never a mirrored number presented as forge's.
 *
 * @returns {{series: object[], priced: number, total: number, summary: object|null, rule: object}}
 */
export function costDrift(runs = [], { rule = { ok: true, missing: [] } } = {}) {
  const series = [];
  let seenPriced = 0;

  runs.forEach((r, i) => {
    const priced = r?.status === 'ok' && typeof r?.costUsd === 'number';
    if (!priced) return;
    seenPriced += 1;
    const before = pricedOf(runs.slice(0, i));
    const window = before.slice(-ESTIMATE_WINDOW);
    const estimatedUsd = rule.ok
      ? (before.length ? mean(window.map((x) => x.costUsd)) : MEASURED_FALLBACK_USD)
      : null;
    const actualUsd = r.costUsd;
    series.push({
      variantId: r.variantId ?? null,
      briefId: r.briefId ?? null,
      createdAt: r.createdAt ?? null,
      index: i,
      historyDepth: before.length,
      estimatedUsd,
      actualUsd,
      // `null`, never `0`: a drift of zero and an absent estimate are different facts, and
      // collapsing them would make "we could not compute this" read as "it matched exactly".
      deltaUsd: estimatedUsd === null ? null : actualUsd - estimatedUsd,
      basis: before.length
        ? `mean of the ${window.length} priced run(s) before it`
        : 'the measured fallback (no history at that point)',
    });
  });

  const deltas = series.filter((s) => s.deltaUsd !== null).map((s) => s.deltaUsd);
  const summary = deltas.length ? {
    n: deltas.length,
    meanActualUsd: mean(series.map((s) => s.actualUsd)),
    meanEstimatedUsd: mean(series.filter((s) => s.estimatedUsd !== null).map((s) => s.estimatedUsd)),
    meanDeltaUsd: mean(deltas),
    overCount: deltas.filter((d) => d > 0).length,
    underCount: deltas.filter((d) => d < 0).length,
    exactCount: deltas.filter((d) => d === 0).length,
    maxAbsDeltaUsd: Math.max(...deltas.map(Math.abs)),
  } : null;

  return { series, priced: seenPriced, total: runs.length, summary, rule };
}

// ---------------------------------------------------------------------------
// The assembled view — PURE. THIS MODULE DOES NO I/O EXCEPT READING forge.mjs.
// ---------------------------------------------------------------------------

/**
 * Assemble the Ledger pane's whole view from data. PURE.
 *
 * THE READS HAPPEN ELSEWHERE, and that is deliberate. `variants.mjs` owns the variant store and
 * the brief store; this module takes what it returns. A module that both reads a store and
 * computes over it cannot be tested without the store, and the arithmetic here is the part worth
 * testing exhaustively — including the cases a real ledger will not contain for months.
 *
 * TWO KINDS OF INCOMPLETENESS, AND THEY ARE NOT THE SAME FACT. `runsError` is "the store could
 * not be read at all"; `runsSkipped` is "the store was read and N lines in it were corrupt".
 * The first yields an empty run list; the second yields a SHORT one. Both mean the numbers are
 * not complete, and a pane that showed either as a full table would be asserting a completeness
 * it does not have — which is `T-M-03`'s rule applied to a ledger instead of a compile. So both
 * are threaded through rather than swallowed.
 *
 * @param {{compiles: object[], variantRuns: object[], rule: object, runsError: object|null,
 *          runsSkipped: number}} input
 */
export function buildLedger({
  compiles = [], variantRuns = [], rule = estimateRule(), runsError = null, runsSkipped = 0,
} = {}) {
  const trend = rejectedAllTrend(compiles);
  const drift = costDrift(variantRuns, { rule });
  // NO `estimateAvailable` FIELD. The first version computed `rule.ok && drift.priced > 0` here
  // and nothing ever read it — the pane decides the same thing from `drift.rule.ok` and
  // `drift.priced`, which it already has. A convenience field with no reader is a second place
  // for one fact to be computed, and the whole point of `costDrift`'s `rule` passthrough is that
  // there is ONE. Found by A6's hostile round (C4) and deleted rather than wired.
  return { trend, drift, runsError, runsSkipped };
}
