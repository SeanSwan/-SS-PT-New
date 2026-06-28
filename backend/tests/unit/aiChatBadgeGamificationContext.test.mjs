/**
 * aiChatService badge gamification context tests.
 *
 * Locks the Swan Coach / AI hive bridge so earned badge rewards from the
 * admin-editable Badge Creator system are visible in coach context while badge
 * image storage URLs stay out of the LLM prompt.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getExerciseHistoryFromLogsMock } = vi.hoisted(() => ({
  getExerciseHistoryFromLogsMock: vi.fn(),
}));

vi.mock('../../services/analyticsExerciseHistoryService.mjs', () => ({
  getExerciseHistoryFromLogs: getExerciseHistoryFromLogsMock,
}));

import { enrichWithUserData } from '../../services/aiChatService.mjs';

function createBadgeAwareSequelize(badges = [], { includeGamification = true } = {}) {
  const sqls = [];
  return {
    QueryTypes: { SELECT: 'SELECT' },
    sqls,
    async query(sql) {
      sqls.push(sql);
      if (sql.includes('"firstName"') && sql.includes('FROM "Users"')) {
        return [{ firstName: 'Dana', lastName: 'Rivers', email: 'dana@example.com', phone: '555-0100' }];
      }
      if (sql.includes('"healthConcerns"') && sql.includes('"trainingExperience"')) {
        return [{
          role: 'client',
          createdAt: '2026-01-01',
          fitnessGoal: 'strength',
          healthConcerns: null,
          trainingExperience: 'intermediate',
          availableSessions: 4,
          clientSource: 'swanstudios',
          accountStatus: 'active',
        }];
      }
      if (includeGamification && sql.includes('u."experiencePoints"') && sql.includes('u.level')) {
        return [{ experiencePoints: 2400, level: 34, tier: 'legacy_bronze' }];
      }
      if (sql.includes('FROM "UserBadges"')) {
        return badges;
      }
      return [];
    },
  };
}

describe('aiChatService badge gamification context', () => {
  beforeEach(() => {
    getExerciseHistoryFromLogsMock.mockReset();
    getExerciseHistoryFromLogsMock.mockResolvedValue({ exercises: [] });
  });

  it('adds displayed earned badge rewards to Swan Coach context without image URLs', async () => {
    const sequelize = createBadgeAwareSequelize([
      {
        name: 'Apex Pond Guardian',
        description: 'Protected a thirty day workout streak.',
        category: 'general',
        difficulty: 'expert',
        collectionName: 'Swan Milestones',
        rewards: { points: 500 },
        criteria: { source: 'badge_upload', assignment: { assignedTo: 'milestone', assignedTarget: '30-day-streak' } },
        earningType: 'manual',
        earnedAt: '2026-06-20T10:00:00.000Z',
        imageUrl: 'https://private-r2.example.com/badges/apex-pond-guardian.png',
      },
      {
        name: 'Sapphire Flight Crew',
        description: 'Completed the team challenge.',
        category: 'endurance',
        difficulty: 'advanced',
        collectionName: 'Team Flight',
        rewards: JSON.stringify({ points: 350 }),
        criteria: JSON.stringify({ source: 'badge_creator', assignment: { assignedTo: 'achievement', assignedTarget: 'team-challenge' } }),
        earningType: 'automatic',
        earnedAt: '2026-06-15T10:00:00.000Z',
        imageUrl: 'https://private-r2.example.com/badges/sapphire-flight-crew.png',
      },
    ]);

    const context = await enrichWithUserData(42, 'trainer', 'coach_assistant', sequelize);

    expect(context).toContain('--- BADGE REWARDS ---');
    expect(context).toContain('Earned/displayed: 2');
    expect(context).toContain('Apex Pond Guardian [expert/general, manual] - 500 XP');
    expect(context).toContain('Assignment: milestone:30-day-streak');
    expect(context).toContain('Sapphire Flight Crew [advanced/endurance, automatic] - 350 XP');
    expect(context).not.toContain('private-r2.example.com');
    expect(context).not.toContain('imageUrl');
  });

  it('keeps badge rewards visible even when the XP row is unavailable', async () => {
    const sequelize = createBadgeAwareSequelize([
      {
        name: 'Forest Tempo Sentinel',
        category: 'endurance',
        difficulty: 'advanced',
        rewards: { points: 275 },
        criteria: { source: 'badge_creator' },
        earningType: 'automatic',
      },
    ], { includeGamification: false });

    const context = await enrichWithUserData(42, 'client', 'general', sequelize);

    expect(context).toContain('--- BADGE REWARDS ---');
    expect(context).toContain('Forest Tempo Sentinel [advanced/endurance, automatic] - 275 XP');
    expect(context).not.toContain('--- GAMIFICATION ---');
  });
  it('fetches displayed user badges through the canonical UserBadges to Badges join', async () => {
    const sequelize = createBadgeAwareSequelize([]);

    await enrichWithUserData(42, 'client', 'general', sequelize);

    const badgeSql = sequelize.sqls.find(sql => sql.includes('FROM "UserBadges"'));
    expect(badgeSql).toContain('JOIN "Badges" b ON ub."badgeId" = b.id');
    expect(badgeSql).toContain('ub."isDisplayed" = true');
    expect(badgeSql).not.toContain('"imageUrl"');
  });
});