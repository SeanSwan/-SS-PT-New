#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-state.test.mjs
 * PURPOSE: Prove lifecycle state is atomic, bounded, and fail-closed.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Uses isolated temporary roots to exercise durable state.
 * HOW IT FITS IN THE APP: Node test runner -> lifecycle state persistence.
 * KEY DECISIONS: Corrupt state is ambiguity; tests never use production state.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function stateModule() {
  return import('./mcp-lifecycle-state.mjs').catch(() => ({}));
}

function isolatedState(t) {
  const root = mkdtempSync(join(tmpdir(), 'mcp-state-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('dirty latch is atomic and malformed state fails closed', async (t) => {
  const state = await stateModule();
  const root = isolatedState(t);
  assert.equal(typeof state.writeDirtyLatch, 'function');
  assert.equal(state.readDirtyLatch(root), false);
  state.writeDirtyLatch(root, 'release-started');
  assert.equal(state.readDirtyLatch(root), true);
  writeFileSync(join(root, 'dirty.json'), '{broken', 'utf8');
  assert.throws(() => state.readDirtyLatch(root), /invalid dirty latch/i);
});

test('journal is allowlisted, atomic, and size bounded', async (t) => {
  const state = await stateModule();
  const root = isolatedState(t);
  const entry = {
    timestamp: '2026-08-09T00:00:00.000Z', mode: 'audit', label: 'playwright',
    running: 1, released: 0, incomplete: 0, protected: 2,
    result: 'audit-only', reason: 'mode-audit',
  };
  assert.equal(typeof state.appendJournal, 'function');
  assert.throws(() => state.appendJournal(root, { ...entry, commandLine: 'forbidden' }), /journal entry/i);
  for (let index = 0; index < 5; index += 1) state.appendJournal(root, entry, { maxBytes: 500 });
  const path = join(root, 'journal.ndjson');
  assert.ok(statSync(path).size <= 500);
  const rows = readFileSync(path, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  assert.ok(rows.length >= 1);
  assert.deepEqual(Object.keys(rows.at(-1)).sort(), Object.keys(entry).sort());
  writeFileSync(path, '{"forbidden":"prior"}\n', 'utf8');
  assert.throws(() => state.readJournal(root), /journal/i);
  assert.throws(() => state.appendJournal(root, entry), /journal/i);
});

test('tombstone is read back before active lease removal', async (t) => {
  const state = await stateModule();
  const root = isolatedState(t);
  const lease = {
    sessionId: 'session-a', agentKind: 'claude', agentPid: 100,
    agentCreatedAt: 1000, roots: [{ pid: 110, createdAt: 1100 }],
  };
  let removals = 0;
  const record = state.recordTombstoneAndRemove({
    root, lease, reason: 'audit-ended',
    removeLease: () => {
      assert.equal(state.readTombstones(root).length, 1);
      removals += 1;
    },
  });
  assert.equal(removals, 1);
  assert.equal(record.reason, 'audit-ended');
  assert.equal('sessionId' in record, false);
  assert.throws(() => state.recordTombstoneAndRemove({
    root, lease, reason: 'audit-ended', removeLease: () => { removals += 1; },
    write: () => { throw new Error('disk failure'); },
  }), /disk failure/);
  assert.equal(removals, 1);
  assert.equal(state.tombstoneLeaseStatus(root, lease, 'release-refused', () => {}), 'removed');
  assert.equal(state.tombstoneLeaseStatus(
    root, lease, 'release-refused', () => { throw new Error('locked'); },
  ), 'retained');
});

test('tombstones coalesce per exact owner generation without losing roots', async (t) => {
  const state = await stateModule();
  const root = isolatedState(t);
  for (let index = 0; index < 300; index += 1) {
    state.recordTombstoneAndRemove({
      root,
      lease: {
        sessionId: `session-${index}`, agentPid: 100, agentCreatedAt: 1000,
        roots: [{ pid: 1000, createdAt: 2000 }],
      },
      reason: 'audit-ended', removeLease: () => {},
    });
  }
  const records = state.readTombstones(root);
  assert.equal(records.length, 1);
  assert.equal(records[0].roots.length, 1);
});

test('tombstone root overflow preserves the last valid quarantine record', async (t) => {
  const state = await stateModule();
  const root = isolatedState(t);
  for (let index = 0; index < 256; index += 1) {
    state.recordTombstoneAndRemove({
      root,
      lease: {
        sessionId: `bounded-${index}`, agentPid: 100, agentCreatedAt: 1000,
        roots: [{ pid: 1000 + index, createdAt: 2000 + index }],
      },
      reason: 'audit-ended', removeLease: () => {},
    });
  }
  assert.throws(() => state.recordTombstoneAndRemove({
    root,
    lease: {
      sessionId: 'overflow', agentPid: 100, agentCreatedAt: 1000,
      roots: [{ pid: 9999, createdAt: 9999 }],
    },
    reason: 'audit-ended', removeLease: () => {},
  }), /tombstone/i);
  assert.equal(state.readTombstones(root)[0].roots.length, 256);
});

test('only the exact owner generation is blocked by a tombstone', async () => {
  const state = await stateModule();
  const tombstones = [{ ownerPid: 100, ownerCreatedAt: 1000 }];
  assert.equal(state.ownerHasTombstone(tombstones, { pid: 100, createdAt: 1000 }), true);
  assert.equal(state.ownerHasTombstone(tombstones, { pid: 100, createdAt: 1001 }), false);
  assert.equal(state.ownerHasTombstone(tombstones, { pid: 101, createdAt: 1000 }), false);
});

test('tombstones are removed only after exact owner and root generations are gone', async (t) => {
  const state = await stateModule();
  const root = isolatedState(t);
  const lease = {
    sessionId: 'prune-session', agentPid: 100, agentCreatedAt: 1000,
    roots: [{ pid: 110, createdAt: 1100 }],
  };
  state.recordTombstoneAndRemove({ root, lease, reason: 'audit-ended', removeLease: () => {} });
  assert.equal(state.pruneExitedTombstones(root, [{ pid: 100, createdAt: 1000 }]), 0);
  assert.equal(state.pruneExitedTombstones(root, [{ pid: 100, createdAt: null }]), 0);
  assert.equal(state.pruneExitedTombstones(root, [
    { pid: 100, createdAt: 2000 }, { pid: 110, createdAt: 2100 },
  ]), 1);
  assert.equal(state.readTombstones(root).length, 0);
});

test('enforcement transaction latches before release and clears only after durable clean receipt', async (t) => {
  const state = await stateModule();
  const cleanRoot = isolatedState(t);
  const entry = {
    timestamp: '2026-08-09T00:00:00.000Z', mode: 'enforce', label: 'playwright',
    running: 1, released: 1, incomplete: 0, protected: 0,
    result: 'complete', reason: 'release-complete',
  };
  const clean = state.runEnforcementTransaction(cleanRoot, {
    release: () => {
      assert.equal(state.readDirtyLatch(cleanRoot), true);
      return { released: 1, incomplete: 0 };
    },
    journalEntry: (result) => ({ ...entry, released: result.released }),
  });
  assert.deepEqual(clean, { released: 1, incomplete: 0 });
  assert.equal(state.readDirtyLatch(cleanRoot), false);
  assert.match(readFileSync(join(cleanRoot, 'journal.ndjson'), 'utf8'), /release-complete/);

  const failedRoot = isolatedState(t);
  assert.throws(() => state.runEnforcementTransaction(failedRoot, {
    release: () => { throw new Error('release failed'); }, journalEntry: () => entry,
  }), /release failed/);
  assert.equal(state.readDirtyLatch(failedRoot), true);

  const incompleteRoot = isolatedState(t);
  state.runEnforcementTransaction(incompleteRoot, {
    release: () => ({ released: 0, incomplete: 1 }),
    journalEntry: () => ({ ...entry, released: 0, incomplete: 1, result: 'incomplete', reason: 'release-incomplete' }),
  });
  assert.equal(state.readDirtyLatch(incompleteRoot), true);
});

test('rearm requires explicit approval and a clean doctor result before clearing dirty', async (t) => {
  const state = await stateModule();
  const root = isolatedState(t);
  state.writeDirtyLatch(root, 'release-started');
  assert.throws(() => state.rearmDirtyLatch(root, { approved: false, doctorClean: true }), /approval/i);
  assert.throws(() => state.rearmDirtyLatch(root, { approved: true, doctorClean: false }), /doctor/i);
  assert.equal(state.readDirtyLatch(root), true);
  state.rearmDirtyLatch(root, { approved: true, doctorClean: true });
  assert.equal(state.readDirtyLatch(root), false);
  assert.match(readFileSync(join(root, 'journal.ndjson'), 'utf8'), /rearmed/);
});
