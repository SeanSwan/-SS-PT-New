import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutsTab, { WORKOUT_SESSIONS_API_PATH } from './WorkoutsTab';
import {
  calcStreak,
  transformWorkoutLogs,
  type RawSession,
} from './WorkoutsTabTransformers';

const { mockNavigate, mockUseAuth } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

describe('WorkoutsTab', () => {
  const authGet = vi.fn();

  beforeEach(() => {
    vi.useRealTimers();
    mockNavigate.mockClear();
    authGet.mockReset();
    mockUseAuth.mockReturnValue({ authAxios: { get: authGet } });
  });

  it('loads the canonical workout sessions path and shows the empty workout state', async () => {
    authGet.mockResolvedValue({ data: { data: { workouts: [] } } });

    render(<WorkoutsTab />);

    await screen.findByText('No workouts logged yet');
    expect(authGet).toHaveBeenCalledWith(WORKOUT_SESSIONS_API_PATH, {
      params: { limit: 200, page: 1 },
    });
  });

  it('routes the log-workout call to the existing admin sessions logger', async () => {
    const user = userEvent.setup();
    authGet.mockResolvedValue({ data: { data: { workouts: [] } } });

    render(<WorkoutsTab />);
    await user.click(await screen.findByRole('button', { name: /log workout/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin-sessions');
  });
});

describe('WorkoutsTabTransformers', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('counts each exercise once per workout session before grouping categories', () => {
    const result = transformWorkoutLogs([
      { logs: [{ exerciseName: 'Barbell Bench Press' }, { exerciseName: 'Barbell Bench Press' }] },
      { WorkoutLogs: [{ exerciseName: 'Barbell Bench Press' }] },
    ]);

    const chest = result.find((category) => category.key === 'Chest');

    expect(chest?.exercises).toContainEqual({ name: 'Barbell Bench Press', count: 2 });
  });

  it('calculates workout streaks from valid session dates and skips malformed dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T12:00:00.000Z'));
    const sessions: RawSession[] = [
      { completedAt: '2026-05-09T09:00:00.000Z' },
      { workoutDate: '2026-05-08T09:00:00.000Z' },
      { date: 'not-a-date' },
    ];

    expect(calcStreak(sessions)).toBe(2);
  });
});
