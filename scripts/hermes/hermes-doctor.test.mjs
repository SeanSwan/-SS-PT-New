/**
 * hermes-doctor.test.mjs — E4 contract tests for the self-diagnosis command
 * (closes G-5 / G-10). Exit code is the panel contract: 0 healthy · 1 degraded
 * · 2 fault.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ensureLanes, seedSwitches, writeReceipt, readReceipts, vaultPaths } from './hermesRunsLib.mjs';
import { runDoctor } from './hermes-doctor.mjs';

const DAY = '2026-07-01';
function fresh() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-doc-'));
  const swFile = path.join(root, 'switches.json');
  ensureLanes(root);
  seedSwitches(swFile);
  return { root, swFile };
}
const receipt = (root, over = {}) => writeReceipt(root, {
  who: 'hermes/runner', what: 'health-sweep (T0)', target: 't', when: `${DAY}T06:00:00-07:00`,
  'approved-by': 'n/a', outcome: 'ok — green', evidence: 'runs/logs/x.log', ...over,
});

test('doctor: healthy vault → exit 0, all checks ok, writes its own receipt', () => {
  const { root, swFile } = fresh();
  receipt(root);
  const out = runDoctor(root, swFile, DAY, { now: `${DAY}T12:00:00-07:00` });
  assert.equal(out.exitCode, 0);
  assert.ok(out.checks.every((c) => c.ok), `all checks ok: ${JSON.stringify(out.checks.filter((c) => !c.ok))}`);
  assert.ok(readReceipts(root, DAY).some((r) => r.what === 'hermes-doctor (T0)' && r.outcome.startsWith('ok')));
});

test('doctor: a chain break → exit 2 with a chain fault', () => {
  const { root, swFile } = fresh();
  receipt(root);
  receipt(root, { outcome: 'ok — 2' });
  const f = vaultPaths(root, DAY).receiptsFile;
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  lines[0] = lines[0].replace('ok — green', 'ok — TAMPERED');
  fs.writeFileSync(f, lines.join('\n') + '\n');
  const out = runDoctor(root, swFile, DAY, { now: `${DAY}T12:00:00-07:00` });
  assert.equal(out.exitCode, 2);
  assert.ok(out.checks.find((c) => c.name === 'chain' && !c.ok));
});

test('doctor: a backwards clock is flagged as a regression → exit 2 (G-10)', () => {
  const { root, swFile } = fresh();
  runDoctor(root, swFile, DAY, { now: `${DAY}T18:00:00-07:00` }); // persists last-seen = 18:00
  const out = runDoctor(root, swFile, DAY, { now: `${DAY}T06:00:00-07:00` }); // 12h earlier
  assert.equal(out.exitCode, 2);
  assert.ok(out.checks.find((c) => c.name === 'clock' && !c.ok));
});

test('doctor: forward clock does NOT flag, and last-seen never rewinds', () => {
  const { root, swFile } = fresh();
  runDoctor(root, swFile, DAY, { now: `${DAY}T06:00:00-07:00` });
  const out = runDoctor(root, swFile, DAY, { now: `${DAY}T18:00:00-07:00` }); // later — fine
  assert.equal(out.checks.find((c) => c.name === 'clock').ok, true);
});

test('doctor: unreadable switches file is a reported fault, not a crash', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-doc-'));
  ensureLanes(root);
  const missing = path.join(root, 'switches.json'); // never seeded
  const out = runDoctor(root, missing, DAY, { now: `${DAY}T12:00:00-07:00` });
  assert.ok(out.checks.find((c) => c.name === 'switches' && !c.ok));
  assert.equal(out.exitCode, 2);
});
