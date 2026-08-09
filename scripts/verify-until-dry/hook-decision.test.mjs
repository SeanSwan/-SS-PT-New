/**
 * @file hook-decision.test.mjs
 * @description Tests observe/enforce behavior for the always-active local gate.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { appendEvent, canonicalJson, sha256 } from './ledger.mjs';
import { buildReceipt } from './receipt.mjs';
import { decideHook } from './hook-decision.mjs';
import { buildCompletedReview } from './review-proof.mjs';

function cleanReceipt() {
  const headSha = 'a'.repeat(40);
  const scopeContract = { tier: 0, surfaces: ['docs'], paths: ['docs/a.md'] };
  const scopeHash = sha256(canonicalJson(scopeContract));
  const sourceHash = 'c'.repeat(64);
  const reviewPacketHash = 'd'.repeat(64);
  const reviews = [
    buildCompletedReview({ id: 'R1', builder: 'b', reviewer: 'r1', headSha, sourceHash,
      origin: 'local-full-scope',
      scopeHash, reviewPacketHash, axes: ['static-control-flow'], reviewedPaths: scopeContract.paths,
      output: 'VERDICT: CLEAN\nNone.', findings: [] }),
    buildCompletedReview({ id: 'R2', builder: 'b', reviewer: 'r2', headSha, sourceHash,
      origin: 'local-full-scope',
      scopeHash, reviewPacketHash, axes: ['dynamic-runtime'], reviewedPaths: scopeContract.paths,
      output: 'VERDICT: CLEAN\nNone.', findings: [] }),
  ];
  let ledger = appendEvent([], { type: 'snapshot', headSha, sourceHash, scopeHash });
  const requiredGates = ['diff-check', 'verifier-tests', 'secret-scan'];
  const gates = {};
  for (const [index, id] of requiredGates.entries()) {
    gates[id] = { status: 'pass', current: true, outputHash: String(index + 1).repeat(64), exitCode: 0 };
    ledger = appendEvent(ledger, { type: 'gate', gateId: id, ...gates[id] });
  }
  return buildReceipt({
    tier: 0, headSha, scopeHash, reviewedScopeHash: scopeHash, sourceHash, reviewPacketHash, scopeContract,
    ledger, requiredGates, gates, findings: [], blockers: [], escalations: [],
    vantages: [], reviews,
  });
}

test('observe mode reports gaps without blocking', () => {
  const result = decideHook({ mode: 'observe', receipt: null, currentSnapshot: null });
  assert.equal(result.block, false);
  assert.match(result.reason, /receipt/i);
});

test('assist mode blocks gaps but accepts current local clean proof', () => {
  assert.equal(decideHook({ mode: 'assist', receipt: null }).block, true);
  const receipt = cleanReceipt();
  const currentSnapshot = {
    headSha: receipt.headSha, sourceHash: receipt.sourceHash, scopeHash: receipt.scopeHash,
  };
  assert.deepEqual(decideHook({ mode: 'assist', receipt, currentSnapshot }), {
    mode: 'assist', block: false, reason: 'clean-current-receipt',
  });
});

test('enforce mode blocks missing, dirty, tampered, or stale proof', () => {
  assert.equal(decideHook({ mode: 'enforce', receipt: null }).block, true);
  const receipt = cleanReceipt();
  assert.equal(decideHook({ mode: 'enforce', receipt, currentSnapshot: {
    headSha: receipt.headSha, sourceHash: receipt.sourceHash, scopeHash: receipt.scopeHash,
  } }).reason, 'verification-provenance-not-protected');
  const stale = { headSha: receipt.headSha, sourceHash: 'd'.repeat(64), scopeHash: receipt.scopeHash };
  assert.equal(decideHook({ mode: 'enforce', receipt, currentSnapshot: stale }).block, true);
  const tampered = structuredClone(receipt);
  tampered.verdict.verdict = 'DIRTY';
  assert.equal(decideHook({ mode: 'enforce', receipt: tampered, currentSnapshot: stale }).block, true);
});
