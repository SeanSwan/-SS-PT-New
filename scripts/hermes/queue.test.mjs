/**
 * queue.test.mjs — Slice 1 contract tests for the approval-queue store.
 *
 * Locks (per docs/ai-workflow/hermes-agentic-os/approval-gates.md §2-§7,
 * command-effect-registry.md §1/§3, kill-switches.md §1):
 *  - only registered T3/T4 actions queue; T2 asking for a queue entry is a tier error
 *  - exact-match Telegram approval phrase; paraphrase → refusal (with receipt)
 *  - T3: 24h single-execution approval; T4: approve → cross-channel arm within
 *    10 minutes → human-executed; rollback pointer required to arm
 *  - expiry closes itself; unreadable expiry = expired (fail closed)
 *  - switches read fresh; missing/unreadable switches file → refuse (fail closed)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ensureLanes, seedSwitches, readReceipts } from './hermesRunsLib.mjs';
import {
  createEntry,
  listEntries,
  transitionEntry,
  loadQueueState,
} from './queueModel.mjs';

function freshVault({ switches = true, masterOn = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-q-'));
  ensureLanes(root);
  const swFile = path.join(root, 'switches.json');
  if (switches) seedSwitches(swFile, { SWITCH_MASTER: masterOn });
  return { root, swFile };
}

const T3_REQ = {
  action: 'discord-alert',
  tier: 'T3',
  target: '#ops · template deploy-health',
  requester: 'hermes/runner',
  evidence: 'runs/receipts/2026-07/receipts-2026-07-01.jsonl#L1',
};
const NOW = '2026-07-01T08:00:00-07:00';

test('creates a T3 entry with 24h expiry and Q-id', () => {
  const { root, swFile } = freshVault();
  const e = createEntry(root, swFile, T3_REQ, NOW);
  assert.match(e.id, /^Q-20260701-001$/);
  assert.equal(e.status, 'open');
  assert.equal(e.expires, '2026-07-02T15:00:00.000Z' /* +24h from 2026-07-01T08:00-07:00 */);
});

test('refuses unregistered actions and writes a refusal receipt', () => {
  const { root, swFile } = freshVault();
  assert.throws(
    () => createEntry(root, swFile, { ...T3_REQ, action: 'mass-client-message' }, NOW),
    /unregistered|forbidden/i
  );
  const receipts = readReceipts(root, '2026-07-01');
  assert.ok(receipts.some((r) => r.outcome.startsWith('refused')));
});

test('refuses a T2 command asking for a queue entry (tier error)', () => {
  const { root, swFile } = freshVault();
  assert.throws(
    () => createEntry(root, swFile, { ...T3_REQ, action: 'memory-note', tier: 'T2' }, NOW),
    /T2.*never.*queue|tier/i
  );
});

test('refuses target "various"', () => {
  const { root, swFile } = freshVault();
  assert.throws(() => createEntry(root, swFile, { ...T3_REQ, target: 'various' }, NOW), /various/i);
});

test('telegram approval requires the exact-match phrase', () => {
  const { root, swFile } = freshVault();
  const e = createEntry(root, swFile, T3_REQ, NOW);
  // paraphrase → refused, entry stays open, refusal receipted
  assert.throws(
    () =>
      transitionEntry(root, swFile, {
        id: e.id, to: 'approved', resolver: 'sean', channel: 'telegram',
        phrase: 'yes do it', at: '2026-07-01T08:05:00-07:00',
      }),
    /exact/i
  );
  assert.equal(loadQueueState(root, '2026-07-01T08:06:00-07:00').get(e.id).status, 'open');
  assert.ok(readReceipts(root, '2026-07-01').some((r) => r.outcome.startsWith('refused')));
  // exact phrase → approved
  const t = transitionEntry(root, swFile, {
    id: e.id, to: 'approved', resolver: 'sean', channel: 'telegram',
    phrase: `APPROVE ${e.id} discord-alert`, at: '2026-07-01T08:10:00-07:00',
  });
  assert.equal(t.to, 'approved');
});

test('T3 single execution: second execute is refused', () => {
  const { root, swFile } = freshVault();
  const e = createEntry(root, swFile, T3_REQ, NOW);
  transitionEntry(root, swFile, {
    id: e.id, to: 'approved', resolver: 'sean', channel: 'command-center',
    confirmed: true, at: '2026-07-01T08:10:00-07:00',
  });
  transitionEntry(root, swFile, {
    id: e.id, to: 'executed', resolver: 'hermes/discord-broker',
    evidence: 'discord message id 118842', at: '2026-07-01T08:11:00-07:00',
  });
  assert.throws(
    () =>
      transitionEntry(root, swFile, {
        id: e.id, to: 'executed', resolver: 'hermes/discord-broker',
        evidence: 'discord message id 118843', at: '2026-07-01T08:12:00-07:00',
      }),
    /executed|not approvable|state/i
  );
});

test('expiry closes itself during list; unreadable expiry = expired', () => {
  const { root, swFile } = freshVault();
  const e = createEntry(root, swFile, T3_REQ, NOW);
  // 25h later, a list() sweep expires it without any explicit transition call
  const rows = listEntries(root, swFile, { filter: 'all', at: '2026-07-02T09:01:00-07:00' });
  assert.equal(rows.find((r) => r.id === e.id).status, 'expired');
  // corrupt-expiry entry: simulate by writing an entry with a garbage expires value
  const e2 = createEntry(root, swFile, { ...T3_REQ, target: '#ops · second' }, NOW);
  const qf = path.join(root, 'runs', 'queue', '2026-07', 'queue-2026-07-01.jsonl');
  const mangled = fs
    .readFileSync(qf, 'utf8')
    .split('\n')
    .map((line) => (line.includes(e2.id) ? line.replace(e2.expires, 'not-a-date') : line))
    .join('\n');
  fs.writeFileSync(qf, mangled);
  const rows2 = listEntries(root, swFile, { filter: 'all', at: '2026-07-01T08:30:00-07:00' });
  assert.equal(rows2.find((r) => r.id === e2.id).status, 'expired');
});

test('T4: rollback pointer required at create; arm must be cross-channel within 10 minutes', () => {
  const { root, swFile } = freshVault();
  assert.throws(
    () =>
      createEntry(root, swFile, {
        action: 'manual-maintenance', tier: 'T4', target: 'storefront reseed',
        requester: 'sean/telegram', evidence: 'drift report',
      }, NOW),
    /rollback/i
  );
  const e = createEntry(root, swFile, {
    action: 'manual-maintenance', tier: 'T4', target: 'storefront reseed',
    requester: 'sean/telegram', evidence: 'drift report',
    rollback: 'pre-reseed row export path',
  }, NOW);
  transitionEntry(root, swFile, {
    id: e.id, to: 'approved', resolver: 'sean', channel: 'command-center',
    confirmed: true, at: '2026-07-01T09:00:00-07:00',
  });
  // same-channel arm → refused
  assert.throws(
    () =>
      transitionEntry(root, swFile, {
        id: e.id, to: 'armed', resolver: 'sean', channel: 'command-center',
        at: '2026-07-01T09:04:00-07:00',
      }),
    /different channel|cross-channel/i
  );
  // cross-channel but late (minute 11) → refused, entry expired
  assert.throws(
    () =>
      transitionEntry(root, swFile, {
        id: e.id, to: 'armed', resolver: 'sean', channel: 'telegram',
        phrase: `ARM ${e.id} manual-maintenance`, at: '2026-07-01T09:11:00-07:00',
      }),
    /window|expired/i
  );
});

test('T4 happy path: cross-channel arm inside window, then human-executed receipt filing', () => {
  const { root, swFile } = freshVault();
  const e = createEntry(root, swFile, {
    action: 'manual-maintenance', tier: 'T4', target: 'storefront reseed',
    requester: 'sean/telegram', evidence: 'drift report',
    rollback: 'pre-reseed row export path',
  }, NOW);
  transitionEntry(root, swFile, {
    id: e.id, to: 'approved', resolver: 'sean', channel: 'command-center',
    confirmed: true, at: '2026-07-01T09:00:00-07:00',
  });
  const armed = transitionEntry(root, swFile, {
    id: e.id, to: 'armed', resolver: 'sean', channel: 'telegram',
    phrase: `ARM ${e.id} manual-maintenance`, at: '2026-07-01T09:05:00-07:00',
  });
  assert.equal(armed.to, 'armed');
  const done = transitionEntry(root, swFile, {
    id: e.id, to: 'executed', resolver: 'sean/keyboard',
    evidence: 'render shell run log + rollback pointer', at: '2026-07-01T09:20:00-07:00',
  });
  assert.equal(done.to, 'executed');
});

test('fail closed: missing switches file refuses queue writes with a refusal receipt', () => {
  const { root } = freshVault({ switches: false });
  const missing = path.join(root, 'switches.json');
  assert.throws(() => createEntry(root, missing, T3_REQ, NOW), /switch/i);
  assert.ok(readReceipts(root, '2026-07-01').some((r) => /SWITCH/i.test(r.outcome)));
});

test('fail closed: SWITCH_MASTER off refuses queue writes', () => {
  const { root, swFile } = freshVault({ masterOn: false });
  assert.throws(() => createEntry(root, swFile, T3_REQ, NOW), /SWITCH_MASTER/i);
});
