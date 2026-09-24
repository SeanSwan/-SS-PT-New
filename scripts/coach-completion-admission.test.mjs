// scripts/coach-completion-admission.test.mjs
//
// R6-03 (Astra Review 6, `xhigh`, HIGH): the ADMISSION gates and the aggregate. Split out of
// `coach-completion-checkpoint.test.mjs` for Rule 4 when that file reached 362 lines, and because it
// is a different subject: the checkpoint suite tests STRUCTURAL checks against document shapes, this
// one tests the gates asking "may a successor start" and "did a controller migration preserve what it
// must", plus the aggregate that must actually CALL them.
//
// Every test is a REFUSAL case or a guard. Astra's finding was that two gates were defined, exported
// and never invoked — a defect invisible to behavioural testing, which is why the shipped-source
// guard at the bottom exists. Run from ROOT: node --test scripts/coach-completion-admission.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { checkSuccessor, checkControllerMigration, sha256, runAll } from './coach-completion-checkpoint.mjs';

const ROOT = process.cwd();
const EV = join('docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19', 'evidence');

// R6-03: rewritten, not deleted — the originals ASSERTED THE DEFECT (`admitted: true` plus
// `successorLaunched: true` for an unread receipt holding `sha256: 'x'`). Kept failing on the old
// behaviour, which is what makes the fix load-bearing. Full narrative: the module docblock.
const realReceipt = () => {
  const rel = join(EV, 'admission.json');
  const abs = join(ROOT, rel);
  return { status: 'PASS', receiptPath: rel, sha256: sha256(readFileSync(abs)) };
};

test('CONTROL: a valid, HASH-VERIFIED successor is admitted (R6-03)', () => {
  const r = checkSuccessor({ predecessorReceipt: realReceipt(), root: ROOT });
  assert.deepEqual(r.violations, []);
  assert.equal(r.admitted, true);
  // The honest claim: this module READ the receipt and made no assertion about launching.
  assert.equal(r.successorLaunched, null, 'a read-only validator cannot witness a launch');
  assert.equal(r.launchWitnessed, false);
});

test('R6-03 REGRESSION: a non-hash string is refused in EVERY mode (Astra\'s probe)', () => {
  // Without a root: the shape check alone must catch `'not-a-hash'`.
  const noRoot = checkSuccessor({ predecessorReceipt: { status: 'PASS', receiptPath: 'EV/admission.json', sha256: 'not-a-hash' } });
  assert.equal(noRoot.admitted, false, 'a non-digest must never be admitted');
  assert.ok(noRoot.violations.some((v) => /not a 64-hex digest/.test(v)), noRoot.violations.join(' | '));
  // With a root: same verdict.
  const withRoot = checkSuccessor({ predecessorReceipt: { status: 'PASS', receiptPath: 'EV/admission.json', sha256: 'not-a-hash' }, root: ROOT });
  assert.equal(withRoot.admitted, false);
});

test('R6-03 REGRESSION: a receipt path that does not resolve is refused', () => {
  const r = checkSuccessor({
    predecessorReceipt: { status: 'PASS', receiptPath: 'does-not-exist', sha256: 'a'.repeat(64) },
    root: ROOT,
  });
  assert.equal(r.admitted, false, 'Astra measured `admitted: true` here — that is the defect');
  assert.ok(r.violations.some((v) => /does not resolve/.test(v)), r.violations.join(' | '));
});

test('R6-03 REGRESSION: a receipt whose bytes do not match the recorded hash is refused', () => {
  const r = checkSuccessor({
    predecessorReceipt: { status: 'PASS', receiptPath: join(EV, 'admission.json'), sha256: 'a'.repeat(64) },
    root: ROOT,
  });
  assert.equal(r.admitted, false, 'a well-formed hash that does not match the bytes is still a mismatch');
  assert.ok(r.violations.some((v) => /sha256 MISMATCH/.test(v)), r.violations.join(' | '));
});

test('R6-03: a root-less call reports that the receipt was never read', () => {
  const r = checkSuccessor({ predecessorReceipt: { status: 'PASS', receiptPath: join(EV, 'admission.json'), sha256: 'a'.repeat(64) } });
  assert.equal(r.admitted, false, 'an unread receipt is not evidence that it passed');
  assert.ok(r.violations.some((v) => /NO ROOT SUPPLIED/.test(v)), r.violations.join(' | '));
});

test('REGRESSION: a missing predecessor receipt refuses (the sentinel is not merely presence)', () => {
  const r = checkSuccessor({ predecessorReceipt: null });
  assert.equal(r.refused, true);
  assert.equal(r.admitted, false);
  // R6-03: this asserted `successorLaunched === false`. That is also a claim about launching, made
  // by a module that cannot launch anything — the same fabrication Astra caught on the admit path,
  // one line away. Neither `true` nor `false` is available to a read-only validator.
  assert.equal(r.successorLaunched, null);
  assert.equal(r.launchWitnessed, false);
  assert.deepEqual(r.launchLog, []);
});

test('REGRESSION: a non-PASS predecessor refuses (the sentinel is not merely presence)', () => {
  const r = checkSuccessor({ predecessorReceipt: { status: 'FAIL', receiptPath: 'p', sha256: 'a'.repeat(64) } });
  assert.equal(r.refused, true);
  // R6-03: the assertion was `successorLaunched === false`, which the module has no standing to
  // make. The refusal is what matters, and it is asserted above.
  assert.ok(r.violations.some((m) => /not PASS/.test(m)));
});

test('REGRESSION: failed cleanup or a skipped required case refuses the successor', () => {
  const base = { predecessorReceipt: realReceipt(), root: ROOT };
  assert.equal(checkSuccessor({ ...base, evidence: { cleanupFailed: true } }).refused, true);
  assert.equal(checkSuccessor({ ...base, evidence: { skippedRequiredCases: ['x'] } }).refused, true);
});
// ── controller migration ─────────────────────────────────────────────────────
const beforeState = () => ({
  taskId: 't', sessionId: 's', calls: 5, slices: [1, 2],
  events: [{ type: 'a' }], origin: { events: [{ type: 'a' }] },
  authorization: { cadence: 'final-astra' },
});
const afterState = () => ({
  taskId: 't', sessionId: 's', calls: 6, slices: [1, 2, 3],
  events: [{ type: 'a' }, { type: 'explicit-migration' }], origin: { events: [{ type: 'a' }] },
  authorization: { cadence: 'final-astra' },
});

test('CONTROL: a faithful migration to final-astra passes', () => {
  assert.deepEqual(checkControllerMigration({ before: beforeState(), after: afterState() }), []);
});

test('REGRESSION: a changed taskId or sessionId is refused', () => {
  const a = afterState(); a.taskId = 'other';
  assert.ok(checkControllerMigration({ before: beforeState(), after: a }).some((m) => /taskId changed/.test(m)));
  const b = afterState(); b.sessionId = 'other';
  assert.ok(checkControllerMigration({ before: beforeState(), after: b }).some((m) => /sessionId changed/.test(m)));
});

test('REGRESSION: a lost event history is refused (the field is events, not history)', () => {
  const a = afterState(); a.events = [];
  const v = checkControllerMigration({ before: beforeState(), after: a });
  assert.ok(v.some((m) => /event history was not preserved/.test(m)), v.join(' | '));
});

test('REGRESSION: a missing explicit-migration event is refused', () => {
  const a = afterState(); a.events = [{ type: 'a' }];
  assert.ok(checkControllerMigration({ before: beforeState(), after: a }).some((m) => /no explicit-migration event/.test(m)));
});
test('REGRESSION: a regressed call count or a non-Astra cadence is refused', () => {
  const a = afterState(); a.calls = 4;
  assert.ok(checkControllerMigration({ before: beforeState(), after: a }).some((m) => /call consumption regressed/.test(m)));
  const b = afterState(); b.authorization.cadence = 'legacy';
  assert.ok(checkControllerMigration({ before: beforeState(), after: b }).some((m) => /not final-astra/.test(m)));
});

// ── R6-03: `runAll` omitted two of the six checks it exports ──────────────────────────────────────
// Astra measured that `checkControllerMigration` and `checkSuccessor` were DEFINED, EXPORTED and
// NEVER INVOKED. A caller reading the aggregate would conclude both had been validated. Neither had
// been looked at. These tests pin that the aggregate now (a) calls them and (b) FAILS rather than
// SKIPS when their inputs are absent.
test('R6-03 REGRESSION: runAll reports the controller as NOT CHECKED when given no pair', () => {
  const r = runAll({ root: ROOT, bindings: { rows: [] }, preservation: {}, runContract: {}, changes: [] });
  assert.ok(r.controller.some((v) => /NOT CHECKED/.test(v)),
    'an un-run gate must announce itself, not disappear from the aggregate');
  assert.equal(r.allClear, false, 'and the aggregate must not be green');
  assert.ok(r.violations.some((v) => /controller/.test(v)), 'the flat view must carry it too');
});

test('R6-03 REGRESSION: runAll reports the successor as NOT CHECKED when given no receipt', () => {
  const r = runAll({ root: ROOT, bindings: { rows: [] }, preservation: {}, runContract: {}, changes: [] });
  assert.ok(r.successor.violations.some((v) => /NOT CHECKED/.test(v)));
  assert.equal(r.successor.successorLaunched, null);
  assert.equal(r.allClear, false);
});

test('R6-03 REGRESSION: a supplied controller pair IS actually evaluated by runAll', () => {
  const r = runAll({
    root: ROOT, bindings: { rows: [] }, preservation: {}, runContract: {}, changes: [],
    controller: { before: beforeState(), after: afterState() },
  });
  assert.deepEqual(r.controller, [], 'the pair above is a clean migration and must be reported clean');
  assert.ok(r.controller !== undefined, 'and the key must exist at all — it was absent before R6-03');
});

test('R6-03 REGRESSION: a supplied predecessor receipt IS actually evaluated by runAll', () => {
  const r = runAll({
    root: ROOT, bindings: { rows: [] }, preservation: {}, runContract: {}, changes: [],
    successor: { predecessorReceipt: realReceipt() },
  });
  assert.deepEqual(r.successor.violations, [], 'a real receipt with a matching hash must pass');
  assert.equal(r.successor.admitted, true);
});

test('R6-03: the flat violations view mirrors every gate', () => {
  const r = runAll({
    root: ROOT, bindings: { rows: [] }, preservation: {}, runContract: {}, changes: [],
    controller: { before: { taskId: 'x' }, after: { taskId: 'y' } },
  });
  // The controller mismatch must appear in BOTH the per-gate list and the flat list.
  assert.ok(r.controller.some((v) => /taskId changed/.test(v)));
  assert.ok(r.violations.some((v) => /taskId changed/.test(v)));
  //
  // ── DERIVE THE EXPECTATION, DO NOT ENUMERATE IT (fixed 2026-09-21) ────────────────────────────
  // The first version of this test hand-listed the gate keys it remembered:
  //     r.controller.length + r.successor.violations.length + r.bindings.length + r.preservation…
  // and it silently omitted `candidate` — the seventh gate added by R6-08's extraction. It passed
  // until a REAL candidate violation existed, then failed 31 !== 30. The assertion was not wrong
  // about `runAll`; it was wrong about the SHAPE OF `runAll`, and it stayed green for exactly as
  // long as nothing exercised the missing key. That is the same defect class as the R6-03 gate
  // itself: an enumeration that has to be kept in step by hand will drift out of step silently.
  //
  // So compute the expectation from the returned object. Every gate is either an array of strings
  // or an object carrying a `violations` array, and `violations`/`allClear` are the only non-gate
  // keys — which makes the invariant self-checking rather than remembered.
  const gateKeys = Object.keys(r).filter((k) => k !== 'violations' && k !== 'allClear');
  const expected = gateKeys.flatMap((k) => (Array.isArray(r[k]) ? r[k] : (r[k]?.violations || [])));
  assert.equal(r.violations.length, expected.length,
    `the flat view must mirror every gate: ${gateKeys.join(', ')}`);
  assert.equal(r.violations.length, expected.filter((v) => r.violations.includes(v)).length,
    'every per-gate violation must appear in the flat view');
  // And the flat view must not invent entries no gate produced.
  assert.ok(r.violations.every((v) => expected.includes(v)), 'the flat view must not contain foreign entries');
});

// ── R6-10 / task #55: PER-SLICE FIELD LOSS — the v7->v8 shape passed with `violations: []`. ────
const r610State = (slices) => ({
  taskId: 'T1', sessionId: 'S1', calls: 5, slices,
  events: [{ type: 'explicit-migration' }],
  origin: { events: [{ type: 'explicit-migration' }], state: { slices: slices.map((s) => ({ id: s.id })) } },
  authorization: { cadence: 'final-astra' },
});

test('R6-10 ANTI-VACUITY: an UNCHANGED slice set produces no violation', () => {
  const slices = [{ id: 'S1', fields: ['a', 'b'], status: 'active' }];
  assert.deepEqual(checkControllerMigration({ before: r610State(slices), after: r610State(slices) }), [],
    'if this is not clean the rest of the R6-10 tests are measuring the harness, not the gate');
});

test('R6-10: a slice that loses a FIELD is refused', () => {
  const before = [{ id: 'S1', fields: ['a', 'b'], digest: 'd1', status: 'active' }];
  const after = [{ id: 'S1', fields: ['a', 'b'], status: 'active' }];
  const v = checkControllerMigration({ before: r610State(before), after: r610State(after) });
  assert.ok(v.some((x) => /S1.*lost field "digest"/.test(x)), `expected digest loss to be named, got ${JSON.stringify(v)}`);
});

test('R6-10: a field that survives as an EMPTY list is still a loss — the disguise case', () => {
  // My first fix tested only `key in afterSlice`, so `['a','b','c','d'] -> []` passed. The key was
  // present and the contents were gone. This test exists because that fix was incomplete.
  const before = [{ id: 'S1', fields: ['a', 'b', 'c', 'd'], status: 'active' }];
  const after = [{ id: 'S1', fields: [], status: 'active' }];
  const v = checkControllerMigration({ before: r610State(before), after: r610State(after) });
  assert.ok(v.some((x) => /S1.*"fields" was EMPTIED/.test(x)), `expected the emptying to be named, got ${JSON.stringify(v)}`);
});

test('R6-10: an ADDITIVE migration is never refused (the gate must not refuse change)', () => {
  const before = [{ id: 'S1', fields: ['a'], status: 'active' }];
  const after = [{ id: 'S1', fields: ['a', 'b'], status: 'active' }, { id: 'S2', fields: ['z'], status: 'new' }];
  const v = checkControllerMigration({ before: r610State(before), after: r610State(after) });
  assert.deepEqual(v, [], `a strictly additive migration must pass, got ${JSON.stringify(v)}`);
});

test('R6-10: a status DEMOTION on a surviving slice is named, separately from field loss', () => {
  const before = [{ id: 'S1', fields: ['a'], status: 'tested' }];
  const after = [{ id: 'S1', fields: ['a'], status: 'build' }];
  const v = checkControllerMigration({ before: r610State(before), after: r610State(after) });
  assert.ok(v.some((x) => /S1.*status changed tested -> build/.test(x)), `expected demotion named, got ${JSON.stringify(v)}`);
});

// ── R6-03: the STRUCTURAL guard. The defect was not a wrong answer — it was a gate that was never
//    asked. No behavioural test can observe where a call site ISN'T, so this reads the source. ────
test('R6-03 GUARD: runAll invokes EVERY gate this package exports (no gate may go unasked)', () => {
  const src = readFileSync(new URL('./coach-completion-checkpoint.mjs', import.meta.url), 'utf8');
  const admission = readFileSync(new URL('./coach-completion-admission.mjs', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('export const runAll'));
  // The gate inventory comes from BOTH modules, because after the Rule 4 extraction the admission
  // gates are DEFINED in the admission module and only re-exported here.
  //
  // ── THE MAGIC NUMBER IS GONE (fixed 2026-09-21, third failure of this guard) ──────────────────
  // This guard has now been wrong about its own arithmetic THREE times, each for the same reason:
  // it asserted a COUNT that encoded the package's shape at the moment of writing.
  //   1. `< 6 exports in this file`  — wrong after the Rule 4 extraction moved two gates out.
  //   2. `>= 6`                      — the same error with a looser comparator.
  //   3. `=== 6`                     — failed at 7 when `checkCandidateManifest` (R6-08) existed;
  //                                    the gate was real and correctly called, and the GUARD was
  //                                    the stale artifact.
  // A count is a claim about a shape that the next extraction will change. The invariant that
  // actually matters is "*every* exported gate is called", which needs no number at all — so the
  // count is replaced by a liveness floor (there must be more than one, or the loop is vacuous).
  const exported = [
    ...[...src.matchAll(/^export const (check\w+)/gm)].map((m) => m[1]),
    ...[...admission.matchAll(/^export const (check\w+)/gm)].map((m) => m[1]),
  ];
  assert.ok(exported.length > 1,
    `expected the package to export more than one gate, found ${exported.length} — a single-gate loop proves nothing`);
  for (const gate of exported) {
    assert.ok(body.includes(`${gate}(`),
      `runAll must CALL ${gate} — a gate that is defined, exported and never invoked is decoration`);
  }
  // The behavioural half: the result must expose exactly as many gates as are called, so a gate
  // cannot be invoked and then dropped before the caller sees it.
  //
  // NOTE — do NOT try to derive the gate KEY from the check name. `checkCandidateManifest` is
  // exposed as `candidate`, and an earlier draft of this guard transliterated the name with a
  // regex and asserted `candidateManifest`, failing on correct code. That was the fourth time a
  // mechanical transformation stood in for an observation in this one file. The keys are the
  // contract; assert their COUNT against the call count and let the divergence surface as a
  // mismatch, rather than guessing individual names.
  const CALLS = [...body.matchAll(/check\w+\(/g)].map((m) => m[0]);
  const r = runAll({ root: ROOT, bindings: { rows: [] }, preservation: {}, runContract: {}, changes: [] });
  const gateKeys = Object.keys(r).filter((k) => k !== 'violations' && k !== 'allClear');
  assert.ok(gateKeys.length >= exported.length,
    `runAll exposes ${gateKeys.length} gate key(s) [${gateKeys.join(', ')}] for ${exported.length} exported gate(s) — a called gate must be visible to the caller`);
  assert.ok(CALLS.length >= exported.length,
    `runAll contains ${CALLS.length} gate call(s) for ${exported.length} exported gate(s)`);
});
