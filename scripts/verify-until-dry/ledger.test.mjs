#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/ledger.test.mjs
 * PURPOSE: Prove the evidence chain rejects mutation, reordering, and deletion.
 * SECURITY: False acceptance here would let an agent fabricate clean evidence.
 * RUN: node --test scripts/verify-until-dry/ledger.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendEvent, verifyLedger } from './ledger.mjs';

const buildLedger = () => {
  let entries = [];
  entries = appendEvent(entries, { type: 'snapshot', headSha: 'abc', scopeHash: 'scope-1' });
  entries = appendEvent(entries, { type: 'gate_result', gate: 'unit', status: 'pass' });
  return entries;
};

test('a valid hash-chained ledger verifies', () => {
  const result = verifyLedger(buildLedger());
  assert.deepEqual(result, { valid: true, error: null });
});

test('mutating evidence invalidates the chain', () => {
  const entries = structuredClone(buildLedger());
  entries[1].status = 'fail';
  const result = verifyLedger(entries);
  assert.equal(result.valid, false);
  assert.match(result.error, /hash mismatch/i);
});

test('reordering or deleting entries invalidates the chain', () => {
  const entries = buildLedger();
  assert.equal(verifyLedger([entries[1], entries[0]]).valid, false);
  assert.equal(verifyLedger([entries[1]]).valid, false);
});

test('non-object and duplicate-sequence entries are rejected', () => {
  assert.equal(verifyLedger([null]).valid, false);
  const entries = buildLedger();
  entries[1].seq = entries[0].seq;
  assert.equal(verifyLedger(entries).valid, false);
});
