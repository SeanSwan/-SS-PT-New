/**
 * switches.test.mjs — Slice 2 (repo side) contract tests for switch-status /
 * switch-flip.
 *
 * Locks (kill-switches.md §1-§5, command-effect-registry.md §3, approval-gates.md §6):
 *  - switch-status and switch-flip carry NO kill switch — they must work when
 *    everything else is off (that is the RESUME path)
 *  - unreadable/missing switches file: status reports it (no throw); flip refuses
 *  - unknown switch name → refusal (adding a switch is a registry change)
 *  - every flip is receipted with the state diff
 *  - flipping a switch OFF auto-revokes open/approved/armed queue entries whose
 *    command depends on it; SWITCH_MASTER off revokes everything; ON revokes nothing
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ensureLanes, seedSwitches, readReceipts, readSwitches } from './hermesRunsLib.mjs';
import { createEntry, transitionEntry, loadQueueState } from './queueModel.mjs';
import { switchStatus, switchFlip } from './switches.mjs';

const NOW = '2026-07-01T10:00:00-07:00';

function fresh({ seed = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-sw-'));
  ensureLanes(root);
  const swFile = path.join(root, 'switches.json');
  if (seed) seedSwitches(swFile);
  return { root, swFile };
}

test('status lists every switch and writes a T0 receipt', () => {
  const { root, swFile } = fresh();
  const out = switchStatus(root, swFile, { now: NOW });
  assert.equal(out.unreadable, false);
  assert.equal(out.states.SWITCH_MASTER, true);
  assert.ok(Object.keys(out.states).length >= 9);
  assert.ok(readReceipts(root, '2026-07-01').some((r) => r.what === 'switch-status (T0)'));
});

test('status works with SWITCH_MASTER off and with the file missing (no throw)', () => {
  const { root, swFile } = fresh();
  seedSwitches(swFile, { SWITCH_MASTER: false });
  assert.equal(switchStatus(root, swFile, { now: NOW }).states.SWITCH_MASTER, false);
  const missing = fresh({ seed: false });
  const out = switchStatus(missing.root, missing.swFile, { now: NOW });
  assert.equal(out.unreadable, true);
  assert.ok(readReceipts(missing.root, '2026-07-01').some((r) => /unreadable|fail closed/i.test(r.outcome)));
});

test('flip off→receipt with state diff; RESUME works while MASTER is off', () => {
  const { root, swFile } = fresh();
  const off = switchFlip(root, swFile, { name: 'SWITCH_MASTER', direction: 'off', resolver: 'sean', channel: 'telegram', now: NOW });
  assert.equal(off.changed, true);
  assert.equal(readSwitches(swFile).state.SWITCH_MASTER, false);
  // RESUME path: flip back ON while master is off — flip has no self-gate
  const on = switchFlip(root, swFile, { name: 'SWITCH_MASTER', direction: 'on', resolver: 'sean', channel: 'telegram', now: '2026-07-01T10:05:00-07:00' });
  assert.equal(on.changed, true);
  assert.equal(readSwitches(swFile).state.SWITCH_MASTER, true);
  const flips = readReceipts(root, '2026-07-01').filter((r) => r.what === 'switch-flip (T2)');
  assert.equal(flips.length, 2);
  assert.match(flips[0].outcome, /on→off/);
  assert.match(flips[1].outcome, /off→on/);
});

test('unknown switch and unreadable file both refuse with receipts', () => {
  const { root, swFile } = fresh();
  assert.throws(
    () => switchFlip(root, swFile, { name: 'SWITCH_NOPE', direction: 'off', resolver: 'sean', channel: 'telegram', now: NOW }),
    /unknown switch/i
  );
  const missing = fresh({ seed: false });
  assert.throws(
    () => switchFlip(missing.root, missing.swFile, { name: 'SWITCH_MASTER', direction: 'off', resolver: 'sean', channel: 'telegram', now: NOW }),
    /unreadable|missing/i
  );
  assert.ok(readReceipts(root, '2026-07-01').some((r) => r.outcome.startsWith('refused')));
});

test('no-change flip is receipted honestly as no change', () => {
  const { root, swFile } = fresh();
  const out = switchFlip(root, swFile, { name: 'SWITCH_HEALTH_SWEEP', direction: 'on', resolver: 'sean', channel: 'command-center', now: NOW });
  assert.equal(out.changed, false);
  assert.ok(readReceipts(root, '2026-07-01').some((r) => /on→on \(no change\)/.test(r.outcome)));
});

test('flip OFF auto-revokes dependent open entries only (approval-gates §6)', () => {
  const { root, swFile } = fresh();
  const alert = createEntry(root, swFile, {
    action: 'discord-alert', tier: 'T3', target: '#ops · template deploy-health',
    requester: 'hermes/runner', evidence: 'sweep receipt',
  }, NOW);
  const maint = createEntry(root, swFile, {
    action: 'manual-maintenance', tier: 'T4', target: 'storefront reseed',
    requester: 'sean/telegram', evidence: 'drift report', rollback: 'row export',
  }, NOW);
  const out = switchFlip(root, swFile, { name: 'SWITCH_DISCORD_BROKER', direction: 'off', resolver: 'sean', channel: 'telegram', now: '2026-07-01T10:10:00-07:00' });
  assert.deepEqual(out.revoked, [alert.id]);
  const state = loadQueueState(root);
  assert.equal(state.get(alert.id).status, 'revoked');
  assert.equal(state.get(maint.id).status, 'open', 'non-dependent entry untouched');
  assert.ok(readReceipts(root, '2026-07-01').some((r) => r.target === alert.id && /revoked.*kill-switch/i.test(r.outcome)));
});

test('SWITCH_MASTER off revokes everything holding live authority, incl. approved', () => {
  const { root, swFile } = fresh();
  const a = createEntry(root, swFile, {
    action: 'discord-alert', tier: 'T3', target: '#ops · one',
    requester: 'hermes/runner', evidence: 'e',
  }, NOW);
  const b = createEntry(root, swFile, {
    action: 'manual-maintenance', tier: 'T4', target: 'reseed',
    requester: 'sean/telegram', evidence: 'e', rollback: 'r',
  }, NOW);
  transitionEntry(root, swFile, {
    id: a.id, to: 'approved', resolver: 'sean', channel: 'command-center',
    confirmed: true, at: '2026-07-01T10:01:00-07:00',
  });
  const out = switchFlip(root, swFile, { name: 'SWITCH_MASTER', direction: 'off', resolver: 'sean', channel: 'telegram', now: '2026-07-01T10:02:00-07:00' });
  assert.deepEqual([...out.revoked].sort(), [a.id, b.id].sort());
  const state = loadQueueState(root);
  assert.equal(state.get(a.id).status, 'revoked');
  assert.equal(state.get(b.id).status, 'revoked');
});

test('flip ON never revokes anything', () => {
  const { root, swFile } = fresh();
  const e = createEntry(root, swFile, {
    action: 'discord-alert', tier: 'T3', target: '#ops · x',
    requester: 'hermes/runner', evidence: 'e',
  }, NOW);
  seedSwitches(swFile, { SWITCH_DISCORD_BROKER: false });
  const out = switchFlip(root, swFile, { name: 'SWITCH_DISCORD_BROKER', direction: 'on', resolver: 'sean', channel: 'telegram', now: '2026-07-01T10:20:00-07:00' });
  assert.deepEqual(out.revoked, []);
  assert.equal(loadQueueState(root).get(e.id).status, 'open');
});
