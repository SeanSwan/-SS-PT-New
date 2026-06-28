/**
 * coachProposalReviewTokenService.mjs
 * ===================================
 * Stateless detail-review token for Coach proposal approvals.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getJwtSecret, isJwtSecretConfigurationError } from '../../utils/jwtSecretGuard.mjs';

const VERSION = 'review-v1';
const TOKEN_TTL_MS = 30 * 60 * 1000;
const REVIEW_REQUIRED_TYPES = new Set([
  'client_onboarding',
  'client_profile_coverage_update',
  'workout_log',
  'nutrition_log',
  'client_data_update',
  'frontend_dispatch',
  'split_plan',
]);

function reviewSecret() {
  try {
    return getJwtSecret();
  } catch (error) {
    if (isJwtSecretConfigurationError(error)) return null;
    throw error;
  }
}

function signPayload(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function proposalRequiresDetailReview(proposalType) {
  return REVIEW_REQUIRED_TYPES.has(proposalType);
}

export function createProposalReviewToken({ row, userId, now = Date.now() }) {
  if (!proposalRequiresDetailReview(row?.proposal_type)) return null;
  const secret = reviewSecret();
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({
    version: VERSION,
    proposalId: row.id,
    userId,
    proposalType: row.proposal_type,
    status: 'PENDING',
    issuedAt: now,
  }), 'utf8').toString('base64url');
  return `${VERSION}.${payload}.${signPayload(payload, secret)}`;
}

export function verifyProposalReviewToken({ token, row, userId, now = Date.now() }) {
  if (!proposalRequiresDetailReview(row?.proposal_type)) return { ok: true };
  const secret = reviewSecret();
  if (!secret) return { ok: false, code: 'PROPOSAL_REVIEW_TOKEN_UNAVAILABLE' };
  if (typeof token !== 'string' || !token.trim()) {
    return { ok: false, code: 'PROPOSAL_DETAIL_REVIEW_REQUIRED' };
  }
  const [version, payload, signature] = token.split('.');
  if (version !== VERSION || !payload || !signature || !safeEqual(signature, signPayload(payload, secret))) {
    return { ok: false, code: 'PROPOSAL_DETAIL_REVIEW_REQUIRED' };
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const valid = parsed.version === VERSION
      && parsed.proposalId === row.id
      && Number(parsed.userId) === Number(userId)
      && parsed.proposalType === row.proposal_type
      && parsed.status === 'PENDING'
      && Number.isFinite(Number(parsed.issuedAt))
      && Number(parsed.issuedAt) <= now
      && now - Number(parsed.issuedAt) <= TOKEN_TTL_MS;
    return valid ? { ok: true } : { ok: false, code: 'PROPOSAL_DETAIL_REVIEW_REQUIRED' };
  } catch {
    return { ok: false, code: 'PROPOSAL_DETAIL_REVIEW_REQUIRED' };
  }
}

export default {
  createProposalReviewToken,
  proposalRequiresDetailReview,
  verifyProposalReviewToken,
};
