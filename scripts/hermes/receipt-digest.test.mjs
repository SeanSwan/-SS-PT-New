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
