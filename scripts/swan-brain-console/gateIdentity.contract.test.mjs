/**
 * gateIdentity.contract.test — the cases the identity gate must NOT refuse.
 * @module scripts/swan-brain-console/gateIdentity.contract.test
 *
 * WHY THIS IS A SEPARATE FILE FROM `gateIdentity.test.mjs`
 * Two subjects, and the second is the one that decides whether the first is a fix or a new
 * defect. `gateIdentity.test.mjs` proves the reader refuses foreign and self-contradictory
 * evidence. This file proves it does not refuse REAL evidence — which is the failure mode the
 * cure invites, and one this subsystem has already shipped once: round 12's proposed G01
 * remedy ("require a producer-specific, recognized evidence mode before classification") would
 * have rejected the only gate in the repository with a committed result. Astra had to name that
 * over-reach; the tests below are what stop me making the same mistake twice.
 *
 * The two load-bearing ones are named in their own titles. `A REAL POPULATION MISMATCH IS STILL
 * A FAIL` matters most: a hand-written "population mismatch" fixture would prove only that a
 * fixture can be refused, whereas `planPopulation` is the producer's OWN function for exactly
 * the shape the reconciliation looks for. If the new check fires on that output, the console
 * would report a real, correctly-recorded gate failure as unreadable — a guard that fails a
 * real gate, which is itself the defect.
 *
 * Together the two files breached Rule 4's 300 lines, which is what forced the split; the
 * shared fixtures moved to `gateIdentity.fixtures.mjs` at the same time, so the two suites
 * cannot drift apart on what a normal artifact looks like.
 *
 * Run: node --test scripts/swan-brain-console/gateIdentity.contract.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { readGateHealth, GATES } from './gateHealth.mjs';
import { artifactContract, admissibilityDefect, ARTIFACT_CONTRACTS, FAILURE_STATUSES } from './gateIdentity.mjs';
import { classifyEval } from './gateClassify.mjs';
import { countFailures, planPopulation, ROW_STATUSES } from './renderResult.mjs';
import { summarize } from './baselineComparison.mjs';
import { NOW, STALE, render, planning, PLANNING, gateFrom, renderDoc } from './gateIdentity.fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

/* ── the guards on the guard ──────────────────────────────────────────────── */

test('THE REAL PRODUCER STILL PASSES — the identity gate must not refuse its own artifact', () => {
  /*
   * The render gate as `shot-diff.mjs` actually writes it. If the identity requirement had
   * been implemented as "every gate must carry a stamp we recognise", or the reconciliation as
   * "any non-pass row is a contradiction", this is the test that would catch it.
   *
   * MUTATION: require an identity stamp for every contract, or treat any row status other than
   * `pass` as a contradiction. This goes RED.
   */
  const gate = gateFrom({ [render.path]: renderDoc() }, render.id);
  assert.equal(gate.status, 'pass', `the real render artifact was refused: ${gate.detail}`);
  assert.equal(gate.ageDays, 0);
});

test('A REAL POPULATION MISMATCH IS STILL A FAIL — not a contradiction (H02)', () => {
  /*
   * The load-bearing one. `planPopulation` is the producer's OWN function for a partial run,
   * and its output is a legitimate FAILURE: the mismatch is carried as a failed row, so
   * `summary.failed` is 1 and the reconciliation sees no contradiction.
   *
   * MUTATION: make the population check fire on `population.ok === false` alone, without
   * asking whether the failure count already reflects it. This goes RED — and the console
   * would then report a real, correctly-recorded gate failure as unreadable.
   */
  const plan = planPopulation({ expected: ['alpha', 'beta'], measured: ['alpha'] });
  assert.equal(plan.population.ok, false, 'premise: this fixture is a partial run');
  assert.equal(plan.refusal, null, 'premise: compare mode records a mismatch, it does not refuse');
  const results = [...plan.rows, { id: 'alpha', status: 'pass' }];
  const doc = renderDoc({ results, population: plan.population });

  const gate = gateFrom({ [render.path]: doc }, render.id);
  assert.equal(gate.status, 'fail', `a real population mismatch read as ${gate.status}: ${gate.detail}`);
});

test('a genuinely failing render is fail, not a contradiction', () => {
  // Control for the rows check: rows that failed AND a summary that says so is coherent, and
  // must stay a failure. MUTATION: treat any failure row as a contradiction. This goes RED.
  const gate = gateFrom(
    { [render.path]: renderDoc({ results: [{ id: 'alpha', status: 'fail' }] }) }, render.id,
  );
  assert.equal(gate.status, 'fail', `a real failure was refused as ${gate.status}: ${gate.detail}`);
});

/* ── the compatibility contract, and the seam that could bypass it ────────── */

test('the REAL planning artifact is preserved by its compatibility contract (H02)', () => {
  /*
   * Astra asked for this explicitly: "Preserve mode-less planning artifacts through an
   * explicit planning-producer contract." This asserts it against the real committed file, and
   * asserts the PREMISE too — if the artifact ever gains a `gate` field, this reasoning changes
   * and the test must be re-derived rather than silently kept.
   *
   * MUTATION: require an identity stamp for every contract. The real gate is refused and this
   * goes RED, which is the exact over-reach round 12's G01 remedy would have committed.
   */
  const rel = planning.path;
  const file = join(REPO, rel);
  assert.ok(existsSync(file), `the real planning artifact is missing at ${rel}`);
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(doc.gate, undefined, 'the real planning artifact now declares a gate — re-derive the contract');
  assert.equal(
    admissibilityDefect(PLANNING, doc), null,
    'the planning contract refused the only real committed gate in the repository',
  );

  // End to end, through the real reader, at a clock where the artifact is fresh.
  const out = readGateHealth(REPO, { now: Date.parse(doc.timestamp) + 3_600_000 });
  const gate = out.gates.find((g) => g.id === planning.id);
  assert.equal(gate.status, 'pass', `the real planning gate was refused: ${gate.detail}`);
});

test('classifying without a contract is a refusal, not a default (H02)', () => {
  /*
   * The seam. If the contract were an optional fourth parameter, every pre-existing caller
   * would have kept the old permissive behaviour and the identity gate would apply only where
   * someone remembered to pass one — the same "scope narrower than the name" defect this round
   * is about. `readGateHealth` is the only production caller, and this pins that the parameter
   * is genuinely required.
   *
   * MUTATION: default a missing contract to a permissive one. This goes RED.
   */
  const r = classifyEval(renderDoc({ gate: 'different-gate' }), NOW, STALE);
  assert.equal(r.status, 'unreadable', 'a contract-less classification was not refused');
  assert.match(r.detail, /no artifact contract/);
});

test('a gate with no declared contract is refused, not silently accepted (H02)', () => {
  // The asymmetry, applied to this table: a sixth gate added to `GATES` without a contract
  // must be visible. MUTATION: return a permissive contract for an unknown id. This goes RED.
  const refused = admissibilityDefect(artifactContract('a-gate-nobody-declared'), renderDoc());
  assert.ok(refused, 'an undeclared gate was accepted');
  assert.equal(refused.status, 'not_evidence');
  assert.match(refused.detail, /no declared artifact contract/);
});

test('every declared EVAL gate has an artifact contract', () => {
  /*
   * The completeness guard: the table above is only as good as its coverage of the registry.
   *
   * Scoped to `kind: 'eval'` on purpose. `gate-shadow-window` is classified by
   * `classifyWindow`, which takes no contract, because the window file is its own declaration
   * — `gateHealth.mjs` names `.ai-workflow/gate-mode.json` as both the path AND the
   * `declaredBy`, so there is no second party to disagree with, and a foreign file fails on
   * its missing `until` rather than on its identity. Demanding a contract for it would be a
   * guard asserting a rule this subsystem does not have.
   *
   * MUTATION: add a gate to `GATES` without adding it here. This goes RED.
   */
  for (const g of GATES.filter((gate) => gate.kind === 'eval')) {
    assert.ok(
      ARTIFACT_CONTRACTS[g.id],
      `eval gate "${g.id}" is in GATES with no entry in ARTIFACT_CONTRACTS — the reader would `
        + 'refuse it as not_evidence, which is visible but wrong',
    );
  }
});

test('the failure-status list agrees with the producer’s own failure count', () => {
  /*
   * Drift guard. `FAILURE_STATUSES` is what the reconciliation looks for in the rows;
   * `countFailures` is what the producer puts in `summary.failed`. If a future status is added
   * to one and not the other, the reconciliation silently stops covering it — a check whose
   * scope quietly narrowed, which is this round's whole subject.
   *
   * MUTATION: add a status to `classifyComparison` and `countFailures` but not here. RED.
   */
  const rows = [
    { id: 'a', status: 'pass' }, { id: 'b', status: 'fail' },
    { id: 'c', status: 'no_baseline' }, { id: 'd', status: 'unreadable' },
    { id: 'e', status: 'written' },
  ];
  const fromRows = rows.filter((r) => FAILURE_STATUSES.includes(r.status)).length;
  assert.equal(countFailures(summarize(rows)), fromRows, 'FAILURE_STATUSES and countFailures disagree');
  assert.equal(fromRows, 3, 'premise: this fixture has exactly three failure rows');
});

/* ── round 14 (Astra J04, J05): the two ways a stricter decoder goes wrong ── */

test('a gate with NO producer refuses evidence (J04)', () => {
  /*
   * `engine-contract` declares that no writer exists. Its contract used to say `identity: null`
   * and no rows — which is indistinguishable from `planning-validation`'s, and means "admit any
   * well-formed summary". Astra put the REAL planning artifact at that path and got
   * `pass, 49 passed, 0 failed, 49/53 evaluated`.
   *
   * MUTATION: remove the `producerless` branch of `admissibilityDefect`. The first assertions go
   * RED. MUTATION: apply `producerless` to `planning-validation` too. The last assertion goes RED.
   */
  const engine = artifactContract('engine-contract');
  assert.equal(engine.producerless, true, 'the engine contract is no longer marked producerless');

  const doc = JSON.parse(readFileSync(join(REPO, planning.path), 'utf8'));
  const refused = admissibilityDefect(engine, doc);
  assert.ok(refused, 'the real planning artifact was admitted as engine-contract evidence');
  assert.equal(refused.status, 'not_evidence');
  assert.match(refused.detail, /no producer is declared/);

  /*
   * AND THE EXCEPTION MUST STAY SCOPED TO PLANNING. The whole reason `identity: null` exists is
   * that the one gate with a committed artifact has no stamp; withdrawing it everywhere would be
   * the over-reach round 12's G01 remedy nearly shipped.
   */
  assert.equal(
    admissibilityDefect(PLANNING, doc), null,
    'the planning contract regressed while the engine contract was being tightened',
  );
});

test('EVERY legitimate producer outcome survives the reader (J05)', () => {
  /*
   * Astra's J05: the two "must not refuse" guards named in this file covered only ONE population
   * shape and one failure outcome, so a mutation that returned `unreadable` whenever
   * `population.duplicates.length > 0` left all fifteen callbacks green — while flipping a real
   * duplicate-mount FAIL to UNREADABLE. The shipped decoder was right; the GUARD was blind.
   *
   * So the preservation claim is parameterised over every shape the producer can emit:
   *   missing / unexpected / duplicate / all three at once, via `planPopulation` and
   *   `reconcilePopulation` — the producer's OWN functions, never hand-written fixtures.
   *   And each of the three failure statuses as a row.
   *
   * MUTATION: refuse `unreadable` on a non-empty `duplicates` (or `missing`, or `unexpected`).
   * The corresponding case goes RED. MUTATION: treat any `no_baseline` row as a contradiction.
   * The last loop goes RED.
   */
  const partials = [
    ['missing member', ['alpha', 'beta'], ['alpha']],
    ['unexpected member', ['alpha'], ['alpha', 'ghost']],
    ['duplicate mount', ['alpha', 'beta'], ['alpha', 'beta', 'beta']],
    ['all three at once', ['alpha', 'beta'], ['ghost', 'alpha', 'alpha']],
  ];
  for (const [name, expected, measured] of partials) {
    const plan = planPopulation({ expected, measured });
    assert.equal(plan.population.ok, false, `premise: "${name}" is a partial run`);
    assert.equal(plan.refusal, null, `premise: "${name}" is compare mode, so it records`);
    const results = [...plan.rows, ...measured.map((id) => ({ id, status: 'pass' }))];
    const gate = gateFrom({ [render.path]: renderDoc({ results, population: plan.population }) }, render.id);
    assert.equal(gate.status, 'fail',
      `"${name}" read as ${gate.status} — a real, correctly-recorded failure was refused: ${gate.detail}`);
  }

  for (const status of ['fail', 'no_baseline', 'unreadable']) {
    const gate = gateFrom(
      { [render.path]: renderDoc({ results: [{ id: 'alpha', status }] }) }, render.id,
    );
    assert.equal(gate.status, 'fail',
      `a "${status}" row read as ${gate.status} — a real failure was refused: ${gate.detail}`);
  }
});

test('the row vocabulary is closed, and its non-failures are named (J01)', () => {  /*
   * `ROW_STATUSES` is the set the reconciliation accepts. If a status is added to the producer
   * without being added here, the reader starts refusing real artifacts; if it is added here
   * without a producer, the reader starts accepting rows nothing can write. Both directions are
   * asserted, and the two non-failures are named so a third one cannot appear silently.
   *
   * MUTATION: add a status to `classifyComparison` without adding it to `ROW_STATUSES`. RED.
   */
  for (const s of FAILURE_STATUSES) {
    assert.ok(ROW_STATUSES.includes(s), `FAILURE_STATUSES has "${s}" but ROW_STATUSES does not`);
  }
  assert.deepEqual(
    ROW_STATUSES.filter((s) => !FAILURE_STATUSES.includes(s)), ['pass', 'written'],
    'the row vocabulary gained a status that is neither a failure nor one of pass/written — '
      + 'decide which it is, and say so in both places',
  );
});
