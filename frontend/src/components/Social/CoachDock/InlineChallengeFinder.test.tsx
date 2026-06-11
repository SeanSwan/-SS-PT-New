/**
 * InlineChallengeFinder — D2b contract (find-challenge inline)
 * ============================================================
 * Locks the D2b decisions from the 2026-06-11 grill-me doc (Q4 hybrid depth):
 *  - matches = up to 2 ACTIVE, NOT-yet-joined challenges, ranked by
 *    participants (social proof), from the REAL useChallenges lane — the
 *    same hook/endpoints ChallengesView exercises in production
 *  - one-tap join via the hook's joinChallenge; success is verified from
 *    the refetched joined flag, never assumed (the hook swallows errors)
 *  - a just-joined match stays visible as a receipt (selection is locked
 *    at first load, not recomputed away by the refetch)
 *  - failed join renders an honest retry line, not a fake success
 *  - empty / API-down → empty state with a Browse-all deep-link to
 *    /social/challenges (graceful fallback to the D2a behavior)
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InlineChallengeFinder from './InlineChallengeFinder';
import type { Challenge } from '../../../hooks/useChallenges';

const { mockNavigate, mockUseChallenges, mockJoinChallenge } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseChallenges: vi.fn(),
  mockJoinChallenge: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../hooks/useChallenges', () => ({
  useChallenges: mockUseChallenges,
}));

const challenge = (overrides: Partial<Challenge>): Challenge => ({
  id: '1',
  title: 'Cardio Crusher',
  description: 'desc',
  category: 'cardio',
  status: 'active',
  progress: 0,
  participants: 10,
  reward: '500 XP',
  joined: false,
  ...overrides,
});

const hookState = (overrides: Record<string, unknown> = {}) => ({
  challenges: [] as Challenge[],
  loading: false,
  error: null,
  isDemoData: false,
  joinChallenge: mockJoinChallenge,
  leaveChallenge: vi.fn(),
  refetch: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  mockNavigate.mockClear();
  mockJoinChallenge.mockReset();
  mockJoinChallenge.mockResolvedValue(undefined);
});

describe('InlineChallengeFinder — match selection', () => {
  it('shows a loading line while the challenges fetch is in flight', () => {
    mockUseChallenges.mockReturnValue(hookState({ loading: true }));
    render(<InlineChallengeFinder />);
    expect(screen.getByText(/finding challenges/i)).toBeTruthy();
  });

  it('shows up to 2 active unjoined challenges ranked by participants', () => {
    mockUseChallenges.mockReturnValue(
      hookState({
        challenges: [
          challenge({ id: '1', title: 'Small Squad', participants: 5 }),
          challenge({ id: '2', title: 'Big League', participants: 90 }),
          challenge({ id: '3', title: 'Mid Pack', participants: 40 }),
        ],
      }),
    );
    render(<InlineChallengeFinder />);

    const joinButtons = screen.getAllByRole('button', { name: /^join /i });
    expect(joinButtons).toHaveLength(2);
    expect(screen.getByText('Big League')).toBeTruthy();
    expect(screen.getByText('Mid Pack')).toBeTruthy();
    expect(screen.queryByText('Small Squad')).toBeNull();
  });

  it('never matches joined, upcoming, or completed challenges', () => {
    mockUseChallenges.mockReturnValue(
      hookState({
        challenges: [
          challenge({ id: '1', title: 'Already In', joined: true }),
          challenge({ id: '2', title: 'Not Started', status: 'upcoming' }),
          challenge({ id: '3', title: 'Done', status: 'completed' }),
        ],
      }),
    );
    render(<InlineChallengeFinder />);

    expect(screen.queryByRole('button', { name: /^join /i })).toBeNull();
    expect(screen.getByText(/no open challenges/i)).toBeTruthy();
  });

  it('empty state offers a Browse-all deep-link to the challenges tab', async () => {
    mockUseChallenges.mockReturnValue(hookState());
    const user = userEvent.setup();
    render(<InlineChallengeFinder />);

    await user.click(screen.getByRole('button', { name: /browse all challenges/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/social/challenges');
  });
});

describe('InlineChallengeFinder — one-tap join', () => {
  it('joins via the hook and shows the receipt once the refetch confirms', async () => {
    let state = hookState({
      challenges: [challenge({ id: '7', title: 'Big League', participants: 90 })],
    });
    mockUseChallenges.mockImplementation(() => state);
    // Simulate the hook's refetch-on-success: joined flips to true.
    mockJoinChallenge.mockImplementation(async () => {
      state = hookState({
        challenges: [
          challenge({ id: '7', title: 'Big League', participants: 91, joined: true }),
        ],
      });
    });

    const user = userEvent.setup();
    render(<InlineChallengeFinder />);

    await user.click(screen.getByRole('button', { name: /join big league/i }));

    expect(mockJoinChallenge).toHaveBeenCalledWith('7');
    // The joined match stays visible as a receipt, not recomputed away.
    expect(await screen.findByText(/you're in/i)).toBeTruthy();
    expect(screen.getByText('Big League')).toBeTruthy();
  });

  it('shows an honest retry line when the join did not stick', async () => {
    mockUseChallenges.mockReturnValue(
      hookState({
        challenges: [challenge({ id: '7', title: 'Big League', participants: 90 })],
      }),
    );
    // joinChallenge resolves (hook swallows errors) but joined stays false.
    const user = userEvent.setup();
    render(<InlineChallengeFinder />);

    await user.click(screen.getByRole('button', { name: /join big league/i }));

    expect(await screen.findByText(/didn't go through/i)).toBeTruthy();
    expect(screen.queryByText(/you're in/i)).toBeNull();
    // Retry stays available.
    expect(screen.getByRole('button', { name: /join big league/i })).toBeTruthy();
  });

  it('is a companion rail, not a chat surface — no inputs (rule 27)', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, resolve } = await import('node:path');
    const dir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(dir, './InlineChallengeFinder.tsx'), 'utf8');
    expect(source).not.toMatch(/<input|<textarea|onSubmit/i);
    const styles = readFileSync(resolve(dir, './InlineChallengeFinder.styles.ts'), 'utf8');
    expect(styles).toContain('prefers-reduced-motion');
    expect(styles).not.toMatch(/keyframes|animation:/);
  });
});
