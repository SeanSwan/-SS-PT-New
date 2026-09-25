/**
 * gateReconcile.test — the internal-coherence rules, and the shapes they must NOT refuse.
 * @module scripts/swan-brain-console/gateReconcile.test
 *
 * WHY THIS FILE EXISTS (Astra round 15, K02)
 * `gateReconcile.mjs` and `populationReconcile.mjs` are the two modules that ask "does this
 * artifact agree with itself". Until round 15 neither had a suite of its own: their rules were
 * exercised only through `gateIdentity.test.mjs` and `gateIdentity.contract.test.mjs`, which are
 * about PROVENANCE. Adding K02's three rules to those files pushed both past Rule 4's 300 lines,
 * which is what forced this split — and the split is the right boundary, because a provenance
 * suite and a coherence suite answer different questions and should be able to fail separately.
 *
 * K02's THREE RULES, AND WHY EACH WAS NEEDED
 *   HISTOGRAM  `summary.passed` must equal the rows that carry `pass`. Round 14 reconciled only
 *              `summary.failed`, so `variants: []` with `summary {passed: 20, failed: 0}` — no
 *              `total`, so the row-count rule declined to look — certified "20 passed, 0 failed".
 *   MODE       a `written` row is only producible by an `--update` run, so it cannot appear under
 *              `mode: "compare"`. Round 14's vocabulary rule admitted it because `written` is a
 *              legitimate status; the row was valid in a mode that cannot produce it.
 *   POPULATION `population.measured` is the length of the id list the run reconciled, so it must
 *              equal the rows that are not the synthetic population row. A population claiming
 *              `expected: 20, measured: 20` beside ONE row is internally perfect and describes a
 *              run that did not happen.
 *
 * Each rule is a TIGHTENING, so the second half of this file is the over-reach control: every
 * shape the real producer emits, built by the producer's OWN functions, must still be classified
 * as it was. A tightening that refuses a real artifact is a defect, not a stricter guard.
 *
 * Run: node --test scripts/swan-brain-console/gateReconcile.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { planPopulation } from './renderResult.mjs';
import { render, gateFrom, renderDoc } from './gateIdentity.fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

/* ── the rules ────────────────────────────────────────────────────────────── */

test('RED — a PASS COUNT no row supports is refused, with or without a total (K02)', () => {
  /*
   * Astra's first K02 input: `variants: []` with `summary: {passed: 20, failed: 0}` and NO `total`.
   * The round-14 row-count rule is guarded by `Number.isInteger(summary.total)`, and the documented
   * minimal summary `{passed, failed}` has no total — so the guard declined to check exactly the
   * shape a hand-written artifact uses. Astra got `pass`, rendered "20 passed, 0 failed".
   *
   * The repair reconciles `summary.passed` against the rows that actually carry `pass`, which needs
   * no denominator.
   *
   * MUTATION: remove the `passed` histogram branch. The first case goes RED.
   */
  const empty = renderDoc({ results: [] });
  empty.summary = { passed: 20, failed: 0 };
  const a = gateFrom({ [render.path]: empty }, render.id);
  assert.notEqual(a.status, 'pass', 'an empty row list certified twenty passing variants');
  assert.equal(a.status, 'unreadable');
  assert.match(a.detail, /carries 0 row\(s\) with status "pass" but summary\.passed is 20/);

  // The same shape WITH a total is caught by the row-count rule, so the two agree rather than one
  // of them being the only thing between a forged count and a green gate.
  const withTotal = renderDoc({ results: [] });
  withTotal.summary = { passed: 20, failed: 0, total: 20 };
  const b = gateFrom({ [render.path]: withTotal }, render.id);
  assert.notEqual(b.status, 'pass');
  assert.match(b.detail, /has 0 row\(s\) but summary\.total is 20/);
});

test('RED — an ABSENT row field is refused, and it is not the same case as an empty one (K02)', () => {
  /*
   * THE BRANCH THE MODULE'S OWN COMMENT ADMITS WAS NEVER COVERED BY A TEST.
   *
   * `gateReconcile.mjs` says of its `rows === undefined` rule: *"Found by probing the fix rather
   * than by a test failing, which is the point: the suite could not catch it, because no test had
   * been written from the assumption that rows could be missing."* That was true when it was
   * written, and it stayed true — this suite covers `variants: []` (an EMPTY array) and never
   * covers `variants` being ABSENT. Deleting the branch was GREEN on 2026-09-21.
   *
   * The two cases are genuinely different and the distinction is the whole rule: `[]` is a run that
   * produced no results, while a MISSING field is a document whose shape contradicts its contract —
   * the table declares this gate's producer always emits `variants`, so an artifact without one
   * cannot be reconciled at all. Reading it as "nothing to check" is how a green summary with no
   * rows at all gets certified.
   *
   * MUTATION: delete the `rows === undefined` branch. RED here.
   */
  const doc = renderDoc({ results: [] });
  delete doc.variants;                     // ABSENT, not empty — the case no test covered
  doc.summary = { passed: 0, failed: 0 };
  const gate = gateFrom({ [render.path]: doc }, render.id);
  assert.notEqual(gate.status, 'pass',
    'an artifact with NO row field at all was certified from its summary alone');
  assert.equal(gate.status, 'unreadable');
  assert.match(gate.detail, /declares that its producer always emits "variants", and this artifact has none/);

  /*
   * THE PAIRED CONTROL: the EMPTY array must NOT be refused by this rule. It is a legitimate
   * shape — a run that produced no results — and it is refused (if at all) by the histogram rule,
   * which is a different reason with a different message. Without this, the rule above could be
   * satisfied by refusing every empty-looking artifact, which would break real runs.
   */
  const empty = renderDoc({ results: [] });
  empty.summary = { passed: 0, failed: 0 };
  const emptyGate = gateFrom({ [render.path]: empty }, render.id);
  assert.doesNotMatch(emptyGate.detail, /and this artifact has none/,
    'an empty row list was refused as though the field were absent — `[]` is a run with no '
    + 'results, not a document missing its row list');
});

test('RED — a `written` row under `mode: "compare"` is refused (K02)', () => {
  /*
   * Astra's second K02 input: one `status: "written"` row with `summary {total:1, passed:1,
   * failed:0}` under `mode: "compare"`. Every round-14 rule passed it — `written` is in the closed
   * vocabulary, the row count matched the total, and `failed` agreed — so it certified
   * `1/1 evaluated`. `written` is what the `--update` branch records for a staged baseline, so the
   * row describes a run that could not have happened.
   *
   * MUTATION: remove the mode branch. RED.
   */
  const doc = renderDoc({ results: [{ id: 'alpha', status: 'written', detail: 'staged' }] });
  doc.summary = { total: 1, passed: 1, failed: 0 };
  const gate = gateFrom({ [render.path]: doc }, render.id);
  assert.notEqual(gate.status, 'pass', 'a compare-mode artifact with a `written` row certified');
  assert.equal(gate.status, 'unreadable');
  assert.match(gate.detail, /carry status "written" but this artifact's mode is "compare"/);

  /*
   * THE CONTROL THAT MAKES THE RULE HONEST RATHER THAN CONVENIENT. `buildAttemptFailure` stamps
   * `mode: "update"` for an aborted update and carries a single `fail` row — NOT a `written` row.
   * So the reverse rule ("mode is update, therefore every row is written") would refuse a real
   * failure artifact. Only the direction asserted above is checked; this pins why.
   *
   * The reader classifies the aborted update `not_evidence`, because an update run never compared
   * against a reference (see `renderAttempt.mjs`'s header). What matters here is that it must not
   * become `unreadable`.
   */
  const aborted = renderDoc({
    results: [{ id: 'attempt-aborted', status: 'fail', detail: 'the run did not complete: died' }],
    mode: 'update',
  });
  const control = gateFrom({ [render.path]: aborted }, render.id);
  assert.notEqual(control.status, 'unreadable',
    `an aborted update read as unreadable: ${control.detail} — the mode rule over-reached by `
    + 'requiring every row of an update to be `written`');
  assert.equal(control.status, 'not_evidence', `an aborted update read as ${control.status}`);
});

test('RED — a population claiming more measured rows than exist is refused (K02)', () => {
  /*
   * Astra's third K02 input: ONE passing row with `population {ok: true, scope: 'full-fleet',
   * expected: 20, measured: 20}`. Every round-14 population rule passed it, because each compares
   * the population to the summary or to its own fields — and 20 expected with 20 measured is
   * internally perfect. The artifact carries one row.
   *
   * MUTATION: remove the `measured` rule from `populationReconcile.mjs`. RED.
   */
  const doc = renderDoc({
    results: [{ id: 'alpha', status: 'pass' }],
    population: {
      ok: true, scope: 'full-fleet', expected: 20, measured: 20,
      missing: [], unexpected: [], duplicates: [], detail: 'all 20 declared variants rendered once',
    },
  });
  doc.summary = { total: 1, passed: 1, failed: 0 };
  const gate = gateFrom({ [render.path]: doc }, render.id);
  assert.notEqual(gate.status, 'pass', 'a population describing twenty variants certified one row');
  assert.equal(gate.status, 'unreadable');
  assert.match(gate.detail, /"population.measured" is 20 but the artifact carries 1 measured row\(s\)/);
});

/* ── the over-reach control ───────────────────────────────────────────────── */

test('EVERY legitimate producer shape still survives the HISTOGRAM, MODE and POPULATION rules (K02)', () => {
  /*
   * THE TEST THAT MATTERS MOST HERE. All three rules are tightenings, and this repository's
   * recurring defect is a guard whose scope is wider than its justification — so a tightening that
   * refuses a real artifact is a defect, not a stricter guard.
   *
   * Every case is built by the PRODUCER's own functions (`summarize`, `planPopulation`,
   * `buildRenderResult` via `renderDoc`), never hand-written, so the shapes are the ones
   * `shot-diff.mjs` actually writes.
   *
   * MUTATION: compare the histogram against `rows.length` instead of the `pass` rows — the all-pass
   * case still passes and the all-`written` case goes RED. MUTATION: add the reverse mode rule — the
   * aborted-update case goes RED. MUTATION: compare `population.measured` to `rows.length` without
   * excluding the synthetic row — the mismatch case goes RED.
   */
  const ids = ['alpha', 'beta', 'gamma'];

  // 1. A real all-pass COMPARE run: every variant passed, full population.
  const full = planPopulation({ expected: ids, measured: ids });
  assert.equal(full.population.ok, true, 'premise: the fleet was covered');
  const allPass = [...full.rows, ...ids.map((id) => ({ id, status: 'pass', detail: 'ok' }))];
  const a = gateFrom(
    { [render.path]: renderDoc({ results: allPass, population: full.population }) }, render.id,
  );
  assert.equal(a.status, 'pass', `a real all-pass run read as ${a.status}: ${a.detail}`);

  // 2. A real --update run: every row `written`, summary.passed is 0. The histogram must not expect
  //    a passing row, and the mode rule must not fire on the artifact's own mode.
  const updateRows = ids.map((id) => ({ id, status: 'written', detail: 'baseline staged (9 bytes)' }));
  const b = gateFrom(
    { [render.path]: renderDoc({ results: updateRows, population: full.population, mode: 'update' }) },
    render.id,
  );
  assert.equal(b.status, 'not_evidence',
    `a real --update artifact read as ${b.status}: ${b.detail} — an update run is refused as `
    + 'not-evidence upstream, and must not be turned into an unreadable one by the new rules');

  // 3. A real POPULATION MISMATCH: the synthetic row is present, so `measured` counts one fewer row
  //    than the array holds. The population rule must exclude it.
  const partial = planPopulation({ expected: ids, measured: ['alpha'] });
  assert.equal(partial.population.ok, false, 'premise: a subset run');
  const mismatchRows = [...partial.rows, { id: 'alpha', status: 'pass', detail: 'ok' }];
  const c = gateFrom(
    { [render.path]: renderDoc({ results: mismatchRows, population: partial.population }) }, render.id,
  );
  assert.equal(c.status, 'fail', `a real population mismatch read as ${c.status}: ${c.detail}`);

  // 4. A real DUPLICATE MOUNT: two rows for one id, population records it, one synthetic row.
  const dup = planPopulation({ expected: ['alpha'], measured: ['alpha', 'alpha'] });
  assert.equal(dup.population.ok, false, 'premise: a duplicate mount');
  const dupRows = [...dup.rows, { id: 'alpha', status: 'pass' }, { id: 'alpha', status: 'pass' }];
  const d = gateFrom(
    { [render.path]: renderDoc({ results: dupRows, population: dup.population }) }, render.id,
  );
  assert.equal(d.status, 'fail', `a real duplicate mount read as ${d.status}: ${d.detail}`);

  // 5. A real FAILURE ARTIFACT (`buildAttemptFailure`'s compare shape): one `fail` row, no population.
  const failed = renderDoc({
    results: [{ id: 'attempt-aborted', status: 'fail', detail: 'the run did not complete: died' }],
  });
  const e = gateFrom({ [render.path]: failed }, render.id);
  assert.equal(e.status, 'fail', `a real failure artifact read as ${e.status}: ${e.detail}`);
});

test('the synthetic population row cannot collide with a declared variant id (K02)', () => {
  /*
   * The population rule excludes the synthetic row BY ID, so it is only sound while no variant
   * shares that id. The ids come from `skeletons.ts`, which the gate itself reads through
   * `fleetData.mjs` — asserted here from the same source rather than a copied list.
   *
   * MUTATION: rename a skeleton id to `fleet-population`. RED.
   */
  const skeletons = readFileSync(join(REPO, 'frontend', 'src', 'pages', 'HomePage',
    'three-worlds', 'skeletons.ts'), 'utf8');
  assert.doesNotMatch(skeletons, /id:\s*['"]fleet-population['"]/,
    'a variant is now named "fleet-population", which the population rule excludes as synthetic — '
    + 'the exclusion is no longer sound and the rule must key on something else');
});
