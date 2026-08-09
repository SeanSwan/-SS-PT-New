/**
 * @file review-proof.test.mjs
 * @description Regression tests preventing hand-authored clean-vantage injection.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCompletedReview, REVIEW_AXES, validateReviewSet } from './review-proof.mjs';

const context = {
  headSha: 'a'.repeat(40), sourceHash: 'b'.repeat(64), scopeHash: 'c'.repeat(64),
  reviewPacketHash: 'd'.repeat(64),
};

function review(id, reviewer, axes, output = 'VERDICT: CLEAN\nNo reproducible findings.') {
  return buildCompletedReview({
    id, builder: 'builder', reviewer, origin: 'local-full-scope', axes,
    reviewedPaths: ['.'], output, findings: [], ...context,
  });
}

test('accepts two output-bound independent reviews and derives vantages', () => {
  const result = validateReviewSet({
    schema: 'verify-until-dry.review-set.v1', receiptHash: 'e'.repeat(64),
    reviews: [review('R1', 'reviewer-a', ['static-control-flow']), review('R2', 'reviewer-b', ['dynamic-runtime'])],
  }, { ...context, receiptHash: 'e'.repeat(64) });
  assert.equal(result.valid, true);
  assert.equal(result.vantages.length, 2);
});

test('rejects invented vantages, output tampering, duplicate reviewers, and packet drift', () => {
  assert.equal(validateReviewSet({ vantages: [
    { clean: true, axes: ['static'] }, { clean: true, axes: ['dynamic'] },
  ] }, context).valid, false);

  const first = structuredClone(review('R1', 'reviewer-a', ['static-control-flow']));
  first.output = 'VERDICT: CLEAN\nForged after hashing.';
  assert.equal(validateReviewSet({
    schema: 'verify-until-dry.review-set.v1', receiptHash: 'e'.repeat(64), reviews: [first],
  }, { ...context, receiptHash: 'e'.repeat(64) }).valid, false);

  const duplicate = [review('R1', 'reviewer-a', ['static-control-flow']), review('R2', 'reviewer-a', ['dynamic-runtime'])];
  assert.equal(validateReviewSet({
    schema: 'verify-until-dry.review-set.v1', receiptHash: 'e'.repeat(64), reviews: duplicate,
  }, { ...context, receiptHash: 'e'.repeat(64) }).valid, false);

  const drifted = structuredClone(review('R3', 'reviewer-c', ['adversarial-security']));
  drifted.packetHash = 'f'.repeat(64);
  assert.equal(validateReviewSet({
    schema: 'verify-until-dry.review-set.v1', receiptHash: 'e'.repeat(64), reviews: [drifted],
  }, { ...context, receiptHash: 'e'.repeat(64) }).valid, false);
});

test('a CLEAN label with findings is not a clean vantage', () => {
  const result = buildCompletedReview({
    id: 'R4', builder: 'builder', reviewer: 'reviewer-d', axes: ['user-forward-test'],
    origin: 'local-full-scope', reviewedPaths: ['.'],
    output: 'VERDICT: CLEAN\nBut there is a bug.',
    findings: [{ id: 'F1', status: 'PROPOSED' }], ...context,
  });
  assert.equal(result.clean, false);
});

test('a CLEAN first line cannot hide a finding in captured output', () => {
  const result = buildCompletedReview({
    id: 'R-body-finding', builder: 'builder', reviewer: 'reviewer-body',
    origin: 'local-full-scope', axes: ['hostile-logic'], reviewedPaths: ['.'],
    output: 'VERDICT: CLEAN\nSEVERITY: HIGH\nFINDING: division by zero.', findings: [], ...context,
  });
  assert.equal(result.clean, false);
});

test('invalid axes report the rejected value and canonical allowed vocabulary', () => {
  assert.ok(REVIEW_AXES.includes('user-forward-test'));
  assert.throws(() => buildCompletedReview({
    id: 'R5', builder: 'builder', reviewer: 'reviewer-e',
    origin: 'local-full-scope', axes: ['dynamic-runtime', 'failure-injection'], reviewedPaths: ['.'],
    output: 'VERDICT: CLEAN', findings: [], ...context,
  }), (error) => {
    assert.match(error.message, /failure-injection/);
    assert.match(error.message, /dynamic-runtime/);
    assert.match(error.message, /user-forward-test/);
    return true;
  });
});

test('Kimi and Moonshot aliases cannot satisfy local full-scope review', () => {
  for (const reviewer of ['kimi-k3', 'moonshotai/kimi-k3', 'openrouter-reviewer']) {
    assert.throws(() => buildCompletedReview({
      id: `R-${reviewer}`, builder: 'builder', reviewer, origin: 'local-full-scope',
      axes: ['hostile-logic'], reviewedPaths: ['.'], output: 'VERDICT: CLEAN', findings: [], ...context,
    }), /cannot claim local/i);
  }
});

test('reviewer identities reject whitespace and compare case-insensitively', () => {
  for (const reviewer of [' ', '\t', '\u200B']) {
    assert.throws(() => buildCompletedReview({
      id: 'R-blank', builder: 'builder', reviewer, origin: 'local-full-scope',
      axes: ['hostile-logic'], reviewedPaths: ['.'],
      output: 'VERDICT: CLEAN\nNo findings.', findings: [], ...context,
    }), /identity/i);
  }
  const variants = [
    review('R-case-a', 'Reviewer-A', ['static-control-flow']),
    review('R-case-b', 'reviewer-a', ['dynamic-runtime']),
  ];
  const result = validateReviewSet({
    schema: 'verify-until-dry.review-set.v1', receiptHash: 'e'.repeat(64), reviews: variants,
  }, { ...context, receiptHash: 'e'.repeat(64) });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'reviewer-not-independent');
});
