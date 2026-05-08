import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminGamificationController } from './useAdminGamificationController';

const mocks = vi.hoisted(() => ({
  authAxios: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  toast: vi.fn(),
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mocks.authAxios }),
}));

vi.mock('../../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const baseLevelSettings = {
  pointsPerLevel: 500,
  levelCap: 100,
  enableLevelCap: false,
};

const baseSystemSettings = {
  enableGamification: true,
  enableAchievements: true,
  enableRewards: true,
  enableLeaderboard: true,
  enableLevels: true,
  enableTiers: true,
  enableStreaks: true,
  notifyOnAchievement: true,
  notifyOnLevelUp: true,
  notifyOnReward: true,
  streakExpirationDays: 3,
  pointsExpiration: { enabled: false, expirationDays: 365 },
};

describe('useAdminGamificationController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authAxios.get.mockImplementation((url: string) => {
      if (url.includes('/achievements')) return Promise.resolve({ data: { achievements: [] } });
      if (url.includes('/rewards')) return Promise.resolve({ data: { rewards: [] } });
      if (url.includes('/leaderboard')) return Promise.resolve({ data: { leaderboard: [] } });
      if (url.includes('/settings')) {
        return Promise.resolve({
          data: {
            settings: {
              pointValues: [{ id: 'workout_complete', name: 'Workout', description: '', pointValue: 50 }],
              tierThresholds: [{ tier: 'bronze', pointsRequired: 0 }],
              levelSettings: baseLevelSettings,
              systemSettings: baseSystemSettings,
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('saves the edited settings draft instead of stale React state', async () => {
    const { result } = renderHook(() => useAdminGamificationController());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const draft = {
      pointValues: [{ id: 'workout_complete', name: 'Workout', description: '', pointValue: 90 }],
      tierThresholds: [{ tier: 'bronze' as const, pointsRequired: 0 }],
      levelSettings: { ...baseLevelSettings, pointsPerLevel: 700 },
      systemSettings: { ...baseSystemSettings, enableLeaderboard: false },
    };

    await act(async () => {
      await result.current.handleSaveSettings(draft);
    });

    expect(mocks.authAxios.put).toHaveBeenCalledWith('/api/v1/gamification/settings', draft);
  });
});
