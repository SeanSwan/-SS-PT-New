import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../Social/Hashtags', () => ({
  FeedFilterBar: () => <div data-testid="feed-filter-bar" />,
}));

vi.mock('../../../Social/RPG', () => ({
  FactionLeaderboard: () => <div>Faction leaderboard</div>,
  PartyHPBar: () => <div>Party HP</div>,
  PartyCreateJoin: () => <div>Create or join a party</div>,
}));

vi.mock('../../../Social/Events', () => ({
  EventsList: () => <div>Community events</div>,
}));

vi.mock('../../../../hooks/social/useFaction', () => ({
  useFaction: () => ({ factions: [] }),
}));

vi.mock('../../../../hooks/social/useParty', () => ({
  useParty: () => ({
    party: null,
    myRole: null,
    leaveParty: vi.fn(),
    createParty: vi.fn(),
    joinParty: vi.fn(),
  }),
}));

vi.mock('../../../../hooks/useDashboardQueries', () => ({
  useSocialChallenges: () => ({ data: [], error: null }),
  useSocialFeed: () => ({ data: [], isLoading: false, error: null }),
  useLeaderboard: () => ({ data: [] }),
  useCreatePost: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

import ClientCommunityPage from './ClientCommunityPage';

describe('ClientCommunityPage truth states', () => {
  it('shows an honest empty leaderboard instead of placeholder athletes', () => {
    render(<ClientCommunityPage />);

    expect(screen.getByText(/no leaderboard entries yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/SwanAthlete1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/IronPhoenix/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CoreCrusher/i)).not.toBeInTheDocument();
  });
});
