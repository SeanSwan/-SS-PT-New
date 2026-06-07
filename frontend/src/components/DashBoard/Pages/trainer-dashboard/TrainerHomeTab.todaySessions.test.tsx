import { render, screen } from '@testing-library/react';
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

describe('TrainerHomeTab today session logging', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('routes a scheduled client session directly into the scoped workout logger', async () => {
    const session: TrainerSession = {
      id: 88,
      sessionDate: '2026-05-31T16:00:00.000Z',
      duration: 45,
      userId: 42,
      client: {
        id: 42,
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
      sessionType: {
        creditsRequired: 2,
      },
      status: 'scheduled',
    };

    mockedUseTrainerTodaySessions.mockReturnValue({
      sessions: [session],
      loading: false,
      error: null,
      stats: {
        clientsToday: 1,
        sessionsToday: 1,
        hoursLogged: 0.75,
        completionRate: 0,
      },
    });

    const user = userEvent.setup();
    render(<TrainerHomeTab />);

    await user.click(screen.getByRole('button', { name: /log workout for ada lovelace/i }));

    const route = mockNavigate.mock.calls[0]?.[0] as string;
    const url = new URL(route, 'https://sswanstudios.test');

    expect(url.pathname).toBe('/dashboard/trainer/log-workout');
    expect(url.searchParams.get('clientId')).toBe('42');
    expect(url.searchParams.get('sessionId')).toBe('88');
    expect(url.searchParams.get('sessionDate')).toBe('2026-05-31T16:00:00.000Z');
    expect(url.searchParams.get('sessionCredits')).toBe('2');
    expect(url.searchParams.get('source')).toBe('master-schedule');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/trainer/overview');
    expect(url.searchParams.get('loadPlan')).toBe('today');
  });
});
