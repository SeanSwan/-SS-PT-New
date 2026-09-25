/**
 * gateReconcile — does a gate artifact agree with itself?
 * @module scripts/swan-brain-console/gateReconcile
 *
 * WHY THIS IS SEPARATE FROM `gateIdentity.mjs`
 * Two questions, and they are asked in that order for a reason. `gateIdentity.mjs` asks "is this
 * artifact evidence about the gate whose path supplied it?" — a question about PROVENANCE, which
 * needs a contract and a stamp. This module asks "does the document's own content hang together?"
 * — a question about INTERNAL COHERENCE, which needs neither a gate nor a path, only the fields the
 * contract declares. Splitting them is what brought `gateIdentity.mjs` back under Rule 4's 300
 * lines when the absent-row rule was added, which is the fourth time that cap has forced a split in
 * this subsystem and the fourth time it was right to.
 *
 * WHAT IT CHECKS, AND WHY ONLY THESE FIVE
 *   1. ABSENCE.  A contract that declares the producer always emits a row array means the array's
 *                absence is a finding, not a smaller run.
 *   2. MALFORMED ROWS. A row with no usable `status` is malformed, not absent — the H01 lesson
 *                applied to the row array.
 *   3. UNKNOWN STATUS. A status outside the producer's closed vocabulary is a row this module
 *                cannot place. Round 14 (Astra J01) reached `2 passed, 0 failed, 2/2 evaluated`
 *                from a row whose status was `psas`, because the shortfall rule asks what the
 *                SUMMARY says and a summary claiming the row as a pass leaves no shortfall.
 *   4. COUNTS.  The row array's LENGTH must equal the summary's `total`. One expression builds
 *                both (`summarize(results)` → `total: results.length`, `variants: results`), so
 *                they cannot legitimately differ — and Astra reached `20/20 evaluated` from a
 *                one-row artifact.
 *   5. CONTRADICTION. Rows carrying a failure status while `summary.failed` is zero; or a
 *                population that says the run was partial while the failure count says nothing
 *                went wrong; or a population claiming `ok: true` while naming coverage it did
 *                not have. All three pairs are impossible for this repository's producers.
 *
 * Every check is claimed ONLY for gates whose contract declares the corresponding field. That
 * restraint is deliberate: `population`'s meaning is defined by `reconcilePopulation` in
 * `renderResult.mjs`, and `docs/qa/AI-PLANNING-VALIDATION-LATEST.json` carries a `results` array
 * whose schema this subsystem has never been given. Inventing a reconciliation for it would be a
 * guard built on a rule the project does not have — itself a defect, and the one this repository
 * keeps producing. So the planning contract declares `rows: null` and NAMES that limitation rather
 * than silently trusting it.
 *
 * BOUNDS: pure. An already-parsed value and an already-resolved contract in, a message or null out.
 * No I/O, no clock, no paths, no registry.
 */
import { ROW_STATUSES } from './renderResult.mjs';
/*
 * ROUND 15 (Astra K02) — the population half moved out, and it is the fifth Rule 4 split here.
 * The row rules below ask "does each row agree with the summary"; the population rules ask "does
 * the fleet reconciliation agree with the rows it claims to describe". Different subjects, and
 * the new row rules did not fit alongside them.
 */
import { populationDefect } from './populationReconcile.mjs';

export { fullFleetDefect, POPULATION_ROW_ID } from './populationReconcile.mjs';

/**
 * Row statuses this repository's render producer counts as a failure.
 *
 * One expression, two consumers: `renderResult.mjs`'s `countFailures` sums exactly
 * `summary.fail + summary.no_baseline + summary.unreadable`, and this list is what the
 * reconciliation looks for in the row array. `gateIdentity.contract.test.mjs` asserts the two agree
 * by building a summary from rows with `summarize` and checking `countFailures` against a count
 * taken from this list — so the two definitions cannot drift apart unnoticed.
 *
 * `pass` is absent, and so is `written`: `written` is what `--update` records, and an update run is
 * refused upstream as `not_evidence` rather than counted as a failure here.
 */
export const FAILURE_STATUSES = Object.freeze(['fail', 'no_baseline', 'unreadable']);

/** Row statuses are compared case- and whitespace-insensitively; a non-string is not a status. */
function rowStatus(row) {
  const raw = row?.status;
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/** The first few ids of a set of rows, for a refusal that names what it is talking about. */
function nameRows(rows, render) {
  const named = rows.slice(0, 5).map(render).join(', ');
  return `${named}${rows.length > 5 ? ', …' : ''}`;
}

/*
 * `fullFleetDefect` MOVED TO `populationReconcile.mjs` IN ROUND 15 (Astra K02), and it is
 * re-exported above so an importer does not have to know. The `ok: true` contradiction it
 * detects is one of three population rules now, and the third — the one that compares the
 * population to the ROWS — is the one Astra's K02 turned on.
 */

/**
 * Do the artifact's own claims contradict each other?
 *
 * Returns a message when they do, or null. See the module header for why the restraint is the point
 * rather than a shortcut.
 */
export function reconciliationDefect(contract, doc) {
  const reported = doc?.summary?.failed;
  const counted = typeof reported === 'number' && reported > 0;

  /*
   * THE ROW ARRAY, READ ONCE AND SHARED BY BOTH HALVES.
   *
   * Hoisted out of the `contract.rows` branch in round 15 because the population rules need it
   * too (Astra K02): `population.measured` is reconciled against these rows, and that comparison
   * is only sound if both halves are looking at the same array. `undefined` when the contract
   * declares no row field, which is how the population rule knows it has nothing to compare.
   */
  const rows = contract.rows ? doc?.[contract.rows] : undefined;

  if (contract.rows) {
    /*
     * AN ABSENT ROW LIST IS ENFORCED, AND THIS WAS A RESIDUAL OF THE FIX THAT ADDED IT.
     *
     * The first version only reconciled rows when they were PRESENT (`if (rows !== undefined)`),
     * which is the same "scope narrower than the name" defect the contract exists to remove: the
     * table declares this gate's producer ALWAYS emits `variants`, and then declined to check the
     * one case where it doesn't. A document stamped `gate: "three-worlds-render"` with a green
     * summary and no rows at all was certified — "I have nothing to reconcile" reading as "there
     * is nothing wrong".
     *
     * Found by probing the fix rather than by a test failing, which is the point: the suite could
     * not catch it, because no test had been written from the assumption that rows could be
     * missing. Every artifact this gate's producer writes carries them — `buildRenderResult`,
     * `buildAttemptStart` and `buildAttemptFailure` all set `variants`, including the empty array.
     */
    if (rows === undefined) {
      return 'the contract for this gate declares that its producer always emits '
        + `"${contract.rows}", and this artifact has none — an absent row list is not a smaller `
        + 'run, it is a document whose result cannot be reconciled';
    }
    if (!Array.isArray(rows)) {
      return `"${contract.rows}" is declared but is not an array `
        + `(${JSON.stringify(rows)}) — a malformed row list is not an absent one`;
    }
    /*
     * A ROW WITH NO USABLE STATUS IS MALFORMED, NOT ABSENT.
     *
     * Found by writing the test for the array case: `["alpha", "beta"]` IS an array, so an
     * `Array.isArray` check alone read it as a row list, found no failure statuses in it, and
     * certified the gate green from a summary nothing had been checked against. Every row this
     * repository's producer writes carries a `status` — `shot-diff.mjs` pushes `{id, ...verdict}`
     * and the synthetic population row is `{id, status, detail}` — so a row without one is not a
     * row whose result is unknown, it is a document that cannot be reconciled at all.
     */
    const malformed = rows.filter((r) => rowStatus(r) === '');
    if (malformed.length > 0) {
      const named = nameRows(malformed, (r) => JSON.stringify(
        r && typeof r === 'object' ? r.id ?? '(no id)' : r,
      ));
      return `${malformed.length} row(s) in "${contract.rows}" carry no usable "status" `
        + `(${named}) — a malformed row is not an absent one, and a row list that cannot be read `
        + 'cannot be reconciled against its summary';
    }
    /*
     * A STATUS OUTSIDE THE PRODUCER'S VOCABULARY IS A ROW THIS MODULE CANNOT PLACE.
     *
     * ROUND 14 (Astra J01). The shortfall rule in `summaryDefect` already refuses most unknown
     * statuses — an unplaceable row is an unaccounted case, and silence is not evidence. But that
     * rule asks what the SUMMARY says. A summary that claims the row as a PASS leaves no
     * shortfall, and then nothing disagrees with it: Astra executed the shipped classifier against
     * `variants: [{status:'pass'},{status:'psas'}]` with `summary: {passed:2, failed:0, total:2}`
     * and got `pass`, rendered `2 passed, 0 failed, 2/2 evaluated`. The only thing that can
     * disagree with a summary claiming a status is the status itself, so it is checked here.
     *
     * The vocabulary is closed because every member has a named producer; see `ROW_STATUSES`.
     */
    const unknown = rows.filter((r) => !ROW_STATUSES.includes(rowStatus(r)));
    if (unknown.length > 0) {
      const named = nameRows(unknown, (r) => `${JSON.stringify(r?.id ?? '(no id)')}=${JSON.stringify(r?.status)}`);
      return `${unknown.length} row(s) in "${contract.rows}" carry a status this gate's producer `
        + `cannot write (${named}) — the vocabulary is ${ROW_STATUSES.join('/')}, and a row whose `
        + 'status is not one of them cannot be counted as anything, least of all a pass';
    }
    /*
     * THE ROW COUNT AND THE SUMMARY'S TOTAL ARE ONE EXPRESSION APART.
     *
     * `shot-diff.mjs` builds `summary = summarize(results)` — which sets `total: results.length` —
     * and passes the SAME array as `variants`, so `variants.length === summary.total` holds by
     * construction for every artifact this gate writes. Astra reached `20 passed, 0 failed, 20/20
     * evaluated` from a one-row artifact (J01), and `1/1 evaluated` from an EMPTY one (J01).
     *
     * Checked only when `total` is a number: an absent `total` is a legitimate minimal summary
     * (`summaryDefect` owns that rule, and the documented contract is `{passed, failed}`).
     */
    if (Number.isInteger(doc?.summary?.total) && rows.length !== doc.summary.total) {
      return `"${contract.rows}" has ${rows.length} row(s) but summary.total is `
        + `${doc.summary.total} — this producer builds both from one array, so the artifact is `
        + 'claiming more (or fewer) results than it carries';
    }
    /*
     * ROUND 15 (Astra K02) — A `written` ROW IS ONLY POSSIBLE IN AN UPDATE RUN.
     *
     * `written` is what the `--update` branch of `fleetMeasure.mjs` records for each baseline it
     * staged. In `compare` mode no row can carry it, so a compare-mode artifact with a `written`
     * row is describing a run that cannot have happened. Astra executed the shipped classifier
     * against one `written` row under `mode: "compare"` with `summary {total:1, passed:1,
     * failed:0}` and got `pass`, rendered `1/1 evaluated`.
     *
     * ONLY THIS DIRECTION IS CHECKED, and the asymmetry is deliberate rather than an oversight.
     * The reverse — "mode is update, therefore every row is written" — is FALSE for a legitimate
     * artifact: `buildAttemptFailure` stamps `mode: "update"` for an aborted update and carries a
     * single `fail` row. A rule in that direction would refuse a real failure artifact, which is
     * the over-reach this repository keeps producing. Verified against the shipped producer in
     * `gateIdentity.contract.test.tests` for both modes and the aborted case.
     */
    if (doc?.mode !== 'update') {
      const written = rows.filter((r) => rowStatus(r) === 'written');
      if (written.length > 0) {
        return `${written.length} row(s) in "${contract.rows}" carry status "written" but this `
          + `artifact's mode is ${JSON.stringify(doc?.mode)} — "written" is what an --update run `
          + 'records for each baseline it staged, so a compare-mode artifact cannot contain one';
      }
    }
    const failed = rows.filter((r) => FAILURE_STATUSES.includes(rowStatus(r)));
    if (failed.length > 0 && !counted) {
      return `${failed.length} row(s) in "${contract.rows}" carry a failure status `
        + `(${nameRows(failed, (r) => String(r?.id ?? '(no id)'))}) but summary.failed is `
        + `${JSON.stringify(reported)} — the artifact contradicts itself, so it cannot be read `
        + 'as either';
    }
    /*
     * AND THE OTHER DIRECTION OF THE SAME EQUATION. A failure count larger than the number of
     * failing rows is a document reporting failures its own rows do not show, which is the same
     * invented-result defect as an unsupported `passed` count. Only checked when `summary.failed`
     * is a positive integer, so the branch above keeps ownership of the zero/absent cases and its
     * message — which is the one an operator sees for the common corruption.
     */
    if (counted && failed.length !== reported) {
      return `summary.failed is ${reported} but only ${failed.length} row(s) in `
        + `"${contract.rows}" carry a failure status — a failure count the rows do not support `
        + 'is not a smaller run, it is a result this artifact did not produce';
    }
    /*
     * ROUND 15 (Astra K02) — THE HISTOGRAM, NOT JUST THE FAILURE COUNT.
     *
     * Round 14 reconciled `summary.failed` against the rows and stopped there, so `passed` was
     * never compared to anything. Astra supplied `{total:1, passed:1, failed:0}` beside a single
     * `written` row and beside a single `pass` row with a population claiming twenty: the failure
     * count agreed, so the artifact was certified. `summary.passed` and `summary.failed` are both
     * derived from this one array by `summarize` (`pass` and the three failure buckets), so both
     * must equal the rows they came from — and a count that no row supports is an invented result.
     *
     * CHECKED LAST, DELIBERATELY. The failure rules above are older and their message is the one an
     * operator should see for the common corruption (rows that failed under a summary saying
     * nothing did). This rule is the broader one, and putting it first would have re-labelled that
     * case as a `passed` mismatch — which is how `gateIdentity.test.mjs`'s H02 test caught the
     * ordering when this was first written.
     */
    const passed = rows.filter((r) => rowStatus(r) === 'pass').length;
    if (Number.isInteger(doc?.summary?.passed) && passed !== doc.summary.passed) {
      return `"${contract.rows}" carries ${passed} row(s) with status "pass" but `
        + `summary.passed is ${doc.summary.passed} — this producer counts the same array it `
        + 'writes, so a pass count with no passing row behind it is a result nothing produced';
    }
  }

  /*
   * `population` IS DIFFERENT FROM `rows`, AND THE ASYMMETRY IS DELIBERATE.
   *
   * Its absence is legitimate: `buildRenderResult` includes it only when a run got far enough to
   * reconcile a population, and a run that never reached the manifest has none. So this checks the
   * field when it is present and says nothing when it is not — the opposite of the rule for `rows`,
   * and for a reason rather than by oversight.
   */
  if (contract.population) {
    /*
     * ROUND 15 (Astra K02) — THE THREE POPULATION RULES LIVE IN `populationReconcile.mjs`, AND
     * THE ROWS GO WITH THEM. The first two (the negative claim, and the positive claim
     * contradicted by the object's own fields) moved unchanged. The third is new and it is the
     * one that needed the rows: `population.measured` must equal the number of rows that are not
     * the synthetic population row, because it is the length of the id list this run reconciled.
     * A document with one passing row and a population claiming `measured: 20` satisfied both of
     * the older checks and certified the gate.
     *
     * `rows` is passed even when the contract declares none, because `population` and `rows` are
     * separate declarations: a gate could legitimately declare a population and no row array, and
     * the third rule then has nothing to compare against and says nothing. That is the correct
     * behaviour rather than a gap — see the module header on why inventing a reconciliation for an
     * undeclared field is itself a defect.
     */
    return populationDefect({ pop: doc?.population, rows, reported });
  }

  return null;
}
