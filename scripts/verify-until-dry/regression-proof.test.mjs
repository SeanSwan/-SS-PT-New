/**
 * @file regression-proof.test.mjs
 * @description Tests that claimed regression coverage demonstrably bites before a fix.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createRegressionProof } from './regression-proof.mjs';

const hash = (char) => char.repeat(64);

test('accepts the same test failing before and passing after a source change', () => {
  const proof = createRegressionProof({
    findingId: 'F1', testId: 'math-zero', testHash: hash('a'),
    red: { sourceHash: hash('b'), exitCode: 1, outputHash: hash('c') },
    green: { sourceHash: hash('d'), exitCode: 0, outputHash: hash('e') },
  });
  assert.equal(proof.biting, true);
  assert.match(proof.proofHash, /^[a-f0-9]{64}$/);
});

test('rejects always-green, still-red, changed-test, and unchanged-source claims', () => {
  const base = {
    findingId: 'F2', testId: 'probe', testHash: hash('a'),
    red: { sourceHash: hash('b'), exitCode: 1, outputHash: hash('c') },
    green: { sourceHash: hash('d'), exitCode: 0, outputHash: hash('e') },
  };
  assert.throws(() => createRegressionProof({ ...base, red: { ...base.red, exitCode: 0 } }), /red/i);
  assert.throws(() => createRegressionProof({ ...base, green: { ...base.green, exitCode: 1 } }), /green/i);
  assert.throws(() => createRegressionProof({ ...base, greenTestHash: hash('f') }), /same test/i);
  assert.throws(() => createRegressionProof({ ...base, green: { ...base.green, sourceHash: base.red.sourceHash } }), /source/i);
});
