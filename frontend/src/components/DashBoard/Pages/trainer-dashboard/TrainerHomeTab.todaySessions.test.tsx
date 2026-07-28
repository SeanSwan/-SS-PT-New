import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainerSession } from '../../../../hooks/useTrainerTodaySessions';
import { useTrainerTodaySessions } from '../../../../hooks/useTrainerTodaySessions';
// These render tests mount TrainerHomeTab outside the app Redux provider; the inbox has its own coverage.
vi.mock('../../../Communications/CommunicationsInboxStrip', () => ({
  default: () => null,
}));

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

  it('surfaces the next actionable session as one-tap Coach and Log actions', async () => {
    const sessions: TrainerSession[] = [
      {
        id: 91,
        sessionDate: '2099-05-31T19:00:00.000Z',
        duration: 45,
        userId: 51,
        client: { id: 51, firstName: 'Grace', lastName: 'Hopper' },
        status: 'scheduled',
      },
      {
        id: 88,
        sessionDate: '2099-05-31T16:00:00.000Z',
        duration: 45,
        userId: 42,
        client: { id: 42, firstName: 'Ada', lastName: 'Lovelace' },
        sessionType: { creditsRequired: 2 },
        status: 'scheduled',
      },
    ];

    mockedUseTrainerTodaySessions.mockReturnValue({
      sessions,
      loading: false,
      error: null,
      stats: {
        clientsToday: 2,
        sessionsToday: 2,
        hoursLogged: 1.5,
        completionRate: 0,
      },
    });

    const user = userEvent.setup();
    render(<TrainerHomeTab />);

    const nextAction = screen.getByRole('region', { name: /next trainer action/i });
    expect(within(nextAction).getByText('Next client')).toBeInTheDocument();
    expect(within(nextAction).getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /coach next session for ada lovelace/i }));
    let route = mockNavigate.mock.calls.at(-1)?.[0] as string;
    let url = new URL(route, 'https://sswanstudios.test');
    expect(url.pathname).toBe('/dashboard/trainer/coach-assistant');
    expect(url.searchParams.get('clientId')).toBe('42');
    expect(url.searchParams.get('sessionId')).toBe('88');

    await user.click(screen.getByRole('button', { name: /log next session for ada lovelace/i }));
    route = mockNavigate.mock.calls.at(-1)?.[0] as string;
    url = new URL(route, 'https://sswanstudios.test');
    expect(url.pathname).toBe('/dashboard/trainer/log-workout');
    expect(url.searchParams.get('clientId')).toBe('42');
    expect(url.searchParams.get('loadPlan')).toBe('today');

    await user.click(screen.getByRole('button', { name: /open full trainer schedule/i }));
    expect(mockNavigate.mock.calls.at(-1)?.[0]).toBe('/dashboard/trainer/schedule');
  });

  it('keeps a low-click trainer logging card visible when no session is actionable', async () => {
    mockedUseTrainerTodaySessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      stats: {
        clientsToday: 0,
        sessionsToday: 0,
        hoursLogged: 0,
        completionRate: 0,
      },
    });

    const user = userEvent.setup();
    render(<TrainerHomeTab />);

    const nextAction = screen.getByRole('region', { name: /next trainer action/i });
    expect(within(nextAction).getByText('Build the day')).toBeInTheDocument();
    expect(within(nextAction).getByRole('heading', { name: /start with a workout log/i })).toBeInTheDocument();

    await user.click(within(nextAction).getByRole('button', { name: /pick a client to log a workout/i }));
    expect(mockNavigate.mock.calls.at(-1)?.[0]).toBe('/dashboard/trainer/clients?intent=log_workout');

    await user.click(within(nextAction).getByRole('button', { name: /plan trainer day in schedule/i }));
    expect(mockNavigate.mock.calls.at(-1)?.[0]).toBe('/dashboard/trainer/schedule');

    await user.click(within(nextAction).getByRole('button', { name: /ask coach for trainer day triage/i }));
    const coachRoute = mockNavigate.mock.calls.at(-1)?.[0] as string;
    const coachUrl = new URL(coachRoute, 'https://sswanstudios.test');
    expect(coachUrl.pathname).toBe('/dashboard/trainer/coach-assistant');
    expect(coachUrl.searchParams.get('teachPrompt')).toMatch(/trainer Home/i);
    expect(coachUrl.searchParams.get('teachPrompt')).toContain('0 sessions today');

    expect(within(nextAction).queryByRole('button', { name: /open trainer client roster/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open schedule/i })).toHaveAttribute('type', 'button');

    await user.click(screen.getByRole('button', { name: /primary trainer action: log workout/i }));
    expect(mockNavigate.mock.calls.at(-1)?.[0]).toBe('/dashboard/trainer/clients?intent=log_workout');
    expect(screen.getByRole('button', { name: /primary trainer action: log workout/i })).toHaveAttribute('type', 'button');
  });

  it('routes a scheduled client session into Swan Coach with booked-session dictation context', async () => {
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

    await user.click(screen.getByRole('button', { name: /dictate workout with swan coach for ada lovelace/i }));

    const route = mockNavigate.mock.calls[0]?.[0] as string;
    const url = new URL(route, 'https://sswanstudios.test');

    expect(url.pathname).toBe('/dashboard/trainer/coach-assistant');
    expect(url.searchParams.get('clientId')).toBe('42');
    expect(url.searchParams.get('intent')).toBe('log_workout');
    expect(url.searchParams.get('sessionId')).toBe('88');
    expect(url.searchParams.get('sessionDate')).toBe('2026-05-31T16:00:00.000Z');
    expect(url.searchParams.get('sessionCredits')).toBe('2');
    expect(url.searchParams.get('source')).toBe('master-schedule');
    expect(url.searchParams.get('sourcePath')).toBe('/dashboard/trainer/schedule');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/trainer/overview');
  });

  it('offers a one-tap schedule route when more than five sessions are hidden', async () => {
    const sessions: TrainerSession[] = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      sessionDate: `2026-05-31T1${index}:00:00.000Z`,
      duration: 45,
      userId: index + 10,
      client: {
        id: index + 10,
        firstName: `Client${index}`,
        lastName: 'Today',
      },
      status: 'scheduled',
    }));

    mockedUseTrainerTodaySessions.mockReturnValue({
      sessions,
      loading: false,
      error: null,
      stats: {
        clientsToday: 6,
        sessionsToday: 6,
        hoursLogged: 4.5,
        completionRate: 0,
      },
    });

    const user = userEvent.setup();
    render(<TrainerHomeTab />);

    expect(screen.getAllByRole('button', { name: /log workout for client/i })).toHaveLength(5);

    const viewAllButton = screen.getByRole('button', { name: /view all 6 sessions/i });
    await user.click(viewAllButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/trainer/schedule');
  });
});
