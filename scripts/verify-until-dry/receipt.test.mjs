/**
 * @file receipt.test.mjs
 * @description Tests hash-bound receipts and deterministic verdict recomputation.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { appendEvent, canonicalJson, sha256 } from './ledger.mjs';
import { buildReceipt, verifyReceipt } from './receipt.mjs';
import { buildCompletedReview } from './review-proof.mjs';

const input = () => {
  const headSha = 'a'.repeat(40);
  const scopeContract = { tier: 0, surfaces: ['docs'], paths: ['docs/a.md'] };
  const scopeHash = sha256(canonicalJson(scopeContract));
  const sourceHash = 'c'.repeat(64);
  let ledger = appendEvent([], { type: 'snapshot', headSha, sourceHash, scopeHash });
  const requiredGates = ['diff-check', 'verifier-tests', 'secret-scan'];
  const gates = {};
  for (const [index, id] of requiredGates.entries()) {
    gates[id] = { status: 'pass', current: true, outputHash: String(index + 1).repeat(64), exitCode: 0 };
    ledger = appendEvent(ledger, { type: 'gate', gateId: id, ...gates[id] });
  }
  const result = {
    tier: 0, headSha, scopeHash, reviewedScopeHash: scopeHash, sourceHash, scopeContract, ledger,
    reviewPacketHash: 'e'.repeat(64),
    requiredGates, gates,
    findings: [], blockers: [], escalations: [],
    vantages: [], reviews: [],
  };
  result.reviews = [
    buildCompletedReview({ id: 'R1', builder: 'b', reviewer: 'r1', headSha,
      sourceHash: result.sourceHash, scopeHash, reviewPacketHash: result.reviewPacketHash,
      axes: ['static-control-flow'], output: 'VERDICT: CLEAN\nNone.', findings: [] }),
    buildCompletedReview({ id: 'R2', builder: 'b', reviewer: 'r2', headSha,
      sourceHash: result.sourceHash, scopeHash, reviewPacketHash: result.reviewPacketHash,
      axes: ['dynamic-runtime'], output: 'VERDICT: CLEAN\nNone.', findings: [] }),
  ];
  return result;
};

test('builds a self-verifying CLEAN_IN_PROVEN_SCOPE receipt', () => {
  const receipt = buildReceipt(input());
  assert.equal(receipt.verdict.verdict, 'CLEAN_IN_PROVEN_SCOPE');
  assert.equal(verifyReceipt(receipt).valid, true);
});

test('tampering with gates, scope, or claimed verdict invalidates the receipt', () => {
  for (const mutate of [
    (r) => { r.gates['diff-check'].status = 'fail'; },
    (r) => { r.scopeHash = 'e'.repeat(64); },
    (r) => { r.verdict.verdict = 'CLEAN_IN_PROVEN_SCOPE'; r.blockers.push('hidden'); },
  ]) {
    const receipt = structuredClone(buildReceipt(input()));
    mutate(receipt);
    assert.equal(verifyReceipt(receipt).valid, false);
  }
});
