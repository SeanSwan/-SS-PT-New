/**
 * anchorOffbox.test.mjs — E4c off-box ledger primitive. The append-only signed
 * chained witness + per-date regression detection that (once synced to an
 * un-rewritable sink) closes the deletion-resistance the local anchor cannot.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { appendOffbox, readOffbox, verifyOffbox, witnessByDate, regressionVsLocal } from './anchorOffbox.mjs';

const KEY = 'offbox-test-key-not-for-prod';
function withKey(fn) {
  const prev = process.env.HERMES_ANCHOR_KEY;
  process.env.HERMES_ANCHOR_KEY = KEY;
  try { return fn(); } finally { if (prev === undefined) delete process.env.HERMES_ANCHOR_KEY; else process.env.HERMES_ANCHOR_KEY = prev; }
}
const ledger = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'offbox-')), 'anchor-ledger.jsonl');
const rec = (date, rc, qc = 0) => ({ vaultId: 'vaultA', date, streams: { receipts: { count: rc, head: `h-${date}-${rc}` }, queue: { count: qc, head: `q-${date}-${qc}` } } });

test('append + verify: a signed chained ledger verifies', () => withKey(() => {
  const l = ledger();
  appendOffbox(l, rec('2026-07-01', 5));
  appendOffbox(l, rec('2026-07-02', 3)); // day-2 fewer than day-1 — legit (per-day streams)
  appendOffbox(l, rec('2026-07-03', 9));
  const v = verifyOffbox(l, 'vaultA');
  assert.ok(v.ok, JSON.stringify(v.faults));
  assert.equal(readOffbox(l).length, 3);
}));

test('cross-date: a later day with FEWER lines is NOT flagged (per-day, not global)', () => withKey(() => {
  const l = ledger();
  appendOffbox(l, rec('2026-07-01', 100));
  const { regression } = appendOffbox(l, rec('2026-07-02', 2));
  assert.equal(regression, null);
  assert.ok(verifyOffbox(l, 'vaultA').ok);
}));

test('within-date truncation on append is flagged as a regression', () => withKey(() => {
  const l = ledger();
  appendOffbox(l, rec('2026-07-01', 10));
  const { regression } = appendOffbox(l, rec('2026-07-01', 4)); // same day, fewer lines = truncation
  assert.match(regression, /truncation/);
}));

test('editing a ledger entry without the key breaks verification (HMAC)', () => withKey(() => {
  const l = ledger();
  appendOffbox(l, rec('2026-07-01', 5));
  appendOffbox(l, rec('2026-07-02', 6));
  const lines = fs.readFileSync(l, 'utf8').split('\n').filter(Boolean);
  const o = JSON.parse(lines[0]); o.streams.receipts.count = 1; lines[0] = JSON.stringify(o);
  fs.writeFileSync(l, `${lines.join('\n')}\n`);
  assert.equal(verifyOffbox(l, 'vaultA').ok, false);
}));

test('deleting a middle ledger entry breaks the chain', () => withKey(() => {
  const l = ledger();
  appendOffbox(l, rec('2026-07-01', 5));
  appendOffbox(l, rec('2026-07-02', 6));
  appendOffbox(l, rec('2026-07-03', 7));
  const lines = fs.readFileSync(l, 'utf8').split('\n').filter(Boolean);
  fs.writeFileSync(l, `${[lines[0], lines[2]].join('\n')}\n`); // drop the middle entry
  const v = verifyOffbox(l, 'vaultA');
  assert.equal(v.ok, false);
  assert.match(v.faults.join(' '), /chain break/);
}));

test('vault-id binding: a foreign-vault entry is caught', () => withKey(() => {
  const l = ledger();
  appendOffbox(l, rec('2026-07-01', 5));
  assert.match(verifyOffbox(l, 'vaultB').faults.join(' '), /vault-id mismatch/);
}));

test('regressionVsLocal: local below the witness = DELETION; a witnessed day gone = deletion', () => withKey(() => {
  const l = ledger();
  appendOffbox(l, rec('2026-07-01', 10));
  appendOffbox(l, rec('2026-07-02', 8));
  const w = witnessByDate(readOffbox(l));
  // local: day-1 truncated to 3, day-2 entirely gone
  const localFor = (date) => (date === '2026-07-01' ? { receipts: { count: 3 }, queue: { count: 0 } } : null);
  const faults = regressionVsLocal(w, localFor);
  assert.equal(faults.length, 2);
  assert.match(faults.join(' '), /DELETION.*local 3 < off-box witness 10/);
  assert.match(faults.join(' '), /2026-07-02: witnessed off-box but the local day is GONE/);
}));

test('regressionVsLocal: local at or above the witness = clean', () => withKey(() => {
  const l = ledger();
  appendOffbox(l, rec('2026-07-01', 5));
  const w = witnessByDate(readOffbox(l));
  const localFor = () => ({ receipts: { count: 6 }, queue: { count: 0 } }); // grew — fine
  assert.deepEqual(regressionVsLocal(w, localFor), []);
}));

test('a corrupt ledger line makes verify FAIL, never a silent clean pass', () => withKey(() => {
  const l = ledger();
  appendOffbox(l, rec('2026-07-01', 5));
  appendOffbox(l, rec('2026-07-02', 6));
  fs.appendFileSync(l, 'x-not-json\n'); // attacker appends garbage to collapse the witness
  const v = verifyOffbox(l, 'vaultA');
  assert.equal(v.ok, false);
  assert.match(v.faults.join(' '), /unparseable|corrupt/);
}));

test('a same-day truncation-witness record does NOT fail the ledger verification', () => withKey(() => {
  const l = ledger();
  appendOffbox(l, rec('2026-07-01', 10));
  const { regression } = appendOffbox(l, rec('2026-07-01', 4)); // witnesses the truncation by design
  assert.match(regression, /truncation/);
  assert.ok(verifyOffbox(l, 'vaultA').ok, 'the witness record must not fail its own integrity check');
}));

test('appendOffbox regression reports ALL truncated streams, not just the last', () => withKey(() => {
  const l = ledger();
  appendOffbox(l, rec('2026-07-01', 10, 8));
  const { regression } = appendOffbox(l, rec('2026-07-01', 4, 2));
  assert.match(regression, /receipts/);
  assert.match(regression, /queue/);
}));

test('no key: entries are unsigned and verify treats the ledger as advisory (no HMAC faults)', () => {
  const prev = process.env.HERMES_ANCHOR_KEY; delete process.env.HERMES_ANCHOR_KEY;
  try {
    const l = ledger();
    appendOffbox(l, rec('2026-07-01', 5));
    const v = verifyOffbox(l, 'vaultA');
    assert.equal(v.keyed, false);
    assert.ok(v.ok, JSON.stringify(v.faults)); // unsigned is not a fault when there's no key
  } finally { if (prev !== undefined) process.env.HERMES_ANCHOR_KEY = prev; }
});
