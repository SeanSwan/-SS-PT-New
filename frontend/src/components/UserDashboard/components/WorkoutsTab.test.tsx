import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutsTab, { WORKOUT_SESSIONS_API_PATH, WORKOUT_PAGE_SIZE } from './WorkoutsTab';
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
    // RE-ANCHOR (2026-09-03, S8): the tab now requests ONE PAGE (50) instead of
    // a hard 200, with a "Load older" control and a server hasMore signal. The
    // assertion's intent — this tab calls the canonical sessions path with an
    // explicit window — is unchanged; the window size is the thing that moved.
    expect(authGet).toHaveBeenCalledWith(WORKOUT_SESSIONS_API_PATH, {
      params: { limit: WORKOUT_PAGE_SIZE, page: 1 },
    });
  });

  it("routes the log-workout call to today's canonical client workout logger", async () => {
    const user = userEvent.setup();
    authGet.mockResolvedValue({ data: { data: { workouts: [] } } });
    mockUseAuth.mockReturnValue({ authAxios: { get: authGet }, user: { role: 'client' } });

    render(<WorkoutsTab />);
    await user.click(await screen.findByRole('button', { name: /log workout/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');
  });

  it('routes the empty workout state to Coach with a staged workouts prompt', async () => {
    const user = userEvent.setup();
    authGet.mockResolvedValue({ data: { data: { workouts: [] } } });

    render(<WorkoutsTab />);
    await user.click(await screen.findByRole('button', { name: /ask coach what to log/i }));

    const route = mockNavigate.mock.calls.at(-1)?.[0] as string;
    const url = new URL(route, 'https://app.local');

    expect(url.pathname).toBe('/dashboard/client/coach-assistant');
    expect(url.searchParams.get('teachPrompt')).toMatch(/workouts tab/i);
    expect(url.searchParams.get('teachPrompt')).toMatch(/save today's session/i);
  });

  it('keeps Ask Coach one click away when workout history exists', async () => {
    const user = userEvent.setup();
    authGet.mockResolvedValue({
      data: {
        data: {
          workouts: [
            {
              workoutDate: '2026-06-14T08:00:00.000Z',
              logs: [{ exerciseName: 'Barbell Bench Press' }],
            },
          ],
        },
      },
    });

    render(<WorkoutsTab />);
    await user.click(await screen.findByRole('button', { name: /^ask coach$/i }));

    const route = mockNavigate.mock.calls.at(-1)?.[0] as string;
    const url = new URL(route, 'https://app.local');

    expect(url.pathname).toBe('/dashboard/client/coach-assistant');
    expect(url.searchParams.get('teachPrompt')).toMatch(/workout history/i);
  });

  it('shows a next-move strip and sends Coach the live workout snapshot', async () => {
    const user = userEvent.setup();
    authGet.mockResolvedValue({
      data: {
        data: {
          workouts: [
            {
              workoutDate: '2026-06-14T08:00:00.000Z',
              logs: [
                { exerciseName: 'Barbell Bench Press' },
                { exerciseName: 'Seated Cable Row' },
              ],
            },
            {
              workoutDate: '2026-06-13T08:00:00.000Z',
              logs: [{ exerciseName: 'Barbell Bench Press' }],
            },
          ],
        },
      },
    });

    render(<WorkoutsTab />);

    await screen.findByText('Next best move');
    expect(screen.getByText('Logged Moves')).toBeInTheDocument();
    expect(screen.queryByText('Total Sets')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ask coach next/i }));

    const route = mockNavigate.mock.calls.at(-1)?.[0] as string;
    const url = new URL(route, 'https://app.local');
    const prompt = url.searchParams.get('teachPrompt') || '';

    expect(url.pathname).toBe('/dashboard/client/coach-assistant');
    expect(prompt).toContain('Current workout snapshot');
    expect(prompt).toContain('3 logged exercise touches');
    expect(prompt).toContain('Most active: Chest');
    expect(prompt).toContain('Top movement: Barbell Bench Press');
    expect(prompt).toContain('recommend the next workout to log');
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
