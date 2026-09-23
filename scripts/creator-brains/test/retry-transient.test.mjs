#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/retry-transient.test.mjs
 * PURPOSE: The shared transient-retry policy (E1's helper) — now used by BOTH
 *          the rename publish and the lock release, so it gets its own gate.
 * PART OF: Creator Brains — SS-PT acquisition engine (additive)
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * WHY A GATE FOR A 10-LINE HELPER: two production sites read it (paths.mjs's
 * `renameWithRetry`, lock.mjs's release unlink). The properties are the ones
 * that keep the retry from becoming a lie:
 *
 *   1. TRANSIENT codes are retried and a later success is returned;
 *   2. NON-transient codes surface IMMEDIATELY (no 92 ms mask on ENOENT);
 *   3. the budget is BOUNDED — a permanently-failing transient still throws
 *      after the backoff schedule, so "retry" can never mean "hang".
 *
 * RUN: node --test scripts/creator-brains/test/retry-transient.test.mjs
 * @module creator-brains/test/retry-transient
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { retryTransientSync, sleepSync } from '../lib/paths.mjs';

const eperm = () => { const e = new Error('transient'); e.code = 'EPERM'; return e; };
const enoent = () => { const e = new Error('gone'); e.code = 'ENOENT'; return e; };

test('E1 helper: a transient failure is retried and the eventual success is returned', () => {
  let calls = 0;
  const out = retryTransientSync(() => {
    calls += 1;
    if (calls < 3) throw eperm();
    return 'published';
  }, { backoffMs: [0, 0, 0] }); // zero sleeps: the scheduling is not under test
  assert.equal(out, 'published');
  assert.equal(calls, 3, 'two transients then success — exactly three attempts');
});

test('E1 helper: a NON-transient error surfaces on the first attempt — no masked ENOENT', () => {
  let calls = 0;
  assert.throws(() => retryTransientSync(() => { calls += 1; throw enoent(); }, { backoffMs: [0, 0] }), /gone/);
  assert.equal(calls, 1, 'ENOENT is a real error; waiting cannot make it succeed');
});

test('E1 helper: the budget is BOUNDED — a permanent transient throws after the schedule', () => {
  let calls = 0;
  assert.throws(() => retryTransientSync(() => { calls += 1; throw eperm(); }, { backoffMs: [0, 0] }), /transient/);
  assert.equal(calls, 3, 'initial attempt + one per backoff entry, then it gives up honestly');
});

test('E1 helper: sleepSync actually waits (the backoff is not a no-op)', () => {
  const t0 = process.hrtime.bigint();
  sleepSync(12);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms >= 8, `expected >= ~12ms park (>=8 tolerant), slept ${ms.toFixed(1)}ms`);
});
