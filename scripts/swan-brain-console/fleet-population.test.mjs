/**
 * fleet-population.test — the population a render run CLAIMS to have measured.
 * @module scripts/swan-brain-console/fleet-population.test
 *
 * WHY THIS SUITE EXISTS (round 11, finding F04)
 * `shot-diff.mjs` took the list of variants it compared EXCLUSIVELY from the DOM and rejected
 * only the ZERO case. The page was therefore both the subject and the denominator of the fleet
 * gate, and a filtered harness URL produced a one-row run in which the nineteen absent variants
 * were missing from the measurement AND from the total. `failed` stayed 0, and the artifact
 * still declared `gate: 'three-worlds-render'` — a subset certifying the full-fleet gate.
 *
 * Astra proved this by execution (`shot-diff` obtained IDs only from the DOM; a one-variant
 * artifact built by the real `buildRenderResult` retained the fleet gate name and classified as
 * `pass`) and separately reported the asset and style guards still green against mutations they
 * claimed to catch. The RED tests below are that reproduction, pinned so it cannot return.
 *
 * WHY IT IS NOT IN `shot-diff.test.mjs`
 * Two subjects. That suite pins the per-variant DECISION — "a missing baseline is not a pass".
 * This one pins the RUN'S POPULATION — "a subset is not the fleet". They were one file until the
 * population work pushed it toward Rule 4, which is the same reason `judge-export.test.mjs`
 * split one round earlier.
 *
 * Run: node --test scripts/swan-brain-console/fleet-population.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  reconcilePopulation, populationFailureRows, planPopulation, buildRenderResult, countFailures,
} from './renderResult.mjs';
import { summarize } from './baselineComparison.mjs';
import { loadFleetIds } from './fleetData.mjs';
// The READER, so a subset artifact is judged by the console that declares the gate — not by a
// restatement of its rules. Same discipline as `shot-diff.test.mjs`.
import { readGateHealth, GATES } from './gateHealth.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const NOW = new Date('2026-09-20T06:00:00Z');
const RENDER_GATE = GATES.find((g) => g.id === 'three-worlds-render');

/** Write the document at the DECLARED path and ask the console's reader what it makes of it. */
function readAsGateHealth(doc) {
  const root = mkdtempSync(join(tmpdir(), 'fleet-population-'));
  const full = join(root, RENDER_GATE.path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(doc, null, 2));
  try {
    return readGateHealth(root, { now: NOW.getTime() }).gates.find((g) => g.id === RENDER_GATE.id);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** The declared fleet, as the manifest gives it. */
const FLEET = await loadFleetIds();

/**
 * Exactly what `shot-diff.mjs` does with a run: plan, contribute the failure rows, then persist.
 * Written as one helper calling the SAME `planPopulation` the script calls, so the RED tests
 * below exercise the shipped path rather than a hand-built lookalike.
 */
function runAsArtifact(measured, { update = false } = {}) {
  const plan = planPopulation({ expected: FLEET, measured, update });
  const results = measured.map((id) => ({ id, status: 'pass' }));
  results.push(...plan.rows);
  const summary = summarize(results);
  return {
    plan,
    population: plan.population,
    results,
    summary,
    doc: buildRenderResult({ results, summary, now: NOW, update, population: plan.population }),
  };
}

/* ── the manifest is a usable denominator ────────────────────────────────── */

test('the declared fleet is non-empty and free of duplicates', () => {
  // A duplicate in the manifest would make the population UNSATISFIABLE — no run could ever
  // reconcile as full-fleet, so the guard would be permanently red for a reason nobody could fix.
  assert.ok(FLEET.length > 0, 'the manifest declared no variants');
  assert.equal(new Set(FLEET).size, FLEET.length, `the manifest declares a duplicate id: ${FLEET.join(', ')}`);
});

/* ── the invariant ───────────────────────────────────────────────────────── */

test('a run that measured every declared variant is the only thing called full-fleet', () => {
  const p = reconcilePopulation({ expected: FLEET, measured: [...FLEET] });
  assert.equal(p.ok, true);
  assert.equal(p.scope, 'full-fleet');
  assert.equal(p.expected, FLEET.length);
  assert.equal(p.measured, FLEET.length);
  assert.deepEqual(p.missing, []);
  assert.deepEqual(p.unexpected, []);
  assert.deepEqual(p.duplicates, []);
});

test('RED — the round-11 reproduction: ONE measured variant is not the fleet', () => {
  /*
   * Astra's exact shape. Before the fix this produced a one-row run that classified as `pass`
   * and stamped the fleet gate, because the denominator was read from the page.
   */
  const p = reconcilePopulation({ expected: FLEET, measured: [FLEET[0]] });
  assert.equal(p.ok, false, 'a one-variant run reconciled as the fleet');
  assert.equal(p.scope, 'subset');
  assert.equal(p.measured, 1);
  assert.equal(p.expected, FLEET.length);
  assert.equal(p.missing.length, FLEET.length - 1);
});

test('a subset NAMES the variants that never rendered', () => {
  // The operator's explanation. "19 missing" without the names is not actionable.
  const p = reconcilePopulation({ expected: FLEET, measured: [FLEET[0]] });
  assert.ok(p.detail.includes(FLEET[1]), `detail did not name ${FLEET[1]}: ${p.detail}`);
  assert.match(p.detail, new RegExp(`${FLEET.length - 1} declared variant\\(s\\) never rendered`));
});

test('an empty measurement is a subset, never the fleet', () => {
  const p = reconcilePopulation({ expected: FLEET, measured: [] });
  assert.equal(p.ok, false);
  assert.equal(p.scope, 'subset');
  assert.equal(p.measured, 0);
});

test('order is not identity — a reordered full measurement is still the full fleet', () => {
  // The fleet is a SET for population purposes. Binding this to order would make an unrelated
  // harness reordering look like a coverage failure.
  const p = reconcilePopulation({ expected: FLEET, measured: [...FLEET].reverse() });
  assert.equal(p.ok, true);
  assert.equal(p.scope, 'full-fleet');
});

/* ── the other two ways a population can be wrong ────────────────────────── */

test('RED — a variant mounted twice is a failure, not extra coverage', () => {
  /*
   * Two screenshots race to write one baseline file and the second silently wins, so a
   * duplicate is a data-loss shape rather than a bonus. `measured.length` would still equal the
   * fleet size here — which is exactly why the check cannot be a length comparison.
   */
  const p = reconcilePopulation({ expected: FLEET, measured: [...FLEET, FLEET[0]] });
  assert.equal(p.ok, false, 'a duplicated mount reconciled as the fleet');
  assert.equal(p.measured, FLEET.length + 1);
  assert.deepEqual(p.duplicates, [FLEET[0]]);
  assert.notEqual(p.scope, 'full-fleet');
});

test('RED — a variant the manifest does not declare is a failure', () => {
  const p = reconcilePopulation({ expected: FLEET, measured: [...FLEET, 'v99'] });
  assert.equal(p.ok, false);
  assert.deepEqual(p.unexpected, ['v99']);
  assert.ok(p.detail.includes('v99'), p.detail);
});

test('RED — a subset that also rendered an extra variant is a mismatch, not a subset', () => {
  // Naming this a "subset" would suggest the fix is "run the rest". It is not: the harness is
  // serving something the manifest does not know about.
  const p = reconcilePopulation({ expected: FLEET, measured: [FLEET[0], 'v99'] });
  assert.equal(p.ok, false);
  assert.equal(p.scope, 'mismatch');
});

/* ── the consequence: a subset run cannot be green, on either side ────────── */

test('RED — a subset artifact is a FAILED gate, read by the console that declares it', () => {
  /*
   * The end-to-end claim. `population` alone would be advisory — a reader that only understands
   * `summary.failed` would miss it — so the mismatch must also land in the counts. This asserts
   * both halves at once, through the real reader.
   */
  const run = runAsArtifact([FLEET[0]]);
  assert.equal(countFailures(run.summary), 1, 'the exit code must see the mismatch');
  assert.equal(run.doc.summary.failed, 1, 'the artifact must carry the mismatch as a failure');
  const gate = readAsGateHealth(run.doc);
  assert.equal(gate.status, 'fail', `a one-variant run was read as ${gate.status}: ${gate.detail}`);
});

test('a full-fleet run is still a green gate — the guard did not make the gate unreachable', () => {
  /*
   * The other direction, and the one that matters for trust in the fix: a guard that fails a
   * real, correct run is itself the defect. A twenty-variant run must still pass.
   */
  const run = runAsArtifact([...FLEET]);
  assert.equal(countFailures(run.summary), 0);
  assert.equal(run.doc.summary.failed, 0);
  assert.equal(run.doc.population.scope, 'full-fleet');
  const gate = readAsGateHealth(run.doc);
  assert.equal(gate.status, 'pass', `a full-fleet run was read as ${gate.status}: ${gate.detail}`);
});

test('the artifact states the population it covered', () => {
  const run = runAsArtifact([FLEET[0]]);
  assert.equal(run.doc.population.expected, FLEET.length);
  assert.equal(run.doc.population.measured, 1);
  assert.equal(run.doc.population.scope, 'subset');
  assert.ok(run.doc.population.detail.length > 0);
});

test('a population mismatch contributes no failure row when the run covered the fleet', () => {
  // `populationFailureRows` is the single expression both the script and this suite call, so a
  // full-fleet run must contribute nothing to the counts.
  assert.deepEqual(populationFailureRows(reconcilePopulation({ expected: FLEET, measured: [...FLEET] })), []);
  assert.equal(populationFailureRows(null).length, 0);
});

/* ── the --update refusal, which no browser-less test could reach before ──── */

test('RED — an --update run REFUSES to record a partial baseline set', () => {
  /*
   * The branch that mattered most and was least reachable: `--update` exits 0 by design
   * (`countFailures` returns 0 for it), so a partial `--update` would have written a subset of
   * baselines, exited clean, and left a reference set that looks authoritative while covering
   * half the fleet. It is refused before a single file is written.
   */
  const plan = planPopulation({ expected: FLEET, measured: [FLEET[0]], update: true });
  assert.equal(plan.population.ok, false);
  assert.ok(plan.refusal, 'a partial --update run was not refused');
  assert.match(plan.refusal, /refusing to record baselines/);
  assert.ok(plan.refusal.includes(FLEET[1]), `the refusal did not name what was missing: ${plan.refusal}`);
  assert.deepEqual(plan.rows, [], 'a refused run must not also contribute rows — it never ran');
});

test('a full-fleet --update run is not refused, and a full-fleet compare run contributes nothing', () => {
  // The other direction again: the refusal must not fire on a legitimate update, or baselines
  // could never be recorded at all.
  assert.equal(planPopulation({ expected: FLEET, measured: [...FLEET], update: true }).refusal, null);
  const compare = planPopulation({ expected: FLEET, measured: [...FLEET] });
  assert.equal(compare.refusal, null);
  assert.deepEqual(compare.rows, []);
});

/* ── wiring: a helper nobody calls guards nothing ─────────────────────────── */

test('the script actually consults the plan — this is a WIRING check, and is labelled as one', () => {
  /*
   * Every test above can pass while `shot-diff.mjs` quietly stops calling `planPopulation`: the
   * helper stays correct and the gate goes blind. That is the defect class this entire round is
   * about — a check whose scope is narrower than its name — and it would be committed by exactly
   * the edit that looks most innocent (deleting the call to tidy the function up).
   *
   * The browser path cannot be exercised here: it needs a live harness on :5199, and pointing a
   * test at whatever happens to answer there is how a suite records evidence about the wrong
   * application. So the honest available proof is a SOURCE-LEVEL assertion that the call site
   * still exists and that its answer is still acted on. It proves wiring, not behaviour, and it
   * is named that way on purpose.
   */
  /*
   * ROUND 15 (2026-09-21) — THE CALL SITES MOVED TO `fleetMeasure.mjs` (Rule 4's sixth split in
   * this subsystem; the browser half is a different subject from the process contract). The
   * assertion follows the code, which is the point of a wiring assertion: a declaration that
   * names a file has to move WITH the file, or it quietly stops covering anything.
   */
  const src = readFileSync(join(HERE, 'fleetMeasure.mjs'), 'utf8');
  assert.match(src, /planPopulation\(\{/, 'fleetMeasure.mjs no longer calls planPopulation');
  assert.match(src, /plan\.refusal/, 'the refusal is ignored — an --update run could record a partial baseline set');
  assert.match(src, /plan\.rows/, 'the failure rows are ignored — a subset run would stay green');
  // And the manifest is still the SOURCE of the expected population, read before the browser
  // starts, in the module that owns the run.
  assert.match(readFileSync(join(HERE, 'shot-diff.mjs'), 'utf8'), /loadFleetIds\(\)/,
    'shot-diff.mjs no longer reads the expected population from the manifest');
});

/* ── Rule 4 ──────────────────────────────────────────────────────────────── */

test('Rule 4: every module in this subsystem stays within 300 lines', () => {
  for (const f of [
    'fleet-population.test.mjs', 'shot-diff.mjs', 'shot-diff.test.mjs',
    'baselineComparison.mjs', 'pixelDiff.mjs', 'renderResult.mjs', 'fleetData.mjs',
    'fleetMeasure.mjs',
  ]) {
    const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${f} is ${lines} lines`);
  }
});
