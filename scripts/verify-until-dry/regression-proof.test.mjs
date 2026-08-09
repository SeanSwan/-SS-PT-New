/**
 * @file regression-proof.test.mjs
 * @description Tests that claimed regression coverage demonstrably bites before a fix.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createRegressionProof } from './regression-proof.mjs';
import { sha256 } from './ledger.mjs';

const hash = (char) => char.repeat(64);

test('accepts the same test failing before and passing after a source change', () => {
  const proof = createRegressionProof({
    findingId: 'F1', testId: 'math-zero', testHash: hash('a'), commandHash: hash('f'),
    failureSignature: 'expected 0',
    red: { sourceHash: hash('b'), exitCode: 1, output: 'FAIL expected 0', outputHash: sha256('FAIL expected 0') },
    green: { sourceHash: hash('d'), exitCode: 0, output: 'PASS', outputHash: sha256('PASS') },
  });
  assert.equal(proof.biting, true);
  assert.match(proof.proofHash, /^[a-f0-9]{64}$/);
});

test('rejects always-green, still-red, changed-test, and unchanged-source claims', () => {
  const base = {
    findingId: 'F2', testId: 'probe', testHash: hash('a'), commandHash: hash('f'),
    failureSignature: 'boom',
    red: { sourceHash: hash('b'), exitCode: 1, output: 'boom', outputHash: sha256('boom') },
    green: { sourceHash: hash('d'), exitCode: 0, output: 'pass', outputHash: sha256('pass') },
  };
  assert.throws(() => createRegressionProof({ ...base, red: { ...base.red, exitCode: 0 } }), /red/i);
  assert.throws(() => createRegressionProof({ ...base, green: { ...base.green, exitCode: 1 } }), /green/i);
  assert.throws(() => createRegressionProof({ ...base, greenTestHash: hash('f') }), /same test/i);
  assert.throws(() => createRegressionProof({ ...base, green: { ...base.green, sourceHash: base.red.sourceHash } }), /source/i);
  assert.throws(() => createRegressionProof({ ...base, red: { ...base.red, output: 'different' } }), /output/i);
});
