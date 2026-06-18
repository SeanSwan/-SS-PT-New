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
    getCurrentStreak: vi.fn()
  },
  piiSafeLogger: {
    error: vi.fn(),
    trackGamificationEngagement: vi.fn()
  }
}));

vi.mock('../../services/gamification/GamificationPersistence.mjs', () => ({
  default: class MockGamificationPersistence {
    awardPoints = mocks.persistence.awardPoints;
    getUserTotalPoints = mocks.persistence.getUserTotalPoints;
    getCurrentStreak = mocks.persistence.getCurrentStreak;
  }
}));

vi.mock('../../utils/monitoring/piiSafeLogging.mjs', () => ({
  piiSafeLogger: mocks.piiSafeLogger
}));

const { GamificationEngine } = await import('../../services/gamification/GamificationEngine.mjs');

describe('GamificationEngine idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.persistence.awardPoints.mockResolvedValue({ success: true, duplicate: false });
    mocks.persistence.getUserTotalPoints.mockResolvedValue(125);
    mocks.persistence.getCurrentStreak.mockResolvedValue(0);
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
    expect(pointsServiceSource).toContain("Sequelize.json('metadata.idempotencyKey')");
    expect(pointsServiceSource).toContain('withIdempotencyMetadata(metadata, normalizedKey)');
    expect(pointsServiceSource).toContain('duplicate: true');
  });
});
