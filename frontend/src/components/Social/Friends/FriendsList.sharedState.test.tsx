import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FriendsList from './FriendsList';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useSocialFriends: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../../../hooks/social/useSocialFriends', () => ({
  useSocialFriends: () => mocks.useSocialFriends(),
}));

vi.mock('../../UniversalMasterSchedule/ui/CustomModal', () => ({
  default: ({ children, isOpen, title }: { children: React.ReactNode; isOpen: boolean; title?: string }) => (
    isOpen ? <section role="dialog" aria-label={title || 'Friends dialog'}>{children}</section> : null
  ),
}));

const api = {
  friends: [{
    id: 'friend-1',
    firstName: 'Taylor',
    lastName: 'Training',
    username: 'taylor_training',
    role: 'client',
    friendshipId: 'friendship-1',
    createdAt: '2026-06-13T12:00:00.000Z',
  }],
  isLoading: false,
  error: null,
  fetchFriends: vi.fn(),
  removeFriend: vi.fn(),
  friendRequests: [{
    id: 'request-1',
    requester: {
      id: 'requester-1',
      firstName: 'Morgan',
      lastName: 'Mover',
      username: 'morgan_mover',
      role: 'client',
    },
    createdAt: '2026-06-12T12:00:00.000Z',
  }],
  isLoadingRequests: false,
  fetchFriendRequests: vi.fn(),
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  friendSuggestions: [{
    id: 'suggestion-1',
    firstName: 'Jordan',
    lastName: 'Journey',
    username: 'jordan_journey',
    role: 'client',
  }],
  isLoadingSuggestions: false,
  fetchFriendSuggestions: vi.fn(),
  searchUsers: vi.fn(),
};

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf8');

describe('FriendsList shared state contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSocialFriends.mockReturnValue(api);
  });

  it('keeps one useSocialFriends owner at the mounted friends tab', () => {
    const listSource = readSource('./FriendsList.tsx');
    const requestsSource = readSource('./FriendRequests.tsx');
    const suggestionsSource = readSource('./FriendSuggestions.tsx');

    expect(listSource).toContain('const friendsApi = useSocialFriends();');
    expect(listSource).toContain('friendsApi={friendsApi}');
    expect(requestsSource).not.toContain('useSocialFriends(');
    expect(suggestionsSource).not.toContain('useSocialFriends(');
  });

  it('renders friends, requests, and suggestions from the same hook instance', () => {
    render(<FriendsList />);

    expect(mocks.useSocialFriends).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Taylor Training')).toBeInTheDocument();
    expect(screen.getByText('1 request')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /friend requests/i }));
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    expect(api.acceptFriendRequest).toHaveBeenCalledWith('request-1');

    fireEvent.click(screen.getByRole('button', { name: /add friends/i }));
    fireEvent.click(screen.getByRole('button', { name: /add jordan journey/i }));

    expect(api.sendFriendRequest).toHaveBeenCalledWith('suggestion-1');
  });
});
