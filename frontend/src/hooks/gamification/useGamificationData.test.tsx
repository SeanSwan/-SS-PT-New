/**
 * useGamificationData — profile shape regression tests
 * =====================================================
 * Locks the canonical /api/v1/gamification/profile unwrap path against the
 * streakDays shape drift discovered in the canonical-surface-audit 2026-04-13:
 *
 *   Backend gamificationController.getUserProfile returns
 *     { success, profile: { ...user.toJSON(), leaderboardPosition, ... } }
 *   and `streakDays` is a TOP-LEVEL column on the User model
 *   (backend/models/User.mjs:301). The hook previously read
 *   `raw.stats?.streakDays` which evaluated to `undefined ?? 0` on every
 *   canonical response, so:
 *     - ClientHomeTab MomentumCard always showed "0d" streak on /overview
 *     - ClientProgressDashboardPage top stats Streak card always showed 0d
 *       unless weekly-recap had current.streak
 *
 * These tests hit the hook with a renderHook wrapper, mock authAxios to
 * return the real backend shape, and assert streakDays propagates correctly.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock auth context (provides user + authAxios) ────────────────────────
const mockAxiosGet = vi.fn();
const mockUser = { id: 42, firstName: 'Test', lastName: 'Client', username: 'testclient' };
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    authAxios: { get: mockAxiosGet },
  }),
}));

// ── Mock toast ───────────────────────────────────────────────────────────
vi.mock('../use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ── Mock logger ──────────────────────────────────────────────────────────
vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { useGamificationData } from './useGamificationData';

// Wrapper factory — fresh QueryClient per test so caches don't bleed
const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

// Real backend-shape response — matches gamificationController.getUserProfile:698-710
// streakDays is at TOP LEVEL of profile (spread from user.toJSON()), not nested under stats
const realProfileResponse = {
  data: {
    success: true,
    profile: {
      id: 42,
      firstName: 'Test',
      lastName: 'Client',
      username: 'testclient',
      points: 2500,
      level: 5,
      tier: 'silver_edge',
      streakDays: 12, // ← TOP-LEVEL, the real column on User model
      longestStreakDays: 20,
      lastActivityDate: '2026-04-13T00:00:00.000Z',
      leaderboardPosition: 7,
      recentTransactions: [],
      nextMilestone: null,
      nextLevelProgress: 65,
      nextLevelPoints: 3000,
      nextTierProgress: 0,
      nextTier: 'titanium_core',
    },
  },
};

describe('useGamificationData — profile streakDays top-level read', () => {
  beforeEach(() => {
    mockAxiosGet.mockReset();
  });

  it('reads streakDays from the TOP LEVEL of the profile response (real backend shape)', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('/profile')) return Promise.resolve(realProfileResponse);
      // achievements / other endpoints return empty
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useGamificationData(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.profile.isSuccess).toBe(true);
    });

    // CRITICAL: streakDays must be 12, not 0.
    // The prior `raw.stats?.streakDays` bug always returned 0 here.
    expect(result.current.profile.data?.streakDays).toBe(12);
  });

  it('falls back to 0 when streakDays is genuinely missing (no silent drift)', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('/profile')) {
        return Promise.resolve({
          data: {
            success: true,
            profile: {
              id: 42,
              points: 100,
              level: 1,
              tier: 'bronze_forge',
              // streakDays intentionally absent
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useGamificationData(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.profile.isSuccess).toBe(true);
    });

    expect(result.current.profile.data?.streakDays).toBe(0);
  });

  it('does NOT read from raw.stats.streakDays — legacy path must stay dead (regression guard)', async () => {
    // If some future refactor reintroduces the `stats` nesting, this test
    // proves the hook ignores it in favor of the real top-level column.
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('/profile')) {
        return Promise.resolve({
          data: {
            success: true,
            profile: {
              id: 42,
              points: 2500,
              level: 5,
              tier: 'silver_edge',
              streakDays: 15, // real top-level — must win
              stats: { streakDays: 999 }, // legacy nested — must be ignored
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useGamificationData(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.profile.isSuccess).toBe(true);
    });

    expect(result.current.profile.data?.streakDays).toBe(15);
    expect(result.current.profile.data?.streakDays).not.toBe(999);
  });

  it('maps real backend userAchievements and recentTransactions into the shared profile cache', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('/profile')) {
        return Promise.resolve({
          data: {
            success: true,
            profile: {
              id: 42,
              points: 2500,
              level: 5,
              tier: 'silver_edge',
              streakDays: 12,
              userAchievements: [
                {
                  id: 'ua-1',
                  achievementId: 'ach-1',
                  progress: 1,
                  isCompleted: true,
                  earnedAt: '2026-05-15T12:00:00.000Z',
                  pointsAwarded: 150,
                  achievement: {
                    id: 'ach-1',
                    name: 'First Workout',
                    description: 'Logged the first complete workout.',
                    iconEmoji: 'Trophy',
                    xpReward: 150,
                    requiredPoints: 1,
                    category: 'fitness',
                  },
                },
              ],
              recentTransactions: [
                {
                  id: 'tx-1',
                  points: 150,
                  balance: 2500,
                  transactionType: 'earn',
                  source: 'workout',
                  description: 'Session recap approved',
                  createdAt: '2026-05-15T12:30:00.000Z',
                },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useGamificationData(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.profile.isSuccess).toBe(true);
    });

    expect(result.current.profile.data?.achievements[0]?.achievement.name).toBe('First Workout');
    expect(result.current.profile.data?.recentTransactions[0]?.description).toBe('Session recap approved');
  });
});
