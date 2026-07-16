import { describe, expect, it } from 'vitest';
import {
  buildLegacyProfile,
  mapAchievementTemplateToLegacy,
  mapFallbackAchievementToLegacy,
} from './gamificationMappers';
import { asGamificationCollection } from './gamificationMapperGuards';

const baseRawProfile = {
  userId: 42,
  points: 2500,
  level: 5,
  tier: 'silver_edge',
  streakDays: 12,
  nextLevelProgress: 65,
  nextLevelPoints: 3000,
};

describe('gamificationMappers', () => {
  it('separates spendable wallet points from lifetime progression XP', () => {
    const profile = buildLegacyProfile({
      raw: {
        ...baseRawProfile,
        points: 100,
        lifetimePointsEarned: 2500,
      } as any,
      targetUserId: 42,
      user: null,
    });
    expect(profile.points).toBe(100);
    expect(profile.lifetimePointsEarned).toBe(2500);
    expect(profile.nextLevelPoints).toBeGreaterThan(2500);
  });
  it('normalizes malformed profile collections to arrays', () => {
    const profile = buildLegacyProfile({
      raw: {
        ...baseRawProfile,
        userAchievements: { success: false, message: 'private achievement failure' },
        rewards: { success: false, message: 'private reward failure' },
        milestones: { success: false, message: 'private milestone failure' },
        recentTransactions: { success: false, message: 'private transaction failure' },
      } as any,
      targetUserId: 42,
      user: null,
    });

    expect(profile.achievements).toEqual([]);
    expect(profile.rewards).toEqual([]);
    expect(profile.milestones).toEqual([]);
    expect(profile.recentTransactions).toEqual([]);
    expect(JSON.stringify(profile)).not.toContain('private');
  });

  it('preserves safe rank title payload fields and drops malformed rows', () => {
    const profile = buildLegacyProfile({
      raw: {
        ...baseRawProfile,
        selectedRankTitleKey: 'first_flight',
        selectedRankTitleDisplay: { key: 'first_flight', name: 'First Flight', rankNumber: 1, label: 'Rank 01 | First Flight', minLevel: 1, maxLevel: 10, levelRange: '1-10', earned: true, isSelected: true },
        currentRankTitleDisplay: { key: 'swan_initiate', name: 'Swan Initiate', rankNumber: 2, label: 'Rank 02 | Swan Initiate', minLevel: 11, maxLevel: 20, levelRange: '11-20', earned: true, isCurrent: true },
        earnedRankTitleCount: 2,
        rankTitles: [
          { key: 'first_flight', name: 'First Flight', rankNumber: 1, label: 'Rank 01 | First Flight', minLevel: 1, maxLevel: 10, levelRange: '1-10', earned: true },
          { key: { raw: 'private-key' }, name: 'Spoofed', rankNumber: 2, minLevel: 11, maxLevel: 20, levelRange: '11-20' },
        ],
        upcomingProgressionBeats: [
          { key: 'rank-title-swan-initiate', level: 11, type: 'rank_title', label: 'Rank Title Unlock', reward: 'Equip Swan Initiate', description: 'A new public Swan title becomes available for the profile tag.', intensity: 'title', pointsRequired: 12100, pointsRemaining: 9600, levelsAway: 6 },
          { key: { raw: 'private-beat' }, level: 15, type: 'momentum', label: 'Momentum Checkpoint', reward: 'Leaked', description: 'private-description', intensity: 'pulse' },
          { key: 'missing-points', level: 15, type: 'momentum', label: 'Momentum Checkpoint', reward: 'Missing points', description: 'No real target', intensity: 'pulse' },
        ],
        nextMajorProgressionBeat: { key: 'rank-title-swan-initiate', level: 11, type: 'rank_title', label: 'Rank Title Unlock', reward: 'Equip Swan Initiate', description: 'A new public Swan title becomes available for the profile tag.', intensity: 'title', pointsRequired: 12100, pointsRemaining: 9600, levelsAway: 6 },
      } as any,
      targetUserId: 42,
      user: null,
    });

    expect(profile.selectedRankTitleKey).toBe('first_flight');
    expect(profile.selectedRankTitleDisplay).toMatchObject({ label: 'Rank 01 | First Flight' });
    expect(profile.currentRankTitleDisplay).toMatchObject({ key: 'swan_initiate' });
    expect(profile.earnedRankTitleCount).toBe(2);
    expect(profile.rankTitles).toHaveLength(1);
    expect(profile.upcomingProgressionBeats).toHaveLength(1);
    expect(profile.upcomingProgressionBeats?.[0]).toMatchObject({
      level: 11,
      type: 'rank_title',
      reward: 'Equip Swan Initiate',
      pointsRemaining: 9600,
    });
    expect(profile.nextMajorProgressionBeat).toMatchObject({ type: 'rank_title', label: 'Rank Title Unlock' });
    expect(JSON.stringify(profile)).not.toContain('private-key');
    expect(JSON.stringify(profile)).not.toContain('private-beat');
    expect(JSON.stringify(profile)).not.toContain('Missing points');
  });
  it('preserves valid profile collections', () => {
    const profile = buildLegacyProfile({
      raw: {
        ...baseRawProfile,
        userAchievements: [
          {
            id: 'ua-1',
            achievementId: 'ach-1',
            progress: 1,
            maxProgress: 1,
            isCompleted: true,
            earnedAt: '2026-06-20T00:00:00.000Z',
            pointsAwarded: 100,
            achievement: { id: 'ach-1', name: 'Logged Workout', xpReward: 100 },
          },
        ],
        rewards: [{ id: 'reward-1', name: 'Recovery Credit' }],
        milestones: [{ id: 'milestone-1', milestoneId: 'm-1' }],
        recentTransactions: [{ id: 'tx-1', points: 100, description: 'Workout approved' }],
      } as any,
      targetUserId: 42,
      user: null,
    });

    expect(profile.achievements).toHaveLength(1);
    expect(profile.rewards).toHaveLength(1);
    expect(profile.milestones).toHaveLength(1);
    expect(profile.recentTransactions).toHaveLength(1);
  });

  it('does not synthesize achievement earnedAt from the current clock', () => {
    const profile = buildLegacyProfile({
      raw: {
        ...baseRawProfile,
        userAchievements: [
          {
            id: 'ua-no-earned-date',
            achievementId: 'ach-no-earned-date',
            progress: 1,
            maxProgress: 1,
            isCompleted: true,
            pointsAwarded: 100,
            achievement: { id: 'ach-no-earned-date', name: 'No Date Badge', xpReward: 100 },
          },
          {
            id: 'ua-bad-earned-date',
            achievementId: 'ach-bad-earned-date',
            earnedAt: 'not-a-real-date',
            progress: 1,
            maxProgress: 1,
            isCompleted: true,
            pointsAwarded: 100,
            achievement: { id: 'ach-bad-earned-date', name: 'Bad Date Badge', xpReward: 100 },
          },
          {
            id: 'ua-impossible-earned-date',
            achievementId: 'ach-impossible-earned-date',
            earnedAt: '2026-02-30T00:00:00.000Z',
            progress: 1,
            maxProgress: 1,
            isCompleted: true,
            pointsAwarded: 100,
            achievement: { id: 'ach-impossible-earned-date', name: 'Impossible Date Badge', xpReward: 100 },
          },
        ],
      } as any,
      targetUserId: 42,
      user: null,
    });

    expect(profile.achievements).toHaveLength(3);
    expect(profile.achievements[0].earnedAt).toBe('');
    expect(profile.achievements[1].earnedAt).toBe('');
    expect(profile.achievements[2].earnedAt).toBe('');
    expect(profile.achievements[0].earnedAt).not.toMatch(/\\d{4}-\\d{2}-\\d{2}T/);
    expect(profile.achievements[1].earnedAt).not.toContain('not-a-real-date');
    expect(profile.achievements[2].earnedAt).not.toContain('2026-02-30');
  });

  it('drops malformed profile achievement rows before legacy UI state', () => {
    const profile = buildLegacyProfile({
      raw: {
        ...baseRawProfile,
        recentAchievements: [
          null,
          {
            id: { raw: 'private-user-achievement-id' },
            achievementId: { raw: 'private-achievement-id' },
            progress: [1],
            maxProgress: [10],
            pointsAwarded: { raw: 100 },
            achievement: {
              name: { raw: 'private-name' },
              description: { raw: 'private-description' },
              iconEmoji: { raw: 'private-icon' },
            },
          },
          {
            id: 'ua-safe',
            achievementId: 'ach-safe',
            progress: '3',
            maxProgress: '10',
            isCompleted: true,
            earnedAt: '2026-06-20T00:00:00.000Z',
            pointsAwarded: '125',
            achievement: {
              id: 'ach-safe',
              name: 'Bench Press Milestone',
              description: 'Hit the next strength marker',
              iconEmoji: 'Trophy',
              xpReward: '125',
              requiredPoints: '10',
              category: 'fitness',
            },
          },
        ],
      } as any,
      targetUserId: 42,
      user: null,
    });

    expect(profile.achievements).toHaveLength(1);
    expect(profile.achievements[0]).toMatchObject({
      id: 'ua-safe',
      achievementId: 'ach-safe',
      progress: 3,
      isCompleted: true,
      pointsAwarded: 125,
      achievement: {
        id: 'ach-safe',
        name: 'Bench Press Milestone',
        description: 'Hit the next strength marker',
        pointValue: 125,
        requirementType: 'fitness',
        requirementValue: 10,
      },
    });
    expect(JSON.stringify(profile)).not.toContain('private');
  });

  it('drops achievement template rows without a safe primitive id', () => {
    const mapped = mapAchievementTemplateToLegacy({
      id: { raw: 'private-object-id' },
      name: 'Workout Vanguard',
      xpReward: 250,
    });

    expect(mapped).toBeNull();
  });

  it('sanitizes malformed achievement template row fields before UI state', () => {
    const mapped = mapAchievementTemplateToLegacy({
      id: 'achievement-1',
      name: { raw: 'private-name' },
      title: '[object Object]',
      description: { raw: 'private-description' },
      iconEmoji: { raw: 'private-icon' },
      iconUrl: { raw: 'private-url' },
      category: { raw: 'private-category' },
      skillTree: { raw: 'private-skill-tree' },
      xpReward: [500],
      pointValue: { raw: 300 },
      requiredPoints: [10],
      rarity: { raw: 'private-rarity' },
    });

    expect(mapped).toMatchObject({
      id: 'achievement-1',
      name: 'Achievement',
      description: '',
      icon: 'Trophy',
      pointValue: 0,
      requirementType: 'milestone',
      requirementValue: 0,
      tier: 'bronze',
      isActive: true,
    });
    expect(JSON.stringify(mapped)).not.toContain('private');
    expect(JSON.stringify(mapped)).not.toContain('[object Object]');
  });

  it('rejects non-decimal numeric strings before mapping gamification values', () => {
    const mapped = mapAchievementTemplateToLegacy({
      id: 'achievement-hex',
      name: 'Malformed XP Badge',
      xpReward: '0x10',
      requiredPoints: '1e2',
    });

    const leaderboardRows = asGamificationCollection<Record<string, unknown>>(
      {
        leaderboard: [
          { points: '0x10', displayName: 'Spoofed row' },
          { points: '100', displayName: 'Valid row' },
        ],
      },
      'leaderboard',
      { numberKeys: ['points'] }
    );

    expect(mapped?.pointValue).toBe(0);
    expect(mapped?.requirementValue).toBe(0);
    expect(leaderboardRows).toHaveLength(1);
    expect(leaderboardRows[0].displayName).toBe('Valid row');
  });

  it('drops fallback achievement rows without a safe primitive id', () => {
    const mapped = mapFallbackAchievementToLegacy({
      id: { raw: 'private-fallback-id' },
      name: 'Legacy Badge',
    });

    expect(mapped).toBeNull();
  });
});
