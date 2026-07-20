import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys, useCreatePost } from './useDashboardQueries';

const mockPost = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: { post: mockPost },
  }),
}));

function makeWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCreatePost gamification invalidation', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('refreshes gamification caches after a social post awards XP', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        pointsAwarded: 10,
        newBalance: 110,
        pointMessage: 'You earned 10 points for creating a training post!',
      },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreatePost(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        content: 'Logged a real training update',
        type: 'training',
        visibility: 'friends',
        media: null,
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['social', 'feed'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['gamification'] });
  });
});

describe('authenticated dashboard query keys', () => {
  it('isolates user-specific caches when another account signs into the same browser', () => {
    const firstUser = '101';
    const secondUser = '202';

    expect(queryKeys.social.feed(firstUser, { limit: 10 }))
      .not.toEqual(queryKeys.social.feed(secondUser, { limit: 10 }));
    expect(queryKeys.social.challenges(firstUser))
      .not.toEqual(queryKeys.social.challenges(secondUser));
    expect(queryKeys.notifications.summary(firstUser))
      .not.toEqual(queryKeys.notifications.summary(secondUser));
    expect(queryKeys.messaging.summary(firstUser))
      .not.toEqual(queryKeys.messaging.summary(secondUser));
    expect(queryKeys.workouts.sessions(firstUser, { limit: 50 }))
      .not.toEqual(queryKeys.workouts.sessions(secondUser, { limit: 50 }));
  });
});
