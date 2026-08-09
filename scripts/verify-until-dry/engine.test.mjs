/**
 * @file engine.test.mjs
 * @description Tests deterministic pass orchestration and fence cleanup.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { runDeterministicPass } from './engine.mjs';

const snapshot = { headSha: 'a'.repeat(40), sourceHash: 'b'.repeat(64), scopeHash: 'c'.repeat(64) };

test('passing gates remain UNPROVEN until hostile clean rounds exist', async () => {
  let disposed = 0;
  const receipt = await runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: { paths: ['.'] },
    capture: () => snapshot,
    select: () => [{ id: 'unit' }],
    create: () => ({ path: 'C:\\fence' }),
    run: async () => [{ gateId: 'unit', status: 'passed', outputHash: 'd'.repeat(64) }],
    dispose: () => { disposed += 1; },
  });
  assert.equal(receipt.verdict.verdict, 'UNPROVEN');
  assert.equal(disposed, 1);
});

test('failed gates are DIRTY and fences dispose even when execution throws', async () => {
  let disposed = 0;
  const dirty = await runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
    select: () => [{ id: 'unit' }], create: () => ({ path: 'C:\\fence' }),
    run: async () => [{ gateId: 'unit', status: 'failed', outputHash: 'd'.repeat(64) }],
    dispose: () => { disposed += 1; },
  });
  assert.equal(dirty.verdict.verdict, 'DIRTY');
  await assert.rejects(runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
    select: () => [{ id: 'unit' }], create: () => ({ path: 'C:\\fence' }),
    run: async () => { throw new Error('boom'); }, dispose: () => { disposed += 1; },
  }), /boom/);
  assert.equal(disposed, 2);
});
