/**
 * @file hook-decision.test.mjs
 * @description Tests observe/enforce behavior for the always-active local gate.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { appendEvent } from './ledger.mjs';
import { buildReceipt } from './receipt.mjs';
import { decideHook } from './hook-decision.mjs';

function cleanReceipt() {
  const headSha = 'a'.repeat(40);
  const scopeHash = 'b'.repeat(64);
  return buildReceipt({
    headSha, scopeHash, reviewedScopeHash: scopeHash, sourceHash: 'c'.repeat(64),
    ledger: appendEvent([], { type: 'snapshot', headSha, scopeHash }),
    requiredGates: [], gates: {}, findings: [], blockers: [], escalations: [],
    vantages: [
      { clean: true, headSha, scopeHash, axes: ['static', 'r1'] },
      { clean: true, headSha, scopeHash, axes: ['dynamic', 'r2'] },
    ],
  });
}

test('observe mode reports gaps without blocking', () => {
  const result = decideHook({ mode: 'observe', receipt: null, currentSnapshot: null });
  assert.equal(result.block, false);
  assert.match(result.reason, /receipt/i);
});

test('enforce mode blocks missing, dirty, tampered, or stale proof', () => {
  assert.equal(decideHook({ mode: 'enforce', receipt: null }).block, true);
  const receipt = cleanReceipt();
  assert.equal(decideHook({ mode: 'enforce', receipt, currentSnapshot: {
    headSha: receipt.headSha, sourceHash: receipt.sourceHash, scopeHash: receipt.scopeHash,
  } }).block, false);
  const stale = { headSha: receipt.headSha, sourceHash: 'd'.repeat(64), scopeHash: receipt.scopeHash };
  assert.equal(decideHook({ mode: 'enforce', receipt, currentSnapshot: stale }).block, true);
  const tampered = structuredClone(receipt);
  tampered.verdict.verdict = 'DIRTY';
  assert.equal(decideHook({ mode: 'enforce', receipt: tampered, currentSnapshot: stale }).block, true);
});
