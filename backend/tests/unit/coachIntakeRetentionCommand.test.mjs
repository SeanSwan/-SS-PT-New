/**
 * coachIntakeRetentionCommand.test.mjs
 * ====================================
 * Locks the read-only Swan Coach command that reports raw artifact retention
 * health without returning encrypted payloads, transcripts, or client names.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../services/coachIntakeRetentionPolicyService.mjs', () => ({
  getCoachIntakeRetentionReport: vi.fn(),
}));
vi.mock('../../services/coachIntakeRetentionPurgeService.mjs', () => ({
  purgeCoachIntakeRawArtifacts: vi.fn(),
}));

import { getCoachIntakeRetentionReport } from '../../services/coachIntakeRetentionPolicyService.mjs';
import { purgeCoachIntakeRawArtifacts } from '../../services/coachIntakeRetentionPurgeService.mjs';
import {
  dispatchViewCoachIntakeRetention,
  dispatchViewCoachIntakeRetentionPurgePlan,
} from '../../services/ai/dispatchers/coachIntakeRetentionDispatcher.mjs';

describe('Coach intake retention command dispatcher', () => {
  const sequelizeOverride = { query: vi.fn() };

  beforeEach(() => {
    vi.mocked(getCoachIntakeRetentionReport).mockReset();
    vi.mocked(purgeCoachIntakeRawArtifacts).mockReset();
  });

  it('returns a flat PII-safe retention summary for admin and trainer command cards', async () => {
    vi.mocked(getCoachIntakeRetentionReport).mockResolvedValue({
      schemaReady: true,
      status: 'attention',
      policy: {
        appliedRawArtifactGraceHours: 24,
        failedRawArtifactGraceDays: 7,
        staleReviewQueueDays: 30,
      },
      summary: {
        totalWithRawArtifacts: 5,
        purgeReady: 2,
        reviewRequired: 1,
        retained: 2,
      },
      nextOperatorAction: {
        key: 'review_purge_candidates',
        label: 'Review raw artifact purge candidates',
      },
      items: [{ transcript: 'Do Not Return', clientName: 'Do Not Return' }],
    });

    const result = await dispatchViewCoachIntakeRetention(
      {},
      { user: { id: 42, role: 'admin' }, options: { sequelize: sequelizeOverride } },
    );

    expect(getCoachIntakeRetentionReport).toHaveBeenCalledWith({
      userId: 42,
      sequelizeOverride,
    });
    expect(result).toEqual({
      retentionStatus: 'attention',
      schemaReady: true,
      totalWithRawArtifacts: 5,
      purgeReady: 2,
      reviewRequired: 1,
      retained: 2,
      appliedRawArtifactGraceHours: 24,
      failedRawArtifactGraceDays: 7,
      staleReviewQueueDays: 30,
      nextActionKey: 'review_purge_candidates',
      nextActionLabel: 'Review raw artifact purge candidates',
      retentionRoute: '/dashboard/admin/coach-assistant',
      queueRoute: '/dashboard/admin/coach-assistant',
      commandHint: 'Open the Swan Coach workspace to review retention candidates before any purge job is enabled.',
    });
    expect(JSON.stringify(result)).not.toMatch(/Do Not Return|clientName|transcript|items/i);
  });

  it('rejects client-role retention commands before reading the report', async () => {
    await expect(dispatchViewCoachIntakeRetention(
      {},
      { user: { id: 12, role: 'client' }, options: { sequelize: sequelizeOverride } },
    )).rejects.toThrow(/requires an admin or trainer role/i);

    expect(getCoachIntakeRetentionReport).not.toHaveBeenCalled();
  });

  it('returns a dry-run-only purge plan without candidate ids or artifact details', async () => {
    vi.mocked(purgeCoachIntakeRawArtifacts).mockResolvedValue({
      enabled: true,
      dryRun: true,
      schemaReady: true,
      generatedAt: '2026-05-07T10:00:00.000Z',
      purgeReady: 3,
      purged: 0,
      skippedReason: null,
      candidateIds: ['a1', 'b2', 'c3'],
      items: [{ transcript: 'Do Not Return', clientName: 'Do Not Return' }],
      summary: {
        totalWithRawArtifacts: 9,
        purgeReady: 3,
        reviewRequired: 2,
        retained: 4,
      },
    });

    const result = await dispatchViewCoachIntakeRetentionPurgePlan(
      {},
      { user: { id: 42, role: 'trainer' }, options: { sequelize: sequelizeOverride } },
    );

    expect(purgeCoachIntakeRawArtifacts).toHaveBeenCalledWith({
      userId: 42,
      dryRun: true,
      sequelizeOverride,
    });
    expect(result).toEqual({
      cleanupEnabled: true,
      cleanupDryRun: true,
      schemaReady: true,
      totalWithRawArtifacts: 9,
      purgeReady: 3,
      reviewRequired: 2,
      retained: 4,
      purged: 0,
      skippedReason: 'none',
      cleanupRoute: '/dashboard/trainer/coach-assistant',
      queueRoute: '/dashboard/trainer/coach-assistant',
      commandHint: 'This is a dry-run cleanup plan. No raw artifacts are purged from a Swan Coach command.',
    });
    expect(JSON.stringify(result)).not.toMatch(/candidateIds|items|clientName|transcript|Do Not Return|a1|b2|c3/i);
  });

  it('rejects client-role purge-plan commands before reading the purge service', async () => {
    await expect(dispatchViewCoachIntakeRetentionPurgePlan(
      {},
      { user: { id: 12, role: 'client' }, options: { sequelize: sequelizeOverride } },
    )).rejects.toThrow(/requires an admin or trainer role/i);

    expect(purgeCoachIntakeRawArtifacts).not.toHaveBeenCalled();
  });
});
