/**
 * anchor.test.mjs — E4b v2 contract tests. Each of the 10 adversarial findings
 * (F1–F10, AI-HANDOFF/HERMES-E4B-REDESIGN-2026-07-05.md) has an explicit
 * regression test, plus the E2-reproduced attack, the no-key degraded path, and a
 * legit-growth no-false-positive case. Chain + manifest + vault-id + archive-aware.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import { ensureLanes, seedSwitches, writeReceipt, vaultPaths } from './hermesRunsLib.mjs';
import { runDoctor } from './hermes-doctor.mjs';

const KEY = 'anchor-test-key-not-for-prod';
function withKey(fn) {
  const prev = process.env.HERMES_ANCHOR_KEY;
  process.env.HERMES_ANCHOR_KEY = KEY;
  try { return fn(); }
  finally { if (prev === undefined) delete process.env.HERMES_ANCHOR_KEY; else process.env.HERMES_ANCHOR_KEY = prev; }
}
function noKey(fn) {
  const prev = process.env.HERMES_ANCHOR_KEY;
  delete process.env.HERMES_ANCHOR_KEY;
  try { return fn(); }
  finally { if (prev !== undefined) process.env.HERMES_ANCHOR_KEY = prev; }
}
function fresh() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-anchor-'));
  const swFile = path.join(root, 'switches.json');
  ensureLanes(root);
  seedSwitches(swFile);
  return { root, swFile };
}
const rec = (root, date, i = 0) => writeReceipt(root, {
  who: 'hermes/runner', what: 'health-sweep (T0)', target: 't',
  when: `${date}T06:${String(i).padStart(2, '0')}:00-07:00`, 'approved-by': 'n/a',
  outcome: `ok — ${date} ${i}`, evidence: 'x',
});
function runDay(root, swFile, date, n = 1) {
  for (let i = 0; i < n; i++) rec(root, date, i);
  return runDoctor(root, swFile, date, { now: `${date}T23:00:00-07:00` });
}
const anchorCheck = (out) => out.checks.find((c) => c.name === 'anchor');
const anchorPath = (root, date) => path.join(root, 'runs', 'anchors', `${date}.anchor`);

test('happy: keyed vault signs a chain and verifies (exit 0)', () => withKey(() => {
  const { root, swFile } = fresh();
  const out = runDay(root, swFile, '2026-07-01', 3);
  assert.equal(out.exitCode, 0);
  assert.ok(anchorCheck(out).ok);
  assert.match(anchorCheck(out).detail, /signed chain verified/);
}));

test('E2 attack: .head deletion + truncation of a past day is caught', () => withKey(() => {
  const { root, swFile } = fresh();
  runDay(root, swFile, '2026-07-01', 5);
  const f = vaultPaths(root, '2026-07-01').receiptsFile;
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  fs.writeFileSync(f, `${lines.slice(0, 1).join('\n')}\n`);
  try { fs.rmSync(`${f}.head`); } catch { /* external anchor still catches it */ }
  const out = runDay(root, swFile, '2026-07-02', 1);
  assert.equal(out.exitCode, 2);
  assert.match(anchorCheck(out).detail, /TRUNCATED/);
}));

test('F1: replaying a past-day anchor into another day-slot is caught (date-slot binding)', () => withKey(() => {
  const { root, swFile } = fresh();
  runDay(root, swFile, '2026-07-01', 2);
  runDay(root, swFile, '2026-07-02', 10);
  fs.copyFileSync(anchorPath(root, '2026-07-01'), anchorPath(root, '2026-07-02')); // replay low-count over high-count slot
  const f = vaultPaths(root, '2026-07-02').receiptsFile;
  fs.writeFileSync(f, `${fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).slice(0, 5).join('\n')}\n`);
  const out = runDay(root, swFile, '2026-07-03', 1);
  assert.equal(out.exitCode, 2);
  assert.match(anchorCheck(out).detail, /date-slot mismatch/);
}));

test('F2: deleting a MIDDLE day anchor breaks the chain', () => withKey(() => {
  const { root, swFile } = fresh();
  runDay(root, swFile, '2026-07-01', 1);
  runDay(root, swFile, '2026-07-02', 1);
  runDay(root, swFile, '2026-07-03', 1);
  fs.rmSync(anchorPath(root, '2026-07-02'));
  const out = runDay(root, swFile, '2026-07-04', 1);
  assert.equal(out.exitCode, 2);
  assert.match(anchorCheck(out).detail, /chain break/);
}));

test('F2/F3: deleting the LAST day anchor is caught by the manifest count', () => withKey(() => {
  const { root, swFile } = fresh();
  runDay(root, swFile, '2026-07-01', 1);
  runDay(root, swFile, '2026-07-02', 1);
  fs.rmSync(anchorPath(root, '2026-07-02'));
  const out = runDay(root, swFile, '2026-07-03', 1);
  assert.equal(out.exitCode, 2);
  assert.match(anchorCheck(out).detail, /chain TRUNCATED|manifest/);
}));

test('F4: key-blank downgrade after a keyed history is a hard fault', () => {
  const { root, swFile } = fresh();
  withKey(() => runDay(root, swFile, '2026-07-01', 1)); // keyed → doctor-state.keyed = true
  const out = noKey(() => runDay(root, swFile, '2026-07-02', 1)); // now unkeyed
  assert.equal(out.exitCode, 2);
  assert.match(anchorCheck(out).detail, /DOWNGRADE/);
});

test('F6: an archived (pruned) day is NOT a false truncation', () => withKey(() => {
  const { root, swFile } = fresh();
  runDay(root, swFile, '2026-07-01', 5);
  const f = vaultPaths(root, '2026-07-01').receiptsFile;
  const gz = path.join(root, 'runs', 'archive', 'receipts', '2026-07', 'receipts-2026-07-01.jsonl.gz');
  fs.mkdirSync(path.dirname(gz), { recursive: true });
  fs.writeFileSync(gz, zlib.gzipSync(fs.readFileSync(f))); // archive the whole hot file
  fs.rmSync(f);
  try { fs.rmSync(`${f}.head`); } catch { /* archived */ }
  const out = runDay(root, swFile, '2026-07-02', 1);
  assert.ok(!/TRUNCATED/.test(anchorCheck(out).detail), `no false truncation: ${anchorCheck(out).detail}`);
}));

test('F7: deploying the key mid-life WARNs on pre-key days, does not fault forever', () => {
  const { root, swFile } = fresh();
  noKey(() => runDay(root, swFile, '2026-07-01', 1)); // unsigned history
  const out = withKey(() => runDay(root, swFile, '2026-07-02', 1)); // key deployed
  assert.ok(anchorCheck(out).ok, `pre-key must warn, not fault: ${anchorCheck(out).detail}`);
  assert.match(anchorCheck(out).detail, /pre-key/);
});

test('F8: changing the vault-id is caught (anchors not transplantable)', () => withKey(() => {
  const { root, swFile } = fresh();
  runDay(root, swFile, '2026-07-01', 1);
  fs.writeFileSync(path.join(root, 'runs', 'anchors', 'vault-id'), 'deadbeefdeadbeefdeadbeefdeadbeef\n');
  const out = runDay(root, swFile, '2026-07-02', 1);
  assert.equal(out.exitCode, 2);
  assert.match(anchorCheck(out).detail, /vault-id mismatch/);
}));

test('no key: anchors UNSIGNED → degraded (exit 1), not healthy', () => noKey(() => {
  const { root, swFile } = fresh();
  const out = runDay(root, swFile, '2026-07-01', 1);
  assert.equal(out.exitCode, 1);
  assert.match(anchorCheck(out).detail, /UNSIGNED/);
}));

test('F3: deleting the whole anchors dir while keyed is caught (doctor-state high-water)', () => withKey(() => {
  const { root, swFile } = fresh();
  runDay(root, swFile, '2026-07-01', 1); // keyed → doctor-state.keyed=true persisted (in runs/digests/)
  fs.rmSync(path.join(root, 'runs', 'anchors'), { recursive: true, force: true });
  const out = runDay(root, swFile, '2026-07-02', 1);
  assert.equal(out.exitCode, 2);
  assert.match(anchorCheck(out).detail, /GONE while|baseline wiped/);
}));

test('F10: an un-anchored stream day (doctor skipped) is WARNed', () => withKey(() => {
  const { root, swFile } = fresh();
  runDay(root, swFile, '2026-07-01', 1);
  rec(root, '2026-07-02', 0); // day-2 has activity but the doctor never ran that day
  const out = runDay(root, swFile, '2026-07-03', 1);
  assert.match(anchorCheck(out).detail, /un-anchored/);
}));

test('legit growth on a past day is NOT flagged', () => withKey(() => {
  const { root, swFile } = fresh();
  runDay(root, swFile, '2026-07-01', 1);
  rec(root, '2026-07-01', 5); // legit late-day activity after the anchor was signed
  const out = runDay(root, swFile, '2026-07-02', 1);
  assert.ok(!anchorCheck(out).detail.match(/TRUNCATED|mismatch|chain break/), `growth is not tamper: ${anchorCheck(out).detail}`);
}));
