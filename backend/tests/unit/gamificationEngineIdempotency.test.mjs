import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const mocks = vi.hoisted(() => ({
  persistence: {
    awardPoints: vi.fn(),
    getUserTotalPoints: vi.fn(),
    getCurrentStreak: vi.fn(),
    getLeaderboard: vi.fn()
  },
  piiSafeLogger: {
    error: vi.fn(),
    trackGamificationEngagement: vi.fn()
  },
  Gamification: {
    findOne: vi.fn()
  }
}));

vi.mock('../../services/gamification/GamificationPersistence.mjs', () => ({
  default: class MockGamificationPersistence {
    awardPoints = mocks.persistence.awardPoints;
    getUserTotalPoints = mocks.persistence.getUserTotalPoints;
    getCurrentStreak = mocks.persistence.getCurrentStreak;
    getLeaderboard = mocks.persistence.getLeaderboard;
  }
}));

vi.mock('../../utils/monitoring/piiSafeLogging.mjs', () => ({
  piiSafeLogger: mocks.piiSafeLogger
}));

vi.mock('../../models/Gamification.mjs', () => ({
  default: mocks.Gamification
}));

const { GamificationEngine } = await import('../../services/gamification/GamificationEngine.mjs');

describe('GamificationEngine idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.Gamification.findOne.mockReset();
    mocks.persistence.awardPoints.mockResolvedValue({ success: true, duplicate: false });
    mocks.persistence.getUserTotalPoints.mockResolvedValue(125);
    mocks.persistence.getCurrentStreak.mockResolvedValue(0);
    mocks.persistence.getLeaderboard.mockResolvedValue([{ userId: 7, points: 125, rank: 1 }]);
  });

  it('adds a deterministic idempotency key before awarding points', async () => {
    const engine = new GamificationEngine();

    const result = await engine.awardPoints(7, 'profile_updated', { sourceId: 'profile-form' });

    expect(mocks.persistence.awardPoints).toHaveBeenCalledWith(
      7,
      expect.any(Number),
      'profile_updated',
      expect.objectContaining({
        sourceId: 'profile-form',
        idempotencyKey: 'engine:profile_updated:user:7:sourceId:profile-form'
      })
    );
    expect(result).toEqual(expect.objectContaining({
      duplicate: false,
      idempotencyKey: 'engine:profile_updated:user:7:sourceId:profile-form'
    }));
  });

  it('returns a no-award duplicate result when persistence detects a retry', async () => {
    const engine = new GamificationEngine();
    mocks.persistence.awardPoints.mockResolvedValue({ success: true, duplicate: true, totalPoints: 88 });

    const result = await engine.awardPoints(7, 'profile_updated', { sourceId: 'profile-form' });

    expect(result).toEqual(expect.objectContaining({
      pointsAwarded: 0,
      totalPoints: 88,
      duplicate: true,
      levelUp: false
    }));
  });

  it('does not roll variable-ratio surprise rewards for workout point awards', async () => {
    const engine = new GamificationEngine();
    engine.rollSurpriseMultiplier = vi.fn(() => 1.0);

    const result = await engine.awardPoints(7, 'workout_completed', { workoutId: 42 });
    const [, , , metadata] = mocks.persistence.awardPoints.mock.calls.at(-1);

    expect(engine.rollSurpriseMultiplier).not.toHaveBeenCalled();
    expect(metadata).not.toHaveProperty('_surpriseMultiplier');
    expect(metadata).not.toHaveProperty('_surpriseLabel');
    expect(result).toEqual(expect.objectContaining({
      surpriseMultiplier: null,
      surpriseLabel: null
    }));
  });

  it('checks persisted point metadata before writing legacy ledger rows', () => {
    const persistenceSource = readFileSync(
      resolve(__dirname, '../../services/gamification/GamificationPersistence.mjs'),
      'utf8'
    );
    const pointsServiceSource = readFileSync(
      resolve(__dirname, '../../services/gamification/GamificationPointsService.mjs'),
      'utf8'
    );

    expect(persistenceSource).toContain('GamificationPointsService.recordLedgerEntry');
    expect(persistenceSource).toContain('idempotencyKey: getPointIdempotencyKey(metadata)');
    expect(pointsServiceSource).toContain('idempotencyKey: normalizedKey');
    expect(pointsServiceSource).toContain('withIdempotencyMetadata(metadata, normalizedKey)');
    expect(pointsServiceSource).toContain('duplicate: true');
  });

  it('keeps active multiplier logic deterministic and free of variable-ratio rewards', () => {
    const engineSource = readFileSync(
      resolve(__dirname, '../../services/gamification/GamificationEngine.mjs'),
      'utf8'
    );

    expect(engineSource).toContain('SECTION: Multiplier Calculation');
    expect(engineSource).toContain('deterministic consistency and schedule bonuses');
    expect(engineSource).not.toContain('Variable Ratio Reinforcement');
    expect(engineSource).not.toContain('slot machine');
    expect(engineSource).not.toContain('rollSurpriseMultiplier');
    expect(engineSource).not.toContain("json('metadata._surpriseMultiplier')");
    expect(engineSource).not.toContain('globalThis.crypto.getRandomValues');
    expect(engineSource).not.toContain('_todaySurpriseCount');
  });

  it('passes timeframe and limit to persistence leaderboard fallback using the persistence contract', async () => {
    const engine = new GamificationEngine();

    const result = await engine.getLeaderboard({
      timeframe: 'daily',
      category: 'overall',
      limit: 5,
      requestingUserId: 7
    });

    expect(result).toEqual([{ userId: 7, points: 125, rank: 1 }]);
    expect(mocks.persistence.getLeaderboard).toHaveBeenCalledWith('daily', 5);
    expect(mocks.persistence.getLeaderboard).not.toHaveBeenCalledWith(expect.objectContaining({
      timeframe: 'daily'
    }));
  });

  it('normalizes streak-freeze counters before awarding a freeze', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mocks.Gamification.findOne.mockResolvedValue({ streakFreezes: '2', update });
    const engine = new GamificationEngine();

    const result = await engine.awardStreakFreeze(7);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      streakFreezes: 3
    }));
    expect(result).toEqual(expect.objectContaining({
      awarded: true,
      current: 3,
      max: 3
    }));
    expect(mocks.piiSafeLogger.trackGamificationEngagement).toHaveBeenCalledWith(
      'streak_freeze_earned',
      7,
      { newTotal: 3 }
    );
  });

  it('does not parse hex streak-freeze counters before awarding a freeze', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mocks.Gamification.findOne.mockResolvedValue({ streakFreezes: '0x2', update });
    const engine = new GamificationEngine();

    const result = await engine.awardStreakFreeze(7);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      streakFreezes: 1
    }));
    expect(result).toEqual(expect.objectContaining({
      awarded: true,
      current: 1,
      max: 3
    }));
  });

  it('normalizes streak-freeze counters before using a freeze', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mocks.Gamification.findOne.mockResolvedValue({
      streakFreezes: '2',
      streakFreezesUsed: { bad: true },
      streakCount: '9',
      update
    });
    const engine = new GamificationEngine();

    const result = await engine.useStreakFreeze(7);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      streakFreezes: 1,
      streakFreezesUsed: 1
    }));
    expect(result).toEqual(expect.objectContaining({
      used: true,
      remaining: 1,
      streakPreserved: 9
    }));
    expect(mocks.piiSafeLogger.trackGamificationEngagement).toHaveBeenCalledWith(
      'streak_freeze_used',
      7,
      {
        remaining: 1,
        streakPreserved: 9
      }
    );
  });

  it('does not parse scientific notation streak-freeze counters before using a freeze', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mocks.Gamification.findOne.mockResolvedValue({
      streakFreezes: '1e2',
      streakFreezesUsed: '1e2',
      streakCount: '1e2',
      update
    });
    const engine = new GamificationEngine();

    const result = await engine.useStreakFreeze(7);

    expect(update).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      used: false,
      reason: 'no_freezes',
      streakLost: true
    }));
  });

  it('normalizes streak-freeze status counters', async () => {
    mocks.Gamification.findOne.mockResolvedValue({
      streakFreezes: { bad: true },
      streakFreezesUsed: '2',
      lastStreakFreezeEarned: 'earned',
      lastStreakFreezeUsed: 'used'
    });
    const engine = new GamificationEngine();

    await expect(engine.getStreakFreezeStatus(7)).resolves.toEqual({
      available: 0,
      max: 3,
      used: 2,
      lastEarned: 'earned',
      lastUsed: 'used'
    });
  });
});
