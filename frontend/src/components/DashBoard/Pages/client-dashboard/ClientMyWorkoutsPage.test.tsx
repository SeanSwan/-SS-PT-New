/**
 * ClientMyWorkoutsPage — parent-level regression tests
 * =====================================================
 * Locks the canonical client workouts surface against the "empty-page trap"
 * regression discovered in the canonical-surface-audit 2026-04-13 review:
 *
 *   If the user clicks "Next" past the last real page, the canonical
 *   useWorkoutSessions hook returns []. The old code path then rendered the
 *   global "No workouts logged yet" empty state AND hid the pagination
 *   component (which only lived inside the non-empty branch), so the user
 *   was stranded on a fake-empty page with no Previous control.
 *
 * This suite renders the full ClientMyWorkoutsPage with a mocked hook that
 * returns different payloads for page=1 and page=2, clicks the pagination
 * controls, and asserts the user is never stranded.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock the navigate hook so useNavigate returns a spy ──────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  // The page reads location.state.workoutChallengeProgress (logger handoff).
  useLocation: () => ({ pathname: '/dashboard/my-workouts', search: '', hash: '', state: null, key: 'test' }),
}));

// ── Mock useWorkoutSessions so we can drive page=1 vs page=2 payloads ────
const mockUseWorkoutSessions = vi.fn();
vi.mock('../../../../hooks/useDashboardQueries', () => ({
  useWorkoutSessions: (params: unknown) => mockUseWorkoutSessions(params),
}));

import ClientMyWorkoutsPage from './ClientMyWorkoutsPage';

// Build a minimal WorkoutSession-compatible row. The component's local
// interface is permissive (most fields optional); this shape satisfies the
// render paths we hit.
const makeWorkout = (id: string) => ({
  id,
  title: `Workout ${id}`,
  date: new Date('2026-02-21T10:00:00Z').toISOString(),
  duration: 45,
  intensity: 7,
  totalSets: 12,
  totalReps: 100,
  totalWeight: 5000,
  logs: [],
});

// Full-page payload — 50 rows triggers pagination controls
const FULL_PAGE = Array.from({ length: 50 }, (_, i) => makeWorkout(`w${i}`));

describe('ClientMyWorkoutsPage — empty-page trap regression', () => {
  beforeEach(() => {
    mockUseWorkoutSessions.mockReset();
    mockNavigate.mockReset();
  });

  it('shows the first-time empty state when page=1 and the result is empty', () => {
    mockUseWorkoutSessions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientMyWorkoutsPage />);

    expect(screen.getByText(/no workouts logged yet/i)).toBeInTheDocument();
    // Pagination controls should NOT appear on page=1 with no workouts
    expect(screen.queryByRole('button', { name: /previous page/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument();
  });

  it('renders pagination controls when page 1 is full (50 rows)', () => {
    mockUseWorkoutSessions.mockReturnValue({
      data: FULL_PAGE,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientMyWorkoutsPage />);

    // Next button is present and enabled (full page heuristic)
    const nextBtn = screen.getByRole('button', { name: /next page/i });
    expect(nextBtn).toBeInTheDocument();
    expect(nextBtn).not.toBeDisabled();
    // Previous is present but disabled on page 1
    const prevBtn = screen.getByRole('button', { name: /previous page/i });
    expect(prevBtn).toBeDisabled();
    // Page indicator starts at 1
    expect(screen.getByText(/^Page 1$/)).toBeInTheDocument();
  });

  it('does NOT render the first-time empty state when Next advances to an empty page 2 — shows end-of-history instead', async () => {
    const user = userEvent.setup();
    // Hook implementation varies by page arg
    mockUseWorkoutSessions.mockImplementation((params: { page?: number }) => {
      if (params?.page === 1) {
        return { data: FULL_PAGE, isLoading: false, error: null, refetch: vi.fn() };
      }
      // page=2 (or any later) returns empty
      return { data: [], isLoading: false, error: null, refetch: vi.fn() };
    });

    render(<ClientMyWorkoutsPage />);

    // Initial render: full page 1
    expect(screen.getByText(/^Page 1$/)).toBeInTheDocument();
    expect(screen.queryByText(/no workouts logged yet/i)).not.toBeInTheDocument();

    // Click Next → advances to page 2, hook returns empty
    await user.click(screen.getByRole('button', { name: /next page/i }));

    await waitFor(() => {
      expect(screen.getByText(/^Page 2$/)).toBeInTheDocument();
    });

    // CRITICAL ASSERTION: the first-time empty state must NOT appear.
    // That was the trap — the old path showed "No workouts logged yet" here.
    expect(screen.queryByText(/no workouts logged yet/i)).not.toBeInTheDocument();

    // Instead: the end-of-history state is shown
    expect(screen.getByText(/end of history/i)).toBeInTheDocument();
  });

  it('keeps Previous reachable on the empty page beyond page 1 so the user is not stranded', async () => {
    const user = userEvent.setup();
    mockUseWorkoutSessions.mockImplementation((params: { page?: number }) => {
      if (params?.page === 1) {
        return { data: FULL_PAGE, isLoading: false, error: null, refetch: vi.fn() };
      }
      return { data: [], isLoading: false, error: null, refetch: vi.fn() };
    });

    render(<ClientMyWorkoutsPage />);

    // Advance to empty page 2
    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => expect(screen.getByText(/^Page 2$/)).toBeInTheDocument());

    // Previous must be present AND enabled
    const prevBtn = screen.getByRole('button', { name: /previous page/i });
    expect(prevBtn).toBeInTheDocument();
    expect(prevBtn).not.toBeDisabled();
  });

  it('clicking Previous from the empty page navigates back to page 1 and restores the workout list', async () => {
    const user = userEvent.setup();
    mockUseWorkoutSessions.mockImplementation((params: { page?: number }) => {
      if (params?.page === 1) {
        return { data: FULL_PAGE, isLoading: false, error: null, refetch: vi.fn() };
      }
      return { data: [], isLoading: false, error: null, refetch: vi.fn() };
    });

    render(<ClientMyWorkoutsPage />);

    // Advance to empty page 2
    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => expect(screen.getByText(/end of history/i)).toBeInTheDocument());

    // Click Previous — should return to page 1 with workouts visible again
    await user.click(screen.getByRole('button', { name: /previous page/i }));

    await waitFor(() => {
      expect(screen.getByText(/^Page 1$/)).toBeInTheDocument();
    });
    // End-of-history message is gone, normal workout list is shown
    expect(screen.queryByText(/end of history/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no workouts logged yet/i)).not.toBeInTheDocument();
  });
});

// =========================================================================
// Canonical-surface-audit 2026-04-13 review findings:
//   - Log Workout CTAs must route to the today-loaded canonical client
//     logger, not the legacy /dashboard/workouts/logger.
//   - Stat cards are computed from the current page slice only, so labels
//     must be explicitly page-scoped to avoid misleading-data-truth
//     regressions when pagination lands on later pages.
// =========================================================================
describe('ClientMyWorkoutsPage — CTA routing and page-scoped stat labels', () => {
  beforeEach(() => {
    mockUseWorkoutSessions.mockReset();
    mockNavigate.mockReset();
  });

  it('Header "Log Workout" CTA navigates to the today-loaded client logger', async () => {
    const user = userEvent.setup();
    mockUseWorkoutSessions.mockReturnValue({
      data: FULL_PAGE,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientMyWorkoutsPage />);

    // The header has a LogBtn labeled "Log Workout"
    const headerBtn = screen.getByRole('button', { name: /^\s*log workout\s*$/i });
    await user.click(headerBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');
    // Explicit negative assertion against the legacy route
    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard/workouts/logger');
  });

  it('Header "Ask Coach" CTA opens client Coach with workout-history context', async () => {
    const user = userEvent.setup();
    mockUseWorkoutSessions.mockReturnValue({
      data: FULL_PAGE,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientMyWorkoutsPage />);

    await user.click(screen.getByRole('button', { name: /ask coach about my workouts/i }));

    const route = mockNavigate.mock.calls.at(-1)?.[0] as string;
    const url = new URL(route, 'https://sswanstudios.test');
    expect(url.pathname).toBe('/dashboard/client/coach-assistant');
    expect(url.searchParams.get('intent')).toBe('log_self_workout');
    expect(url.searchParams.get('source')).toBe('client-workouts');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/client/workouts');
    expect(url.searchParams.get('teachPrompt')).toMatch(/workouts tab/i);
    expect(url.searchParams.get('teachPrompt')).toMatch(/workout history/i);
  });

  it('first-time empty state "Log Your First Workout" CTA navigates to the today-loaded logger', async () => {
    const user = userEvent.setup();
    mockUseWorkoutSessions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientMyWorkoutsPage />);

    const emptyStateBtn = screen.getByRole('button', { name: /log your first workout/i });
    await user.click(emptyStateBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');
    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard/workouts/logger');
  });

  it('first-time empty state offers Coach guidance for what to log first', async () => {
    const user = userEvent.setup();
    mockUseWorkoutSessions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientMyWorkoutsPage />);

    await user.click(screen.getByRole('button', { name: /ask coach what to log first/i }));

    const route = mockNavigate.mock.calls.at(-1)?.[0] as string;
    const url = new URL(route, 'https://sswanstudios.test');
    expect(url.pathname).toBe('/dashboard/client/coach-assistant');
    expect(url.searchParams.get('intent')).toBe('log_self_workout');
    expect(url.searchParams.get('source')).toBe('client-workouts');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/client/workouts');
    expect(url.searchParams.get('teachPrompt')).toMatch(/safest next training action/i);
  });

  it('stat labels are explicitly page-scoped (not lifetime totals)', () => {
    mockUseWorkoutSessions.mockReturnValue({
      data: FULL_PAGE,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientMyWorkoutsPage />);

    // Locked labels — must name the page scope, must NOT be misleading
    // lifetime totals like "Total Workouts".
    expect(screen.getByText(/on this page/i)).toBeInTheDocument();
    expect(screen.getByText(/this week \(on page\)/i)).toBeInTheDocument();
    expect(screen.getByText(/page volume/i)).toBeInTheDocument();

    // Explicit negative assertions — the old misleading labels must not reappear
    expect(screen.queryByText(/^total workouts$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^this week$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^total volume \(lbs\)$/i)).not.toBeInTheDocument();
  });
});
