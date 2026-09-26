/**
 * paneLedger.mjs — the Ledger pane: what is it learning. `AC6.1` / `AC6.2` / `AC6.3`.
 *
 * THE ONLY PANE THAT REPORTS A PATTERN, AND THEREFORE THE ONLY ONE THAT CAN BE MISREAD AS A
 * FINDING. Every other pane reports a fact about ONE compile; this one reports across many,
 * and a pattern is the shape of claim this engagement has spent itself learning to distrust.
 * Three defences are built into the RENDERING rather than left to the reader:
 *
 *   1. **A SHARE WITH NO DENOMINATOR IS ABSENT, NOT ZERO.** `share` is `null` when nothing
 *      was measured and the pane prints `—`. A `0%` there reads as "never rejected", which is
 *      a claim, and it is not one the data supports.
 *   2. **A TREND BELOW THE THRESHOLD IS COUNTED AND NOT READ.** `ledgerTrend.mjs` states
 *      `TREND_MIN_REJECTED` as a judgement; below it the pane shows the counts and withholds
 *      the reading, and the copy says which of the two it is doing.
 *   3. **DRIFT IS NEVER AVERAGED AWAY.** `AC6.2` is explicit and this is its whole point: a
 *      mean delta of zero is exactly what you get from one run that cost double the estimate
 *      and one that cost nothing. So EVERY row carries its own delta, and the summary reports
 *      the DIRECTION COUNTS beside the mean rather than instead of it. `a6-drift.test.mjs`
 *      asserts the per-row count, so a rendering that replaced the rows with the mean fails.
 *      That section lives in `paneLedgerDrift.mjs` — see the note below.
 *
 * SPLIT FOR RULE 4, ON THE SAME SEAM `core/ledger.mjs` / `core/ledgerTrend.mjs` USE. This file
 * renders the BATCH (the dial's home) and the TREND; the COST half moved to its sibling, which
 * is the half the hostile round's C1/C2/C7 fixes landed in. Splitting on that seam at both
 * layers is deliberate: the two halves have different sources (Astra's compile registry versus
 * the Forge variant store) and different failure modes, so the boundary is real rather than a
 * line count reached. Nothing here re-derives what the sibling computes.
 *
 * THE COST COLUMN CAN BE ABSENT, AND WHEN IT IS, IT SAYS WHY. The estimate is a MIRROR of
 * `unitCost()` in `scripts/forge.mjs` (see `core/ledger.mjs`), and a mirror is only
 * trustworthy while the thing mirrored is unchanged. When the marker check fails, the pane
 * withholds the estimate and renders the reason — never a mirrored number presented as
 * forge's. The actuals stay, because an actual is a fact about the store, not a
 * reconstruction of it.
 *
 * ZERO CONTROLS IS NOT AN OPTION HERE, and the difference from Law and State is worth stating.
 * Those two are read-only BY DESIGN (`READ_ONLY_PANES`); this pane has exactly ONE control,
 * because `02-BLUEPRINT.md` §5 row 7 gives the Ledger's `rejected_all` write a dial. It is
 * emitted only on a row that is still `pending`, so the pane cannot offer an action that would
 * do nothing.
 *
 * PURE. It renders the data it is handed and does no I/O — the caller resolves the compile
 * registry, the variant store and the estimate rule, so this file can be rendered in a test
 * from literals, including the cases a real ledger will not contain for months.
 */

import { escapeHtml, badge, controlAttr, stateEmpty, stateFailure, statePartial } from './shell.mjs';
import { CONTROLS } from './controls.mjs';
// Imported for LOCAL USE, and NOT re-exported. The house pattern after a Rule 4 split is to
// re-export so the original surface is unchanged — but that half preserves an EXISTING name,
// and `driftSection` was never exported from this module. Re-exporting it would add surface
// with no reader, which is the defect A6's hostile round deleted one layer up (C4).
import { driftSection } from './paneLedgerDrift.mjs';

const ctl = (id) => CONTROLS.find((c) => c.id === id) ?? { id, kind: 'dial', effect: 'unregistered control' };

/** The dial's id, spelled once. */
const REJECT = 'ledger.markRejectedAll';

/** How many batch rows the pane shows before it says it is truncating. */
const BATCH_SHOWN = 12;

// --- money ---------------------------------------------------------------------------
// Only the TREND's share formatting is left here; the cost section's money helpers (`cents`,
// `fmtCents`, `fmtDelta`) moved with that section, to `paneLedgerDrift.mjs`.
const pct = (share) => (share === null ? '—' : `${(share * 100).toFixed(0)}%`);
/** `n of m (33%)` — the fraction AND the share, because a share alone hides its denominator. */
const ratio = (hit, all) => `${hit} of ${all} <span class="muted">(${pct(all ? hit / all : null)})</span>`;
const clock = (iso) => (typeof iso === 'string' && iso.length >= 19 ? iso.slice(11, 19) : '—');

// --- §1 the batch: the dial's home ---------------------------------------------------

function batchRow(c) {
  const pending = c.outcome === 'pending';
  // THE BUTTON IS THE ONLY CONTROL ON THIS PANE, and it exists only while there is something
  // to decide. `data-compile-id` is on the element the handler reads it from.
  const action = pending
    ? `<button type="button" class="primary" ${controlAttr(ctl(REJECT))}`
      + ` data-compile-id="${escapeHtml(c.compileId)}">MARK REJECTED-ALL</button>`
    : '<span class="muted">decided — no action offered</span>';
  return `<tr class="ledger-row ledger-row--${escapeHtml(c.outcome)}">
  <td class="k"><code>${escapeHtml(c.compileId)}</code></td>
  <td class="ledger-outcome"><b>${escapeHtml(c.outcome)}</b></td>
  <td class="muted">${escapeHtml(clock(c.createdAt))}</td>
  <td class="ledger-action">${action}</td>
</tr>`;
}

function batchSection(compiles) {
  const head = `<h2 id="batch-h">THIS BATCH
  <span class="muted">one action, no typed reason</span> ${badge(ctl(REJECT))}</h2>`;
  if (!compiles.length) {
    return `<section class="panel" aria-labelledby="batch-h">
  ${head}
  ${stateEmpty({
    what: 'no compiles yet',
    reason: 'the Ledger counts what you have looked at and thrown away, and nothing has been compiled in this session',
    action: '<a href="/">go to Compose</a>',
  })}
</section>`;
  }
  const rows = compiles.slice(0, BATCH_SHOWN).map(batchRow).join('');
  const pending = compiles.filter((c) => c.outcome === 'pending').length;
  return `<section class="panel" aria-labelledby="batch-h">
  ${head}
  <p class="state-detail"><b>${pending}</b> of <b>${compiles.length}</b> compiles are still pending.
    Marking one takes a single click and asks for no reason — a rejection is a signal, and a
    signal that costs a paragraph is one the operator stops sending.</p>
  <table class="ledger-table">
    <thead><tr><th>compile</th><th>outcome</th><th>at</th><th>action</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${compiles.length > BATCH_SHOWN
    ? statePartial({
      shown: BATCH_SHOWN,
      total: compiles.length,
      reason: 'The counts below cover every compile; only the list is truncated.',
    }) : ''}
</section>`;
}

// --- §2 the trend, by slot and by facet (AC6.3) --------------------------------------

function trendSection(trend) {
  const outcomes = Object.entries(trend.byOutcome)
    .map(([k, v]) => `<li><code>${escapeHtml(k)}</code> <b>${v}</b></li>`).join('');

  const slotRows = trend.bySlot.map((s) => `<tr>
  <td class="k"><code>${escapeHtml(s.key)}</code></td>
  <td>${ratio(s.rejected, s.all)}</td>
  <td class="ledger-values">${s.values.length
    ? s.values.slice(0, 3).map((v) => `<code>${escapeHtml(v.value)}</code> ×${v.count}`).join(', ')
    : '<span class="muted">no value recorded</span>'}</td>
</tr>`).join('');

  const facetRows = trend.byFacet.map((f) => `<tr>
  <td class="k"><code>${escapeHtml(f.facet)}</code></td>
  <td>${ratio(f.rejected, f.all)}</td>
</tr>`).join('');

  return `<section class="panel" aria-labelledby="trend-h">
  <h2 id="trend-h">THE TREND <span class="muted">by slot and by facet</span></h2>
  <p class="state-detail">outcomes in this session:</p>
  <ul class="ledger-outcomes">${outcomes}</ul>
  <p class="ledger-note ledger-note--${trend.sufficient ? 'enough' : 'thin'}">${escapeHtml(trend.note)}</p>

  <h3>BY SLOT <span class="muted">a slot counts when it was populated — an empty slot says a
    facet emptied it, not that taste rejected it</span></h3>
  ${trend.bySlot.length ? `<table class="ledger-table">
    <thead><tr><th>slot</th><th>rejected / populated</th><th>value when rejected</th></tr></thead>
    <tbody>${slotRows}</tbody>
  </table>` : stateEmpty({
    what: 'no slot has been populated',
    reason: 'every compile in this session has all twelve slots empty, so there is nothing to read per slot',
  })}

  <h3>BY FACET <span class="muted">a facet counts when it was APPLIED — this is presence, not
    causation</span></h3>
  ${trend.byFacet.length ? `<table class="ledger-table">
    <thead><tr><th>facet</th><th>rejected / applied</th></tr></thead>
    <tbody>${facetRows}</tbody>
  </table>` : stateEmpty({
    what: 'no facet was applied',
    reason: 'no compile in this session applied a facet, so there is nothing to read per facet',
  })}

  <p class="muted pane-foot">These are PRESENCE counts. This pane can say a facet was applied in
    four of the five rejected batches; it cannot say the facet caused a rejection, and it does
    not try.</p>
</section>`;
}

/**
 * The Ledger pane. PURE.
 *
 * `ledger` is a `buildLedger()` result and `compiles` is the registry list the dial acts on —
 * the same list the trend was computed over, passed separately because the batch table needs
 * `createdAt` and the trend deliberately does not carry it. `ledger` is required: its absence
 * is a NAMED failure, because an empty Ledger renders as "nothing has been rejected", which is
 * the one misreading this pane must not permit.
 *
 * AND THE TWO ARGUMENTS MUST BE ABOUT THE SAME SET. This is the same rule as the one above,
 * applied to the OTHER way a page can lie. `trend.n` is the number of rows the trend counted
 * and `compiles.length` is the number of rows the batch table will list; when they disagree
 * the page prints a header that says *"17 rejected of 41"* above a batch section that says
 * *"no compiles yet"*, and both sentences are in the same document, both in the console's own
 * voice. A6's hostile round found that state by execution (C3) — `renderLedger({ledger})` with
 * `compiles` omitted produces it, and the omitted argument is exactly how a caller would reach
 * it. So the mismatch is a NAMED failure rather than a page that contradicts itself.
 *
 * THE GUARD COMPARES LENGTHS, WHICH IS THE HALF IT CAN SEE. Two different lists of the same
 * length would still pass it, and saying so is the point: this is a guard against the argument
 * being MISSING, NON-ARRAY or PARTIAL, not a proof that the caller passed the right list.
 * Stated here rather than left for a reader to discover the limit.
 *
 * AND IT IS TOTAL (C9). The first cut read `compiles.length` before it could refuse, so an
 * explicitly-`null` list threw `TypeError` and the pane answered with a 500 — an UNNAMED
 * failure, in the one pane whose whole argument is that a failure is named. A guard that
 * crashes before it can refuse is not a guard.
 */
export function renderLedger({ ledger = null, compiles = [], error = null } = {}) {
  if (error) return stateFailure({ code: error.code ?? 'E_LEDGER', detail: error.message ?? '' });
  if (!ledger) {
    return stateFailure({
      code: 'E_LEDGER_UNRESOLVED',
      detail: 'the caller did not resolve the ledger, so there is nothing to count. This is a '
        + 'programming error, not an empty result — an empty Ledger reads as "nothing was '
        + 'rejected", and a zero produced by a missing argument is the defect this pane exists to catch.',
    });
  }
  const { trend } = ledger;
  // THE GUARD IS TOTAL, NOT JUST A LENGTH COMPARISON (C9). It read `compiles.length` first, so
  // an explicitly-`null` batch list threw `TypeError: Cannot read properties of null` and the
  // pane crashed with a 500 — an UNNAMED failure, in a pane whose entire doctrine is that every
  // failure is named. `compiles: null` is not reachable from the shipped caller (`paneRoutes.mjs`
  // passes an array), and it is fixed anyway because a guard that crashes before it can refuse
  // is not a guard. `renderLedger({ ledger })` — the argument OMITTED — is the reachable form,
  // and it is handled below by the same branch.
  const batch = Array.isArray(compiles) ? compiles : null;
  if (!batch || batch.length !== trend.n) {
    return stateFailure({
      code: 'E_LEDGER_BATCH_MISMATCH',
      detail: (batch
        ? `the ledger was built over ${trend.n} compile(s) and the batch list carries ${batch.length}. `
        : `the ledger was built over ${trend.n} compile(s) and the batch list is not a list `
          + `(${JSON.stringify(compiles ?? null)}). `)
        + 'The header counts the ledger while the batch section lists this argument, so drawing '
        + 'both would print two answers to one question — and a page that contradicts itself is '
        + 'worse than one that refuses to draw. Pass the same list the trend was computed over.',
    });
  }
  return `<header class="pane-head">
  <span class="kv">LEDGER · what is it learning</span>
  <span class="kv">source: this session's compiles + the forge variant store</span>
  <span class="kv"><b data-ledger-rejected>${trend.rejected}</b> rejected of ${trend.n}</span>
</header>
${batchSection(batch)}
${trendSection(trend)}
${driftSection(ledger.drift, ledger.runsError, ledger.runsSkipped)}`;
}
