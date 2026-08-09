/**
 * @file review-proof.mjs
 * @description Builds and validates output-bound independent review evidence.
 */
import { sha256 } from './ledger.mjs';

const SHA256 = /^[a-f0-9]{64}$/;
const HEAD = /^[a-f0-9]{40}$/;
export const REVIEW_AXES = Object.freeze([
  'adversarial-security', 'contract-tests', 'cross-platform', 'dynamic-runtime',
  'hostile-logic', 'state-machine', 'static-control-flow', 'user-forward-test',
]);
const ALLOWED_AXES = new Set(REVIEW_AXES);

function cleanDecision(output, findings) {
  const first = String(output).split(/\r?\n/).find((line) => line.trim())?.trim() ?? '';
  return /^VERDICT:\s*CLEAN$/i.test(first) && findings.length === 0;
}

function validAxes(axes) {
  return Array.isArray(axes) && axes.length > 0 &&
    new Set(axes).size === axes.length && axes.every((axis) => ALLOWED_AXES.has(axis));
}

function requireValidAxes(axes) {
  if (!Array.isArray(axes) || axes.length === 0) {
    throw new Error(`Review axes are required. Allowed axes: ${REVIEW_AXES.join(', ')}`);
  }
  const invalid = [...new Set(axes.filter((axis) => !ALLOWED_AXES.has(axis)))];
  if (invalid.length) {
    throw new Error(`Unknown review axes: ${invalid.join(', ')}. Allowed axes: ${REVIEW_AXES.join(', ')}`);
  }
  if (new Set(axes).size !== axes.length) throw new Error('Review axes cannot contain duplicates');
}

export function buildCompletedReview(input = {}) {
  if (!input.id || !input.builder || !input.reviewer || input.builder === input.reviewer) {
    throw new Error('Review identity must name an independent reviewer');
  }
  if (!HEAD.test(String(input.headSha ?? '')) ||
      ![input.sourceHash, input.scopeHash, input.reviewPacketHash].every((value) => SHA256.test(String(value ?? '')))) {
    throw new Error('Review source, scope, packet, and HEAD bindings are required');
  }
  requireValidAxes(input.axes);
  if (typeof input.output !== 'string') throw new Error('Review output must be captured text');
  if (!Array.isArray(input.findings)) throw new Error('Review findings must be an array');
  const findings = input.findings.map((finding) => ({ ...finding }));
  return Object.freeze({
    schema: 'verify-until-dry.completed-review.v1', id: input.id,
    builder: input.builder, reviewer: input.reviewer,
    headSha: input.headSha, sourceHash: input.sourceHash, scopeHash: input.scopeHash,
    packetHash: input.reviewPacketHash, axes: Object.freeze([...input.axes]),
    status: 'COMPLETE', output: input.output, outputHash: sha256(input.output),
    findings: Object.freeze(findings), clean: cleanDecision(input.output, findings),
  });
}

export function validateCompletedReviews(reviews, context = {}) {
  const fail = (error) => ({ valid: false, error, reviews: [], vantages: [], findings: [] });
  if (!Array.isArray(reviews)) return fail('completed-reviews-required');
  const reviewers = new Set();
  const vantages = [];
  const findings = [];
  for (const review of reviews) {
    if (review?.schema !== 'verify-until-dry.completed-review.v1' || review.status !== 'COMPLETE') {
      return fail('review-incomplete');
    }
    if (review.builder === review.reviewer || reviewers.has(review.reviewer)) return fail('reviewer-not-independent');
    reviewers.add(review.reviewer);
    if (review.headSha !== context.headSha || review.sourceHash !== context.sourceHash ||
        review.scopeHash !== context.scopeHash || review.packetHash !== context.reviewPacketHash) {
      return fail('review-source-binding-mismatch');
    }
    if (!validAxes(review.axes) || typeof review.output !== 'string' || sha256(review.output) !== review.outputHash) {
      return fail('review-output-integrity-failed');
    }
    if (!Array.isArray(review.findings) || review.clean !== cleanDecision(review.output, review.findings)) {
      return fail('review-decision-mismatch');
    }
    findings.push(...review.findings);
    vantages.push({
      clean: review.clean, headSha: review.headSha, scopeHash: review.scopeHash,
      axes: [...review.axes], reviewId: review.id,
      outputHash: review.outputHash,
    });
  }
  return { valid: true, reviews, vantages, findings };
}

export function validateReviewSet(artifact, context = {}) {
  if (artifact?.schema !== 'verify-until-dry.review-set.v1' || artifact.receiptHash !== context.receiptHash) {
    return { valid: false, error: 'review-set-binding-mismatch', reviews: [], vantages: [], findings: [] };
  }
  return validateCompletedReviews(artifact.reviews, context);
}
