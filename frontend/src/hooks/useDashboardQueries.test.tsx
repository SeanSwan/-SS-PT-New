import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreatePost } from './useDashboardQueries';

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
