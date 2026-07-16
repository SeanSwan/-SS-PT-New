import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAxiosGet = vi.fn();
const mockAxiosPost = vi.fn();
const mockToast = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, firstName: 'Test', lastName: 'Client', username: 'testclient' },
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
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
  });
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
};

describe('useGamificationData reward redemption proof', () => {
  beforeEach(() => {
    mockAxiosGet.mockReset();
    mockAxiosPost.mockReset();
    mockToast.mockReset();
  });

  it('uses backend redemption proof when patching the profile cache after reward redemption', async () => {
    const serverRedeemedAt = '2026-06-21T09:42:00.000Z';
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
              recentTransactions: [],
              nextLevelProgress: 65,
              nextLevelPoints: 3000,
            },
          },
        });
      }
      if (url.includes('/rewards')) {
        return Promise.resolve({
          data: { rewards: [{ id: '7', name: 'Session Credit', pointCost: 500, stock: 3, redemptionCount: 2 }] },
        });
      }
      return Promise.resolve({ data: [] });
    });
    mockAxiosPost.mockResolvedValue({
      data: {
        success: true,
        reward: { name: 'Session Credit' },
        userReward: { id: 912, rewardId: 7, redeemedAt: serverRedeemedAt, status: 'pending', pointsCost: 500 },
      },
    });

    const { result } = renderHook(() => useGamificationData(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.profile.isSuccess).toBe(true);
      expect(result.current.rewards.isSuccess).toBe(true);
    });
    act(() => result.current.redeemReward('7'));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());

    expect(result.current.profile.data?.rewards[0]).toMatchObject({
      id: '912',
      rewardId: '7',
      redeemedAt: serverRedeemedAt,
      status: 'pending',
      pointsCost: 500,
    });
    expect(result.current.profile.data?.recentTransactions[0]).toMatchObject({
      id: 'reward-redemption-912',
      createdAt: serverRedeemedAt,
      balance: 2000,
      transactionType: 'spend',
    });
  });
});
