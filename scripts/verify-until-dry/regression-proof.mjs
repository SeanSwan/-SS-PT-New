/**
 * @file regression-proof.mjs
 * @description Proves a regression test failed before and passed after the repair.
 */
import { canonicalJson, sha256 } from './ledger.mjs';
import { canonicalizeFailureSignature, hasUnsafeComparableCharacters,
  normalizeComparableText } from './findings.mjs';

const HASH = /^[a-f0-9]{64}$/;

function requireHash(value, label) {
  if (!HASH.test(String(value ?? ''))) throw new Error(`${label} must be a SHA-256 hash`);
}

export function createRegressionProof(input = {}) {
  if (!input.findingId || !input.testId) throw new Error('Finding and test identifiers are required');
  if (!Number.isInteger(input.tier) || input.tier < 0 || input.tier > 3) {
    throw new Error('Regression proof requires risk tier 0 through 3');
  }
  requireHash(input.testHash, 'Test hash');
  requireHash(input.greenTestHash, 'Green test hash');
  requireHash(input.commandHash, 'Command hash');
  requireHash(input.red?.sourceHash, 'Red source hash');
  requireHash(input.red?.outputHash, 'Red output hash');
  requireHash(input.green?.sourceHash, 'Green source hash');
  requireHash(input.green?.outputHash, 'Green output hash');
  if (typeof input.red.output !== 'string' || sha256(input.red.output) !== input.red.outputHash ||
      typeof input.green.output !== 'string' || sha256(input.green.output) !== input.green.outputHash) {
    throw new Error('Regression output hashes must bind captured output');
  }
  const failureSignature = canonicalizeFailureSignature(input.failureSignature);
  if (!failureSignature || failureSignature !== input.failureSignature ||
      hasUnsafeComparableCharacters(input.red.output) ||
      hasUnsafeComparableCharacters(input.green.output) ||
      !normalizeComparableText(input.red.output).includes(failureSignature) ||
      normalizeComparableText(input.green.output).includes(failureSignature)) {
    throw new Error('Regression failure signature must disappear after repair');
  }
  if (input.greenTestHash !== input.testHash) {
    throw new Error('Regression proof must use the same test before and after repair');
  }
  if (input.red.exitCode === 0) throw new Error('Red observation did not fail before the repair');
  if (input.green.exitCode !== 0) throw new Error('Green observation did not pass after the repair');
  if (input.red.sourceHash === input.green.sourceHash) {
    throw new Error('Regression proof requires distinct pre-fix and post-fix source hashes');
  }
  let mutation = null;
  if (input.tier >= 2 && !input.mutation) throw new Error('Tier 2+ regression proof requires fix mutation evidence');
  if (input.mutation) {
    requireHash(input.mutation.sourceHash, 'Mutation source hash');
    requireHash(input.mutation.testHash, 'Mutation test hash');
    requireHash(input.mutation.commandHash, 'Mutation command hash');
    requireHash(input.mutation.outputHash, 'Mutation output hash');
    if (input.mutation.testHash !== input.testHash || input.mutation.commandHash !== input.commandHash) {
      throw new Error('Mutation proof must run the same test and command');
    }
    const mutationSignature = canonicalizeFailureSignature(input.mutation.failureSignature);
    if (input.mutation.sourceHash === input.green.sourceHash || input.mutation.exitCode === 0 ||
        typeof input.mutation.output !== 'string' || sha256(input.mutation.output) !== input.mutation.outputHash ||
        !mutationSignature || mutationSignature !== input.mutation.failureSignature ||
        hasUnsafeComparableCharacters(input.mutation.output) ||
        !normalizeComparableText(input.mutation.output).includes(mutationSignature)) {
      throw new Error('Mutation evidence must bind a distinct killed mutation and captured failure');
    }
    mutation = { ...input.mutation, failureSignature: mutationSignature, killed: true };
  }
  const proof = {
    schema: 'verify-until-dry.regression-proof.v1',
    findingId: input.findingId,
    testId: input.testId,
    testHash: input.testHash,
    greenTestHash: input.greenTestHash,
    commandHash: input.commandHash,
    tier: input.tier,
    failureSignature,
    red: { ...input.red },
    green: { ...input.green },
    mutation,
    biting: true,
  };
  return Object.freeze({ ...proof, proofHash: sha256(canonicalJson(proof)) });
}

export function validateRegressionProof(proof, context = {}) {
  if (proof?.schema !== 'verify-until-dry.regression-proof.v1') return false;
  const { proofHash, ...payload } = proof;
  try {
    const rebuilt = createRegressionProof(payload);
    return rebuilt.proofHash === proofHash && canonicalJson(rebuilt) === canonicalJson(proof) &&
      (!context.findingId || proof.findingId === context.findingId) &&
      (!Number.isInteger(context.tier) || proof.tier === context.tier) &&
      (!context.sourceHash || proof.green.sourceHash === context.sourceHash);
  } catch {
    return false;
  }
}
