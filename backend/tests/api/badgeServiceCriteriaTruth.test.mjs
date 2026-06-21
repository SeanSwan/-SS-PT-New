import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QueryTypes } from 'sequelize';
import { afterEach, describe, expect, it, vi } from 'vitest';
import sequelize from '../../database.mjs';

const mocks = vi.hoisted(() => ({
  recordLedgerEntry: vi.fn()
}));

vi.mock('../../services/gamification/GamificationPointsService.mjs', () => ({
  default: {
    recordLedgerEntry: mocks.recordLedgerEntry
  }
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { default: badgeService } = await import('../../services/badgeService.mjs');

describe('badge service criteria truth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.recordLedgerEntry.mockReset();
  });

  it('does not randomly award badges', () => {
    const source = readFileSync(resolve(__dirname, '../../services/badgeService.mjs'), 'utf8');

    expect(source).not.toContain('Math.random');
    expect(source).toContain('evaluateBadgeCriteria');
  });

  it('matches exercise criteria deterministically', async () => {
    const result = await badgeService.evaluateBadgeCriteria(
      'user-1',
      { criteriaType: 'exercise_completion', criteria: { exerciseId: 'squat' } },
      { type: 'exercise_completion', exerciseId: 'squat' }
    );

    expect(result).toBe(true);
  });

  it('fails closed when badge criteria are missing', async () => {
    const result = await badgeService.evaluateBadgeCriteria(
      'user-1',
      { criteriaType: 'challenge_completion', criteria: {} },
      { type: 'challenge_completion', completed: true }
    );

    expect(result).toBe(false);
  });

  it('normalizes Sequelize SELECT array results for eligible badge checks', async () => {
    const querySpy = vi.spyOn(sequelize, 'query').mockResolvedValue([
      {
        id: 'badge-1',
        name: 'Squat Starter',
        criteriaType: 'exercise_completion',
        criteria: '{"exerciseId":"squat"}',
        rewards: '{"points":25}'
      }
    ]);

    const badges = await badgeService.getEligibleBadges('exercise_completion');

    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('FROM "Badges"'),
      expect.objectContaining({
        type: QueryTypes.SELECT,
        bind: ['exercise_completion']
      })
    );
    expect(badges).toEqual([
      expect.objectContaining({
        id: 'badge-1',
        criteria: { exerciseId: 'squat' },
        rewards: { points: 25 }
      })
    ]);
  });

  it('normalizes Sequelize SELECT array results for existing user badge checks', async () => {
    vi.spyOn(sequelize, 'query').mockResolvedValue([{ count: '1' }]);

    await expect(badgeService.userHasBadge('user-1', 'badge-1')).resolves.toBe(true);
  });

  it('awards badge reward points through the central idempotent point ledger', async () => {
    mocks.recordLedgerEntry.mockResolvedValue({ pointsAwarded: 75, newBalance: 275, duplicate: false });

    await badgeService.applyBadgeRewards(7, {
      id: 'badge-uuid',
      rewards: { points: 75 }
    });

    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      points: 75,
      transactionType: 'bonus',
      source: 'achievement_earned',
      sourceId: null,
      description: 'Badge reward points',
      metadata: expect.objectContaining({
        reason: 'badge_earned',
        badgeId: 'badge-uuid',
        rewardSource: 'badge_earned'
      }),
      awardedBy: null,
      idempotencyKey: 'badge:7:badge-uuid',
      maxPoints: 500
    }));
  });

  it('rejects malformed badge reward point values before the ledger', async () => {
    await badgeService.applyBadgeRewards(7, {
      id: 'badge-uuid',
      rewards: { points: '75xp' }
    });

    expect(mocks.recordLedgerEntry).not.toHaveBeenCalled();
  });

  it('fails closed instead of returning a fake badge image CDN URL', async () => {
    const source = readFileSync(resolve(__dirname, '../../services/badgeService.mjs'), 'utf8');
    const controllerSource = readFileSync(resolve(__dirname, '../../controllers/badgeController.mjs'), 'utf8');

    expect(source).not.toContain('cdn.example.com');
    expect(controllerSource).toContain('BADGE_IMAGE_STORAGE_NOT_CONFIGURED');
    expect(controllerSource).toContain('res.status(501)');
    await expect(
      badgeService.uploadBadgeImage(Buffer.from('image'), 'Sample Badge')
    ).rejects.toMatchObject({
      code: 'BADGE_IMAGE_STORAGE_NOT_CONFIGURED'
    });
  });
});
