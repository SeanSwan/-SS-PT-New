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
  assert.equal(receipt.gates.unit.exitCode, 0);
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
  assert.equal(dirty.gates.unit.exitCode, 1);
  await assert.rejects(runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
    select: () => [{ id: 'unit' }], create: () => ({ path: 'C:\\fence' }),
    run: async () => { throw new Error('boom'); }, dispose: () => { disposed += 1; },
  }), /boom/);
  assert.equal(disposed, 2);
});

test('rejects a result gate id that does not exactly match the selected gate', async () => {
  await assert.rejects(runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
    select: () => [{ id: 'unit' }], create: () => ({ path: 'C:\\fence' }),
    run: async () => [{ gateId: '__proto__', status: 'passed', outputHash: 'd'.repeat(64) }],
    dispose: () => {},
  }), /Gate result identity mismatch/);
});

test('rejects duplicate results for one selected gate', async () => {
  const result = { gateId: 'unit', status: 'passed', outputHash: 'd'.repeat(64) };
  await assert.rejects(runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
    select: () => [{ id: 'unit' }], create: () => ({ path: 'C:\\fence' }),
    run: async () => [result, result], dispose: () => {},
  }), /Gate result count mismatch/);
});

test('rejects duplicate selected gate identities', async () => {
  const result = { gateId: 'unit', status: 'passed', outputHash: 'd'.repeat(64) };
  await assert.rejects(runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
    select: () => [{ id: 'unit' }, { id: 'unit' }], create: () => ({ path: 'C:\\fence' }),
    run: async () => [result, result], dispose: () => {},
  }), /Selected gate identities must be unique/);
});

test('rejects a selected gate identity that is unsafe as an object key', async () => {
  await assert.rejects(runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
    select: () => [{ id: '__proto__' }], create: () => ({ path: 'C:\\fence' }),
    run: async () => [{ gateId: '__proto__', status: 'passed', outputHash: 'd'.repeat(64) }],
    dispose: () => {},
  }), /Selected gate identity is invalid/);
});

test('preserves both the primary gate failure and a cleanup failure', async () => {
  const primary = new Error('primary gate failure');
  const cleanup = new Error('cleanup failure');
  await assert.rejects(runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
    select: () => [{ id: 'unit' }], create: () => ({ path: 'C:\\fence' }),
    run: async () => { throw primary; }, dispose: () => { throw cleanup; },
  }), (error) => {
    assert(error instanceof AggregateError);
    assert.deepEqual(error.errors, [primary, cleanup]);
    assert.equal(error.cause, primary);
    return true;
  });
});

test('rejects a reordered complete result set as an order mismatch', async () => {
  const pass = (gateId) => ({ gateId, status: 'passed', outputHash: 'd'.repeat(64) });
  await assert.rejects(runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
    select: () => [{ id: 'first' }, { id: 'second' }], create: () => ({ path: 'C:\\fence' }),
    run: async () => [pass('second'), pass('first')], dispose: () => {},
  }), /Gate result order mismatch/);
});

test('rejects an unknown gate result status instead of coercing it to failure', async () => {
  await assert.rejects(runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
    select: () => [{ id: 'unit' }], create: () => ({ path: 'C:\\fence' }),
    run: async () => [{ gateId: 'unit', status: 'skipped', outputHash: 'd'.repeat(64) }],
    dispose: () => {},
  }), /Gate result status is invalid/);
});

test('rejects an explicit exit code that contradicts the gate status', async () => {
  for (const result of [
    { gateId: 'unit', status: 'passed', exitCode: 1, outputHash: 'd'.repeat(64) },
    { gateId: 'unit', status: 'failed', exitCode: 0, outputHash: 'd'.repeat(64) },
  ]) {
    await assert.rejects(runDeterministicPass({
      repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
      select: () => [{ id: 'unit' }], create: () => ({ path: 'C:\\fence' }),
      run: async () => [result], dispose: () => {},
    }), /Gate result exit code contradicts status/);
  }
});

test('rejects a malformed explicit gate exit code', async () => {
  for (const exitCode of ['0', -1, Number.NaN]) {
    await assert.rejects(runDeterministicPass({
      repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
      select: () => [{ id: 'unit' }], create: () => ({ path: 'C:\\fence' }),
      run: async () => [{ gateId: 'unit', status: 'failed', exitCode, outputHash: 'd'.repeat(64) }],
      dispose: () => {},
    }), /Gate result exit code is invalid/);
  }
});

test('snapshots the runner result collection before validating identities', async () => {
  let lengthReads = 0;
  const result = { gateId: 'unit', status: 'passed', outputHash: 'd'.repeat(64) };
  const unstable = new Proxy([result], {
    get(target, property, receiver) {
      if (property === 'length') {
        lengthReads += 1;
        return lengthReads === 1 ? 1 : 2;
      }
      return Reflect.get(target, property, receiver);
    },
  });
  const receipt = await runDeterministicPass({
    repoRoot: 'C:\\repo', tier: 0, surfaces: [], scopeContract: {}, capture: () => snapshot,
    select: () => [{ id: 'unit' }], create: () => ({ path: 'C:\\fence' }),
    run: async () => unstable, dispose: () => {},
  });
  assert.equal(receipt.gates.unit.status, 'pass');
  assert.equal(lengthReads, 1);
});
