import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAxiosGet = vi.fn();
const mockUser = { id: 42, firstName: 'Test', lastName: 'Client', username: 'testclient' };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    authAxios: { get: mockAxiosGet, post: vi.fn() },
  }),
}));

vi.mock('../use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
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
      points: 2500,
      level: 5,
      tier: 'silver_edge',
      streakDays: 12,
      recentTransactions: [],
    },
  },
};

describe('useGamificationData query payload contracts', () => {
  beforeEach(() => {
    mockAxiosGet.mockReset();
  });

  it('keeps collection queries as arrays when endpoints return 2xx failure payloads', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/v1/gamification/profile') return Promise.resolve(profileResponse);
      if (url === '/api/profile/achievements') {
        return Promise.resolve({ data: { data: { achievements: [] } } });
      }
      if (
        url === '/api/v1/gamification/achievements'
        || url === '/api/v1/gamification/rewards'
        || url === '/api/v1/gamification/leaderboard'
      ) {
        return Promise.resolve({ data: { success: false, message: 'private collection failure' } });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useGamificationData(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.achievements.isSuccess).toBe(true);
      expect(result.current.rewards.isSuccess).toBe(true);
      expect(result.current.leaderboard.isSuccess).toBe(true);
    });

    expect(result.current.achievements.data).toEqual([]);
    expect(result.current.rewards.data).toEqual([]);
    expect(result.current.leaderboard.data).toEqual([]);
    expect(JSON.stringify(result.current)).not.toContain('private collection failure');
  });

  it('drops malformed collection rows before active consumers read them', async () => {
    const validReward = { id: 'reward-7', name: 'Session Credit', pointCost: 500 };
    const validLeaderboard = { userId: 7, client: { firstName: 'Ada' }, overallLevel: 4, points: 900 };

    mockAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/v1/gamification/profile') return Promise.resolve(profileResponse);
      if (url === '/api/v1/gamification/achievements') {
        return Promise.resolve({
          data: {
            achievements: [
              null,
              'private scalar row',
              { success: false, message: 'private achievement row failure' },
            ],
          },
        });
      }
      if (url === '/api/profile/achievements') {
        return Promise.resolve({ data: { data: { achievements: [] } } });
      }
      if (url === '/api/v1/gamification/rewards') {
        return Promise.resolve({
          data: {
            rewards: [
              null,
              {},
              { message: 'private reward object failure' },
              { id: { raw: 'private reward object id' }, name: 'Unsafe reward' },
              'private scalar reward',
              { success: false, message: 'private reward row failure' },
              validReward,
            ],
          },
        });
      }
      if (url === '/api/v1/gamification/leaderboard') {
        return Promise.resolve({
          data: {
            leaderboard: [
              null,
              {},
              { message: 'private leaderboard object failure' },
              { id: { raw: 'private leaderboard object id' }, client: null },
              'private scalar leaderboard',
              { success: false, message: 'private leaderboard row failure' },
              validLeaderboard,
            ],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useGamificationData(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.achievements.isSuccess).toBe(true);
      expect(result.current.rewards.isSuccess).toBe(true);
      expect(result.current.leaderboard.isSuccess).toBe(true);
    });

    expect(result.current.achievements.data).toEqual([]);
    expect(result.current.rewards.data).toEqual([validReward]);
    expect(result.current.leaderboard.data).toEqual([validLeaderboard]);
    expect(JSON.stringify(result.current)).not.toContain('private reward object failure');
    expect(JSON.stringify(result.current)).not.toContain('private leaderboard object failure');
    expect(JSON.stringify(result.current)).not.toContain('Unsafe reward');
    expect(JSON.stringify(result.current)).not.toContain('private reward row failure');
    expect(JSON.stringify(result.current)).not.toContain('private leaderboard row failure');
    expect(JSON.stringify(result.current)).not.toContain('private scalar');
  });
});
