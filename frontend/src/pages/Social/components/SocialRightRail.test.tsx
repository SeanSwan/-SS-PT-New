/**
 * SocialRightRail — M3 contract (merge: /social feed right rail)
 * ==============================================================
 * Locks the M3 decisions:
 *  - four widgets from REAL cached hooks (no fabricated data): Live Activity
 *    (shared activity singleton), Active Challenge (challenges lane),
 *    Leaderboard top-3 (gamification), Next Best Action (real profile)
 *  - honest empty states everywhere
 *  - Active Challenge = first ACTIVE challenge; Leaderboard caps at 3
 *  - Next Best Action CTA → role-routed workout logger
 *  - reuses useActivityTicker (the singleton) — does NOT open its own socket
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SocialRightRail from './SocialRightRail';

const { mockNavigate, mockUseAuth, mockUseTicker, mockUseChallenges, mockUseGam } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseTicker: vi.fn(),
  mockUseChallenges: vi.fn(),
  mockUseGam: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../../../hooks/social/useActivityTicker', () => ({ useActivityTicker: mockUseTicker }));
vi.mock('../../../hooks/useChallenges', () => ({ useChallenges: mockUseChallenges }));
vi.mock('../../../hooks/gamification/useGamificationData', () => ({ useGamificationData: mockUseGam }));

beforeEach(() => {
  mockNavigate.mockClear();
  mockUseAuth.mockReturnValue({ user: { role: 'user' } });
  mockUseTicker.mockReturnValue({ events: [], isConnected: true, clearEvents: vi.fn() });
  mockUseChallenges.mockReturnValue({ challenges: [], loading: false });
  mockUseGam.mockReturnValue({
    leaderboard: { data: [] },
    profile: { data: { streakDays: 0, level: 1, nextLevelProgress: 0 } },
  });
});

describe('SocialRightRail — empty states', () => {
  it('renders all four widgets with honest empty copy', () => {
    render(<SocialRightRail />);
    expect(screen.getByText(/Live Activity/i)).toBeTruthy();
    expect(screen.getByText(/quiet right now/i)).toBeTruthy();
    expect(screen.getByText(/no active challenge/i)).toBeTruthy();
    expect(screen.getByText(/leaderboard fills/i)).toBeTruthy();
    expect(screen.getByText(/Next Best Action/i)).toBeTruthy();
  });
});

describe('SocialRightRail — populated', () => {
  it('shows up to 4 live events, the first active challenge, and top-3 leaderboard', () => {
    mockUseTicker.mockReturnValue({
      events: [
        { id: 'a', type: 'workout_completed', userId: 1, userName: 'Ava' },
        { id: 'b', type: 'post_created', userId: 2, userName: 'Ben', postType: 'milestone' },
        { id: 'c', type: 'comment_added', userId: 3, userName: 'Cy' },
        { id: 'd', type: 'reaction_added', userId: 4, userName: 'Di' },
        { id: 'e', type: 'workout_completed', userId: 5, userName: 'Eve' },
      ],
      isConnected: true,
      clearEvents: vi.fn(),
    });
    mockUseChallenges.mockReturnValue({
      challenges: [
        { id: '1', title: 'Upcoming One', status: 'upcoming', participants: 5, reward: '100 XP' },
        { id: '2', title: 'Active One', status: 'active', participants: 42, daysLeft: 4, reward: '500 XP' },
      ],
      loading: false,
    });
    mockUseGam.mockReturnValue({
      leaderboard: {
        data: [
          { userId: 'u1', overallLevel: 9, client: { firstName: 'Top', username: 't' } },
          { userId: 'u2', overallLevel: 7, client: { firstName: 'Two', username: 'tw' } },
          { userId: 'u3', overallLevel: 5, client: { firstName: 'Three', username: 'th' } },
          { userId: 'u4', overallLevel: 3, client: { firstName: 'Four', username: 'f' } },
        ],
      },
      profile: { data: { streakDays: 7, level: 3, nextLevelProgress: 60 } },
    });
    render(<SocialRightRail />);

    expect(screen.getByText('Ava completed a workout')).toBeTruthy();
    expect(screen.queryByText('Eve completed a workout')).toBeNull(); // capped at 4

    expect(screen.getByText('Active One')).toBeTruthy();
    expect(screen.queryByText('Upcoming One')).toBeNull(); // only active

    expect(screen.getByText('Top')).toBeTruthy();
    expect(screen.queryByText('Four')).toBeNull(); // capped at 3

    // NBA reflects the live streak
    expect(screen.getByText(/keep your 7-day streak/i)).toBeTruthy();
  });

  it('renders FLAT leaderboard rows (the real production shape — rule 58 drift fix)', () => {
    // progressController.getLeaderboard returns flat user attributes, not the
    // legacy {userId, overallLevel, client:{...}} the type claims. Caught
    // visually on production 2026-06-11 ("Member / Lvl" fallbacks).
    mockUseGam.mockReturnValue({
      leaderboard: {
        data: [
          { id: 57, firstName: 'QABot', username: 'qabottester2026', level: 2, points: 350 },
          { id: 2, firstName: 'Sean', username: 'SeanSwan', level: 9, points: 9000 },
        ],
      },
      profile: { data: { streakDays: 0, level: 1, nextLevelProgress: 0 } },
    });
    render(<SocialRightRail />);

    expect(screen.getByText('QABot')).toBeTruthy();
    expect(screen.getByText('Sean')).toBeTruthy();
    expect(screen.getByText('Lvl 2')).toBeTruthy();
    expect(screen.getByText('Lvl 9')).toBeTruthy();
  });

  it('NBA Log-a-workout routes a member to the role-routed logger', async () => {
    const user = userEvent.setup();
    render(<SocialRightRail />);
    await user.click(screen.getByRole('button', { name: /log a workout/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout');
  });

  it('All-challenges link routes to the challenges tab', async () => {
    const user = userEvent.setup();
    render(<SocialRightRail />);
    await user.click(screen.getByRole('button', { name: /all challenges/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/social/challenges');
  });
});

describe('SocialRightRail — source contract', () => {
  it('consumes the shared activity singleton (no own socket) + reduced-motion styles', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, resolve } = await import('node:path');
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(dir, './SocialRightRail.tsx'), 'utf8');
    expect(src).toContain("from '../../../hooks/social/useActivityTicker'");
    expect(src).not.toMatch(/io\(|socket\.io/); // no direct socket — uses the hook
    const styles = readFileSync(resolve(dir, './SocialRightRail.styles.ts'), 'utf8');
    expect(styles).toContain('prefers-reduced-motion');
    expect(styles).not.toMatch(/keyframes|animation:/);
  });
});
