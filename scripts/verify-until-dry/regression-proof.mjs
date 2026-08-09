/**
 * @file regression-proof.mjs
 * @description Proves a regression test failed before and passed after the repair.
 */
import { canonicalJson, sha256 } from './ledger.mjs';

const HASH = /^[a-f0-9]{64}$/;

function requireHash(value, label) {
  if (!HASH.test(String(value ?? ''))) throw new Error(`${label} must be a SHA-256 hash`);
}

export function createRegressionProof(input = {}) {
  if (!input.findingId || !input.testId) throw new Error('Finding and test identifiers are required');
  requireHash(input.testHash, 'Test hash');
  requireHash(input.commandHash, 'Command hash');
  requireHash(input.red?.sourceHash, 'Red source hash');
  requireHash(input.red?.outputHash, 'Red output hash');
  requireHash(input.green?.sourceHash, 'Green source hash');
  requireHash(input.green?.outputHash, 'Green output hash');
  if (typeof input.red.output !== 'string' || sha256(input.red.output) !== input.red.outputHash ||
      typeof input.green.output !== 'string' || sha256(input.green.output) !== input.green.outputHash) {
    throw new Error('Regression output hashes must bind captured output');
  }
  if (!input.failureSignature || !input.red.output.includes(input.failureSignature) ||
      input.green.output.includes(input.failureSignature)) {
    throw new Error('Regression failure signature must disappear after repair');
  }
  if (input.greenTestHash && input.greenTestHash !== input.testHash) {
    throw new Error('Regression proof must use the same test before and after repair');
  }
  if (input.red.exitCode === 0) throw new Error('Red observation did not fail before the repair');
  if (input.green.exitCode !== 0) throw new Error('Green observation did not pass after the repair');
  if (input.red.sourceHash === input.green.sourceHash) {
    throw new Error('Regression proof requires distinct pre-fix and post-fix source hashes');
  }
  const proof = {
    schema: 'verify-until-dry.regression-proof.v1',
    findingId: input.findingId,
    testId: input.testId,
    testHash: input.testHash,
    commandHash: input.commandHash,
    failureSignature: input.failureSignature,
    red: { ...input.red },
    green: { ...input.green },
    biting: true,
  };
  return Object.freeze({ ...proof, proofHash: sha256(canonicalJson(proof)) });
}
