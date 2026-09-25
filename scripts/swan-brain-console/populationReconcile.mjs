/**
 * populationReconcile — does the artifact's `population` object agree with its own rows?
 * @module scripts/swan-brain-console/populationReconcile
 *
 * WHY THIS IS SEPARATE FROM `gateReconcile.mjs`
 * Two subjects, and the fifth time Rule 4's 300 lines has forced a split in this subsystem. The
 * row rules ask "does each row agree with the summary"; these ask "does the fleet reconciliation
 * agree with the rows it claims to describe". Round 15 (Astra K02) added the second question and
 * the first file could not hold both.
 *
 * WHAT WAS WRONG BEFORE ROUND 15 (Astra K02)
 * `reconciliationDefect` tested `population.ok` for the NEGATIVE claim and, since round 14, for
 * the positive claim contradicted by the object's OWN fields. Neither test compared the
 * population to the ROWS. Astra executed the shipped classifier against a document with one
 * passing row and `population: { ok: true, scope: 'full-fleet', expected: 20, measured: 20 }`
 * and got `pass`. Every field of that population is internally consistent — 20 expected, 20
 * measured, nothing missing — and the artifact carries ONE row. The object describes a run that
 * did not happen, and nothing compared it to the run that did.
 *
 * THE RULE, AND THE ONE EXCLUSION IT NEEDS
 * `reconcilePopulation` (renderResult.mjs) sets `measured` to the length of the id list the page
 * rendered, and `populationFailureRows` adds exactly ONE synthetic row when the reconciliation
 * failed. So the rows that are not that synthetic row are the measured variants, and their count
 * must equal `population.measured`.
 *
 * The exclusion is by id (`fleet-population`) and it is safe for a reason rather than by
 * assumption: the expected ids come from `skeletons.ts`, the current fleet is `v01`…`v20`, and
 * `gateIdentity.contract.test.mjs` asserts that no declared id collides with the synthetic one.
 * If a variant were ever named `fleet-population` that assertion fails before this rule can
 * mis-count, which is why the assertion exists rather than a comment.
 *
 * BOUNDS: pure. An already-parsed document in, a message or null out. No I/O, no clock, no
 * manifest — this module cannot know the DECLARED fleet, only whether the document agrees with
 * itself, and it does not pretend otherwise.
 */

/** The id of the synthetic row `populationFailureRows` contributes. See the header. */
export const POPULATION_ROW_ID = 'fleet-population';

/**
 * Does a population object claiming `ok: true` actually describe full coverage?
 *
 * `reconcilePopulation` derives `ok`, `scope` and the three arrays from ONE reconciliation —
 * `scope: ok ? 'full-fleet' : …`, and `expected`/`measured` are the two list lengths. So `ok:
 * true` implies all of: scope `full-fleet`, no missing/unexpected/duplicates, and
 * `expected === measured`. A reader that only ever tests `ok === false` can be handed a
 * population that names its own shortfall while claiming success.
 *
 * ROUND 14 (Astra J01) did exactly that: `{ok: true, scope: 'subset', expected: 20, measured: 1,
 * missing: ['beta']}` classified `pass`, rendered `1 passed, 0 failed, 1/1 evaluated`.
 *
 * Returns a message when the claim is contradicted, or null.
 */
export function fullFleetDefect(pop) {
  const contradictions = [];
  if (pop.scope !== 'full-fleet') contradictions.push(`scope ${JSON.stringify(pop.scope)}`);
  for (const field of ['missing', 'unexpected', 'duplicates']) {
    if (Array.isArray(pop[field]) && pop[field].length > 0) {
      contradictions.push(`${field} ${JSON.stringify(pop[field])}`);
    }
  }
  if (Number.isInteger(pop.expected) && Number.isInteger(pop.measured)
    && pop.expected !== pop.measured) {
    contradictions.push(`expected ${pop.expected} but measured ${pop.measured}`);
  }
  if (contradictions.length === 0) return null;
  return `"population.ok" is true but the same object contradicts it (${contradictions.join(', ')}) `
    + '— this producer derives "ok", "scope" and those counts from one reconciliation, so a '
    + 'full-fleet claim cannot coexist with a named shortfall';
}

/** The rows a run measured: everything except the synthetic population row. */
export function measuredRowCount(rows) {
  if (!Array.isArray(rows)) return null;
  return rows.filter((r) => !(r && typeof r === 'object' && r.id === POPULATION_ROW_ID)).length;
}

/**
 * Does the `population` object agree with the rows it claims to describe?
 *
 * `reported` is `summary.failed`, passed in rather than re-read so this module and
 * `gateReconcile.mjs` cannot disagree about which number they are reconciling.
 *
 * Returns a message when it does not, or null. A document with no population, or with one that
 * is not an object, is not this module's business and returns null — see `gateReconcile.mjs` for
 * why the ABSENCE of `population` is legitimate while the absence of `variants` is not.
 */
export function populationDefect({ pop, rows, reported } = {}) {
  if (pop === null || typeof pop !== 'object') return null;
  const counted = typeof reported === 'number' && reported > 0;

  /*
   * THE NEGATIVE CLAIM. `population.ok === false` with a zero failure count is impossible: the
   * producer turns a mismatch into a synthetic FAILED row, so the two cannot coexist.
   */
  if (pop.ok === false && !counted) {
    return `"population.ok" is false (scope ${JSON.stringify(pop.scope)}) but summary.failed `
      + `is ${JSON.stringify(reported)} — this producer turns a population mismatch into a `
      + 'failed row, so a run that did not cover its population cannot report zero failures';
  }

  /* THE POSITIVE CLAIM, CONTRADICTED BY THE OBJECT'S OWN FIELDS (round 14, Astra J01). */
  if (pop.ok === true) {
    const contradiction = fullFleetDefect(pop);
    if (contradiction) return contradiction;
  }

  /*
   * ROUND 15 (Astra K02) — THE POPULATION IS RECONCILED AGAINST THE ROWS, NOT ONLY ITSELF.
   *
   * This is the check the three above could not be: each of them compares the population to the
   * summary or to its own fields, and a document whose population says "20 expected, 20 measured"
   * while carrying one row satisfies all of them. `measured` is the number of variants the page
   * rendered, so it is the one count in the document that must equal the row array's size — and
   * it is the only field that can expose a population invented for a run that did not happen.
   *
   * Checked whenever `measured` is an integer, including when `ok` is false: a mismatch run
   * records `measured` as the count it actually saw, and the synthetic row is excluded, so the
   * equation holds for the real producer in both modes. Verified against the shipped producer
   * for a full fleet, a subset, a duplicate mount and an `--update` run in
   * `gateIdentity.contract.test.mjs`.
   */
  const measuredRows = measuredRowCount(rows);
  if (Number.isInteger(pop.measured) && measuredRows !== null && measuredRows !== pop.measured) {
    return `"population.measured" is ${pop.measured} but the artifact carries ${measuredRows} `
      + `measured row(s) — "measured" is the length of the id list this run reconciled, so it is `
      + 'the one count that must equal the rows, and a population describing a larger run than '
      + 'the artifact contains cannot be read as coverage of anything';
  }

  return null;
}
