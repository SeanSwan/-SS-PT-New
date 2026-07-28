/**
 * Locks the client My Workouts Coach handoff so the page teaches one clear
 * next action from the workout history the client is already viewing.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/dashboard/client/workouts',
    search: '',
    hash: '',
    key: 'test',
    state: null,
  }),
}));

const mockUseWorkoutSessions = vi.fn();

vi.mock('../../../../hooks/useDashboardQueries', () => ({
  useWorkoutSessions: (params: unknown) => mockUseWorkoutSessions(params),
}));

import ClientMyWorkoutsPage from './ClientMyWorkoutsPage';

const makeWorkout = (id: string, date: string, totalWeight: number) => ({
  id,
  title: `Private client ${id} 555-0101`,
  date,
  duration: 45,
  intensity: 7,
  totalSets: 10,
  totalReps: 90,
  totalWeight,
  notes: 'Ada Lovelace private note',
  logs: [
    {
      id: 1,
      exerciseName: 'Bench Press',
      setNumber: 1,
      reps: 10,
      weight: 185,
    },
  ],
});

describe('ClientMyWorkoutsPage Coach snapshot handoff', () => {
  beforeEach(() => {
    const recentWorkoutDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    mockNavigate.mockReset();
    mockUseWorkoutSessions.mockReturnValue({
      data: [
        makeWorkout('client-4242', recentWorkoutDate, 5000),
        makeWorkout('client-9999', '2026-05-01T12:00:00Z', 2000),
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('shows one next best move and sends Coach a compact workout-history snapshot', async () => {
    const user = userEvent.setup();

    render(<ClientMyWorkoutsPage />);

    expect(screen.getByText(/next best move/i)).toBeInTheDocument();
    expect(screen.getByText(/review the latest page, log today if you trained, or ask Coach what to adjust/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ask coach next/i }));

    const route = mockNavigate.mock.calls.at(-1)?.[0] as string;
    const url = new URL(route, 'https://sswanstudios.test');
    const prompt = url.searchParams.get('teachPrompt') ?? '';

    expect(url.pathname).toBe('/dashboard/client/coach-assistant');
    expect(url.searchParams.get('intent')).toBe('log_self_workout');
    expect(url.searchParams.get('source')).toBe('client-workouts');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/client/workouts');
    expect(prompt).toContain('workout history');
    expect(prompt).toContain('2 workouts on this page');
    expect(prompt).toContain('1 in the last 7 days');
    expect(prompt).toContain('7.0k lbs page volume');
    expect(prompt.length).toBeLessThan(460);
    expect(prompt).not.toMatch(/client-4242|client-9999|Ada Lovelace|555-0101|Bench Press/i);
  });
});
