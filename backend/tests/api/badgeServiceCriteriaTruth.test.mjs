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

  it('matches social engagement badges by social action', async () => {
    const result = await badgeService.evaluateBadgeCriteria(
      'user-1',
      { criteriaType: 'social_engagement', criteria: { action: 'comment_created' } },
      { type: 'social_action', socialAction: 'comment_created' }
    );

    expect(result).toBe(true);
  });

  it('requires social engagement count when action-specific criteria include a threshold', async () => {
    const result = await badgeService.evaluateBadgeCriteria(
      'user-1',
      { criteriaType: 'social_engagement', criteria: { action: 'comment_created', count: 10 } },
      { type: 'social_action', socialAction: 'comment_created', count: 1 }
    );

    expect(result).toBe(false);
  });

  it('matches milestone badges by milestone id or name', async () => {
    const result = await badgeService.evaluateBadgeCriteria(
      'user-1',
      { criteriaType: 'milestone_reached', criteria: { milestoneId: 12 } },
      { type: 'milestone_reached', milestoneIds: [10, 12], milestoneNames: ['First Flight'] }
    );

    expect(result).toBe(true);
  });

  it('matches admin-assigned custom achievement badges by achievement target', async () => {
    const result = await badgeService.evaluateBadgeCriteria(
      'user-1',
      {
        criteriaType: 'custom_criteria',
        criteria: { assignment: { assignedTo: 'achievement', assignedTarget: 'Iron Will' } }
      },
      { type: 'achievement_earned', achievementId: 'iron-will', achievementNames: ['Iron Will'] }
    );

    expect(result).toBe(true);
  });

  it('matches admin-assigned custom milestone badges by milestone target', async () => {
    const result = await badgeService.evaluateBadgeCriteria(
      'user-1',
      {
        criteriaType: 'custom_criteria',
        criteria: { assignment: { assignedTo: 'milestone', assignedTarget: 'first_60min' } }
      },
      { type: 'milestone_reached', milestoneIds: ['first_60min'], milestoneNames: ['First 60 Minute Session'] }
    );

    expect(result).toBe(true);
  });

  it('does not auto-award tab icon custom badge assignments', async () => {
    const result = await badgeService.evaluateBadgeCriteria(
      'user-1',
      {
        criteriaType: 'custom_criteria',
        criteria: { assignment: { assignedTo: 'tab', assignedTarget: 'progress' } }
      },
      { type: 'milestone_reached', milestoneIds: ['progress'], milestoneNames: ['Progress'] }
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
        bind: ['exercise_completion', 'custom_criteria']
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

  it('includes custom assignment badges for achievement-earned events', async () => {
    const querySpy = vi.spyOn(sequelize, 'query').mockResolvedValue([
      {
        id: 'badge-achievement',
        name: 'Iron Will Badge',
        criteriaType: 'custom_criteria',
        criteria: '{"assignment":{"assignedTo":"achievement","assignedTarget":"Iron Will"}}',
        rewards: '{"points":50}'
      }
    ]);

    const badges = await badgeService.getEligibleBadges('achievement_earned');

    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('"criteriaType" IN ($1)'),
      expect.objectContaining({
        type: QueryTypes.SELECT,
        bind: ['custom_criteria']
      })
    );
    expect(badges).toEqual([
      expect.objectContaining({
        id: 'badge-achievement',
        criteria: { assignment: { assignedTo: 'achievement', assignedTarget: 'Iron Will' } }
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

  it('keeps hidden earned badges out of normal user badge reads unless explicitly requested', async () => {
    const querySpy = vi.spyOn(sequelize, 'query').mockResolvedValue([]);

    await badgeService.getUserBadges(7);

    expect(querySpy.mock.calls[0][0]).toContain('ub."isDisplayed" = true');

    querySpy.mockClear();

    await badgeService.getUserBadges(7, { includeHidden: true });

    expect(querySpy.mock.calls[0][0]).not.toContain('ub."isDisplayed" = true');
  });

  it('updates public display only for badges the user has earned', async () => {
    const querySpy = vi.spyOn(sequelize, 'query').mockResolvedValue([
      { id: 'user-badge-1', userId: 7, badgeId: 'badge-uuid', isDisplayed: false }
    ]);

    await expect(
      badgeService.setUserBadgeDisplay({ userId: 7, badgeId: 'badge-uuid', isDisplayed: false })
    ).resolves.toMatchObject({ id: 'user-badge-1', isDisplayed: false });

    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "UserBadges"'),
      expect.objectContaining({
        type: QueryTypes.SELECT,
        bind: [7, 'badge-uuid', false]
      })
    );
  });

  it('rejects display changes for unearned badges', async () => {
    vi.spyOn(sequelize, 'query').mockResolvedValue([]);

    await expect(
      badgeService.setUserBadgeDisplay({ userId: 7, badgeId: 'badge-uuid', isDisplayed: true })
    ).rejects.toMatchObject({ code: 'BADGE_NOT_EARNED' });
  });

  it('rejects non-boolean display changes before writing user badge state', async () => {
    const querySpy = vi.spyOn(sequelize, 'query').mockResolvedValue([]);

    await expect(
      badgeService.setUserBadgeDisplay({ userId: 7, badgeId: 'badge-uuid', isDisplayed: 'true' })
    ).rejects.toMatchObject({ code: 'BADGE_DISPLAY_INVALID' });

    expect(querySpy).not.toHaveBeenCalled();
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
