/**
 * paneLedgerDrift.mjs — the Ledger's COST section. `AC6.2`, `T-I-06`.
 *
 * SPLIT OUT OF `paneLedger.mjs` FOR RULE 4, ON THE SAME SEAM `core/ledger.mjs` AND
 * `core/ledgerTrend.mjs` USE. The Ledger answers two questions that share a pane and nothing
 * else: *"what did the operator throw away, and what does that say about the slots and
 * facets?"* (still in `paneLedger.mjs`) and *"what did it cost versus what we said it would?"*
 * (here). Different SOURCES — Astra's own compile registry versus the Forge variant store —
 * different failure modes, and now different files, at both layers.
 *
 * AND IT IS THE HALF THAT GREW. The hostile round's C1/C2/C7 fixes all landed in this section,
 * which is the honest reason to move THIS one rather than the trend: a split should put the
 * thing that is still changing behind its own boundary, not carve up the part that has settled.
 *
 * NOT RE-EXPORTED FROM `paneLedger.mjs`, AND THAT IS DELIBERATE. The house pattern after a
 * Rule 4 split is *import for local use, and re-export so the original surface is unchanged* —
 * but that half exists to preserve an EXISTING public name. `driftSection` was never exported
 * from `paneLedger.mjs`, so re-exporting it would ADD a name that nothing imports, which is the
 * defect A6's hostile round deleted one layer up (C4: *"a convenience field with no reader"*).
 * The one caller is `paneLedger.mjs`, and it imports.
 *
 * THE THREE DEFENCES LIVE IN THE RENDERING, NOT IN A COMMENT FOR THE READER:
 *
 *   1. **A DRIFT IS NEVER AVERAGED AWAY.** Every priced run keeps its OWN delta cell, and the
 *      summary reports the DIRECTION COUNTS beside the mean rather than instead of it. One run
 *      at twice the estimate and one at nothing average to zero; the mean alone hides exactly
 *      that pair.
 *   2. **AN ABSENT ESTIMATE IS `—`, NOT `0`.** The estimate is a MIRROR of `unitCost()` in
 *      `scripts/forge.mjs` (see `core/ledger.mjs`). When the marker pin stops resolving the
 *      column is WITHHELD and the reason is named — never a mirrored number shown as forge's.
 *   3. **AN EMPTY LIST PRODUCED BY A FAILURE IS NOT AN EMPTY STORE.** `runsError` means the
 *      store could not be read; `runsSkipped` means N lines in it were corrupt. Both leave a
 *      run list that is empty or short, and both must be drawn BEFORE the emptiness checks —
 *      a banner computed after an early return is a banner that never renders in the case it
 *      was written for.
 *
 * PURE. It renders what it is handed and does no I/O.
 */

import { escapeHtml, stateEmpty, statePartial, stateFailure } from './shell.mjs';

/** How many drift rows the pane shows before it says it is truncating. */
export const DRIFT_SHOWN = 25;

// --- money ---------------------------------------------------------------------------
// The store's field is `costUsd`. `AC6.2` is phrased in CENTS, so cents is what is rendered,
// and the conversion is stated once here rather than inline at each cell.
const cents = (usd) => (typeof usd === 'number' ? usd * 100 : null);
const fmtCents = (c) => (c === null ? '—' : c.toFixed(4));
/** A delta keeps its SIGN, and an absent delta is an em-dash — never `0.0000`. */
const fmtDelta = (d) => (d === null ? '—' : `(${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d).toFixed(4)})`);

function driftRow(s, withEstimate) {
  const actual = fmtCents(cents(s.actualUsd));
  const id = s.variantId ?? s.briefId ?? `run ${s.index}`;
  if (!withEstimate) {
    return `<tr><td class="k"><code>${escapeHtml(id)}</code></td>
      <td>${actual}</td><td class="muted">${escapeHtml(s.basis)}</td></tr>`;
  }
  const est = fmtCents(cents(s.estimatedUsd));
  const delta = fmtDelta(cents(s.deltaUsd));
  const cls = s.deltaUsd === null ? 'absent' : s.deltaUsd > 0 ? 'over' : s.deltaUsd < 0 ? 'under' : 'exact';
  return `<tr class="ledger-drift ledger-drift--${cls}">
    <td class="k"><code>${escapeHtml(id)}</code></td>
    <td>${est}</td><td>${actual}</td>
    <td class="ledger-delta"><b>${delta}</b></td>
    <td class="muted">${escapeHtml(s.basis)}</td></tr>`;
}

function driftSummary(summary) {
  return `<p class="state-detail">over <b>${summary.overCount}</b> · under <b>${summary.underCount}</b>
    · exact <b>${summary.exactCount}</b> · mean drift <b>${fmtDelta(cents(summary.meanDeltaUsd))}</b>
    · worst <b>${fmtCents(cents(summary.maxAbsDeltaUsd))}</b>¢</p>
    <p class="muted">The mean is shown BESIDE the per-row deltas, never instead of them: one run at
      twice the estimate and one at nothing average to zero, and a mean alone would hide exactly
      the pair that matters.</p>`;
}

/**
 * The cost section.
 *
 * `runsError` IS PASSED IN, NOT READ OFF THE DRIFT. The first version read `drift.runsError`,
 * which is a field `costDrift()` does not return — the error lives on the LEDGER, beside the
 * run list the caller resolved. So the partial never rendered: an unreadable store drew a
 * complete-looking cost section over an empty run list, which is exactly the misreading
 * `variants.mjs` returns a named error to prevent. `a6-drift.test.mjs` caught it, and it is the
 * reason that test asserts the CODE on screen rather than just that the section exists.
 *
 * AND THE BANNERS ARE BUILT BEFORE THE EMPTINESS CHECKS, NOT AFTER THEM. That ordering is the
 * second half of the same defect, and A6's hostile round found it by EXECUTION (C1/C2). The
 * first fix above moved the partial into the full render — and the empty branches return
 * AROUND that render. So `drift.total === 0` printed "no generations recorded" over a store
 * that could not be read, and over a store whose every line was corrupt; and `drift.priced ===
 * 0` did the same for a store that had runs but no prices. A banner computed after an early
 * return is a banner that never renders in the case it was written for — and the case it was
 * written for is precisely the case where the run list is EMPTY, so the early return was the
 * only path it needed to cover and the only path it did not.
 *
 * THE TRUNCATION IS DISCLOSED TOO (C7). The batch section has always said when it is showing a
 * prefix of the compiles; this table sliced `series` and said nothing, so a forty-run store
 * rendered as a twenty-five-run one beneath a summary computed over all forty.
 */
export function driftSection(drift, runsError = null, runsSkipped = 0) {
  const head = `<h2 id="drift-h">COST DRIFT
  <span class="muted">estimated vs actual — never averaged away</span></h2>`;
  const open = `<section class="panel" aria-labelledby="drift-h">`;

  // --- the banners, computed FIRST so that every branch below can render them -----------
  //
  // TWO SKIP BANNERS, BECAUSE THE SENTENCE IS ONLY TRUE BESIDE A TABLE (C8). "The drift below
  // is computed over what was readable" is a claim about the DOCUMENT, and the two empty
  // branches render no drift below to qualify — so the full render gets the version that points
  // at the table and the empty branches get the version that stops after the count. The first
  // cut of the C1/C2 fix had one banner and asserted the table in a branch that draws none,
  // which is the same defect class as the round it was fixing.
  const unreadable = runsError ? stateFailure({
    code: runsError.code ?? 'E_VARIANT_STORE_UNREADABLE',
    detail: 'the variant store could not be read, so there is no cost history to show. This is '
      + 'NOT an empty store — the read failed — and any number below is NOT complete.',
  }) : '';
  const skipNote = `${runsSkipped} line(s) in the variant store could not be parsed and were SKIPPED.`;
  const skippedWithTable = runsSkipped > 0 ? statePartial({
    shown: `${drift.priced} priced`,
    total: 'the store',
    reason: `${skipNote} The drift below is computed over what was readable, so it is a floor, not a total.`,
  }) : '';
  const skippedNoTable = runsSkipped > 0 ? statePartial({
    shown: '0 priced',
    total: 'the store',
    reason: skipNote,
  }) : '';

  // --- an empty store is only an empty store when NOTHING explains it ------------------
  if (drift.total === 0) {
    if (unreadable) {
      // THE ERROR AND THE SKIP COUNT ARE DIFFERENT FACTS, AND BOTH ARE DRAWN (C10). An early
      // return that names only the first silently drops the second. `variantRuns()` sets
      // `skipped: 0` on its error path today, so the two cannot co-occur FROM THE SHIPPED
      // CALLER — but `buildLedger` takes them independently, and a branch that is correct only
      // because of a property of a different module is a branch nobody can check here.
      return `${open}
  ${head}
  ${unreadable}
  ${skippedNoTable}
</section>`;
    }
    if (runsSkipped > 0) {
      return `${open}
  ${head}
  ${statePartial({
    shown: '0 priced',
    total: 'the store',
    reason: `every line in the variant store was unreadable — ${skipNote} Nothing else was in `
      + 'it. This is not an empty history; it is an unreadable one, and the two are different facts.',
  })}
</section>`;
    }
    return `${open}
  ${head}
  ${stateEmpty({
    what: 'no generations recorded',
    reason: 'the forge variant store is empty, so there is no cost history to compare against',
  })}
</section>`;
  }
  if (drift.priced === 0) {
    return `${open}
  ${head}
  ${unreadable}
  ${skippedNoTable}
  ${stateEmpty({
    what: `${drift.total} runs, none priced`,
    reason: 'no run in the store carries a numeric costUsd, and a cost trend over unpriced runs would be an invented number',
  })}
</section>`;
  }
  const rows = drift.series.slice(-DRIFT_SHOWN).map((s) => driftRow(s, drift.rule.ok)).join('');
  // THE DEGRADATION, RENDERED. A withheld estimate is a NAMED failure with the reason, never
  // a silently narrower table — a reader who cannot see why the column vanished would assume
  // the numbers were fine.
  const withheld = drift.rule.ok ? '' : stateFailure({
    code: 'E_LEDGER_ESTIMATE_WITHHELD',
    detail: drift.rule.reason ?? 'the estimate rule could not be confirmed against scripts/forge.mjs',
  });
  // THE TRUNCATION, RENDERED (C7) — AND WORDED FROM WHAT IS ACTUALLY ON THE PAGE (C8). The
  // first cut asserted *"the summary above covers every priced run"* unconditionally. When the
  // estimate is withheld, `costDrift` returns `summary: null` and NO summary is drawn, so the
  // banner pointed at nothing and claimed a mean that did not exist. That is the defect this
  // whole round is about, committed by the fix for it. The copy now branches on the same
  // condition the summary does.
  const truncated = drift.priced > DRIFT_SHOWN ? statePartial({
    shown: DRIFT_SHOWN,
    total: drift.priced,
    reason: 'Only the most recent runs are listed, so this table is a PREFIX and not the set.'
      + (drift.summary
        ? ' The summary above covers every priced run — the mean is not the mean of this table.'
        : ' There is no summary above: the estimate is withheld, so nothing on this page totals the rows.'),
  }) : '';
  const table = drift.rule.ok
    ? `<table class="ledger-table">
    <thead><tr><th>run</th><th>est ¢</th><th>actual ¢</th><th>drift ¢</th><th>basis of the estimate</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
    : `<table class="ledger-table">
    <thead><tr><th>run</th><th>actual ¢</th><th>basis of the estimate</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  return `${open}
  ${head}
  ${unreadable}
  ${skippedWithTable}
  ${withheld}
  ${drift.summary ? driftSummary(drift.summary) : ''}
  ${table}
  ${truncated}
  <p class="muted pane-foot">Actuals are read through the store's own API
    (<code>shared/variantRun.mjs</code>). The estimate is a MIRROR of
    <code>unitCost()</code> in <code>scripts/forge.mjs</code>, pinned to that file's own text:
    when the pin stops resolving, the column is withheld rather than shown as forge's.</p>
</section>`;
}
