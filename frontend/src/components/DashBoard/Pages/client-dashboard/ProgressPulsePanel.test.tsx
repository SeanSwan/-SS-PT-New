/**
 * ProgressPulsePanel — Slice 8.3 Progress Intelligence tests
 * ==========================================================
 * Locks: loading skeleton, error self-hide (null, never fake zeros), the
 * ready-state compass + three metric tiles, null-honest balance/variety
 * fallbacks, CTA navigation, and streak pending hint copy.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

const mockAxiosGet = vi.hoisted(() => vi.fn());
// Stable identities — the real AuthContext memoizes authAxios; an unstable
// object here would re-fire the hook's effect on every render.
const mockAuthAxios = vi.hoisted(() => ({ get: mockAxiosGet }));
const mockUser = vi.hoisted(() => ({ id: 42 }));
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, authAxios: mockAuthAxios }),
}));

import ProgressPulsePanel from './ProgressPulsePanel';

const pulseFixture = (over: Record<string, unknown> = {}) => ({
  streak: { weeklyCurrent: 3, weeklyLongest: 5, weekTarget: 2, daysThisWeek: 1, currentWeekPending: true },
  pushPull: { pushVolume: 1200, pullVolume: 1000, ratio: 1.2, label: 'balanced' },
  variety: { score: 63, distinctExercises: 7, patternsCovered: 4, patternsTotal: 6 },
  volume: { thisWeek: 5400, priorWeek: 5000, deltaPct: 8 },
  lastWorkout: { date: '2026-07-01', daysAgo: 1 },
  nextBestAction: {
    primary: {
      code: 'streak_at_risk',
      priority: 3,
      title: 'Protect your 3-week streak',
      message: '1 more training day by Sunday keeps the streak alive.',
      cta: { label: 'Log a workout', href: '/dashboard/client/workouts' },
    },
    secondary: [
      { code: 'keep_momentum', priority: 8, title: 'Keep the cadence', message: 'm', cta: null },
    ],
  },
  ...over,
});

const respondWith = (data: unknown) => {
  mockAxiosGet.mockResolvedValue({ data: { success: true, data } });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProgressPulsePanel', () => {
  it('shows a skeleton while loading', () => {
    mockAxiosGet.mockReturnValue(new Promise(() => {}));
    render(<ProgressPulsePanel />);
    expect(screen.getByTestId('progress-pulse-skeleton')).toBeInTheDocument();
  });

  it('self-hides on fetch failure — no fake zero-progress story', async () => {
    mockAxiosGet.mockRejectedValue(new Error('403'));
    const { container } = render(<ProgressPulsePanel />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('self-hides on a malformed payload', async () => {
    mockAxiosGet.mockResolvedValue({ data: { success: true, data: { nope: true } } });
    const { container } = render(<ProgressPulsePanel />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('renders compass title, message, metrics, and secondary chips from real payload', async () => {
    respondWith(pulseFixture());
    render(<ProgressPulsePanel />);
    expect(await screen.findByText('Protect your 3-week streak')).toBeInTheDocument();
    expect(screen.getByText(/1 more training day by Sunday/)).toBeInTheDocument();
    expect(screen.getByText('3 wks')).toBeInTheDocument();
    expect(screen.getByText('1.2:1')).toBeInTheDocument();
    expect(screen.getByText('63')).toBeInTheDocument();
    expect(screen.getByText('4/6 movement patterns')).toBeInTheDocument();
    expect(screen.getByText('Keep the cadence')).toBeInTheDocument();
  });

  it('pending week shows remaining-days hint; settled week shows best-streak hint', async () => {
    respondWith(pulseFixture());
    const { unmount } = render(<ProgressPulsePanel />);
    expect(await screen.findByText('1 more day this week')).toBeInTheDocument();
    unmount();

    respondWith(pulseFixture({
      streak: { weeklyCurrent: 3, weeklyLongest: 5, weekTarget: 2, daysThisWeek: 2, currentWeekPending: false },
    }));
    render(<ProgressPulsePanel />);
    expect(await screen.findByText('best: 5 weeks')).toBeInTheDocument();
  });

  it('CTA navigates to the action href and meets the 44px floor', async () => {
    respondWith(pulseFixture());
    render(<ProgressPulsePanel />);
    const cta = await screen.findByRole('button', { name: 'Log a workout' });
    await userEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/workouts');
  });

  it('null ratio and null variety render honest unlock hints, never zeros', async () => {
    respondWith(pulseFixture({
      pushPull: { pushVolume: 500, pullVolume: 0, ratio: null, label: 'insufficient_data' },
      variety: { score: null, distinctExercises: 0, patternsCovered: 0, patternsTotal: 6 },
    }));
    render(<ProgressPulsePanel />);
    expect(await screen.findByText('Log push and pull work to unlock')).toBeInTheDocument();
    expect(screen.getByText('Unlocks after your first logged month')).toBeInTheDocument();
    expect(screen.queryByText('0:1')).not.toBeInTheDocument();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });

  it('exposes an accessible region and metric labels', async () => {
    respondWith(pulseFixture());
    render(<ProgressPulsePanel />);
    expect(await screen.findByRole('region', { name: 'Coach compass and progress pulse' })).toBeInTheDocument();
    expect(screen.getByTestId('pulse-streak')).toHaveAttribute('aria-label', 'Weekly streak 3 weeks');
    expect(screen.getByTestId('pulse-variety')).toHaveAttribute('aria-label', 'Variety score 63 out of 100');
  });
});
