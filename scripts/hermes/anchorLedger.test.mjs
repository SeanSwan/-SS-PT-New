/**
 * anchorLedger.test.mjs — E4b-final regression suite. Every test maps to an
 * adversarial finding from HERMES-E4B-REDESIGN-2026-07-05.md (F1–F10) or the
 * 2026-07-07 E4b-final security pass (segments, freshness, downgrade, rewrite).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import { ensureLanes, seedSwitches, writeReceipt, vaultPaths } from './hermesRunsLib.mjs';
import { runDoctor } from './hermes-doctor.mjs';
import { verifyOffbox, readOffbox } from './anchorOffbox.mjs';
import {
  ensureVaultId, recordAnchors, anchorStatus, ledgerPathOf, verifySegments,
} from './anchorLedger.mjs';

const KEY = 'ledger-test-key-not-for-prod';
process.env.HERMES_ANCHOR_KEY = KEY;
const DAY = '2026-07-01';

function fresh() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-anch-'));
  const swFile = path.join(root, 'switches.json');
  ensureLanes(root);
  seedSwitches(swFile);
  return { root, swFile };
}
const receipt = (root, when = `${DAY}T06:00:00-07:00`, outcome = 'ok — green') => writeReceipt(root, {
  who: 'hermes/runner', what: 'health-sweep (T0)', target: 't', when,
  'approved-by': 'n/a', outcome, evidence: 'runs/logs/x.log',
});
const unkeyed = (fn) => {
  delete process.env.HERMES_ANCHOR_KEY;
  try { return fn(); } finally { process.env.HERMES_ANCHOR_KEY = KEY; }
};

test('vault-id: created once, stable across calls', () => {
  const { root } = fresh();
  const a = ensureVaultId(root);
  assert.equal(ensureVaultId(root), a);
  assert.match(a, /^[0-9a-f]{32}$/);
});

test('recordAnchors: signed v2 entry with keyId + toolHash; ledger verifies; segment emitted', () => {
  const { root } = fresh();
  receipt(root);
  const out = recordAnchors(root, DAY);
  assert.deepEqual(out.appended, [DAY]);
  const recs = readOffbox(ledgerPathOf(root));
  assert.equal(recs.length, 1);
  assert.equal(recs[0].signed, true);
  assert.match(recs[0].keyId, /^[0-9a-f]{12}$/);
  assert.match(recs[0].toolHash, /^[0-9a-f]{16}$/);
  assert.ok(verifyOffbox(ledgerPathOf(root), ensureVaultId(root)).ok);
  const seg = verifySegments(root, ensureVaultId(root));
  assert.equal(seg.present, true);
  assert.deepEqual(seg.faults, []);
});

test('healthy keyed vault → anchorStatus ok (off-box note, no warns)', () => {
  const { root } = fresh();
  receipt(root);
  recordAnchors(root, DAY);
  const st = anchorStatus(root, { today: DAY });
  assert.equal(st.level, 'ok', JSON.stringify(st));
  assert.match(st.notes.join(' '), /off-box witness not configured/);
});

test('same-day stream truncation below the witness → FAULT (F5-class)', () => {
  const { root } = fresh();
  receipt(root); receipt(root); receipt(root);
  recordAnchors(root, DAY);
  const f = vaultPaths(root, DAY).receiptsFile;
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  fs.writeFileSync(f, `${lines[0]}\n`);
  const st = anchorStatus(root, { today: DAY });
  assert.equal(st.level, 'fault');
  assert.match(st.faults.join(' '), /TRUNCATION/);
});

test('witnessed line altered beneath later appends → FAULT (rewrite-under-growth)', () => {
  const { root } = fresh();
  receipt(root); receipt(root);
  recordAnchors(root, DAY); // witness at count 2
  const f = vaultPaths(root, DAY).receiptsFile;
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  lines[1] = lines[1].replace('ok — green', 'ok — FORGED');
  lines.push(lines[0]); // grow past the witness so count-compare alone would pass
  fs.writeFileSync(f, `${lines.join('\n')}\n`);
  const st = anchorStatus(root, { today: DAY });
  assert.equal(st.level, 'fault');
  assert.match(st.faults.join(' '), /altered beneath later appends|witnessed head altered/);
});

test('archived day (prune moved it to .gz) is NOT a false TRUNCATED (F6)', () => {
  const { root } = fresh();
  receipt(root); receipt(root);
  recordAnchors(root, DAY);
  const f = vaultPaths(root, DAY).receiptsFile;
  const dest = path.join(root, 'runs', 'archive', 'receipts', '2026-07', `receipts-${DAY}.jsonl.gz`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, zlib.gzipSync(fs.readFileSync(f)));
  fs.rmSync(f); fs.rmSync(`${f}.head`);
  const st = anchorStatus(root, { today: DAY });
  assert.equal(st.level, 'ok', JSON.stringify(st.faults));
});

test('corrupt archive .gz → FAULT, never a crash (round-2 gz lesson)', () => {
  const { root } = fresh();
  receipt(root);
  recordAnchors(root, DAY);
  const f = vaultPaths(root, DAY).receiptsFile;
  const dest = path.join(root, 'runs', 'archive', 'receipts', '2026-07', `receipts-${DAY}.jsonl.gz`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from('not-gzip-at-all'));
  fs.rmSync(f); fs.rmSync(`${f}.head`);
  const st = anchorStatus(root, { today: DAY });
  assert.equal(st.level, 'fault');
  assert.match(st.faults.join(' '), /corrupt \.gz/);
});

test('witnessed day fully GONE (no hot, no archive) → FAULT deletion (F2-class)', () => {
  const { root } = fresh();
  receipt(root);
  recordAnchors(root, DAY);
  const f = vaultPaths(root, DAY).receiptsFile;
  fs.rmSync(f); fs.rmSync(`${f}.head`);
  const st = anchorStatus(root, { today: DAY });
  assert.equal(st.level, 'fault');
  assert.match(st.faults.join(' '), /GONE .* deletion/);
});

test('key-blank downgrade: signed history + unset key → FAULT, never healthy (F4)', () => {
  const { root } = fresh();
  receipt(root);
  recordAnchors(root, DAY);
  const st = unkeyed(() => anchorStatus(root, { today: DAY }));
  assert.equal(st.level, 'fault');
  assert.match(st.faults.join(' '), /key-blank downgrade|key is unset/i);
});

test('never-keyed vault → WARN (degraded), not fault, not healthy (F4/F7)', () => {
  const { root } = fresh();
  receipt(root);
  unkeyed(() => recordAnchors(root, DAY));
  const st = unkeyed(() => anchorStatus(root, { today: DAY }));
  assert.equal(st.level, 'warn');
  assert.match(st.warns.join(' '), /UNSIGNED, forgery-resistance OFF/);
});

test('cross-vault ledger transplant → vault-id FAULT (F8)', () => {
  const a = fresh();
  const b = fresh();
  receipt(a.root);
  recordAnchors(a.root, DAY);
  ensureVaultId(b.root);
  fs.mkdirSync(path.dirname(ledgerPathOf(b.root)), { recursive: true });
  fs.copyFileSync(ledgerPathOf(a.root), ledgerPathOf(b.root));
  const st = anchorStatus(b.root, { today: DAY });
  assert.equal(st.level, 'fault');
  assert.match(st.faults.join(' '), /vault-id mismatch/);
});

test('un-anchored hot stream day → WARN until recorded (F10)', () => {
  const { root } = fresh();
  receipt(root);
  const before = anchorStatus(root, { today: DAY });
  assert.equal(before.level, 'warn');
  assert.match(before.warns.join(' '), /un-anchored stream day/);
  recordAnchors(root, DAY);
  assert.equal(anchorStatus(root, { today: DAY }).level, 'ok');
});

test('backdated stream day appearing after newer ledger entries → skipped + reported, ledger order intact (F9/F1-class)', () => {
  const { root } = fresh();
  receipt(root);
  recordAnchors(root, DAY);
  recordAnchors(root, '2026-07-02'); // ledger advances
  receipt(root, '2026-06-25T10:00:00-07:00'); // a backdated day materializes
  const out = recordAnchors(root, '2026-07-02');
  assert.deepEqual(out.skippedBackdated, ['2026-06-25']);
  assert.ok(verifyOffbox(ledgerPathOf(root), ensureVaultId(root)).ok, 'append-only date order preserved');
});

test('ledger tail deletion vs off-box witness copy → FAULT (the deletion teeth)', () => {
  const { root } = fresh();
  receipt(root);
  recordAnchors(root, DAY);
  recordAnchors(root, DAY); // 2 entries
  const witness = path.join(root, 'witness-copy.jsonl');
  fs.copyFileSync(ledgerPathOf(root), witness);
  const lines = fs.readFileSync(ledgerPathOf(root), 'utf8').split('\n').filter(Boolean);
  fs.writeFileSync(ledgerPathOf(root), `${lines[0]}\n`); // delete the tail locally
  process.env.HERMES_OFFBOX_WITNESS = witness;
  try {
    const st = anchorStatus(root, { today: DAY });
    assert.equal(st.level, 'fault');
    assert.match(st.faults.join(' '), /BEHIND the off-box witness/);
  } finally { delete process.env.HERMES_OFFBOX_WITNESS; }
});

test('stale off-box witness → WARN, never silently healthy (freshness)', () => {
  const { root } = fresh();
  receipt(root);
  recordAnchors(root, DAY);
  const witness = path.join(root, 'witness-copy.jsonl');
  fs.copyFileSync(ledgerPathOf(root), witness);
  process.env.HERMES_OFFBOX_WITNESS = witness;
  try {
    const st = anchorStatus(root, { today: '2026-07-09' }); // witness max date = 07-01
    assert.notEqual(st.level, 'ok');
    assert.match([...st.warns, ...st.faults].join(' '), /STALE/i);
  } finally { delete process.env.HERMES_OFFBOX_WITNESS; }
});

test('segments: ledger truncated after segmenting → segment FAULT (immutable-layout cross-check)', () => {
  const { root } = fresh();
  receipt(root);
  recordAnchors(root, DAY);
  recordAnchors(root, DAY);
  const lines = fs.readFileSync(ledgerPathOf(root), 'utf8').split('\n').filter(Boolean);
  fs.writeFileSync(ledgerPathOf(root), `${lines[0]}\n`);
  const seg = verifySegments(root, ensureVaultId(root));
  assert.ok(seg.faults.some((f) => /SHORTER than its immutable segments/.test(f)), JSON.stringify(seg.faults));
});

test('doctor integration: healthy keyed vault stays exit 0 with the anchor check ok', () => {
  const { root, swFile } = fresh();
  receipt(root);
  const out = runDoctor(root, swFile, DAY, { now: `${DAY}T12:00:00-07:00` });
  assert.equal(out.exitCode, 0, JSON.stringify(out.checks.filter((c) => !c.ok)) + JSON.stringify(out.warns));
  assert.ok(out.checks.find((c) => c.name === 'anchor' && c.ok));
});

test('doctor integration: witnessed truncation → exit 2 via the anchor check', () => {
  const { root, swFile } = fresh();
  receipt(root); receipt(root); receipt(root);
  runDoctor(root, swFile, DAY, { now: `${DAY}T12:00:00-07:00` }); // records the witness
  const f = vaultPaths(root, DAY).receiptsFile;
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  fs.writeFileSync(f, `${lines[0]}\n${lines[1]}\n`);
  fs.rmSync(`${f}.head`); // kill the local heuristic anchor too — the ledger must still catch it
  const out = runDoctor(root, swFile, DAY, { now: `${DAY}T13:00:00-07:00` });
  assert.equal(out.exitCode, 2);
  assert.ok(out.checks.find((c) => c.name === 'anchor' && !c.ok));
});
