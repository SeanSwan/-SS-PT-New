import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { mockCreatePostMutate } = vi.hoisted(() => ({
  mockCreatePostMutate: vi.fn(),
}));

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
  useCreatePost: () => ({ mutate: mockCreatePostMutate, isPending: false, error: null }),
}));

import ClientCommunityPage from './ClientCommunityPage';

const SOURCE = readFileSync(resolve(__dirname, './ClientCommunityPage.tsx'), 'utf8');

describe('ClientCommunityPage truth states', () => {
  beforeEach(() => {
    mockCreatePostMutate.mockClear();
  });

  it('shows an honest empty leaderboard instead of placeholder athletes', () => {
    render(<ClientCommunityPage />);

    expect(screen.getByText(/no leaderboard entries yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/SwanAthlete1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/IronPhoenix/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CoreCrusher/i)).not.toBeInTheDocument();
  });

  it('does not key dynamic community rows by array index', () => {
    expect(SOURCE).not.toContain('key={i}');
    expect(SOURCE).not.toContain('key={c.id || i}');
    expect(SOURCE).not.toContain('key={p.id || i}');
    expect(SOURCE).toContain('communityChallengeKey');
    expect(SOURCE).toContain('leaderboardEntryKey');
    expect(SOURCE).toContain('communityFeedPostKey');
  });

  it('submits smart inferred post type and hashtags from the community composer', async () => {
    const user = userEvent.setup();
    render(<ClientCommunityPage />);

    await user.type(screen.getByLabelText('Write a post'), 'New PR on squats today');
    await user.click(screen.getByRole('button', { name: 'Create post' }));

    expect(mockCreatePostMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('#Milestone'),
        type: 'achievement',
        visibility: 'friends',
      }),
      expect.any(Object),
    );
  });
});
