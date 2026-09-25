/**
 * gateIdentity.test — does the reader certify a gate from evidence that is not its own?
 * @module scripts/swan-brain-console/gateIdentity.test
 *
 * WHY THIS FILE EXISTS (Astra round 13, H02)
 * `readGateHealth` reads a file because a table says that path belongs to a named gate. Until
 * round 13 it never asked the file whether it agreed. Astra executed the shipped reader
 * against a fresh document that was stamped for a DIFFERENT gate, whose own variant rows said
 * one had FAILED while its summary said none had, and which declared it had not covered its
 * population — and got `status: "pass"`, rendered as `1 passed, 0 failed, 0d old`.
 *
 * THE SUBJECT OF THIS FILE IS THE REFUSALS. Everything here goes through the REAL reader
 * (`readGateHealth`), not through `admissibilityDefect` directly, because the defect was
 * precisely that a correct lower-level function was composed into a reader that never
 * consulted it. `gateIdentity.contract.test.mjs` owns the other half — the cases that must NOT
 * be refused, including the only gate in this repository with a committed result. The two are
 * separate files because together they breached Rule 4, and because they are two subjects:
 * "what must be refused" and "what must survive".
 *
 * Run: node --test scripts/swan-brain-console/gateIdentity.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { render, renderDoc, gateFrom } from './gateIdentity.fixtures.mjs';
import { summaryDefect } from './summaryDefect.mjs';

/* ── the identity half ────────────────────────────────────────────────────── */

test('RED — a foreign gate stamp cannot certify the gate at this path (H02)', () => {
  /*
   * Astra's executed input, reduced to its first defect. The file is fresh, its summary is
   * green, and it names a gate that does not exist here.
   *
   * MUTATION: drop the `identityDefect` call from `admissibilityDefect`. This goes RED.
   */
  const gate = gateFrom({ [render.path]: renderDoc({ gate: 'different-gate' }) }, render.id);
  assert.notEqual(gate.status, 'pass', 'a foreign artifact certified the render gate');
  assert.equal(gate.status, 'not_evidence');
  assert.match(gate.detail, /different-gate/);
});

test('RED — Astra H02’s full document is refused, not read as green (H02)', () => {
  /*
   * The exact document from the finding: a foreign stamp, rows that contradict the summary,
   * and a population that says the run was a subset. All three defects are present at once;
   * the reader must refuse it and must say which defect it refused it for.
   *
   * MUTATION: any one of the three checks removed still leaves this RED, which is why the
   * three are asserted separately below as well.
   */
  const doc = renderDoc({
    gate: 'different-gate',
    results: [{ id: 'alpha', status: 'fail' }],
    summary: { passed: 1, failed: 0, total: 1 },
    population: { ok: false, scope: 'subset', detail: 'alpha only' },
  });
  const gate = gateFrom({ [render.path]: doc }, render.id);
  assert.notEqual(gate.status, 'pass', 'Astra’s H02 document was certified green');
  assert.equal(gate.status, 'not_evidence', 'identity is checked first, and it is foreign');
});

test('an UNSTAMPED artifact cannot certify a gate whose producer always stamps one (H02)', () => {
  /*
   * The producer stamps `gate` unconditionally (`renderResult.mjs`). A render-shaped file with
   * no stamp is therefore not something this gate's writer produced, and "I cannot tell whose
   * evidence this is" must not resolve to green.
   *
   * MUTATION: treat an absent stamp as acceptable for every contract. This goes RED.
   */
  const doc = renderDoc();
  delete doc.gate;
  const gate = gateFrom({ [render.path]: doc }, render.id);
  assert.notEqual(gate.status, 'pass');
  assert.equal(gate.status, 'not_evidence');
  assert.match(gate.detail, /no "gate" identity/);
});

test('a malformed stamp is a declaration, not an absence (H02, H01 class)', () => {
  // The H01 lesson applied to the other identity field: `null` is PRESENT, and present is not
  // the same as absent. MUTATION: coerce with `String(doc.gate ?? '')`. This goes RED.
  for (const bad of [null, '', '   ', 7, [], ['three-worlds-render']]) {
    const gate = gateFrom({ [render.path]: renderDoc({ gate: bad }) }, render.id);
    assert.notEqual(gate.status, 'pass', `a gate stamp of ${JSON.stringify(bad)} was accepted`);
    assert.equal(gate.status, 'not_evidence');
  }
});

/* ── the reconciliation half ──────────────────────────────────────────────── */

test('RED — rows that failed cannot coexist with a summary of zero failures (H02)', () => {
  /*
   * Both numbers come from one producer expression: `summary.failed` is `countFailures` over
   * the same `results` array that becomes `variants`. They cannot legitimately disagree, so a
   * document where they do has no reading available.
   *
   * MUTATION: remove the rows branch of `reconciliationDefect`. This goes RED.
   */
  const doc = renderDoc({
    results: [{ id: 'alpha', status: 'fail' }, { id: 'beta', status: 'pass' }],
    summary: { passed: 2, failed: 0, total: 2 },
  });
  const gate = gateFrom({ [render.path]: doc }, render.id);
  assert.notEqual(gate.status, 'pass', 'contradictory rows were read as green');
  assert.equal(gate.status, 'unreadable');
  assert.match(gate.detail, /contradicts itself/);
  assert.match(gate.detail, /alpha/, 'the refusal must name the contradicting row');
});

test('RED — an incomplete population cannot coexist with zero failures (H02)', () => {
  /*
   * `population.ok === false` means the run did not cover the fleet, and this producer turns
   * that into a synthetic FAILED row (`populationFailureRows`). So the pair
   * `population.ok === false` + `summary.failed === 0` is impossible for the real producer.
   *
   * MUTATION: remove the population branch. This goes RED.
   */
  const doc = renderDoc({ population: { ok: false, scope: 'subset', detail: 'alpha only' } });
  const gate = gateFrom({ [render.path]: doc }, render.id);
  assert.notEqual(gate.status, 'pass');
  assert.equal(gate.status, 'unreadable');
  assert.match(gate.detail, /population/);
});

test('an ABSENT row list is not a smaller run (H02 residual, found by probing this fix)', () => {
  /*
   * The first version of the reconciliation only ran `if (rows !== undefined)`. That is the same
   * "scope narrower than the name" defect the contract exists to remove: the table declares this
   * gate's producer ALWAYS emits `variants`, and then declined to check the one case where it
   * doesn't. A document stamped `gate: "three-worlds-render"` with a green summary and no rows
   * was certified — "nothing to reconcile" reading as "nothing wrong".
   *
   * No test could have caught it, because none had been written from the assumption that rows
   * could be missing. It was found by probing the fix rather than by a failing suite, which is
   * why the test below exists in this file rather than in a future review's finding list.
   *
   * MUTATION: restore the `if (rows !== undefined)` guard. This goes RED.
   */
  const doc = renderDoc();
  delete doc.variants;
  const gate = gateFrom({ [render.path]: doc }, render.id);
  assert.notEqual(gate.status, 'pass', 'an artifact with no rows at all certified the render gate');
  assert.equal(gate.status, 'unreadable');
  assert.match(gate.detail, /has none/);
});

test('a malformed row list is not an absent one (H02)', () => {
  /*
   * Two shapes, and the second is the one the first draft of this check missed. `["alpha"]` IS
   * an array, so an `Array.isArray` test alone read it as a row list, found no failure statuses
   * in it, and certified the gate green from a summary nothing had been reconciled against.
   * A row with no usable `status` is malformed, not absent — the same property-presence rule
   * H01 established for `mode`.
   *
   * MUTATION: keep only the `Array.isArray` check. The second and third assertions go RED.
   */
  for (const variants of ['not-a-list', ['alpha', 'beta'], [{ id: 'alpha' }, { id: 'beta' }]]) {
    const gate = gateFrom({ [render.path]: renderDoc({ variants }) }, render.id);
    assert.notEqual(gate.status, 'pass', `variants ${JSON.stringify(variants)} was read as green`);
    assert.equal(gate.status, 'unreadable');
  }
});

/* ── round 14 (Astra J01): the decoder was still narrower than its claim ──── */

test('the contradiction fixture carries the summary it declares (J06)', () => {
  /*
   * Astra J06, and the reason it needs its own test: the fixture used to FORWARD the caller's
   * `{passed, failed, total}` into `buildRenderResult`, which reads `summary.pass`/`summary.fail`.
   * `passed` came out `undefined` (dropped by JSON) and `failed` came out `NaN` (serialised as
   * `null`), so every "contradictory summary" test was really exercising `summaryDefect`'s
   * malformed-counts refusal — a different defect, with the same non-PASS outcome.
   *
   * Without this test the fixture fix is unobservable: the assertions above would pass either way,
   * because both defects produce `unreadable`. That is exactly how the original gap survived.
   *
   * MUTATION: restore `summary: summary ?? summarize(results)` inside `renderDoc`'s builder call.
   * This goes RED.
   */
  const doc = renderDoc({
    results: [{ id: 'alpha', status: 'fail' }],
    summary: { passed: 1, failed: 0, total: 1 },
  });
  const roundTripped = JSON.parse(JSON.stringify(doc));
  assert.deepEqual(roundTripped.summary, { passed: 1, failed: 0, total: 1 },
    'the fixture rewrote the summary it was given — the contradiction under test is not present');
  assert.equal(summaryDefect(doc.summary), null,
    'the fixture is refused for an unrelated reason, so it cannot test the contradiction');
  assert.deepEqual(roundTripped.variants, [{ id: 'alpha', status: 'fail' }],
    'premise: the rows and the summary genuinely disagree');
});

test('RED — a row count the summary does not have is refused (J01)', () => {
  /*
   * Astra reached `1 passed, 0 failed, 1/1 evaluated` from an artifact with NO rows, and
   * `20 passed, 0 failed, 20/20 evaluated` from one with a single row. Both numbers come from one
   * producer expression — `summarize(results)` sets `total: results.length`, and the same array
   * becomes `variants` — so they cannot legitimately disagree.
   *
   * MUTATION: remove the `rows.length !== summary.total` branch of `reconciliationDefect`.
   * Both assertions go RED.
   */
  const empty = renderDoc({ variants: [] });
  const gate = gateFrom({ [render.path]: empty }, render.id);
  assert.notEqual(gate.status, 'pass', 'a zero-row artifact certified the render gate');
  assert.equal(gate.status, 'unreadable');
  assert.match(gate.detail, /0 row\(s\) but summary.total is 1/);

  const inflated = renderDoc();
  inflated.summary = { ...inflated.summary, passed: 20, total: 20 };
  const second = gateFrom({ [render.path]: inflated }, render.id);
  assert.notEqual(second.status, 'pass', 'a one-row artifact certified twenty results');
  assert.equal(second.status, 'unreadable');
  assert.match(second.detail, /1 row\(s\) but summary.total is 20/);
});

test('RED — a row status outside the producer vocabulary cannot be counted (J01)', () => {
  /*
   * Astra executed the shipped classifier against `variants: [{status:'pass'},{status:'psas'}]`
   * with `summary: {passed:2, failed:0, total:2}` and got `pass`.
   *
   * THE REASON THIS SURVIVED IS THE INTERESTING PART, and it is asserted below rather than
   * described: the shortfall rule in `summaryDefect` ALREADY refuses an unplaceable row — but it
   * asks what the SUMMARY says, and a summary that claims the row as a pass leaves no shortfall.
   * The only thing that can disagree with a summary claiming a status is the status itself.
   *
   * MUTATION: remove the `ROW_STATUSES` branch. The first assertions go RED.
   */
  const results = [{ id: 'alpha', status: 'pass' }, { id: 'beta', status: 'psas' }];

  // Refused by the status vocabulary even when the summary accounts for every row as a pass.
  const doc = renderDoc({ results });
  doc.summary = { passed: 2, failed: 0, total: 2 };
  const gate = gateFrom({ [render.path]: doc }, render.id);
  assert.notEqual(gate.status, 'pass', 'a typo status was counted as a pass');
  assert.equal(gate.status, 'unreadable');
  assert.match(gate.detail, /cannot write/);
  assert.match(gate.detail, /beta/, 'the refusal must name the unplaceable row');

  // And with the producer's own summary, the shortfall rule catches it instead — which is why
  // the gap was invisible: the summary, not the status, was doing the work. The new check now
  // fires FIRST, so the mechanism is asserted against the rule that owns it rather than through
  // the reader, where the ordering would hide it.
  const viaShortfall = gateFrom({ [render.path]: renderDoc({ results }) }, render.id);
  assert.equal(viaShortfall.status, 'unreadable');
  assert.match(viaShortfall.detail, /cannot write/, 'the vocabulary check must still be first');

  const unclaimed = summaryDefect({ total: 2, passed: 1, failed: 0 });
  assert.match(unclaimed, /neither passed nor failed/,
    'the shortfall rule no longer refuses a row its summary does not account for');
  assert.equal(
    summaryDefect({ total: 2, passed: 2, failed: 0 }), null,
    'the shortfall rule now refuses a summary that CLAIMS the row as a pass — the mechanism '
      + 'this test documents has changed, so re-derive it',
  );
});

test('RED — `population.ok: true` cannot coexist with a named shortfall (J01)', () => {
  /*
   * The round-13 check read only `ok === false` — the negative claim. Astra supplied the POSITIVE
   * claim together with the evidence against it (`{ok: true, scope: 'subset', expected: 20,
   * measured: 1, missing: ['beta']}`) and reached `pass`. `reconcilePopulation` derives `ok`,
   * `scope` and those counts from ONE reconciliation, so the object contradicted itself.
   *
   * MUTATION: remove the `pop.ok === true` branch. Every case below goes RED.
   */
  for (const population of [
    { ok: true, scope: 'subset', expected: 1, measured: 1 },
    { ok: true, scope: 'full-fleet', expected: 20, measured: 1 },
    { ok: true, scope: 'full-fleet', expected: 1, measured: 1, missing: ['beta'] },
    { ok: true, scope: 'full-fleet', expected: 1, measured: 1, duplicates: ['alpha'] },
  ]) {
    const gate = gateFrom({ [render.path]: renderDoc({ population }) }, render.id);
    assert.notEqual(gate.status, 'pass',
      `population ${JSON.stringify(population)} certified the render gate`);
    assert.equal(gate.status, 'unreadable');
    assert.match(gate.detail, /population\.ok" is true but the same object contradicts it/);
  }
});
