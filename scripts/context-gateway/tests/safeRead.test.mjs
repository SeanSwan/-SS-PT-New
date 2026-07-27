/**
 * safeRead.test.mjs — attack-fixture suite for the gateway's repo jail (Phase 0 threat rows T1/T2/T5)
 * plus the packet/evidence-ID model (T7/T11).
 * Run: node --test scripts/context-gateway/tests/safeRead.test.mjs
 *
 * Every fixture is a REAL on-disk attack in a throwaway git checkout: traversal strings,
 * sibling-prefix roots, symlinks pointing outside, NUL-byte binaries, oversize files, DENY-class
 * names. The refusal tests matter most — a jail that ever opens the wrong file is worse than none.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createSafeReader, gitTrackedFiles, isContained, SafeReadError, DENY_PATTERNS } from '../src/safeRead.mjs';
import { createPacket, PacketError } from '../src/packet.mjs';

/** Build a real throwaway git repo with tracked fixture files, plus a sibling-prefix decoy repo. */
function fixtureRepo() {
  const base = mkdtempSync(join(tmpdir(), 'swan-gw-'));
  const root = join(base, 'repo');
  const sibling = join(base, 'repo-evil'); // sibling-prefix attack target
  mkdirSync(root); mkdirSync(sibling);
  writeFileSync(join(sibling, 'loot.txt'), 'SIBLING SECRET');
  writeFileSync(join(base, 'outside.txt'), 'OUTSIDE SECRET');
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { stdio: 'pipe' });
  git('init', '-q');
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src', 'app.mjs'), 'line1\nline2\nline3\nline4\nline5\n');
  writeFileSync(join(root, '.env'), 'API_KEY=nope');
  writeFileSync(join(root, 'big.txt'), 'x'.repeat(64));
  writeFileSync(join(root, 'blob.bin'), Buffer.from([0x41, 0x00, 0x42]));
  let symlinks = false;
  try { symlinkSync(join(base, 'outside.txt'), join(root, 'escape.txt')); symlinks = true; } catch { /* no symlink privilege on this Windows */ }
  git('add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'fixtures');
  return { root, tracked: gitTrackedFiles(root), symlinks };
}

const repo = fixtureRepo();
const reader = createSafeReader({ root: repo.root, tracked: repo.tracked, maxBytes: 50 });

// ---------- T1: traversal + sibling prefix ----------
test('T1: happy path reads a tracked window', () => {
  const w = createSafeReader({ root: repo.root, tracked: repo.tracked }).readWindow('src/app.mjs', 2, 4);
  assert.equal(w.content, 'line2\nline3\nline4');
  assert.equal(w.totalLines, 6); // trailing newline yields empty 6th split entry
});

test('T1: ../ traversal refused', () => {
  assert.throws(() => reader.assertReadable('../outside.txt'), (e) => e.code === 'OUTSIDE_ROOT');
  assert.throws(() => reader.assertReadable('src/../../outside.txt'), (e) => e.code === 'OUTSIDE_ROOT');
});

test('T1: absolute path refused', () => {
  assert.throws(() => reader.assertReadable(join(repo.root, 'src', 'app.mjs')), (e) => e.code === 'OUTSIDE_ROOT' || e.code === 'NOT_TRACKED');
});

test('T1: sibling-prefix root does not contain', () => {
  assert.equal(isContained(repo.root, `${repo.root}-evil`), false);
  assert.equal(isContained(repo.root, join(`${repo.root}-evil`, 'loot.txt')), false);
});

test('T1: untracked file refused even inside root', () => {
  writeFileSync(join(repo.root, 'stray.txt'), 'untracked');
  assert.throws(() => reader.assertReadable('stray.txt'), (e) => e.code === 'NOT_TRACKED');
});

// ---------- T2: symlink escape ----------
test('T2: symlink to outside refused', { skip: !repo.symlinks && 'symlink privilege unavailable' }, () => {
  assert.throws(() => reader.assertReadable('escape.txt'), (e) => e.code === 'SYMLINK' || e.code === 'DENY_PATTERN');
});

// ---------- T5 + Rule 59: binary, size, DENY ----------
test('T5: NUL-byte binary refused', () => {
  assert.throws(() => reader.readWindow('blob.bin'), (e) => e.code === 'BINARY');
});

test('T5: oversize file refused at cap', () => {
  assert.throws(() => reader.readWindow('big.txt'), (e) => e.code === 'TOO_LARGE');
});

test('Rule 59: .env refused even though tracked', () => {
  assert.ok(repo.tracked.has('.env'), 'fixture .env must be tracked to prove the DENY gate');
  assert.throws(() => reader.assertReadable('.env'), (e) => e.code === 'DENY_PATTERN');
});

test('Rule 59: DENY patterns cover key shapes', () => {
  for (const p of ['config/secrets.json', 'certs/server.pem', 'a/.ssh/id_rsa', 'backend/.env.production']) {
    assert.ok(DENY_PATTERNS.some((re) => re.test(p)), `expected DENY for ${p}`);
  }
  assert.ok(!DENY_PATTERNS.some((re) => re.test('src/environment.ts')), 'environment.ts must NOT be denied');
});

test('bad line ranges refused', () => {
  assert.throws(() => reader.readWindow('src/app.mjs', 0, 2), (e) => e.code === 'BAD_RANGE');
  assert.throws(() => reader.readWindow('src/app.mjs', 4, 2), (e) => e.code === 'BAD_RANGE');
  assert.throws(() => reader.readWindow('src/app.mjs', 99, 100), (e) => e.code === 'BAD_RANGE');
});

// ---------- T7/T11: packet + citations ----------
function samplePacket() {
  const p = createPacket({ question: 'q', headSha: 'abc123', originatingModel: 'claude-fable-5', issue: 'SWA-1' });
  p.addEvidence({ path: 'src/app.mjs', startLine: 10, endLine: 40, content: 'c', sha: 'deadbeef', tier: 'A0' });
  p.addEvidence({ path: 'docs/x.md', startLine: 1, endLine: 5, content: 'd', sha: 'feedface', tier: 'A2' });
  return p;
}

test('T7: evidence IDs are ordinal and manifest is frozen', () => {
  const p = samplePacket();
  const m = p.finalize();
  assert.deepEqual(m.evidence.map((e) => e.id), ['E001', 'E002']);
  assert.equal(m.originatingModel, 'claude-fable-5');
  assert.throws(() => { 'use strict'; m.evidence.push({}); });
  assert.throws(() => p.addEvidence({ path: 'x', startLine: 1, endLine: 1, content: '', sha: 's', tier: 'A0' }), (e) => e.code === 'FINALIZED');
});

test('T7: citation validation — grounded passes, fabricated fails', () => {
  const p = samplePacket(); p.finalize();
  assert.equal(p.validateCitation('[E001:L12-L20]').ok, true);
  assert.equal(p.validateCitation('E001:L10-L40').ok, true);
  assert.equal(p.validateCitation('[E001:L5-L20]').reason, 'OUT_OF_WINDOW');
  assert.equal(p.validateCitation('[E001:L12-L99]').reason, 'OUT_OF_WINDOW');
  assert.equal(p.validateCitation('[E014:L1-L2]').reason, 'UNKNOWN_ID');
  assert.equal(p.validateCitation('src/app.mjs:12').reason, 'SYNTAX');
});

test('T7: answer audit classifies every citation and flags uncited answers', () => {
  const p = samplePacket(); p.finalize();
  const audit = p.auditAnswer('See [E001:L10-L15] and bogus [E999:L1-L1].');
  assert.equal(audit.valid, 1);
  assert.equal(audit.invalid.length, 1);
  assert.equal(audit.invalid[0].reason, 'UNKNOWN_ID');
  assert.equal(p.auditAnswer('no citations here').uncited, true);
});

test('finding 3: UNbracketed fabricated citations are extracted + caught (not downgraded to uncited)', () => {
  const p = samplePacket(); p.finalize();
  const audit = p.auditAnswer('per E999:L1-L2 the code does X'); // no brackets, fabricated id
  assert.equal(audit.uncited, false, 'unbracketed citation IS extracted');
  assert.equal(audit.invalid.length, 1);
  assert.equal(audit.invalid[0].reason, 'UNKNOWN_ID');
  assert.equal(p.auditAnswer('E001:L10-L20 confirms it').valid, 1, 'unbracketed VALID citation also honored');
});

test('T11: packet requires provenance + rejects bad tiers/windows', () => {
  assert.throws(() => createPacket({ question: 'q', headSha: 'x', originatingModel: '' }), (e) => e.code === 'BAD_EVIDENCE');
  const p = createPacket({ question: 'q', headSha: 'x', originatingModel: 'm' });
  assert.throws(() => p.addEvidence({ path: 'a', startLine: 5, endLine: 4, content: '', sha: 's', tier: 'A0' }), (e) => e.code === 'BAD_EVIDENCE');
  assert.throws(() => p.addEvidence({ path: 'a', startLine: 1, endLine: 2, content: '', sha: 's', tier: 'A9' }), (e) => e.code === 'BAD_TIER');
});

test('reader refuses non-checkout roots', () => {
  assert.throws(() => createSafeReader({ root: tmpdir(), tracked: new Set() }), (e) => e instanceof SafeReadError);
});

test('packet errors are typed', () => {
  try { createPacket({}); } catch (e) { assert.ok(e instanceof PacketError); }
});
