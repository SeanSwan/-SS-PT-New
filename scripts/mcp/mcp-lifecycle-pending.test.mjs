#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-pending.test.mjs
 * PURPOSE: Lock holder-bound pending publication and recovery behavior.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exercises pending schemas, nonce ABA defense, and quarantine.
 * HOW IT FITS IN THE APP: Node test runner -> lifecycle pending persistence.
 * KEY DECISIONS: Replacement generations and ambiguous holders are never removed.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allPendingStarts, canQuarantinePending, nextPendingStart, quarantinePendingStart,
  readPendingStart, removePendingStart, savePendingStart, validatePendingStart,
} from './mcp-lifecycle-leases.mjs';
const at = (seconds) => Date.parse(`2026-08-08T00:00:${String(seconds).padStart(2, '0')}.000Z`);
const owner = { kind: 'claude', pid: 100, createdAt: at(1) };
const holder = { pid: 101, createdAt: at(2) };

test('pending claims are host-visible and bind an expiring exact holder nonce', () => {
  const sessionId = `pending-${process.pid}-${Date.now()}`;
  const pending = nextPendingStart(sessionId, owner, holder, {
    now: at(3), ttlMs: 30_000, nonce: '0123456789abcdef0123456789abcdef',
  });
  assert.equal(pending.holderPid, holder.pid);
  assert.equal(pending.expiresAt, at(3) + 30_000);
  assert.throws(() => validatePendingStart({ ...pending, holderCreatedAt: null }), /pending state/i);
  try {
    savePendingStart(pending);
    assert.equal(readPendingStart(sessionId).nonce, pending.nonce);
    assert.equal(allPendingStarts().some((item) => item.sessionId === sessionId), true);
  } finally { removePendingStart(sessionId, pending.nonce); }
});

test('pending removal cannot delete a replacement nonce', () => {
  const sessionId = `pending-aba-${process.pid}-${Date.now()}`;
  const first = nextPendingStart(sessionId, owner, holder, { nonce: 'a'.repeat(32) });
  const replacement = nextPendingStart(sessionId, owner, holder, { nonce: 'b'.repeat(32) });
  try {
    savePendingStart(first); savePendingStart(replacement);
    assert.equal(removePendingStart(sessionId, first.nonce), false);
    assert.equal(readPendingStart(sessionId).nonce, replacement.nonce);
    assert.equal(removePendingStart(sessionId, replacement.nonce), true);
  } finally { removePendingStart(sessionId, replacement.nonce); }
});

test('stale quarantine requires unchanged nonce, expiry, and exact dead holder', () => {
  const before = nextPendingStart('stale-pending', owner, holder, {
    now: at(3), ttlMs: 1000, nonce: 'a'.repeat(32),
  });
  assert.equal(canQuarantinePending(before, { ...before, nonce: 'b'.repeat(32) }, [], at(5)), false);
  assert.equal(canQuarantinePending(before, before, [holder], at(5)), false);
  assert.equal(canQuarantinePending(before, before, [{ pid: holder.pid, createdAt: null }], at(5)), false);
  assert.equal(canQuarantinePending(before, before, [], at(5)), true);
});

test('expired pending record is quarantined instead of deleted', () => {
  const sessionId = `pending-quarantine-${process.pid}-${Date.now()}`;
  const pending = nextPendingStart(sessionId, owner, holder, {
    now: at(3), ttlMs: 1000, nonce: 'c'.repeat(32),
  });
  try {
    savePendingStart(pending);
    assert.equal(quarantinePendingStart(sessionId, pending, [], at(5)), true);
    assert.equal(readPendingStart(sessionId), null);
  } finally { removePendingStart(sessionId, pending.nonce); }
});
