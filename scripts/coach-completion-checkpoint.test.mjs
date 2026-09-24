// scripts/coach-completion-checkpoint.test.mjs
//
// C0 checkpoint validator suite. Every REFUSAL case is the point of this file:
// a validator that admits everything is indistinguishable from no validator.
//
// Run from ROOT:  node --test scripts/coach-completion-checkpoint.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  checkBindings, checkPreservation, checkRunContract, checkScope, checkSuccessor,
  checkControllerMigration, readJson, nine, sha256, runAll,
} from './coach-completion-checkpoint.mjs';

const ROOT = process.cwd();
const EV = join('docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19', 'evidence');

const G0 = ['G0-MOUNT', 'G0-ADOPT', 'G0-MEMORY', 'G0-CONSENT', 'G0-DB', 'G0-TEST', 'G0-SCHEMA', 'G0-OWNER', 'G0-RELEASE'];
const row = (id, over = {}) => ({ id, required: 'something', sourceBound: true, sources: [{ path: 'x.mjs', available: true }], ...over });
const nineRows = () => ({ rows: G0.map((id) => row(id)), countCheck: { resolved: true } });

// ── 1-6: the nine bindings ──────────────────────────────────────────────────
test('CONTROL: exactly nine binding rows pass', () => {
  assert.deepEqual(checkBindings(nineRows()), []);
});

test('REGRESSION: ten rows are refused (R5-12 count)', () => {
  const doc = nineRows();
  doc.rows.push(row('G0-EXTRA'));
  const v = checkBindings(doc);
  assert.ok(v.some((m) => /expected exactly 9 .* found 10/.test(m)), v.join(' | '));
});

test('REGRESSION: a missing G0 row is named', () => {
  const doc = { rows: nineRows().rows.filter((r) => r.id !== 'G0-MEMORY') };
  const v = checkBindings(doc);
  assert.ok(v.some((m) => /MISSING row G0-MEMORY/.test(m)), v.join(' | '));
});

test('REGRESSION: a duplicate G0 row is refused', () => {
  const doc = nineRows();
  doc.rows.push(row('G0-MOUNT'));
  const v = checkBindings(doc);
  assert.ok(v.some((m) => /DUPLICATE row G0-MOUNT/.test(m)), v.join(' | '));
});

test('REGRESSION: a row whose named source is unavailable is refused', () => {
  const doc = { rows: G0.map((id) => row(id, id === 'G0-DB' ? { sources: [{ path: 'gone.mjs', available: false }] } : {})) };
  const v = checkBindings(doc);
  assert.ok(v.some((m) => /G0-DB names 1 unavailable source/.test(m)), v.join(' | '));
});

test('REGRESSION: a row with no required-content statement is refused', () => {
  const doc = { rows: G0.map((id) => row(id, id === 'G0-TEST' ? { required: '   ' } : {})) };
  const v = checkBindings(doc);
  assert.ok(v.some((m) => /G0-TEST has no required-content/.test(m)), v.join(' | '));
});

// ── 7-9: preservation ───────────────────────────────────────────────────────
// R7-04: these three tests ALL encoded the defect. The first asserted a PASS for a receipt with an
// `artifactCount` and a "29/29" string and NO enumeration — i.e. it locked in the very shape Astra
// measured as accepting 29 artefacts with 0/0 verification. A test that a strengthened gate breaks
// because it was asserting the weak behaviour is not a regression; it is the defect being recorded.
// They now assert the strengthened contract, with the old shape demoted to an explicit CONTROL that
// must be REFUSED.
const enumd = (n, over = {}) => ({
  base: { head: 'abc' }, status: 'PRESERVED', artifactCount: n,
  method: { verified: `${n}/${n} preserved artifacts byte-identical` },
  artifacts: Array.from({ length: n }, (_, i) => ({ path: `evidence/preserved-r4-package/f${i}.md`, rawByteLength: 10, sha256: 'a'.repeat(64) })),
  ...over,
});

test('CONTROL: an ENUMERATED preservation receipt passes without a root (shape only)', () => {
  // "Shape only" is the whole pass: with no root the gate CANNOT read bytes, so it must say so
  // rather than quietly reporting a preserved state nobody verified. The control asserts exactly
  // that — no violation EXCEPT the self-report — because asserting `[]` here would be asserting
  // that the gate stays silent about verification it did not perform.
  const v = checkPreservation(enumd(29));
  assert.deepEqual(v, ['preservation: NO ROOT SUPPLIED — artefact digests were not re-verified against disk (pass { root } to verify)']);
});

test('R7-04: the pre-fix shape — a count and a 29/29 string with NO enumeration — is refused', () => {
  // This is the exact receipt that shipped and that `checkPreservation` returned `[]` for. A claim no
  // measurement can contradict is not evidence, so the enumeration is now required.
  const v = checkPreservation({ base: { head: 'abc' }, status: 'PRESERVED', artifactCount: 29, method: { verified: '29/29 preserved artifacts byte-identical' } });
  assert.ok(v.some((m) => /NO ARTEFACT ENUMERATION/.test(m)), v.join(' | '));
});

test('R7-04: a count that disagrees with the enumeration is refused', () => {
  const v = checkPreservation(enumd(29, { artifactCount: 30 }));
  assert.ok(v.some((m) => /disagrees with its own detail/.test(m)), v.join(' | '));
});

test('R7-04: a 0-byte artefact is refused (a move that recorded intent and lost content)', () => {
  const v = checkPreservation(enumd(2, { artifacts: [
    { path: 'evidence/preserved-r4-package/f0.md', rawByteLength: 10, sha256: 'a'.repeat(64) },
    { path: 'evidence/preserved-r4-package/f1.md', rawByteLength: 0, sha256: 'b'.repeat(64) },
  ] }));
  assert.ok(v.some((m) => /a 0-byte artefact is a move that lost its content/.test(m)), v.join(' | '));
});

test('R7-04: claiming baseBlobsReadable with no recorded blobSha is the over-claim returning', () => {
  const v = checkPreservation(enumd(2, { verification: { baseBlobsReadable: true } }));
  assert.ok(v.some((m) => /claims the base blobs were read, but no artefact records a blobSha/.test(m)), v.join(' | '));
});

test('REGRESSION: a partial preservation count is refused', () => {
  const v = checkPreservation(enumd(29, { method: { verified: '9/29 preserved artifacts byte-identical' } }));
  assert.ok(v.some((m) => /verification is not complete/.test(m)), v.join(' | '));
});

test('REGRESSION: an empty preservation is refused', () => {
  const v = checkPreservation({ base: { head: 'abc' }, status: 'PRESERVED', artifactCount: 0, method: { verified: '0/0' } });
  assert.ok(v.some((m) => /artifactCount is zero/.test(m)), v.join(' | '));
});

// ── 10-12: run contract ─────────────────────────────────────────────────────
const goodContract = () => ({
  entryPoints: {
    applicationSuite: { path: 'backend/run-coach-postgres.mjs', invocations: [{ cwd: 'backend', command: 'node run-coach-postgres.mjs' }] },
    nativeUnit: {}, vitestUnit: {}, browser: {}, typecheck: {}, build: {},
  },
  migrationConfig: { path: 'backend/tests/helpers/coachMigrationCompletion.config.cjs', requirements: ['No dotenv import of any kind'] },
  retiredEntryPoints: { 'run-owned-postgres-matrix': {}, 'config/config.cjs': {} },
  allowedPaths: { c0: ['a.json'] },
});

test('CONTROL: a complete run contract passes', () => {
  assert.deepEqual(checkRunContract(goodContract()), []);
});

test('REGRESSION: the application suite must be run-coach-postgres.mjs (R5-06)', () => {
  const c = goodContract();
  c.entryPoints.applicationSuite.path = 'docs/ai-workflow/.../run-owned-postgres-matrix.mjs';
  const v = checkRunContract(c);
  assert.ok(v.some((m) => /does not name backend\/run-coach-postgres\.mjs/.test(m)), v.join(' | '));
});

test('REGRESSION: an unretired dotenv config is refused (R5-06)', () => {
  const c = goodContract();
  c.retiredEntryPoints = { 'run-owned-postgres-matrix': {} };
  const v = checkRunContract(c);
  assert.ok(v.some((m) => /config\/config\.cjs is not explicitly retired/.test(m)), v.join(' | '));
  const c2 = goodContract();
  c2.migrationConfig.requirements = ['must use the application environment'];
  assert.ok(checkRunContract(c2).some((m) => /does not bind the no-dotenv/.test(m)));
});

// ── 13-15: scope ────────────────────────────────────────────────────────────
test('CONTROL: in-scope changes pass', () => {
  assert.deepEqual(checkScope([{ status: ' M', path: 'PKG/01-architecture.md' }], ['PKG/01-architecture.md', 'PKG/evidence/*.json']), []);
});

test('REGRESSION: a modified path outside scope is refused', () => {
  const v = checkScope([{ status: ' M', path: 'backend/core/routes.mjs' }], ['PKG/*.md']);
  assert.ok(v.some((m) => /MODIFIED path outside scope: backend\/core\/routes\.mjs/.test(m)), v.join(' | '));
});

test('REGRESSION: untracked and deleted paths outside scope are refused and distinguished', () => {
  const v = checkScope([{ status: '??', path: 'tmp/scratch.mjs' }, { status: ' D', path: 'docs/old.md' }], []);
  assert.ok(v.some((m) => /UNTRACKED path outside scope/.test(m)), v.join(' | '));
  assert.ok(v.some((m) => /DELETED path outside scope/.test(m)), v.join(' | '));
});

// ── 16-19: controller migration (the C→S vocabulary gate) ───────────────────
// Fixture shapes the real v7 → v9 migration: nine historical slices migrate to
// six active C-slices with the full record retained in origin. Astra Review 6
// C→S ruling; shrinkage-without-preservation stays a violation.
const v7shape = () => ({
  taskId: 't', sessionId: 's', calls: 12,
  slices: ['S83', 'S84', 'S85', 'S86', 'S87', 'S88a', 'S88b', 'S89', 'S90'].map((id) => ({ id, status: 'tested' })),
  events: Array.from({ length: 216 }, (_, i) => ({ type: `e${i}` })),
});
const v9shape = (over = {}) => {
  const before = v7shape();
  return {
    taskId: 't', sessionId: 's', calls: 12,
    slices: ['C0', 'C1', 'C2', 'C3', 'C4', 'C5'].map((id) => ({ id, status: 'build' })),
    events: [...before.events, { type: 'explicit-migration' }],
    origin: { state: before, events: before.events },
    authorization: { cadence: 'final-astra' },
    ...over,
  };
};

test('CONTROL: the C→S vocabulary migration (9 active -> 6, full origin) passes', () => {
  const before = v7shape(), after = v9shape();
  assert.deepEqual(checkControllerMigration({ before, after }), []);
});

test('REGRESSION: active-slice shrinkage WITHOUT a preserving migration is refused', () => {
  const before = v7shape(), after = v9shape();
  after.events = after.events.filter((e) => e.type !== 'explicit-migration');
  const v = checkControllerMigration({ before, after });
  assert.ok(v.some((m) => /slice history shrank/.test(m)), v.join(' | '));
});

test('REGRESSION: shrinkage whose origin lost a prior slice id is refused', () => {
  const before = v7shape(), after = v9shape();
  after.origin.state.slices = after.origin.state.slices.filter((s) => s.id !== 'S87');
  const v = checkControllerMigration({ before, after });
  assert.ok(v.some((m) => /slice history shrank/.test(m)), v.join(' | '));
});

test('REGRESSION: a final-fable after-state is refused — admission requires final-astra', () => {
  const before = v7shape(), after = v9shape({ authorization: { cadence: 'final-fable' } });
  const v = checkControllerMigration({ before, after });
  assert.ok(v.some((m) => /not final-astra/.test(m)), v.join(' | '));
});

// ── 20-22: candidate manifest currency (R6-08) ──────────────────────────────
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { checkCandidateManifest } from './coach-completion-checkpoint.mjs';

test('CONTROL: a current manifest with matching disk bytes passes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cand-'));
  writeFileSync(join(dir, 'a.mjs'), 'export const a = 1;\n');
  const bytes = readFileSync(join(dir, 'a.mjs'));
  const doc = { generatedAt: 'now', baseHead: 'abc', hashing: 'raw bytes', entries: [{ path: 'a.mjs', rawByteLength: bytes.length, sha256: sha256(bytes), trackedStatus: 'M', ownerSlice: 'C0' }] };
  assert.deepEqual(checkCandidateManifest(doc, { root: dir }), []);
  rmSync(dir, { recursive: true, force: true });
});

test('REGRESSION: drifted bytes, missing file, resurrected deletion and no root are refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cand-'));
  writeFileSync(join(dir, 'a.mjs'), 'export const a = 2;\n'); // differs from manifest
  const doc = { generatedAt: 'now', baseHead: 'abc', hashing: 'raw bytes', entries: [
    { path: 'a.mjs', rawByteLength: 20, sha256: sha256(Buffer.from('export const a = 1;\n')), trackedStatus: 'M', ownerSlice: 'C0' },
    { path: 'gone.mjs', rawByteLength: 3, sha256: sha256(Buffer.from('x')), trackedStatus: 'M', ownerSlice: 'C0' },
    { path: 'back.mjs', rawByteLength: 0, sha256: null, trackedStatus: 'D', ownerSlice: 'C0' },
  ] };
  writeFileSync(join(dir, 'back.mjs'), 'resurrected\n');
  const v = checkCandidateManifest(doc, { root: dir });
  assert.ok(v.some((m) => /DRIFTED/.test(m)), v.join(' | '));
  assert.ok(v.some((m) => /gone\.mjs does not resolve/.test(m)), v.join(' | '));
  assert.ok(v.some((m) => /back\.mjs is recorded DELETED but bytes are present/.test(m)), v.join(' | '));
  assert.ok(checkCandidateManifest(doc).some((m) => /NO ROOT SUPPLIED/.test(m)));
  rmSync(dir, { recursive: true, force: true });
});

test('REGRESSION: an entry missing required fields is named', () => {
  const doc = { generatedAt: 'now', baseHead: 'abc', hashing: 'raw bytes', entries: [{ path: 'x.mjs' }] };
  const v = checkCandidateManifest(doc, { root: '.' });
  assert.ok(v.some((m) => /missing required fields[\s\S]*x\.mjs/.test(m)), v.join(' | '));
});
