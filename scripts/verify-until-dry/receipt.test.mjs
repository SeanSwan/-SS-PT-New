/**
 * @file receipt.test.mjs
 * @description Tests hash-bound receipts and deterministic verdict recomputation.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { appendEvent } from './ledger.mjs';
import { buildReceipt, verifyReceipt } from './receipt.mjs';

const input = () => {
  const headSha = 'a'.repeat(40);
  const scopeHash = 'b'.repeat(64);
  const ledger = appendEvent([], { type: 'snapshot', headSha, scopeHash });
  return {
    headSha, scopeHash, reviewedScopeHash: scopeHash, sourceHash: 'c'.repeat(64), ledger,
    requiredGates: ['unit'], gates: { unit: { status: 'pass', current: true, outputHash: 'd'.repeat(64) } },
    findings: [], blockers: [], escalations: [],
    vantages: [
      { clean: true, headSha, scopeHash, axes: ['static', 'reviewer-a'] },
      { clean: true, headSha, scopeHash, axes: ['dynamic', 'reviewer-b'] },
    ],
  };
};

test('builds a self-verifying CLEAN_IN_PROVEN_SCOPE receipt', () => {
  const receipt = buildReceipt(input());
  assert.equal(receipt.verdict.verdict, 'CLEAN_IN_PROVEN_SCOPE');
  assert.equal(verifyReceipt(receipt).valid, true);
});

test('tampering with gates, scope, or claimed verdict invalidates the receipt', () => {
  for (const mutate of [
    (r) => { r.gates.unit.status = 'fail'; },
    (r) => { r.scopeHash = 'e'.repeat(64); },
    (r) => { r.verdict.verdict = 'CLEAN_IN_PROVEN_SCOPE'; r.blockers.push('hidden'); },
  ]) {
    const receipt = structuredClone(buildReceipt(input()));
    mutate(receipt);
    assert.equal(verifyReceipt(receipt).valid, false);
  }
});
