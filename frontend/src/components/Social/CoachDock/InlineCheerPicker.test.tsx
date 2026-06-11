/**
 * InlineCheerPicker — cheer-v2 contract (feed-anchored cheer, D2 fast-follow)
 * ===========================================================================
 * Locks the Sean-ratified 2026-06-11 decision (feed-anchored cheer over
 * messaging picker / slipping-friend nudge):
 *  - candidates are OTHER members' unreacted celebration posts (milestone /
 *    achievement / workout / transformation / challenge) from the real feed
 *    lane; own posts and already-cheered posts never appear
 *  - friends' wins are preferred via the real friendships lane; when no
 *    friend wins exist, recent community wins show under honest copy
 *  - one tap sends a 'swan' reaction through the production like endpoint;
 *    the receipt renders only on a confirmed 2xx; failure = honest retry
 *  - empty / API-down → honest empty state + deep-link to /social/friends
 *    (the D2a fallback behavior)
 *  - rule 27: companion rail — no inputs; reuses the finder's styles
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import InlineCheerPicker from './InlineCheerPicker';

const { mockNavigate, mockUseAuth, mockGet, mockPost } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

const post = (overrides: Record<string, unknown>) => ({
  id: 'p1',
  content: 'Crushed it today',
  type: 'milestone',
  isLiked: false,
  user: { id: '20', firstName: 'Ava', username: 'ava' },
  ...overrides,
});

const lanes = (posts: unknown[], friends: unknown[]) => {
  mockGet.mockImplementation(async (url: string) =>
    url.includes('/feed') ? { data: { posts } } : { data: { friends } },
  );
};

beforeEach(() => {
  mockNavigate.mockClear();
  mockGet.mockReset();
  mockPost.mockReset();
  mockPost.mockResolvedValue({ data: { success: true } });
  mockUseAuth.mockReturnValue({
    user: { id: 1, role: 'user', firstName: 'Sean' },
    authAxios: { get: mockGet, post: mockPost },
  });
});

describe('InlineCheerPicker — candidate selection', () => {
  it('prefers friends’ wins, caps at 2, and excludes own/liked/non-celebration posts', async () => {
    lanes(
      [
        post({ id: 'own', user: { id: '1', firstName: 'Sean' } }),
        post({ id: 'liked', isLiked: true, user: { id: '21', firstName: 'Liv' } }),
        post({ id: 'general', type: 'general', user: { id: '22', firstName: 'Gen' } }),
        post({ id: 'f1', user: { id: '30', firstName: 'Ava' } }),
        post({ id: 'f2', type: 'workout', user: { id: '31', firstName: 'Ben' } }),
        post({ id: 'f3', type: 'achievement', user: { id: '32', firstName: 'Cy' } }),
        post({ id: 'stranger', user: { id: '99', firstName: 'Zed' } }),
      ],
      [{ id: 30 }, { id: 31 }, { id: 32 }],
    );
    render(<InlineCheerPicker />);

    const cheerButtons = await screen.findAllByRole('button', { name: /^cheer /i });
    expect(cheerButtons).toHaveLength(2);
    expect(screen.getByText(/Ava/)).toBeTruthy();
    expect(screen.getByText(/Ben/)).toBeTruthy();
    expect(screen.queryByText(/Zed/)).toBeNull();
    expect(screen.queryByText(/Sean/)).toBeNull();
    expect(screen.queryByText(/Liv/)).toBeNull();
    expect(screen.queryByText(/Gen/)).toBeNull();
  });

  it('falls back to community wins under honest copy when no friend wins exist', async () => {
    lanes([post({ id: 'c1', user: { id: '99', firstName: 'Zed' } })], [{ id: 30 }]);
    render(<InlineCheerPicker />);

    expect(await screen.findByText(/no friend wins right now/i)).toBeTruthy();
    expect(screen.getByText(/Zed/)).toBeTruthy();
  });

  it('shows an honest empty state with a friends deep-link when nothing is cheerable', async () => {
    lanes([], []);
    const user = userEvent.setup();
    render(<InlineCheerPicker />);

    expect(await screen.findByText(/no fresh wins to cheer/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /see your friends/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/social/friends');
  });

  it('degrades to community wins when the friendships lane fails', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/feed')) {
        return { data: { posts: [post({ id: 'c1', user: { id: '40', firstName: 'Kai' } })] } };
      }
      throw new Error('friendships down');
    });
    render(<InlineCheerPicker />);

    expect(await screen.findByText(/Kai/)).toBeTruthy();
  });
});

describe('InlineCheerPicker — one-tap cheer', () => {
  it('sends a swan reaction and shows the receipt only after a confirmed 2xx', async () => {
    lanes([post({ id: 'p7', user: { id: '30', firstName: 'Ava' } })], [{ id: 30 }]);
    const user = userEvent.setup();
    render(<InlineCheerPicker />);

    await user.click(await screen.findByRole('button', { name: /cheer ava/i }));

    expect(mockPost).toHaveBeenCalledWith('/api/social/posts/p7/like', {
      reactionType: 'swan',
    });
    expect(await screen.findByText(/cheered/i)).toBeTruthy();
  });

  it('shows an honest retry line when the reaction fails', async () => {
    lanes([post({ id: 'p7', user: { id: '30', firstName: 'Ava' } })], [{ id: 30 }]);
    mockPost.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    render(<InlineCheerPicker />);

    await user.click(await screen.findByRole('button', { name: /cheer ava/i }));

    expect(await screen.findByText(/didn't go through/i)).toBeTruthy();
    expect(screen.queryByText(/cheered\b/i)).toBeNull();
    expect(screen.getByRole('button', { name: /cheer ava/i })).toBeTruthy();
  });
});

describe('cheer-v2 source contracts', () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const SOURCE = readFileSync(resolve(__dirname, './InlineCheerPicker.tsx'), 'utf8');

  it('is a companion rail — no inputs (rule 27), reuses the finder styles', () => {
    expect(SOURCE).not.toMatch(/<input|<textarea|onSubmit/i);
    expect(SOURCE).toContain("from './InlineChallengeFinder.styles'");
  });
});
