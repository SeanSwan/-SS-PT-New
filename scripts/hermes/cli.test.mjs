/**
 * cli.test.mjs — Slice 1 wiring smoke tests for the two CLIs.
 *
 * Proves the CLI layer (arg parsing → lib calls) works end-to-end against a
 * temp vault: init scaffolds + seeds + receipts; write/list roundtrip; queue
 * create surfaces through list. Behavior depth lives in the sibling suites.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli as receiptCli } from './receipt-write.mjs';
import { runCli as queueCli } from './queue.mjs';
import { readReceipts } from './hermesRunsLib.mjs';

function fresh() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-cli-'));
  return { root, swFile: path.join(root, 'switches.json') };
}

test('init scaffolds lanes, seeds switches once, and receipts itself', () => {
  const { root, swFile } = fresh();
  const out = receiptCli(['init'], root, swFile);
  assert.match(out.join('\n'), /seeded/);
  assert.ok(fs.existsSync(path.join(root, 'runs', 'receipts', 'index.md')));
  assert.equal(JSON.parse(fs.readFileSync(swFile, 'utf8')).SWITCH_MASTER, true);
  const again = receiptCli(['init'], root, swFile);
  assert.match(again.join('\n'), /existing/);
});

test('write + list roundtrip through the CLI', () => {
  const { root, swFile } = fresh();
  receiptCli(['init'], root, swFile);
  const [id] = receiptCli(
    [
      'write', '--who', 'sean/telegram', '--command', 'health-sweep', '--tier', 'T0',
      '--target', 'health endpoints', '--outcome', 'ok — green',
      '--evidence', 'runs/logs/x.log', '--when', '2026-07-01T06:00:00-07:00',
    ],
    root, swFile
  );
  assert.match(id, /^R-20260701-/);
  const rows = receiptCli(['list', '--date', '2026-07-01'], root, swFile);
  assert.ok(rows.some((line) => line.includes('health-sweep (T0)')));
});

test('queue create → list via the CLI', () => {
  const { root, swFile } = fresh();
  receiptCli(['init'], root, swFile);
  const [created] = queueCli(
    [
      'create', '--action', 'discord-alert', '--tier', 'T3',
      '--target', '#ops · template deploy-health', '--requester', 'hermes/runner',
      '--evidence', 'sweep receipt',
    ],
    root, swFile, '2026-07-01T08:00:00-07:00'
  );
  assert.match(created, /^Q-20260701-001 · discord-alert \(T3\)/);
  const listed = queueCli(['list'], root, swFile, '2026-07-01T09:00:00-07:00');
  assert.ok(listed[0].includes('open'));
});

test('CLI refusals still produce refusal receipts (registry §1 posture)', () => {
  const { root, swFile } = fresh();
  receiptCli(['init'], root, swFile);
  assert.throws(
    () =>
      queueCli(
        ['create', '--action', 'raw-shell', '--tier', 'T3', '--target', 'x',
         '--requester', 'sean/telegram', '--evidence', 'y'],
        root, swFile, '2026-07-01T08:00:00-07:00'
      ),
    /FORBIDDEN/i
  );
  assert.ok(readReceipts(root, '2026-07-01').some((r) => r.outcome.startsWith('refused')));
});
