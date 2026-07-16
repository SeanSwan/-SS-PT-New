import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAxiosGet = vi.fn();
const mockAxiosPost = vi.fn();
const mockToast = vi.fn();
const mockUser = { id: 42, firstName: 'Test', lastName: 'Client', username: 'testclient' };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    authAxios: { get: mockAxiosGet, post: mockAxiosPost },
  }),
}));

vi.mock('../use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { useGamificationData } from './useGamificationData';

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
};

const profileResponse = {
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
      streakDays: 12,
      recentTransactions: [],
      nextMilestone: null,
      nextLevelProgress: 65,
      nextLevelPoints: 3000,
    },
  },
};

const makeRedemptionResponse = (rewardName: string, userReward: Record<string, unknown> = {}) => ({
  data: {
    success: true,
    reward: { name: rewardName },
    userReward: {
      id: 912,
      rewardId: 7,
      redeemedAt: '2026-06-21T09:42:00.000Z',
      status: 'pending',
      pointsCost: 500,
      ...userReward,
    },
  },
});

const rewardFixture = { id: '7', name: 'Session Credit', pointCost: 500, stock: 3, redemptionCount: 2 };

const mockProfileAndRewards = (reward: Record<string, unknown> = rewardFixture) => {
  mockAxiosGet.mockImplementation((url: string) => {
    if (url.includes('/profile')) return Promise.resolve(profileResponse);
    if (url.includes('/rewards')) return Promise.resolve({ data: { rewards: [reward] } });
    return Promise.resolve({ data: [] });
  });
};

const renderUseGamificationData = () => renderHook(() => useGamificationData(), { wrapper: makeWrapper() });

const waitForRewardData = async (result: any) => {
  await waitFor(() => {
    expect(result.current.profile.isSuccess).toBe(true);
    expect(result.current.rewards.isSuccess).toBe(true);
  });
};

const redeemReward = async (result: any) => {
  act(() => result.current.redeemReward('7'));
  await waitFor(() => expect(mockAxiosPost).toHaveBeenCalled());
};

describe('useGamificationData cache hardening', () => {
  beforeEach(() => {
    mockAxiosGet.mockReset();
    mockAxiosPost.mockReset();
    mockToast.mockReset();
  });

  it('clamps malformed next-level progress before exposing the shared profile cache', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('/profile')) {
        return Promise.resolve({
          data: { success: true, profile: { ...profileResponse.data.profile, nextLevelProgress: 175 } },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useGamificationData(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.profile.isSuccess).toBe(true));
    expect(result.current.profile.data?.nextLevelProgress).toBe(100);
  });

  it('falls back to formula progress when backend settings return a zero target', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('/profile')) {
        return Promise.resolve({
          data: {
            success: true,
            profile: {
              ...profileResponse.data.profile,
              points: 2800,
              nextLevelProgress: 0,
              nextLevelPoints: 0,
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useGamificationData(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.profile.isSuccess).toBe(true));
    expect(result.current.profile.data?.nextLevelProgress).toBeGreaterThan(0);
    // Curve-agnostic: the lock is that the fallback comes from the shared
    // leveling helper, not a hardcoded threshold (the logarithmic-leveling
    // rework in ee111b3ae turned the old 3600 literal into a time bomb).
    const { getLevelProgress } = await import('../../types/gamification');
    expect(result.current.profile.data?.nextLevelPoints).toBe(getLevelProgress(2800).nextLevelAt);
    expect(result.current.profile.data?.nextLevelPoints).toBeGreaterThan(2800);
  });

  it('falls back to formula progress when backend progression hints are array-shaped', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('/profile')) {
        return Promise.resolve({
          data: {
            success: true,
            profile: {
              ...profileResponse.data.profile,
              points: 2800,
              nextLevelProgress: [88],
              nextLevelPoints: [3000],
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    const { result } = renderHook(() => useGamificationData(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.profile.isSuccess).toBe(true));
    expect(result.current.profile.data?.nextLevelProgress).toBe(result.current.levelProgress.progressPercent);
    expect(result.current.profile.data?.nextLevelPoints).toBe(result.current.levelProgress.nextLevelAt);
  });

  it('updates profile and reward caches only when redeemed reward economics are valid', async () => {
    mockProfileAndRewards();
    mockAxiosPost.mockResolvedValue(makeRedemptionResponse('Session Credit'));

    const { result } = renderUseGamificationData();
    await waitForRewardData(result);
    await redeemReward(result);
    expect(result.current.profile.data?.points).toBe(2000);
    expect(result.current.profile.data?.rewards).toHaveLength(1);
    expect(result.current.profile.data?.recentTransactions[0]?.balance).toBe(2000);
    expect(result.current.rewards.data?.[0]?.stock).toBe(2);
    expect(result.current.rewards.data?.[0]?.redemptionCount).toBe(3);
  });

  it('does not update caches or show success when redemption returns a 2xx failure payload', async () => {
    mockProfileAndRewards();
    mockAxiosPost.mockResolvedValue({
      data: { success: false, message: 'private stock rule failed' },
    });

    const { result } = renderUseGamificationData();
    await waitForRewardData(result);
    act(() => result.current.redeemReward('7'));

    await waitFor(() => {
      expect(mockAxiosPost).toHaveBeenCalledWith('/api/v1/gamification/users/42/rewards/7/redeem');
      expect(mockToast).toHaveBeenCalled();
    });

    expect(result.current.profile.data?.points).toBe(2500);
    expect(result.current.profile.data?.rewards).toHaveLength(0);
    expect(result.current.profile.data?.recentTransactions).toHaveLength(0);
    expect(result.current.rewards.data?.[0]?.stock).toBe(3);
    expect(result.current.rewards.data?.[0]?.redemptionCount).toBe(2);
    expect(mockToast.mock.calls.at(-1)?.[0]).toMatchObject({
      title: 'Error',
      description: 'Reward could not be redeemed.',
      variant: 'destructive',
    });
    expect(JSON.stringify(mockToast.mock.calls)).not.toContain('private stock rule failed');
    expect(JSON.stringify(mockToast.mock.calls)).not.toContain("You've successfully redeemed");
  });

  it('does not corrupt profile or reward caches when redeemed reward economics are malformed', async () => {
    mockProfileAndRewards({
      id: '7',
      name: 'Malformed Reward',
      pointCost: 'not-a-number',
      stock: undefined,
      redemptionCount: undefined,
    });
    mockAxiosPost.mockResolvedValue({ data: { reward: { name: 'Malformed Reward' } } });

    const { result } = renderUseGamificationData();
    await waitForRewardData(result);
    await redeemReward(result);
    expect(result.current.profile.data?.points).toBe(2500);
    expect(result.current.profile.data?.rewards).toHaveLength(0);
    expect(result.current.profile.data?.recentTransactions).toHaveLength(0);
    expect(JSON.stringify(result.current.profile.data)).not.toContain('NaN');
    expect(JSON.stringify(result.current.rewards.data)).not.toContain('NaN');
  });

  it('rejects array-shaped reward economics instead of coercing them into cache math', async () => {
    mockProfileAndRewards({
      id: '7',
      name: 'Array Reward',
      pointCost: [500],
      stock: [3],
      redemptionCount: [2],
    });
    mockAxiosPost.mockResolvedValue(makeRedemptionResponse('Array Reward', {
      pointsCost: [500],
    }));

    const { result } = renderUseGamificationData();
    await waitForRewardData(result);
    await redeemReward(result);

    expect(result.current.profile.data?.points).toBe(2500);
    expect(result.current.profile.data?.rewards).toHaveLength(0);
    expect(result.current.profile.data?.recentTransactions).toHaveLength(0);
    expect(result.current.rewards.data?.[0]?.stock).toEqual([3]);
    expect(result.current.rewards.data?.[0]?.redemptionCount).toEqual([2]);
  });

  it('uses safe reward copy for success toasts and optimistic transaction descriptions', async () => {
    const unsafeRewardName = `Elite Reward\n${'A'.repeat(120)}`;

    mockProfileAndRewards({ ...rewardFixture, name: unsafeRewardName });
    mockAxiosPost.mockResolvedValue(makeRedemptionResponse(unsafeRewardName));

    const { result } = renderUseGamificationData();
    await waitForRewardData(result);
    act(() => result.current.redeemReward('7'));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());

    const toastDescription = String(mockToast.mock.calls.at(-1)?.[0]?.description || '');
    const transactionDescription = String(result.current.profile.data?.recentTransactions[0]?.description || '');

    expect(toastDescription).not.toContain('\n');
    expect(toastDescription).not.toContain('A'.repeat(80));
    expect(toastDescription).toMatch(/^You've successfully redeemed: Elite Reward/);
    expect(toastDescription.length).toBeLessThanOrEqual(110);
    expect(transactionDescription).not.toContain('\n');
    expect(transactionDescription).not.toContain('A'.repeat(80));
    expect(transactionDescription).toMatch(/^Reward Redeemed: Elite Reward/);
    expect(transactionDescription.length).toBeLessThanOrEqual(100);
  });

  it('falls back instead of echoing markup-shaped reward names', async () => {
    const unsafeRewardName = '<script>alert(1)</script>';

    mockProfileAndRewards({ ...rewardFixture, name: unsafeRewardName });
    mockAxiosPost.mockResolvedValue(makeRedemptionResponse(unsafeRewardName));

    const { result } = renderUseGamificationData();
    await waitForRewardData(result);
    act(() => result.current.redeemReward('7'));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());

    const toastDescription = String(mockToast.mock.calls.at(-1)?.[0]?.description || '');
    const transactionDescription = String(result.current.profile.data?.recentTransactions[0]?.description || '');

    expect(toastDescription).toBe("You've successfully redeemed: your reward");
    expect(transactionDescription).toBe('Reward Redeemed: Reward');
    expect(`${toastDescription} ${transactionDescription}`).not.toContain('<');
  });
});
