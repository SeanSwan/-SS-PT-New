import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSocialFriends } from './useSocialFriends';

const mocks = vi.hoisted(() => ({
  authAxios: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  user: { id: 'user-1' },
  toast: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mocks.authAxios,
    user: mocks.user,
  }),
}));

vi.mock('../use-toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

describe('useSocialFriends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authAxios.get.mockImplementation((url: string) => {
      if (url === '/api/social/friendships') {
        return Promise.resolve({ data: { friends: [] } });
      }
      if (url === '/api/social/friendships/requests') {
        return Promise.resolve({ data: { requests: [] } });
      }
      if (url === '/api/social/friendships/suggestions') {
        return Promise.resolve({
          data: {
            suggestions: [{
              id: 'suggestion-1',
              firstName: 'Jordan',
              lastName: 'Journey',
              username: 'jordan_journey',
              role: 'client',
            }],
          },
        });
      }
      return Promise.resolve({ data: { results: [] } });
    });
    mocks.authAxios.post.mockResolvedValue({
      data: { friendship: { id: 'friendship-pending-1' } },
    });
  });

  it('marks a suggestion pending after sending a friend request', async () => {
    const { result } = renderHook(() => useSocialFriends());

    await waitFor(() => {
      expect(result.current.friendSuggestions).toHaveLength(1);
    });

    await act(async () => {
      const sent = await result.current.sendFriendRequest('suggestion-1');
      expect(sent).toBe(true);
    });

    expect(result.current.friendSuggestions[0]).toMatchObject({
      friendshipStatus: 'pending',
      friendshipId: 'friendship-pending-1',
      isRequester: true,
    });
  });
});
