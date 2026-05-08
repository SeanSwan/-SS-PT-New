/**
 * coachIntakeRetentionPurgePlanHandler.test.mjs
 * =============================================
 * Locks the HTTP-facing retention purge plan as a dry-run-only, PII-safe
 * operator endpoint.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/coachIntakeRetentionPurgeService.mjs', () => ({
  purgeCoachIntakeRawArtifacts: vi.fn(),
}));

import { purgeCoachIntakeRawArtifacts } from '../../services/coachIntakeRetentionPurgeService.mjs';
import { getCoachIntakeRetentionPurgePlanHandler } from '../../controllers/coachIntakeController.mjs';

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('getCoachIntakeRetentionPurgePlanHandler', () => {
  beforeEach(() => {
    vi.mocked(purgeCoachIntakeRawArtifacts).mockReset();
  });

  it('returns a dry-run purge plan without leaking internal candidate ids', async () => {
    vi.mocked(purgeCoachIntakeRawArtifacts).mockResolvedValue({
      enabled: false,
      dryRun: true,
      schemaReady: true,
      generatedAt: '2026-05-07T13:00:00.000Z',
      policy: { appliedRawArtifactGraceHours: 24 },
      summary: { totalWithRawArtifacts: 3, purgeReady: 2, reviewRequired: 1, retained: 0 },
      purgeReady: 2,
      purged: 0,
      candidateIds: ['11111111-1111-4111-8111-111111111111'],
      skippedReason: 'disabled',
    });
    const res = response();

    await getCoachIntakeRetentionPurgePlanHandler({ user: { id: 42 } }, res);

    expect(purgeCoachIntakeRawArtifacts).toHaveBeenCalledWith({
      userId: 42,
      dryRun: true,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      purgePlan: {
        enabled: false,
        dryRun: true,
        schemaReady: true,
        purgeReady: 2,
        purged: 0,
        skippedReason: 'disabled',
      },
    });
    expect(res.body.purgePlan.candidateIds).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/11111111-1111-4111-8111-111111111111|payload_cipher|transcript|clientName/i);
  });

  it('rejects unauthenticated reads before invoking the purge service', async () => {
    const res = response();

    await getCoachIntakeRetentionPurgePlanHandler({ user: null }, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'AUTH_REQUIRED' },
    });
    expect(purgeCoachIntakeRawArtifacts).not.toHaveBeenCalled();
  });
});
