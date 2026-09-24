// scripts/coach-completion-manifest.test.mjs
//
// R7-06 companion suite. `checkRetirementPairing` exists because its sibling verifies every
// manifest entry IN ISOLATION and therefore cannot see the one shape that matters: a migration
// that is DELETED with no replacement delivered. A retirement that lands no successor does not
// rename a file — it removes a migration from the runner's discovery path and adds nothing, which
// is the single outcome retirement exists to prevent.
//
// Every refusal case is asserted alongside a CONTROL that must PASS. A suite made only of
// refusals is satisfied by a function that refuses everything, so the control is not decoration.
//
// Run from WORKTREE ROOT:  node --test scripts/coach-completion-manifest.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { checkRetirementPairing, checkCandidateManifest } from './coach-completion-manifest.mjs';

const ARCHIVE = 'backend/migrations/retired-production-incident-fixes';
const live = (path, over = {}) => ({ path, rawByteLength: 1024, sha256: 'a'.repeat(64), trackedStatus: 'M', ownerSlice: 'C0', ...over });
const del = (path) => ({ path, rawByteLength: 0, sha256: null, trackedStatus: 'D', ownerSlice: 'C2' });
const arch = (name, over = {}) => ({ path: `${ARCHIVE}/${name}`, rawByteLength: 13428, sha256: 'b'.repeat(64), trackedStatus: 'A', ownerSlice: 'C2', ...over });

// ── CONTROL — the shape that must pass ──────────────────────────────────────
test('CONTROL: a deletion paired with a TRACKED successor carrying real bytes passes', () => {
  const doc = { entries: [del('backend/migrations/EMERGENCY-DATABASE-REPAIR.cjs'), arch('EMERGENCY-DATABASE-REPAIR.cjs')] };
  assert.deepEqual(checkRetirementPairing(doc), []);
});

test('CONTROL: an unrelated modification is never paired, so it is never flagged', () => {
  const doc = { entries: [live('backend/run-coach-postgres.mjs'), live('scripts/coach-completion-checkpoint.mjs')] };
  assert.deepEqual(checkRetirementPairing(doc), []);
});

test('CONTROL: a deletion OUTSIDE migrations/ is out of this gate\'s scope', () => {
  // Retirement pairing is a claim about the migration runner's discovery path. A deleted doc or
  // test is a different fault with a different fix, and this gate must not pretend to see it.
  const doc = { entries: [{ path: 'docs/old.md', rawByteLength: 0, sha256: null, trackedStatus: 'D', ownerSlice: 'C0' }] };
  assert.deepEqual(checkRetirementPairing(doc), []);
});

// ── REFUSALS — the three measured faults, one per test ──────────────────────
test('R7-06: a deletion with NO archived successor at all is refused (the EMERGENCY shape)', () => {
  // Measured on the real manifest 2026-09-22: backend/migrations/EMERGENCY-DATABASE-REPAIR.cjs was
  // DELETED and its 13,428-byte replacement was absent from the manifest entirely (the file is
  // invisible to `git status` because .gitignore:201 `emergency-*` matches it). The gate reported
  // nothing, because it compared no deletion to any addition.
  const doc = { entries: [del('backend/migrations/EMERGENCY-DATABASE-REPAIR.cjs')] };
  const v = checkRetirementPairing(doc);
  assert.ok(v.some((m) => /no archived successor with that basename is listed/.test(m)), v.join(' | '));
  assert.ok(v.some((m) => /EMERGENCY-DATABASE-REPAIR\.cjs/.test(m)), v.join(' | '));
});

test('R7-06: a successor that is UNTRACKED does not count as delivered (the "??" shape)', () => {
  // This is the half a pairing check alone still passes: the basename matches, the bytes are real,
  // and the file is not in the index — so a commit of tracked changes would not land it.
  const doc = { entries: [del('backend/migrations/UUID-INTEGER-TYPE-MISMATCH-FIX.cjs'), arch('UUID-INTEGER-TYPE-MISMATCH-FIX.cjs', { trackedStatus: '??' })] };
  const v = checkRetirementPairing(doc);
  assert.ok(v.some((m) => /is listed as "\?\?" — an untracked replacement is NOT a delivered replacement/.test(m)), v.join(' | '));
});

test('R7-06: a successor that resolves to different content is refused on bytes', () => {
  const doc = { entries: [del('backend/migrations/X.cjs'), arch('X.cjs', { rawByteLength: 0, sha256: null })] };
  const v = checkRetirementPairing(doc);
  assert.ok(v.some((m) => /records no bytes/.test(m)), v.join(' | '));
});

test('R7-06: a DIFFERENT basename is not a successor, however well-formed it looks', () => {
  // The near-miss that a naive "an archive entry exists" check would admit.
  const doc = { entries: [del('backend/migrations/EMERGENCY-DATABASE-REPAIR.cjs'), arch('SOMETHING-ELSE.cjs')] };
  const v = checkRetirementPairing(doc);
  assert.ok(v.some((m) => /no archived successor with that basename is listed/.test(m)), v.join(' | '));
});

test('R7-06: a document with no entries is refused rather than silently clean', () => {
  assert.ok(checkRetirementPairing(null).length > 0);
  assert.ok(checkRetirementPairing({}).length > 0);
});

// ── the aggregate must actually CALL the pairing check ──────────────────────
test('R7-06: checkCandidateManifest surfaces the pairing fault, not just the isolated entries', () => {
  // The defect was an AGGREGATE OMITTING ITS OWN CHECK: an entry-level verifier that never related
  // a deletion to an addition. This test fails if the call is ever dropped from the aggregate.
  const doc = {
    generatedAt: 'now', baseHead: 'abc', headAtManifest: 'abc', hashing: 'raw bytes',
    entries: [del('backend/migrations/EMERGENCY-DATABASE-REPAIR.cjs')],
  };
  const v = checkCandidateManifest(doc, { root: '.' });
  assert.ok(v.some((m) => /no archived successor with that basename is listed/.test(m)), v.join(' | '));
});

// ── the unsubstantiated baseline (the hardcoded baseHead) ───────────────────
test('R7-06: a baseHead that disagrees with headAtManifest must be substantiated', () => {
  const base = { generatedAt: 'now', hashing: 'raw bytes', entries: [live('backend/run-coach-postgres.mjs')] };
  const drift = { ...base, baseHead: '5'.repeat(40), headAtManifest: '7'.repeat(40) };
  const v = checkCandidateManifest(drift, { root: 'scripts' });
  assert.ok(v.some((m) => /no baseHeadSource names where the base was resolved from/.test(m)), v.join(' | '));
  // Naming the source discharges the obligation. `baseHead` may legitimately differ from HEAD —
  // a candidate can be built on an unmerged base — so the requirement is substantiation, not equality.
  const named = { ...drift, baseHeadSource: 'rescue/swan-coach-astra-owned-53005a6da (merge-base with HEAD)' };
  assert.ok(!checkCandidateManifest(named, { root: 'scripts' }).some((m) => /baseHeadSource/.test(m)));
});

test('CONTROL: a manifest whose baseHead equals headAtManifest needs no source', () => {
  const doc = { generatedAt: 'now', baseHead: 'abc', headAtManifest: 'abc', hashing: 'raw bytes', entries: [live('backend/run-coach-postgres.mjs')] };
  assert.ok(!checkCandidateManifest(doc, { root: 'scripts' }).some((m) => /baseHeadSource/.test(m)));
});

// ── R7-11: A RECORDED LENGTH NOTHING COMPARED (found by my own R7-06 control pass) ─────────────
// These use a REAL file written to a temp root, because the defect class here is "the recorded value
// and the measured value disagree" — a fixture with invented values could not distinguish a check
// that compares them from one that does not. `root: '.'` + a made-up path would fail to resolve
// instead, which is a DIFFERENT refusal and would make this suite green for the wrong reason.
const REAL = 'scripts/coach-completion-manifest.mjs'; // any stable file in the tree; hashed from disk

test('R7-11 CONTROL: a manifest whose recorded length EQUALS the bytes on disk passes', () => {
  const body = readFileSync(REAL);
  const honest = { generatedAt: 'now', baseHead: 'abc', headAtManifest: 'abc', hashing: 'raw bytes',
    entries: [live(REAL, { rawByteLength: body.length, sha256: createHash('sha256').update(body).digest('hex') })] };
  assert.deepEqual(checkCandidateManifest(honest, { root: '.' }), []);
});

test('R7-11: a length that disagrees with the bytes that hashed is refused (the mutation mine missed)', () => {
  // The strongest form of the lie: the DIGEST is correct and the file is untouched, so a digest-only
  // verifier passes. Only the recorded length is wrong. Measured against the shipped gate before the
  // fix: `[]` — admitted (`tmp/r711-manifest-byte-probe.mjs`, hostile-mutation style, length += 999).
  const body = readFileSync(REAL);
  const liar = { generatedAt: 'now', baseHead: 'abc', headAtManifest: 'abc', hashing: 'raw bytes',
    entries: [live(REAL, { rawByteLength: body.length + 999, sha256: createHash('sha256').update(body).digest('hex') })] };
  const v = checkCandidateManifest(liar, { root: '.' });
  assert.ok(v.some((m) => /records rawByteLength .* but the bytes that hashed are/.test(m)), v.join(' | '));
});

test('R7-11 ANTI-VACUITY: a zero recorded length is refused, not excused as "nothing to carry"', () => {
  // A `null`/0 length beside a non-empty digest is the same self-contradiction, and it is the shape a
  // partial write leaves behind. Refusing it must not depend on the byte count being large or small.
  const body = readFileSync(REAL);
  const zeroed = { generatedAt: 'now', baseHead: 'abc', headAtManifest: 'abc', hashing: 'raw bytes',
    entries: [live(REAL, { rawByteLength: 0, sha256: createHash('sha256').update(body).digest('hex') })] };
  assert.ok(checkCandidateManifest(zeroed, { root: '.' }).some((m) => /records rawByteLength 0 /.test(m)));
});
