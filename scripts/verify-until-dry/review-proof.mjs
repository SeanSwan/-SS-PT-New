/**
 * @file review-proof.mjs
 * @description Builds and validates output-bound independent review evidence.
 */
import { sha256 } from './ledger.mjs';

const SHA256 = /^[a-f0-9]{64}$/;
const HEAD = /^[a-f0-9]{40}$/;
const SAFE_RELATIVE_PATH = /^(?![A-Za-z]:)(?![\\/])(?!.*(?:^|[\\/])\.\.(?:[\\/]|$)).+/;
export const REVIEW_AXES = Object.freeze([
  'adversarial-security', 'contract-tests', 'cross-platform', 'dynamic-runtime',
  'hostile-logic', 'state-machine', 'static-control-flow', 'user-forward-test',
]);
const ALLOWED_AXES = new Set(REVIEW_AXES);
const REVIEW_ORIGINS = new Set(['kimi-external', 'local-full-scope']);
const KIMI_ALIAS = /kimi|moonshot|openrouter/i;

function normalizeIdentity(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  return /[\p{Cc}\p{Cf}]/u.test(normalized) || !/[\p{L}\p{N}]/u.test(normalized) ? '' : normalized;
}

function identityKey(value) {
  return normalizeIdentity(value).toLowerCase();
}

export function parseReviewDecision(output) {
  const lines = String(output).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (/^VERDICT:\s*REVISE$/i.test(lines[0] ?? '')) return 'REVISE';
  if (!/^VERDICT:\s*CLEAN$/i.test(lines[0] ?? '')) return 'MALFORMED';
  const body = lines.slice(1);
  const noFinding = /^(?:none|no findings|no reproducible findings)\.?$/i;
  return body.length > 0 && body.every((line) => noFinding.test(line)) ? 'CLEAN' : 'MALFORMED';
}

function cleanDecision(output, findings) {
  return parseReviewDecision(output) === 'CLEAN' && findings.length === 0;
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

function normalizePaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return null;
  const normalized = paths.map((path) => String(path).trim().replaceAll('\\', '/'));
  if (normalized.some((path) => !path || !SAFE_RELATIVE_PATH.test(path)) ||
      new Set(normalized).size !== normalized.length) return null;
  return normalized.sort();
}

export function buildCompletedReview(input = {}) {
  const builder = normalizeIdentity(input.builder);
  const reviewer = normalizeIdentity(input.reviewer);
  if (!input.id || !builder || !reviewer || identityKey(builder) === identityKey(reviewer)) {
    throw new Error('Review identity must name an independent reviewer');
  }
  if (!HEAD.test(String(input.headSha ?? '')) ||
      ![input.sourceHash, input.scopeHash, input.reviewPacketHash].every((value) => SHA256.test(String(value ?? '')))) {
    throw new Error('Review source, scope, packet, and HEAD bindings are required');
  }
  requireValidAxes(input.axes);
  if (!REVIEW_ORIGINS.has(input.origin)) throw new Error('Review origin must be bound explicitly');
  if (input.origin === 'kimi-external' && reviewer !== 'kimi-k3') {
    throw new Error('External Kimi evidence requires the canonical reviewer identity');
  }
  if (input.origin === 'local-full-scope' && KIMI_ALIAS.test(reviewer)) {
    throw new Error('Kimi or Moonshot aliases cannot claim local full-scope review');
  }
  const reviewedPaths = normalizePaths(input.reviewedPaths);
  if (!reviewedPaths) throw new Error('Review coverage needs unique safe relative paths');
  if (typeof input.output !== 'string') throw new Error('Review output must be captured text');
  if (!Array.isArray(input.findings)) throw new Error('Review findings must be an array');
  const findings = input.findings.map((finding) => ({ ...finding }));
  return Object.freeze({
    schema: 'verify-until-dry.completed-review.v1', id: input.id,
    builder, reviewer,
    headSha: input.headSha, sourceHash: input.sourceHash, scopeHash: input.scopeHash,
    packetHash: input.reviewPacketHash, axes: Object.freeze([...input.axes]),
    origin: input.origin,
    reviewedPaths: Object.freeze(reviewedPaths),
    status: 'COMPLETE', output: input.output, outputHash: sha256(input.output),
    findings: Object.freeze(findings), clean: cleanDecision(input.output, findings),
  });
}

export function validateCompletedReviews(reviews, context = {}) {
  const fail = (error) => ({ valid: false, error, reviews: [], vantages: [], findings: [],
    coverageComplete: false, uncoveredPaths: [], fullScopeLocalReview: false });
  if (!Array.isArray(reviews)) return fail('completed-reviews-required');
  const scopePaths = normalizePaths(context.scopeContract?.paths ?? ['.']);
  if (!scopePaths) return fail('review-scope-paths-invalid');
  const allowedPaths = new Set(scopePaths);
  const coveredPaths = new Set();
  const reviewers = new Set();
  const vantages = [];
  const findings = [];
  let fullScopeLocalReview = false;
  for (const review of reviews) {
    if (review?.schema !== 'verify-until-dry.completed-review.v1' || review.status !== 'COMPLETE') {
      return fail('review-incomplete');
    }
    const builder = normalizeIdentity(review.builder);
    const reviewer = normalizeIdentity(review.reviewer);
    const reviewerKey = identityKey(reviewer);
    if (!builder || !reviewer || review.builder !== builder || review.reviewer !== reviewer ||
        identityKey(builder) === reviewerKey || reviewers.has(reviewerKey)) {
      return fail('reviewer-not-independent');
    }
    reviewers.add(reviewerKey);
    if (review.headSha !== context.headSha || review.sourceHash !== context.sourceHash ||
        review.scopeHash !== context.scopeHash || review.packetHash !== context.reviewPacketHash) {
      return fail('review-source-binding-mismatch');
    }
    if (!REVIEW_ORIGINS.has(review.origin) ||
        (review.origin === 'kimi-external' && reviewer !== 'kimi-k3') ||
        (review.origin === 'local-full-scope' && KIMI_ALIAS.test(reviewer)) ||
        !validAxes(review.axes) || typeof review.output !== 'string' || sha256(review.output) !== review.outputHash) {
      return fail('review-output-integrity-failed');
    }
    const reviewedPaths = normalizePaths(review.reviewedPaths);
    if (!reviewedPaths || reviewedPaths.some((path) => !allowedPaths.has(path))) {
      return fail('review-path-coverage-invalid');
    }
    reviewedPaths.forEach((path) => coveredPaths.add(path));
    if (!Array.isArray(review.findings) || review.clean !== cleanDecision(review.output, review.findings)) {
      return fail('review-decision-mismatch');
    }
    if (review.clean === true && review.origin === 'local-full-scope' &&
        reviewedPaths.length === scopePaths.length &&
        reviewedPaths.every((path, index) => path === scopePaths[index])) fullScopeLocalReview = true;
    findings.push(...review.findings);
    vantages.push({
      clean: review.clean, headSha: review.headSha, scopeHash: review.scopeHash,
      axes: [...review.axes], reviewId: review.id, origin: review.origin,
      outputHash: review.outputHash,
    });
  }
  const uncoveredPaths = scopePaths.filter((path) => !coveredPaths.has(path));
  return { valid: true, reviews, vantages, findings,
    coverageComplete: uncoveredPaths.length === 0, uncoveredPaths, fullScopeLocalReview };
}

export function validateReviewSet(artifact, context = {}) {
  if (artifact?.schema !== 'verify-until-dry.review-set.v1' || artifact.receiptHash !== context.receiptHash) {
    return { valid: false, error: 'review-set-binding-mismatch', reviews: [], vantages: [], findings: [] };
  }
  return validateCompletedReviews(artifact.reviews, context);
}
