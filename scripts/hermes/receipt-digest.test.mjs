/**
 * receipt-digest.test.mjs — Slice 1 golden-file test for the daily digest.
 *
 * Locks (audit-receipts.md §5): counts by tier, attention lines
 * (failed/refused/partial), approval flow with median open→resolved, switch
 * activity, silence check (scheduled-but-silent = failure mode). Digest output
 * is deterministic from fixture data and diffed against a golden file.
 * Kill-switch gate: SWITCH_RECEIPT_DIGEST off → refusal receipt, no digest.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureLanes, seedSwitches, writeReceipt, readReceipts, vaultPaths } from './hermesRunsLib.mjs';
import { createEntry, transitionEntry } from './queueModel.mjs';
import { renderDigest, writeDigest } from './receipt-digest.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(HERE, 'fixtures', 'golden-digest-2026-07-01.md');
const DAY = '2026-07-01';

/** The canonical fixture day — also used once to generate the golden file. */
export function buildFixtureDay(root, swFile) {
  ensureLanes(root);
  seedSwitches(swFile);
  const R = (over) =>
    writeReceipt(root, {
      who: 'hermes/runner', what: 'health-sweep (T0)',
      target: 'api.sswanstudios.com health endpoints',
      when: `${DAY}T06:00:11-07:00`, 'approved-by': 'n/a',
      outcome: 'ok — 5/5 green', evidence: 'runs/logs/2026-07/health-sweep.log',
      ...over,
    });
  R({});
  R({ what: 'morning-briefing (T1)', who: 'hermes/command-center', target: 'daily operator briefing', outcome: 'ok — draft rendered' });
  R({ what: 'health-sweep (T0)', when: `${DAY}T12:00:11-07:00`, outcome: 'failed — render deploy endpoint timed out', evidence: 'runs/logs/2026-07/health-sweep-noon.log' });
  R({ what: 'wiki-search (T0)', who: 'sean/telegram', target: 'vault query', outcome: 'refused — unregistered command variant', evidence: 'runs/receipts refusal trail' });
  R({ what: 'switch-flip (T2)', who: 'sean/command-center', target: 'SWITCH_STALE_CLIENT', 'approved-by': 'allowlist: switch ops', outcome: 'ok — off→on (test flip)', evidence: 'switch state diff' });
  // queue lifecycle: one full T3 approve+execute, one left to expire tomorrow
  const e1 = createEntry(root, swFile, {
    action: 'discord-alert', tier: 'T3', target: '#ops · template deploy-health',
    requester: 'hermes/runner', evidence: 'sweep receipt R-20260701-003',
  }, `${DAY}T06:05:00-07:00`);
  transitionEntry(root, swFile, {
    id: e1.id, to: 'approved', resolver: 'sean', channel: 'telegram',
    phrase: `APPROVE ${e1.id} discord-alert`, at: `${DAY}T08:05:00-07:00`,
  });
  transitionEntry(root, swFile, {
    id: e1.id, to: 'executed', resolver: 'hermes/discord-broker',
    evidence: 'discord message id 118842', at: `${DAY}T08:06:00-07:00`,
  });
  createEntry(root, swFile, {
    action: 'discord-alert', tier: 'T3', target: '#ops · template stale-client-threshold',
    requester: 'hermes/runner', evidence: 'stale report pointer',
  }, `${DAY}T09:00:00-07:00`);
  // schedule: stale-client-report is scheduled but produced no receipt → silence hit
  fs.writeFileSync(
    vaultPaths(root, DAY).scheduleFile,
    JSON.stringify({ scheduled: ['health-sweep', 'morning-briefing', 'stale-client-report'] }, null, 2)
  );
}

function freshVault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-d-'));
  const swFile = path.join(root, 'switches.json');
  return { root, swFile };
}

test('digest matches the golden file for the fixture day', () => {
  const { root, swFile } = freshVault();
  buildFixtureDay(root, swFile);
  const { digestMarkdown } = renderDigest(root, DAY);
  const golden = fs.readFileSync(GOLDEN, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(digestMarkdown, golden);
});

test('writeDigest lands digest + human view + its own T0 receipt', () => {
  const { root, swFile } = freshVault();
  buildFixtureDay(root, swFile);
  const out = writeDigest(root, swFile, DAY, { now: `${DAY}T18:00:00-07:00` });
  assert.ok(fs.existsSync(out.digestFile));
  assert.ok(fs.existsSync(out.viewFile));
  const own = readReceipts(root, DAY).filter((r) => r.what === 'receipt-digest (T0)');
  assert.equal(own.length, 1);
  assert.match(fs.readFileSync(out.viewFile, 'utf8'), /R-20260701-001/);
});

test('SWITCH_RECEIPT_DIGEST off → refusal receipt, no digest file', () => {
  const { root, swFile } = freshVault();
  buildFixtureDay(root, swFile);
  seedSwitches(swFile, { SWITCH_RECEIPT_DIGEST: false });
  assert.throws(
    () => writeDigest(root, swFile, DAY, { now: `${DAY}T18:00:00-07:00` }),
    /SWITCH_RECEIPT_DIGEST/i
  );
  assert.ok(!fs.existsSync(vaultPaths(root, DAY).digestFile));
  assert.ok(readReceipts(root, DAY).some((r) => /SWITCH_RECEIPT_DIGEST/.test(r.outcome)));
});

test('digest headlines an approval-queue flood and clusters refusals by sender (G-4)', () => {
  const { root, swFile } = freshVault();
  ensureLanes(root);
  seedSwitches(swFile);
  const req = { action: 'discord-alert', tier: 'T3', requester: 'hermes/runner', evidence: 'e' };
  for (let i = 0; i < 10; i++) createEntry(root, swFile, { ...req, target: `#ops · ${i}` }, `${DAY}T06:00:00-07:00`);
  for (let i = 0; i < 6; i++) {
    try { createEntry(root, swFile, { ...req, target: `#ops · flood${i}` }, `${DAY}T06:0${i}:30-07:00`); }
    catch { /* refused at the cap — the refusal receipt is what the digest surfaces */ }
  }
  const digest = renderDigest(root, DAY).digestMarkdown;
  assert.match(digest, /FLOOD CAP HIT/);
  assert.match(digest, /hermes\/runner: \d+ refusals/);
});

test('digest Integrity section surfaces a chain break (G-7)', () => {
  const { root, swFile } = freshVault();
  ensureLanes(root);
  seedSwitches(swFile);
  writeReceipt(root, { who: 'hermes/runner', what: 'health-sweep (T0)', target: 't', when: `${DAY}T06:00:00-07:00`, 'approved-by': 'n/a', outcome: 'ok — a', evidence: 'x' });
  writeReceipt(root, { who: 'hermes/runner', what: 'health-sweep (T0)', target: 't', when: `${DAY}T06:01:00-07:00`, 'approved-by': 'n/a', outcome: 'ok — b', evidence: 'x' });
  const f = vaultPaths(root, DAY).receiptsFile;
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  lines[0] = lines[0].replace('ok — a', 'ok — TAMPERED');
  fs.writeFileSync(f, lines.join('\n') + '\n');
  assert.match(renderDigest(root, DAY).digestMarkdown, /CHAIN BREAK/);
});

test('digest Integrity section flags a tier-less receipt (G-7)', () => {
  const { root, swFile } = freshVault();
  ensureLanes(root);
  seedSwitches(swFile);
  writeReceipt(root, { who: 'x/y', what: 'weird-command-no-tier', target: 't', when: `${DAY}T06:00:00-07:00`, 'approved-by': 'n/a', outcome: 'ok — x', evidence: 'e' });
  assert.match(renderDigest(root, DAY).digestMarkdown, /tier-less/);
});

test('digest Integrity section headlines an armed>24h entry with no filed receipt (G-9)', () => {
  const { root, swFile } = freshVault();
  ensureLanes(root);
  seedSwitches(swFile);
  const e = createEntry(root, swFile, { action: 'manual-maintenance', tier: 'T4', target: 'reseed', requester: 'sean/telegram', evidence: 'drift', rollback: 'export' }, `${DAY}T06:00:00-07:00`);
  transitionEntry(root, swFile, { id: e.id, to: 'approved', resolver: 'sean', channel: 'command-center', confirmed: true, at: `${DAY}T06:01:00-07:00` });
  transitionEntry(root, swFile, { id: e.id, to: 'armed', resolver: 'sean', channel: 'telegram', phrase: `ARM ${e.id} manual-maintenance`, at: `${DAY}T06:05:00-07:00` });
  assert.match(renderDigest(root, '2026-07-03').digestMarkdown, /ARMED > 24h/); // 2 days later, never executed
});

test('silence check reports a clean day and a missing schedule honestly', () => {
  const { root, swFile } = freshVault();
  ensureLanes(root);
  seedSwitches(swFile);
  writeReceipt(root, {
    who: 'hermes/runner', what: 'health-sweep (T0)', target: 'health endpoints',
    when: `${DAY}T06:00:00-07:00`, 'approved-by': 'n/a', outcome: 'ok — green',
    evidence: 'runs/logs/x.log',
  });
  // no schedule file at all
  const noSchedule = renderDigest(root, DAY).digestMarkdown;
  assert.match(noSchedule, /No schedule registered/);
  // schedule fully receipted
  fs.writeFileSync(vaultPaths(root, DAY).scheduleFile, JSON.stringify({ scheduled: ['health-sweep'] }));
  const clean = renderDigest(root, DAY).digestMarkdown;
  assert.match(clean, /All scheduled commands receipted/);
});

test('UX-8: local-day digest gathers both UTC files and filters by the operator day', async () => {
  const { localWindow } = await import('./receipt-digest.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-dg-'));
  const swFile = path.join(root, 'switches.json');
  ensureLanes(root);
  seedSwitches(swFile);
  const R = (when, outcome) => writeReceipt(root, {
    who: 'hermes/runner', what: 'health-sweep (T0)', target: 't', when,
    'approved-by': 'n/a', outcome, evidence: 'runs/logs/x.log',
  });
  R('2026-07-02T02:00:00Z', 'failed — evening deploy check red');   // 7pm PDT 07-01 → UTC 07-02 file
  R('2026-07-01T03:00:00Z', 'failed — belongs to local 06-30');          // 8pm PDT 06-30 → excluded from local 07-01
  const w = localWindow('2026-07-01', -420);
  assert.deepEqual(w.utcDates, ['2026-07-01', '2026-07-02']);
  const local = renderDigest(root, '2026-07-01', { local: true, offsetMinutes: -420 }).digestMarkdown;
  assert.match(local, /LOCAL day, UTC-07:00/);
  assert.match(local, /evening deploy check red/, 'evening work lands in TODAY local digest');
  assert.ok(!local.includes('belongs to local 06-30'), 'pre-midnight-local records excluded');
  const utc = renderDigest(root, '2026-07-01').digestMarkdown;
  assert.ok(utc.includes('belongs to local 06-30'), 'default UTC mode unchanged');
});

test('UX-8: local mode writes a SIBLING -local.md; canonical digest + view untouched', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-dg-'));
  const swFile = path.join(root, 'switches.json');
  ensureLanes(root);
  seedSwitches(swFile);
  writeReceipt(root, {
    who: 'hermes/runner', what: 'health-sweep (T0)', target: 't', when: '2026-07-01T12:00:00Z',
    'approved-by': 'n/a', outcome: 'ok — green', evidence: 'runs/logs/x.log',
  });
  const out = writeDigest(root, swFile, '2026-07-01', { now: '2026-07-01T23:00:00Z', local: true, offsetMinutes: -420 });
  assert.match(out.digestFile.replace(/\\/g, '/'), /digest-2026-07-01-local\.md$/);
  assert.equal(out.viewFile, null);
  assert.ok(fs.existsSync(out.digestFile));
});
