/**
 * receipt-prune.test.mjs — Slice 1 retention tests.
 *
 * Locks (run-logs-and-self-improvement.md §3, open-questions Q4 DECIDED):
 * 90-day hot window; aged files are gzip-archived (verified roundtrip) and
 * MOVED, never deleted; the prune is itself receipted; dry-run touches nothing;
 * index.md lane files are never pruned.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import { ensureLanes, seedSwitches, readReceipts } from './hermesRunsLib.mjs';
import { pruneVault } from './receipt-prune.mjs';

const NOW = '2026-07-01T12:00:00-07:00';

function vaultWithAgedFiles() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-p-'));
  ensureLanes(root);
  const swFile = path.join(root, 'switches.json');
  seedSwitches(swFile);
  const old = path.join(root, 'runs', 'receipts', '2026-01');
  fs.mkdirSync(old, { recursive: true });
  fs.writeFileSync(path.join(old, 'receipts-2026-01-15.jsonl'), '{"id":"R-20260115-001"}\n');
  const oldQ = path.join(root, 'runs', 'queue', '2026-01');
  fs.mkdirSync(oldQ, { recursive: true });
  fs.writeFileSync(path.join(oldQ, 'queue-2026-01-15.jsonl'), '{"type":"create"}\n');
  const young = path.join(root, 'runs', 'receipts', '2026-06');
  fs.mkdirSync(young, { recursive: true });
  fs.writeFileSync(path.join(young, 'receipts-2026-06-20.jsonl'), '{"id":"R-20260620-001"}\n');
  return { root, swFile };
}

test('archives aged files as verified gzip and keeps young files hot', () => {
  const { root, swFile } = vaultWithAgedFiles();
  const result = pruneVault(root, swFile, { olderThanDays: 90, now: NOW });
  const hotOld = path.join(root, 'runs', 'receipts', '2026-01', 'receipts-2026-01-15.jsonl');
  const gz = path.join(root, 'runs', 'archive', 'receipts', '2026-01', 'receipts-2026-01-15.jsonl.gz');
  assert.ok(!fs.existsSync(hotOld), 'aged file must leave the hot lane');
  assert.ok(fs.existsSync(gz), 'aged file must exist in archive as .gz');
  assert.equal(zlib.gunzipSync(fs.readFileSync(gz)).toString(), '{"id":"R-20260115-001"}\n');
  assert.ok(
    fs.existsSync(path.join(root, 'runs', 'receipts', '2026-06', 'receipts-2026-06-20.jsonl')),
    'young file stays hot'
  );
  assert.equal(result.archived.length, 2);
  const receipts = readReceipts(root, '2026-07-01');
  assert.ok(receipts.some((r) => r.what === 'receipt-prune (T2)' && r.outcome.startsWith('ok')));
});

test('dry-run reports candidates and touches nothing', () => {
  const { root, swFile } = vaultWithAgedFiles();
  const result = pruneVault(root, swFile, { olderThanDays: 90, now: NOW, dryRun: true });
  assert.equal(result.archived.length, 0);
  assert.equal(result.candidates.length, 2);
  assert.ok(fs.existsSync(path.join(root, 'runs', 'receipts', '2026-01', 'receipts-2026-01-15.jsonl')));
  assert.ok(!fs.existsSync(path.join(root, 'runs', 'archive', 'receipts', '2026-01')));
});

test('lane index.md files are never pruned; SWITCH_MASTER off refuses', () => {
  const { root, swFile } = vaultWithAgedFiles();
  pruneVault(root, swFile, { olderThanDays: 0, now: NOW });
  assert.ok(fs.existsSync(path.join(root, 'runs', 'receipts', 'index.md')));
  // same-day clamp: the prune's OWN receipt (written today) must survive an
  // aggressive olderThanDays=0 — never archive the current day's file
  assert.ok(
    fs.existsSync(path.join(root, 'runs', 'receipts', '2026-07', 'receipts-2026-07-01.jsonl')),
    'today\'s receipts file must never be archived (duplicate-id hazard)'
  );
  seedSwitches(swFile, { SWITCH_MASTER: false });
  assert.throws(() => pruneVault(root, swFile, { olderThanDays: 90, now: NOW }), /SWITCH_MASTER/i);
});

test('E6/G-16: readReceipts answers transparently from the archive after prune', async () => {
  const { readReceipts, ensureLanes, seedSwitches, writeReceipt } = await import('./hermesRunsLib.mjs');
  const zlib = (await import('node:zlib')).default;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-arc-'));
  ensureLanes(root);
  const day = '2026-03-01';
  writeReceipt(root, {
    who: 'hermes/runner', what: 'health-sweep (T0)', target: 'old day', when: `${day}T06:00:00Z`,
    'approved-by': 'n/a', outcome: 'ok — archived era', evidence: 'runs/logs/x.log',
  });
  const hot = path.join(root, 'runs', 'receipts', '2026-03', `receipts-${day}.jsonl`);
  const dest = path.join(root, 'runs', 'archive', 'receipts', '2026-03', `receipts-${day}.jsonl.gz`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, zlib.gzipSync(fs.readFileSync(hot)));
  fs.rmSync(hot); fs.rmSync(`${hot}.head`);
  const recs = readReceipts(root, day);
  assert.equal(recs.length, 1);
  assert.match(recs[0].outcome, /archived era/);
  // corrupt archive → marker, never a throw or a silent []
  fs.writeFileSync(dest, Buffer.from('not-gzip'));
  const bad = readReceipts(root, day);
  assert.ok(bad[0].__unparseable, 'corrupt .gz surfaces as an __unparseable marker');
});

// E6/G-13 REMOVED 2026-08-16 together with design-mirror-check.mjs. The test asserted that
// design.md and design.html held the same canonical tokens; design.html was retired to
// docs/_attic/, so the check had no subject left. It was ALREADY failing before the retirement
// (3 canonical tokens missing — the mirror had drifted), which is part of why the mirror went.
// Deleting the check with its subject is the honest fix; leaving it would have crashed on ENOENT.
