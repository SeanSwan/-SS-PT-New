import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockUseWorkoutSessions = vi.fn();
vi.mock('../../../../hooks/useDashboardQueries', () => ({
  useWorkoutSessions: (params: unknown) => mockUseWorkoutSessions(params),
}));

import ClientMyWorkoutsPage from './ClientMyWorkoutsPage';

const todayLoggerPath = '/dashboard/client/log-workout?loadPlan=today';

describe('ClientMyWorkoutsPage log-today routes', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseWorkoutSessions.mockReset();
  });

  it('routes the header Log Workout CTA to the today-loaded logger', async () => {
    const user = userEvent.setup();
    mockUseWorkoutSessions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientMyWorkoutsPage />);

    await user.click(screen.getByRole('button', { name: /^\s*log workout\s*$/i }));

    expect(mockNavigate).toHaveBeenCalledWith(todayLoggerPath);
  });

  it('routes the first-time empty-state CTA to the today-loaded logger', async () => {
    const user = userEvent.setup();
    mockUseWorkoutSessions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientMyWorkoutsPage />);

    await user.click(screen.getByRole('button', { name: /log your first workout/i }));

    expect(mockNavigate).toHaveBeenCalledWith(todayLoggerPath);
  });

  it('routes the next-best-move CTA to the today-loaded logger', async () => {
    const user = userEvent.setup();
    mockUseWorkoutSessions.mockReturnValue({
      data: [{ id: 'workout-1', title: 'Workout 1', date: '2026-02-21T10:00:00Z', logs: [] }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientMyWorkoutsPage />);

    await user.click(screen.getByRole('button', { name: /log today's workout/i }));

    expect(mockNavigate).toHaveBeenCalledWith(todayLoggerPath);
  });
});
