import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainerSession } from '../../../../hooks/useTrainerTodaySessions';
import { useTrainerTodaySessions } from '../../../../hooks/useTrainerTodaySessions';
import TrainerHomeTab from './TrainerHomeTab';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { firstName: 'Sean', username: 'coach' } }),
}));

vi.mock('../../../../hooks/gamification/useGamificationData', () => ({
  useGamificationData: () => ({ profile: { data: { level: 7 } } }),
}));

vi.mock('../../../../hooks/useTrainerTodaySessions', async () => {
  const actual = await vi.importActual<typeof import('../../../../hooks/useTrainerTodaySessions')>(
    '../../../../hooks/useTrainerTodaySessions',
  );
  return {
    ...actual,
    useTrainerTodaySessions: vi.fn(),
  };
});

vi.mock('./SwanCoachDockTrainer', () => ({
  default: () => <div data-testid="trainer-coach-dock" />,
}));

const mockedUseTrainerTodaySessions = vi.mocked(useTrainerTodaySessions);

const scheduledSession: TrainerSession = {
  id: 88,
  sessionDate: '2099-05-31T16:00:00.000Z',
  duration: 45,
  userId: 42,
  client: { id: 42, firstName: 'Ada', lastName: 'Lovelace' },
  sessionType: { creditsRequired: 2 },
  status: 'scheduled',
};

describe('TrainerHomeTab Build Plan handoffs', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockedUseTrainerTodaySessions.mockReturnValue({
      sessions: [scheduledSession],
      loading: false,
      error: null,
      stats: {
        clientsToday: 1,
        sessionsToday: 1,
        hoursLogged: 0.75,
        completionRate: 0,
      },
    });
  });

  it('surfaces a next-session Build action that opens the selected-client Workout Planner', async () => {
    const user = userEvent.setup();
    render(<TrainerHomeTab />);

    const nextAction = screen.getByRole('region', { name: /next trainer action/i });
    await user.click(within(nextAction).getByRole('button', { name: /build plan from next action for ada lovelace/i }));

    const route = mockNavigate.mock.calls.at(-1)?.[0] as string;
    const url = new URL(route, 'https://sswanstudios.test');

    expect(url.pathname).toBe('/dashboard/trainer/workout-planner');
    expect(url.searchParams.get('clientId')).toBe('42');
    expect(url.searchParams.get('sessionId')).toBe('88');
    expect(url.searchParams.get('sessionDate')).toBe('2099-05-31T16:00:00.000Z');
    expect(url.searchParams.get('source')).toBe('trainer-overview');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/trainer/overview');
  });

  it('keeps Coach, Build, and Log available on the session row without extra tab hunting', async () => {
    const user = userEvent.setup();
    render(<TrainerHomeTab />);

    await user.click(screen.getByRole('button', { name: /build plan for ada lovelace/i }));

    const route = mockNavigate.mock.calls.at(-1)?.[0] as string;
    const url = new URL(route, 'https://sswanstudios.test');

    expect(screen.getByRole('button', { name: /dictate workout with swan coach for ada lovelace/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log workout for ada lovelace/i })).toBeInTheDocument();
    expect(url.pathname).toBe('/dashboard/trainer/workout-planner');
    expect(url.searchParams.get('clientId')).toBe('42');
  });
});
