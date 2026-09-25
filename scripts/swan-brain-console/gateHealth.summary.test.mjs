/**
 * gateHealth.summary.test — can a SELF-CONTRADICTORY summary be read as `pass`?
 * @module scripts/swan-brain-console/gateHealth.summary.test
 *
 * WHY THIS FILE EXISTS
 * `gateHealth.mjs` claims one invariant: `pass` requires a result that was read, parsed,
 * found fresh, found real, and found to have **zero failures**. The module exists so that
 * "not run" can never be read as green.
 *
 * Round 6 asked the question the main suite never asked: what if the summary is readable
 * JSON with a `passed`/`failed` pair that is *finite but incoherent*? `Number.isFinite`
 * accepts `failed: -1`. It accepts `passed: 5` beside `total: 500`. Both shapes reached
 * `pass`, because the arithmetic was never checked — only the type.
 *
 * That is the exact hole this module exists to close, in the one direction that matters.
 * A negative failure count is not "zero failures"; it is an unusable count. A total that
 * dwarfs what was evaluated means the overwhelming majority of this gate's own population
 * neither passed nor failed — which is "not run", and ban 35 forbids reading that as green.
 *
 * THE HARD PART, AND WHY THE CHECK IS SHAPED THIS WAY
 * The obvious check — `total === passed + failed` — is WRONG, and this suite proves it
 * against the real producer. `docs/qa/AI-PLANNING-VALIDATION-LATEST.json` carries
 * `{total: 53, gated: 49, passed: 49, failed: 0, knownGaps: 4}`. There, `total` counts the
 * 4 `knownGaps` that were deliberately excluded, so `49 + 0 !== 53`. A naive equality check
 * would reject a legitimate producer — and a guard that fails a real green gate is itself
 * the defect. So the rule is narrower: counts must be counts, `total` must not contradict
 * them, and a shortfall must be *named by the producer* rather than left as silence.
 *
 * ROUND 11 (2026-09-20) — "NAMED" HAD TO BE SPLIT IN TWO. The suite above asserted that ANY
 * field in `EXCLUSION_COUNTERS` excused a shortfall, on the stated ground that every member
 * meant "deliberately not evaluated". That was true of `knownGaps` and `excluded`, and false
 * of `notRun`, `pending`, `blocked` and `skipped` — which mean the work has not happened yet.
 * Because they excused a shortfall, `{passed: 1, failed: 0, total: 100, notRun: 99}` was
 * `pass`, rendered as `1 passed, 0 failed, 0d old`, with the 99 nowhere on screen. The
 * vocabulary is now split (`WAIVED_COUNTERS` / `AWAITING_COUNTERS`), the pass detail carries
 * its coverage, the arithmetic is checked in both directions, and a future-dated result is
 * refused. The tests below are the RED for each.
 *
 * Run: node --test scripts/swan-brain-console/gateHealth.summary.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import { readGateHealth, GATES, EXCLUSION_COUNTERS, WAIVED_COUNTERS, AWAITING_COUNTERS }
  from './gateHealth.mjs';

/** A fixed clock so "fresh" is a fact about the fixture, not about when the suite ran. */
const NOW = Date.parse('2026-09-19T12:00:00Z');

const planning = GATES.find((g) => g.id === 'planning-validation');

/** Write one planning-validation result into a throwaway root and classify it. */
function classify(summary, extra = {}) {
  const root = mkdtempSync(join(tmpdir(), 'gate-health-summary-'));
  const full = join(root, planning.path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify({
    timestamp: '2026-09-19T00:00:00Z',
    mode: 'live',
    summary,
    ...extra,
  }));
  try {
    return readGateHealth(root, { now: NOW }).gates.find((g) => g.id === planning.id);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/* ── RED: the shapes that reached `pass` before this round ────────────────── */

test('RED — a NEGATIVE failure count is never reported as pass', () => {
  // `-1 > 0` is false, so the failure branch was skipped and `passed: 5 > 0` carried it
  // to `pass`. A count that cannot exist is not evidence of zero failures.
  const gate = classify({ passed: 5, failed: -1, total: 4 });
  assert.notEqual(gate.status, 'pass', 'a negative failure count was read as green');
  assert.equal(gate.status, 'unreadable');
});

test('RED — a total that contradicts the counts is never reported as pass', () => {
  // 9 evaluated out of a declared 2. The arithmetic cannot be true, so nothing here is
  // usable — least of all "zero failures".
  const gate = classify({ passed: 9, failed: 0, total: 2 });
  assert.notEqual(gate.status, 'pass', 'passed+failed exceeding total was read as green');
  assert.equal(gate.status, 'unreadable');
});

test('RED — a total dwarfing what was evaluated is never reported as pass', () => {
  // 5 of 500 cases evaluated, 495 neither passed nor failed. That is silence, not a pass.
  const gate = classify({ passed: 5, failed: 0, total: 500 });
  assert.notEqual(gate.status, 'pass', '495 unevaluated cases were read as green');
  assert.equal(gate.status, 'unreadable');
  assert.match(gate.detail, /neither passed nor failed|unaccounted|exclusion/i);
});

test('RED — a non-integer pass count is never reported as pass', () => {
  const gate = classify({ passed: 5.5, failed: 0, total: 6 });
  assert.notEqual(gate.status, 'pass');
  assert.equal(gate.status, 'unreadable');
});

test('RED — a non-numeric total is never reported as pass', () => {
  const gate = classify({ passed: 5, failed: 0, total: '5' });
  assert.notEqual(gate.status, 'pass');
  assert.equal(gate.status, 'unreadable');
});

/* ── the anti-regression half: a real producer must still pass ─────────────
 * These are the assertions that keep the fix from becoming the defect. If the coherence
 * check is ever tightened to a naive `total === passed + failed`, these go RED.
 * ------------------------------------------------------------------------ */

test('a REAL producer shape with a declared shortfall still reports pass', () => {
  /*
   * Copied from docs/qa/AI-PLANNING-VALIDATION-LATEST.json (2026-03-03), re-dated so the
   * freshness window is not what decides the assertion. `total` 53 counts the 4 known
   * gaps that `gated` (49 = passed + failed) excludes, so `total !== passed + failed`.
   * A legitimate green gate. A coherence check that rejects this is a false alarm.
   */
  const gate = classify({
    total: 53,
    gated: 49,
    passed: 49,
    failed: 0,
    correctnessFailures: 0,
    knownGaps: 4,
    passRate: 1,
    durationMs: 9,
  });
  assert.equal(gate.status, 'pass', `real producer shape was rejected: ${gate.detail}`);
});

test('a summary with no total at all still reports pass — total is optional', () => {
  // The module's documented contract is `{ passed, failed }`. Requiring `total` would
  // break every producer that does not report one, including this suite's own fixture.
  const gate = classify({ passed: 5, failed: 0 });
  assert.equal(gate.status, 'pass');
});

test('an equal total is coherent, and reports pass', () => {
  const gate = classify({ passed: 5, failed: 0, total: 5 });
  assert.equal(gate.status, 'pass');
});

test('a shortfall named by a WAIVED counter is accepted', () => {
  /*
   * Round 11 (2026-09-20). The producer vocabulary is not ours to fix, so the rule is "the
   * shortfall must be NAMED" — but only for fields naming scope that was DELIBERATELY waived.
   *
   * This test used to iterate EXCLUSION_COUNTERS, under a comment claiming every member meant
   * "cases that were deliberately not evaluated". Half of them did not: `notRun`, `pending`,
   * `blocked` and `skipped` mean the work has NOT HAPPENED YET. The assertion was true and the
   * rationale was false — which is how it certified a false pass, in the module whose entire
   * purpose is that not-run is not read as green.
   */
  for (const field of WAIVED_COUNTERS) {
    const gate = classify({ passed: 5, failed: 0, total: 7, [field]: 2 });
    assert.equal(gate.status, 'pass', `shortfall waived by "${field}" was rejected: ${gate.detail}`);
  }
});

test('RED — a shortfall declared as NOT YET RUN is not a pass', () => {
  // The headline doctrine as an assertion: not run is not pass, however clearly it is labelled.
  for (const field of AWAITING_COUNTERS) {
    const gate = classify({ passed: 5, failed: 0, total: 7, [field]: 2 });
    assert.notEqual(gate.status, 'pass', `a shortfall declared via "${field}" was read as pass`);
    assert.equal(gate.status, 'unreadable');
    assert.match(gate.detail, /not run yet/);
  }
});

test('RED — a population that mostly did not run is not a pass', () => {
  const gate = classify({ passed: 1, failed: 0, total: 100, notRun: 99 });
  assert.notEqual(gate.status, 'pass', '1 of 100 evaluated was read as a pass');
  assert.match(gate.detail, /99 of 100/);
});

test('RED — an OVER-declared exclusion is incoherent, not merely large', () => {
  // Only `named < shortfall` was ever tested. 999 skips out of 2 cases is as impossible as a
  // silent shortfall, and it used to be accepted.
  const gate = classify({ passed: 1, failed: 0, total: 2, skipped: 999 });
  assert.notEqual(gate.status, 'pass');
  assert.match(gate.detail, /arithmetic cannot be true/);
});

test('the pass detail carries COVERAGE, so 49 of 53 cannot read as 49 of 49', () => {
  const gate = classify({ total: 53, gated: 49, passed: 49, failed: 0, knownGaps: 4 });
  assert.equal(gate.status, 'pass');
  assert.match(gate.detail, /49\/53 evaluated/, `the detail lost its coverage: ${gate.detail}`);
});

test('RED — a FUTURE-dated result is not evidence about today', () => {
  // Freshness had an upper bound and no lower one, so a result dated 2099 stayed "fresh" for
  // the next seventy years and the panel rendered it green.
  const gate = classify({ passed: 1, failed: 0, total: 1 }, { timestamp: '2099-01-01T00:00:00Z' });
  assert.notEqual(gate.status, 'pass', 'a result dated in 2099 was read as a pass');
  assert.match(gate.detail, /FUTURE/);
});

test('RED — a whitespace-padded non-evidence mode is still non-evidence', () => {
  /*
   * `.toLowerCase()` without `.trim()`: `"Mock"` was caught and `" mock "` was not, because the
   * comparison is exact. A mode field that has been through a YAML or CSV round-trip is exactly
   * the shape that carries a stray space, and its simulated run was read as real evidence.
   */
  for (const mode of [' mock ', '\tmock\n', 'Mock ', ' MOCK']) {
    const gate = classify({ passed: 1, failed: 0, total: 1 }, { mode });
    assert.notEqual(gate.status, 'pass', `mode ${JSON.stringify(mode)} was read as evidence`);
    assert.equal(gate.status, 'not_evidence');
  }
});

test('the waived and awaiting vocabularies are disjoint, and their union is the list', () => {
  // The two sets were one list before, which is what let "awaiting" excuse a shortfall.
  for (const f of WAIVED_COUNTERS) {
    assert.ok(!AWAITING_COUNTERS.includes(f), `"${f}" is in both vocabularies`);
  }
  assert.deepEqual(
    [...EXCLUSION_COUNTERS].sort(),
    [...WAIVED_COUNTERS, ...AWAITING_COUNTERS].sort(),
  );
  assert.ok(!EXCLUSION_COUNTERS.includes('gated'));
});

test('a shortfall larger than the declared exclusion is still refused', () => {
  // Naming *some* of the gap is not naming the gap. 5 evaluated + 1 gap does not account
  // for a total of 20.
  const gate = classify({ passed: 5, failed: 0, total: 20, knownGaps: 1 });
  assert.notEqual(gate.status, 'pass');
  assert.equal(gate.status, 'unreadable');
});

test('the exclusion counters are a documented, non-empty list', () => {
  // The list is the module's vocabulary for "deliberately not evaluated". If it silently
  // emptied, every shortfall would be refused and real green gates would go unreadable.
  assert.ok(Array.isArray(EXCLUSION_COUNTERS) && EXCLUSION_COUNTERS.length > 0);
  for (const f of EXCLUSION_COUNTERS) assert.equal(typeof f, 'string');
  // `gated` means "was evaluated" — the opposite of an exclusion. Counting it as one
  // would let `gated` alone absorb a shortfall it does not describe.
  assert.ok(!EXCLUSION_COUNTERS.includes('gated'));
});

/* ── the invariant, swept over every incoherent shape at once ─────────────── */

test('no incoherent summary is EVER reported as pass', () => {
  const incoherent = [
    { passed: 5, failed: -1, total: 4 },
    { passed: -5, failed: 0, total: 5 },
    { passed: 5.5, failed: 0, total: 6 },
    { passed: 9, failed: 0, total: 2 },
    { passed: 5, failed: 0, total: 500 },
    { passed: 5, failed: 0, total: '5' },
    { passed: 5, failed: 0, total: -1 },
    { passed: 5, failed: 0, total: 20, knownGaps: 1 },
    { passed: Number.NaN, failed: 0, total: 5 },
    { passed: 5, failed: Number.POSITIVE_INFINITY, total: 5 },
  ];
  for (const summary of incoherent) {
    const gate = classify(summary);
    assert.notEqual(
      gate.status,
      'pass',
      `summary ${JSON.stringify(summary)} was reported as pass`,
    );
  }
});
