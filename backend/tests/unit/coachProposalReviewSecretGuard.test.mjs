import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import {
  createProposalReviewToken,
  verifyProposalReviewToken,
} from '../../services/ai/coachProposalReviewTokenService.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const source = readFileSync(join(repoRoot, 'backend/services/ai/coachProposalReviewTokenService.mjs'), 'utf8');

const reviewRequiredRow = {
  id: 'proposal-1',
  proposal_type: 'workout_log',
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('coach proposal review secret guard', () => {
  it('does not fall back to SESSION_SECRET for proposal review HMAC tokens', () => {
    expect(source).toContain('jwtSecretGuard.mjs');
    expect(source).toContain('getJwtSecret()');
    expect(source).not.toContain('process.env.JWT_SECRET || process.env.SESSION_SECRET');
  });

  it('disables review tokens when JWT_SECRET is a known placeholder even if SESSION_SECRET exists', () => {
    vi.stubEnv('JWT_SECRET', 'your-production-jwt-secret-key-here-change-this');
    vi.stubEnv('SESSION_SECRET', 'session-secret-must-not-sign-review-tokens');

    expect(createProposalReviewToken({ row: reviewRequiredRow, userId: 7 })).toBeNull();
    expect(verifyProposalReviewToken({
      token: 'review-v1.payload.signature',
      row: reviewRequiredRow,
      userId: 7,
    })).toEqual({ ok: false, code: 'PROPOSAL_REVIEW_TOKEN_UNAVAILABLE' });
  });
});
