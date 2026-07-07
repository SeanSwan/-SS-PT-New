/**
 * health-sweep.test.mjs — Q-2 contracts: manifest-driven, switch-gated, honest
 * about unchecked admin rows, and green/amber/red classification with receipts.
 * No network: fetch is injected.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ensureLanes, seedSwitches, readReceipts } from './hermesRunsLib.mjs';
import { runSweep, loadManifest } from './health-sweep.mjs';

process.env.HERMES_ANCHOR_KEY = 'sweep-test-key';
const DAY = '2026-07-01';
const NOW = `${DAY}T06:00:00-07:00`;

function fresh() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-sweep-'));
  const swFile = path.join(root, 'switches.json');
  ensureLanes(root);
  seedSwitches(swFile);
  return { root, swFile };
}
const manifest = {
  endpoints: [
    { name: 'a-crit', url: 'https://x/health', auth: 'public', weight: 'critical' },
    { name: 'b-norm', url: 'https://x/feature', auth: 'public', weight: 'normal' },
    { name: 'c-admin', url: 'https://x/admin', auth: 'admin-jwt', weight: 'normal', skip: 'P-1 pending' },
  ],
};
const fetchOk = async () => ({ status: 200 });

test('GREEN: criticals 2xx; admin rows reported unchecked, never amber (alarm-fatigue rule)', async () => {
  const { root, swFile } = fresh();
  const out = await runSweep(root, swFile, { manifest, fetchImpl: fetchOk, now: NOW });
  assert.equal(out.color, 'GREEN');
  assert.match(out.line, /1 unchecked: c-admin/);
  const rec = readReceipts(root, DAY).find((r) => r.what === 'health-sweep (T0)');
  assert.match(rec.outcome, /^ok — GREEN/);
});

test('RED: a critical endpoint down → exit 2 + failed receipt', async () => {
  const { root, swFile } = fresh();
  const fetchImpl = async (url) => (url.includes('health') ? { status: 503 } : { status: 200 });
  const out = await runSweep(root, swFile, { manifest, fetchImpl, now: NOW });
  assert.equal(out.color, 'RED');
  assert.equal(out.exitCode, 2);
  assert.match(readReceipts(root, DAY)[0].outcome, /^failed — RED — a-crit 503/);
});

test('AMBER: normal endpoint failing while criticals are green → exit 1 + partial receipt', async () => {
  const { root, swFile } = fresh();
  const fetchImpl = async (url) => (url.includes('feature') ? { status: 500 } : { status: 200 });
  const out = await runSweep(root, swFile, { manifest, fetchImpl, now: NOW });
  assert.equal(out.color, 'AMBER');
  assert.match(readReceipts(root, DAY)[0].outcome, /^partial — AMBER — b-norm failing \(500\)/);
});

test('network error on a critical → RED with the error named, no crash', async () => {
  const { root, swFile } = fresh();
  const fetchImpl = async (url) => { if (url.includes('health')) throw new Error('ECONNREFUSED'); return { status: 200 }; };
  const out = await runSweep(root, swFile, { manifest, fetchImpl, now: NOW });
  assert.equal(out.color, 'RED');
  assert.match(out.line, /ECONNREFUSED/);
});

test('switch off → refusal receipt + throw (fail closed)', async () => {
  const { root, swFile } = fresh();
  const sw = JSON.parse(fs.readFileSync(swFile, 'utf8'));
  sw.SWITCH_HEALTH_SWEEP = false;
  fs.writeFileSync(swFile, JSON.stringify(sw));
  await assert.rejects(() => runSweep(root, swFile, { manifest, fetchImpl: fetchOk, now: NOW }), /SWITCH_HEALTH_SWEEP/);
  assert.ok(readReceipts(root, DAY).some((r) => r.outcome.startsWith('refused')));
});

test('shipped manifest parses and only public rows are probed', async () => {
  const m = loadManifest();
  assert.ok(m.endpoints.length >= 3);
  const { root, swFile } = fresh();
  const hit = [];
  await runSweep(root, swFile, { manifest: m, fetchImpl: async (u) => { hit.push(u); return { status: 200 }; }, now: NOW });
  assert.ok(hit.every((u) => m.endpoints.find((e) => e.url === u).auth === 'public'));
});
