import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { mockCreatePostMutate, mockNavigate, mockSocialChallengesData } = vi.hoisted(() => ({
  mockCreatePostMutate: vi.fn(),
  mockNavigate: vi.fn(),
  mockSocialChallengesData: [] as unknown[],
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
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
  useSocialChallenges: () => ({ data: mockSocialChallengesData, error: null }),
  useSocialFeed: () => ({ data: [], isLoading: false, error: null }),
  useLeaderboard: () => ({ data: [] }),
  useCreatePost: () => ({ mutate: mockCreatePostMutate, isPending: false, error: null }),
}));

import ClientCommunityPage from './ClientCommunityPage';
import {
  SAFE_COMMUNITY_LOAD_ERROR,
  SAFE_CREATE_POST_ERROR,
  getSafeCommunityLoadError,
  getSafeCreatePostErrorCopy,
  getAwardedPostPoints,
  normalizeCommunityChallenge,
  normalizeCommunityFeedPost,
  normalizeLeaderboardEntry,
} from './ClientCommunityPage.helpers';

const SOURCE = readFileSync(resolve(__dirname, './ClientCommunityPage.tsx'), 'utf8');
const HELPERS_SOURCE = readFileSync(resolve(__dirname, './ClientCommunityPage.helpers.ts'), 'utf8');
const STYLES_SOURCE = readFileSync(resolve(__dirname, './ClientCommunityStyles.ts'), 'utf8');
const FEED_STYLES_SOURCE = readFileSync(resolve(__dirname, './ClientCommunityFeedStyles.ts'), 'utf8');
const COMMUNITY_STYLE_SOURCES = [STYLES_SOURCE, FEED_STYLES_SOURCE];

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

  it('opens the first-class Challenge Board from active challenge previews', async () => {
    const user = userEvent.setup();
    mockSocialChallengesData.push({
      id: 'challenge-1',
      title: 'Three Planned Sessions',
      description: 'Complete assigned workouts this week',
      progress: 40,
      daysRemaining: 4,
    });

    render(<ClientCommunityPage />);

    await user.click(screen.getByRole('button', { name: 'Open Challenge Board for Three Planned Sessions' }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/challenges');
  });

  it('does not key dynamic community rows by array index', () => {
    expect(SOURCE).not.toContain('key={i}');
    expect(SOURCE).not.toContain('key={c.id || i}');
    expect(SOURCE).not.toContain('key={p.id || i}');
    expect(HELPERS_SOURCE).toContain('communityChallengeKey');
    expect(HELPERS_SOURCE).toContain('leaderboardEntryKey');
    expect(HELPERS_SOURCE).toContain('communityFeedPostKey');
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

  it('does not promise fixed XP before backend confirms the awarded points', async () => {
    const user = userEvent.setup();
    render(<ClientCommunityPage />);

    expect(screen.queryByText('+15 XP')).not.toBeInTheDocument();
    expect(screen.getByText(/xp varies by type/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Write a post'), 'Logged my workout and hit a milestone');
    await user.click(screen.getByRole('button', { name: 'Create post' }));

    const callbacks = mockCreatePostMutate.mock.calls[0]?.[1] as {
      onSuccess?: (result: unknown) => void;
    };
    await act(async () => {
      callbacks.onSuccess?.({ pointsAwarded: 25 });
    });

    expect(screen.getByRole('status')).toHaveTextContent('+25 XP earned');
  });

  it('normalizes awarded post points from response payloads only when they are finite positive numbers', () => {
    expect(getAwardedPostPoints({ pointsAwarded: 25 })).toBe(25);
    expect(getAwardedPostPoints({ data: { pointsAwarded: '50' } })).toBe(50);
    expect(getAwardedPostPoints({ pointsAwarded: 0 })).toBeNull();
    expect(getAwardedPostPoints({ pointsAwarded: [50] })).toBeNull();
    expect(getAwardedPostPoints({ pointsAwarded: '0x32' })).toBeNull();
    expect(getAwardedPostPoints({ data: { pointsAwarded: '1e2' } })).toBeNull();
    expect(getAwardedPostPoints({ pointsAwarded: 'private malformed value' })).toBeNull();
  });

  it('prevents duplicate community post submits while the create request is in flight', async () => {
    const user = userEvent.setup();
    render(<ClientCommunityPage />);

    await user.type(screen.getByLabelText('Write a post'), 'Finished the workout block #Consistency');
    await user.dblClick(screen.getByRole('button', { name: 'Create post' }));

    expect(mockCreatePostMutate).toHaveBeenCalledTimes(1);

    const callbacks = mockCreatePostMutate.mock.calls[0]?.[1] as { onSettled?: () => void };
    callbacks.onSettled?.();
    await user.click(screen.getByRole('button', { name: 'Create post' }));

    expect(mockCreatePostMutate).toHaveBeenCalledTimes(2);
  });

  it('keeps raw backend failure details out of client-facing community copy', () => {
    expect(SOURCE).not.toContain('createPost.error.message');
    expect(SOURCE).not.toContain('feedError?.message');
    expect(SOURCE).not.toContain('challengesError?.message');

    expect(getSafeCreatePostErrorCopy(new Error('SequelizeConnectionError: password auth failed'))).toBe(
      SAFE_CREATE_POST_ERROR,
    );
    expect(getSafeCommunityLoadError(new Error('500 /internal/tenant/42'))).toBe(SAFE_COMMUNITY_LOAD_ERROR);
  });

  it('mounts the faction leaderboard frameless inside the community section card', () => {
    expect(SOURCE).toContain('<FactionLeaderboard factions={factions} frameless />');
  });

  it('mounts the active party HP display frameless inside the community section card', () => {
    expect(SOURCE).toContain('<PartyHPBar party={party} myRole={myRole} onLeave={leaveParty} frameless />');
  });

  it('normalizes malformed community numbers and display text before render', () => {
    expect(normalizeLeaderboardEntry({ firstName: 'Ada\u0000 Lift', totalPoints: Number.POSITIVE_INFINITY }, 0))
      .toEqual({ id: 'leader-ada-lift', name: 'Ada Lift', xp: 0 });
    expect(normalizeLeaderboardEntry({ firstName: 'Hex Athlete', totalPoints: '0x32' } as any, 1))
      .toMatchObject({ name: 'Hex Athlete', xp: 0 });
    expect(normalizeLeaderboardEntry({ firstName: 'Array Athlete', totalPoints: [75] } as any, 2))
      .toMatchObject({ name: 'Array Athlete', xp: 0 });

    expect(normalizeCommunityChallenge({ title: '\u0000', progress: 999, daysRemaining: -4 }, 0))
      .toMatchObject({ title: 'Challenge', progress: 100, daysRemaining: 0 });
    expect(normalizeCommunityChallenge({ title: 'Malformed', progress: '1e2', daysRemaining: [7] } as any, 1))
      .toMatchObject({ title: 'Malformed', progress: 0, daysRemaining: 0 });

    expect(normalizeCommunityFeedPost({ authorName: 'A\u0007thlete', content: 'Nice\u0000 work', createdAt: 'bad-date' }, 0))
      .toMatchObject({ author: 'Athlete', body: 'Nice work', createdAt: '' });
  });

  it('keeps community chrome tokenized and reduced-motion aware', () => {
    COMMUNITY_STYLE_SOURCES.forEach(source => {
      expect(source.charCodeAt(0)).not.toBe(0xfeff);
      expect(source).not.toContain('rgba(');
      expect(source).not.toContain('transition: all');
    });
    expect(COMMUNITY_STYLE_SOURCES.join('\n')).toContain('@media (prefers-reduced-motion: reduce)');
    expect(COMMUNITY_STYLE_SOURCES.join('\n')).toContain('animation: none');
  });

  it('keeps the mounted community route files under the dashboard line cap', () => {
    expect(SOURCE.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(HELPERS_SOURCE.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(STYLES_SOURCE.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(FEED_STYLES_SOURCE.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
