/**
 * gateEvidence.test.mjs — the false-PASS family, Astra round 12 (G01, G02, G05).
 *
 * WHY THIS FILE EXISTS
 * Round 12's brief told Astra that all 22 round-11 findings had been addressed. Astra
 * executed the shipped classifier and returned `status: "pass"` for inputs that declare work
 * which never ran. The claim was false, and the three findings below are the demonstration.
 * Each test here is written against the SHIPPED behaviour, and each names the mutation that
 * turns it RED — a test whose mutation cannot be named may assert nothing.
 *
 * THE TEST THAT MATTERS MOST IS THE LAST ONE
 * It is easy to stop a false pass by rejecting more. The failure mode of that cure is the one
 * this module already names: a guard that fails a REAL gate is itself the defect. The real
 * artifact — `docs/qa/AI-PLANNING-VALIDATION-LATEST.json`, the only gate in this repository
 * with a committed result — has NO `mode` field and a legitimate 4-case shortfall. Every fix
 * here must leave it green, and that is asserted directly against the real file rather than
 * against a hand-written summary that might have drifted from it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyEval, summaryDefect, EVIDENCE_MODES, NON_EVIDENCE_MODES,
} from './gateClassify.mjs';
import { artifactContract } from './gateIdentity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

const NOW = Date.parse('2026-09-20T12:00:00Z');
const STALE = 7;
const FRESH = new Date(NOW).toISOString();

/*
 * ROUND 13 — `classifyEval` NOW REQUIRES AN ARTIFACT CONTRACT (Astra H02), so every call
 * below supplies one.
 *
 * It is the PLANNING contract, and specifically not a permissive test-only stand-in. These
 * tests are about the classifier's own logic — modes, summaries, freshness — and their
 * fixtures are planning-shaped: a `{passed, failed, total}` summary and no `gate` field. The
 * planning contract is the one that declares no identity stamp is required, so it accepts
 * exactly these documents and refuses a foreign one. A test-local "accept anything" contract
 * would have let this suite stay green while the identity gate was disconnected.
 */
const PLANNING = artifactContract('planning-validation');

/** Classify one document at the fixed clock. */
const classify = (doc) => classifyEval(doc, NOW, STALE, PLANNING);

/* ── G01: an unrecognised execution mode is not evidence ──────────────────── */

test('RED — a declared but unrecognised mode is never a pass (G01)', () => {
  /*
   * MUTATION: restore the denylist rule — delete the `mode !== '' && !EVIDENCE_MODES.includes`
   * branch in `classifyEval`. Every assertion below then returns `pass`, and the suite goes
   * RED on the first one. That branch is the fix; this test is what proves it is load-bearing.
   */
  const summary = { passed: 1, failed: 0, total: 1 };
  for (const mode of ['preview', 'sImUlAtEd-ish', 'fast', 'unknown-producer']) {
    const r = classify({ mode, timestamp: FRESH, summary });
    assert.notEqual(r.status, 'pass', `mode "${mode}" was read as real evidence`);
    assert.equal(r.status, 'not_evidence', `mode "${mode}" should be not_evidence`);
    assert.match(r.detail, /not a recognised evidence mode/);
  }
});

test('RED — a non-string mode cannot smuggle itself past the check (G01)', () => {
  // `String(123)` is `"123"` — truthy, non-empty, and unrecognised. Before the fix the
  // denylist saw a value it did not know and let it through.
  const r = classify({ mode: 123, timestamp: FRESH, summary: { passed: 1, failed: 0, total: 1 } });
  assert.equal(r.status, 'not_evidence');
});

test('an ABSENT mode is still evidence — the real gate has none (G01, load-bearing)', () => {
  /*
   * This is the assertion that stops the G01 fix from breaking the product. Astra's proposed
   * remedy was "require a producer-specific, recognized evidence mode before classification";
   * taken literally that rejects the one gate in the repo with a committed result. The
   * distinction that matters is PRESENT-BUT-UNRECOGNISED, not ABSENT.
   *
   * MUTATION: make the check `!EVIDENCE_MODES.includes(mode)` without the `mode !== ''` guard.
   * This test goes RED and the real planning-validation gate is refused.
   */
  const r = classify({ timestamp: FRESH, summary: { passed: 1, failed: 0, total: 1 } });
  assert.equal(r.status, 'pass', 'a producer that declares no mode must not be refused');
});

test('the recognised modes still classify as evidence (G01)', () => {
  // MUTATION: empty `EVIDENCE_MODES`. Both assertions go RED — which is the correct
  // direction, and shows the list is load-bearing rather than decorative.
  for (const mode of EVIDENCE_MODES) {
    const r = classify({ mode, timestamp: FRESH, summary: { passed: 1, failed: 0, total: 1 } });
    assert.equal(r.status, 'pass', `mode "${mode}" should be evidence`);
  }
});

test('the known simulation modes keep their specific message (G01)', () => {
  // MUTATION: delete the NON_EVIDENCE_MODES branch. `mock` would then be rejected by the
  // generic branch, so the status survives but the message changes — this pins the message.
  for (const mode of NON_EVIDENCE_MODES) {
    const r = classify({ mode, timestamp: FRESH, summary: { passed: 1, failed: 0, total: 1 } });
    assert.equal(r.status, 'not_evidence');
    assert.match(r.detail, /did not compare against a reference/);
  }
});

/* ── G02: a declared not-run is not a pass, even without a total ──────────── */

test('RED — an absent total does not license ignoring declared not-run cases (G02)', () => {
  /*
   * Astra's first executed input. `summaryDefect` returned `null` here because `total` was
   * undefined and the function returned before it ever looked at `notRun`. Ninety-nine cases
   * that have not run were rendered as a green gate reading `1 passed, 0 failed, 0d old`.
   *
   * MUTATION: move the `awaiting > 0` check back below the `total === undefined` return.
   */
  const r = classify({ mode: 'live', timestamp: FRESH, summary: { passed: 1, failed: 0, notRun: 99 } });
  assert.notEqual(r.status, 'pass', '99 declared un-run cases were read as green');
  assert.match(r.detail, /not run yet/);
});

test('RED — a balanced total does not license ignoring declared not-run cases (G02)', () => {
  /*
   * Astra's second executed input: one case, ninety-nine declared un-run. The old function
   * returned the moment `shortfall === 0`, so the 99 were never read.
   *
   * MUTATION: move the over-declaration check back below the `shortfall === 0` return.
   */
  const r = classify({
    mode: 'live', timestamp: FRESH, summary: { passed: 1, failed: 0, total: 1, notRun: 99 },
  });
  assert.notEqual(r.status, 'pass', 'a declaration of 99 un-run cases out of 1 was read as green');
  assert.match(r.detail, /arithmetic cannot be true/);
});

test('RED — a malformed exclusion counter is a defect, not a number to skip (G02)', () => {
  /*
   * Astra's third input. `notRun: -99` used to be folded to 0 by
   * `Number.isInteger(v) && v > 0 ? v : 0`, so the field was treated as though it had never
   * been written and the summary reconciled cleanly.
   *
   * MUTATION: restore the `? v : 0` folding for the counters.
   */
  const r = summaryDefect({ passed: 1, failed: 0, total: 2, knownGaps: 1, notRun: -99 });
  assert.notEqual(r, null, 'a negative notRun was silently discarded');
  assert.match(r, /not a non-negative integer/);
});

test('a genuine shortfall that IS named still passes (G02, load-bearing)', () => {
  // The rule must not become "any shortfall is a defect" — that would reject the real gate,
  // which reports exactly this shape. MUTATION: replace the `waived < shortfall` branch with
  // `return '...'` unconditionally; this test goes RED.
  assert.equal(summaryDefect({ total: 53, gated: 49, passed: 49, failed: 0, knownGaps: 4 }), null);
  assert.equal(summaryDefect({ total: 7, passed: 5, failed: 0, knownGaps: 2 }), null);
});

test('the old bypass is still refused when the total IS present (G02, control)', () => {
  // This shape was already refused before round 12. Kept so the fix cannot be "achieved" by
  // weakening the existing rule.
  const r = summaryDefect({ passed: 1, failed: 0, total: 100, notRun: 99 });
  assert.match(r, /not run yet/);
});

/* ── G05: the future allowance is a day, not two ──────────────────────────── */

test('RED — the future allowance is exact, not rounded up to two days (G05)', () => {
  /*
   * `ageDays` floors to whole days and the boundary used the floored value, so a result 47
   * hours ahead floored to `-1` and sat inside a one-day allowance. Astra measured PASS at
   * 47h and `unreadable` at 48h.
   *
   * MUTATION: change the boundary back to `ageDays < -FUTURE_SKEW_DAYS`. The 47h and 36h
   * assertions go RED.
   */
  const at = (hours) => classify({
    mode: 'live',
    timestamp: new Date(NOW + hours * 3_600_000).toISOString(),
    summary: { passed: 1, failed: 0, total: 1 },
  });
  assert.equal(at(36).status, 'unreadable', '36h ahead must not be evidence');
  assert.equal(at(47).status, 'unreadable', '47h ahead must not be evidence');
  assert.equal(at(25).status, 'unreadable', '25h ahead exceeds a one-day allowance');
  assert.equal(at(24).status, 'pass', 'exactly one day ahead is the documented allowance');
  assert.equal(at(1).status, 'pass', 'ordinary clock skew must stay green');
});

/* ── H01: property PRESENCE, not coerced text (round 13) ──────────────────── */

test('RED — a DECLARED but malformed mode is not the absence of one (H01)', () => {
  /*
   * Round 12's fix read `String(doc?.mode ?? '').trim().toLowerCase()` and tested `mode !== ''`.
   * That checks normalised TEXT, not property PRESENCE, and `String()` coerces all of these to
   * something that passed:
   *
   *     null -> '' (read as absent)   "" -> '' (read as absent)
   *     []   -> '' (read as absent)   ["compare"] -> "compare" (in the allowlist)
   *
   * Astra (round 13, H01) executed the shipped classifier and got `pass` for all four. The
   * array case is the sharpest: an array was accepted as evidence of a real comparison.
   *
   * MUTATION: restore `const mode = String(doc?.mode ?? '').trim().toLowerCase()` with the
   * `mode !== ''` guard. Every assertion below goes RED.
   */
  const summary = { passed: 1, failed: 0, total: 1 };
  for (const mode of [null, '', [], ['compare'], ['live'], {}, 0, false]) {
    const r = classify({ mode, timestamp: FRESH, summary });
    assert.notEqual(r.status, 'pass',
      `a declared mode of ${JSON.stringify(mode)} was read as real evidence`);
    assert.equal(r.status, 'not_evidence');
  }
});

test('RED — an empty or whitespace-only declared mode is refused (H01)', () => {
  // MUTATION: allow `mode.trim() === ''` to mean "absent". `"   "` then passes.
  for (const mode of ['', '   ', '\t\n']) {
    const r = classify({ mode, timestamp: FRESH, summary: { passed: 1, failed: 0, total: 1 } });
    assert.equal(r.status, 'not_evidence', `mode ${JSON.stringify(mode)} was read as absent`);
    assert.match(r.detail, /empty/);
  }
});

test('an ABSENT mode is still evidence — undefined, not falsy (H01, load-bearing)', () => {
  /*
   * The distinction the fix must preserve. `undefined` means the property was not declared,
   * which is legitimate: the one gate in this repository with a committed result declares no
   * mode at all. Every OTHER falsy value is a declaration and is refused.
   *
   * MUTATION: test truthiness (`if (doc?.mode)`) instead of `!== undefined`. This test goes RED.
   */
  assert.equal(classify({ timestamp: FRESH, summary: { passed: 1, failed: 0, total: 1 } }).status, 'pass');
  assert.equal(
    classify({ mode: undefined, timestamp: FRESH, summary: { passed: 1, failed: 0, total: 1 } }).status,
    'pass', 'an explicitly-undefined mode is the same as an absent one',
  );
});

/* ── H05: the STALE boundary uses raw milliseconds too (round 13) ─────────── */

test('RED — the stale boundary is exact, not rounded up a day (H05)', () => {
  /*
   * Round 12 fixed only the future side. The stale side still compared the floored `ageDays`,
   * so a nominal 14-day limit accepted almost 15 days: Astra measured `pass` at 359 hours old
   * (displayed `14d old`), turning `stale` only at 360.
   *
   * MUTATION: restore `if (ageDays > staleAfterDays)`. The 359h assertion goes RED.
   */
  const LIMIT = 14;
  const at = (hours) => classifyEval(
    { mode: 'live', timestamp: new Date(NOW - hours * 3_600_000).toISOString(), summary: { passed: 1, failed: 0, total: 1 } },
    NOW, LIMIT, PLANNING,
  );
  assert.equal(at(359).status, 'stale', '359h old exceeded a 14-day limit but was not stale');
  assert.equal(at(336).status, 'pass', 'exactly 14 days old is the documented limit');
  assert.equal(at(335).status, 'pass', 'under the limit must stay green');
  // One millisecond past the limit is past it.
  const justOver = classifyEval(
    {
      mode: 'live',
      timestamp: new Date(NOW - LIMIT * 86_400_000 - 1).toISOString(),
      summary: { passed: 1, failed: 0, total: 1 },
    },
    NOW, LIMIT, PLANNING,
  );
  assert.equal(justOver.status, 'stale', 'one millisecond past the limit must be stale');
});


/* ── the guard on the guard ───────────────────────────────────────────────── */

test('THE REAL GATE STILL PASSES — the fixes must not refuse genuine evidence', () => {
  /*
   * Read the ACTUAL committed artifact, not a hand-written copy of it. If the fixes above
   * had been implemented as "reject more", this is the test that would have caught it: the
   * real planning-validation gate declares no mode and a legitimate 4-case knownGaps
   * shortfall, and it must still classify as a pass.
   *
   * MUTATION: any of the three fixes taken one step too far — requiring a mode, treating any
   * shortfall as a defect, or rejecting a present-but-nonzero waived counter — turns this RED.
   */
  const rel = 'docs/qa/AI-PLANNING-VALIDATION-LATEST.json';
  const file = join(REPO, rel);
  assert.ok(existsSync(file), `the real gate artifact is missing at ${rel} — this guard cannot run`);
  const doc = JSON.parse(readFileSync(file, 'utf8'));

  // The premise of the test, asserted rather than assumed. If the real artifact ever gains a
  // mode field, or stops carrying a shortfall, this test's reasoning changes and it must be
  // re-derived rather than silently kept.
  assert.equal(doc.mode, undefined, 'the real gate now declares a mode — re-derive this test');
  assert.ok(doc.summary.knownGaps > 0, 'the real gate no longer has a shortfall — re-derive this test');

  const r = classifyEval(doc, Date.parse(doc.timestamp) + 3_600_000, STALE, PLANNING);
  assert.equal(r.status, 'pass', `the real gate was refused: ${r.detail}`);
  assert.match(r.detail, /evaluated/, 'the pass detail must still report coverage');
});
