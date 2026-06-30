/**
 * ChallengesView render contract
 * ==============================
 * Verifies the mounted client challenge surface distinguishes API outage from
 * the ordinary no-challenges state and offers explicit retry/leave feedback.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChallengesView from './ChallengesView';

const mocks = vi.hoisted(() => ({
  useChallenges: vi.fn(),
  toast: vi.fn(),
  authAxios: {},
  apiPost: vi.fn(),
}));

vi.mock('../../../hooks/useChallenges', () => ({
  useChallenges: mocks.useChallenges,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mocks.authAxios }),
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../../../services/api.service', () => ({
  default: { post: mocks.apiPost },
}));

vi.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

const joinedChallenge = {
  id: 'challenge-1',
  title: '150-Minute Week',
  description: 'Build consistent training minutes',
  category: 'strength',
  status: 'active',
  progress: 60,
  participants: 18,
  reward: '250 XP',
  joined: true,
  currentProgress: 90,
  maxProgress: 150,
  progressUnit: 'minutes',
  progressLabel: '90 of 150 minutes',
  targetLabel: '150 minutes target',
  participantStatus: 'active',
  checkInsCount: 2,
};

const renderChallengesView = () => render(
  <MemoryRouter>
    <ChallengesView />
  </MemoryRouter>,
);

const hookState = (overrides: Record<string, unknown> = {}) => ({
  challenges: [],
  loading: false,
  error: null,
  isDemoData: false,
  joinChallenge: vi.fn(),
  leaveChallenge: vi.fn(),
  refetch: vi.fn(),
  ...overrides,
});

describe('ChallengesView render contract', () => {
  beforeEach(() => {
    mocks.useChallenges.mockReset();
    mocks.toast.mockReset();
    mocks.apiPost.mockReset();
    mocks.apiPost.mockResolvedValue({ data: { success: true } });
  });

  it('renders a retryable unavailable panel instead of the normal empty state when challenge fetch fails', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    mocks.useChallenges.mockReturnValue(hookState({
      error: 'Challenge list unavailable. Refresh to try again.',
      refetch,
    }));

    const user = userEvent.setup();
    renderChallengesView();

    expect(screen.getByRole('alert')).toHaveTextContent('Challenges unavailable');
    expect(screen.getByText('Challenge list unavailable. Refresh to try again.')).toBeInTheDocument();
    expect(screen.queryByText('No active challenges')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
  it('renders workout-first copy for the normal empty active challenge state', () => {
    mocks.useChallenges.mockReturnValue(hookState());

    renderChallengesView();

    expect(screen.getByText('No live challenges')).toBeInTheDocument();
    expect(screen.getByText(/Log your next workout/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log workout/i })).toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('renders a real-data challenge pulse and status counts from the hook state', () => {
    mocks.useChallenges.mockReturnValue(hookState({
      challenges: [
        joinedChallenge,
        { ...joinedChallenge, id: 'challenge-2', title: 'Open Strength Squad', joined: false, progress: 0 },
        { ...joinedChallenge, id: 'challenge-3', title: 'Scheduled Phase', status: 'upcoming', joined: false, progress: 0, startsIn: '2 days' },
        { ...joinedChallenge, id: 'challenge-4', title: 'Finished Run', status: 'completed', participantStatus: 'completed', progress: 100 },
      ],
    }));

    renderChallengesView();

    const pulse = screen.getByLabelText('Challenge board pulse');
    expect(within(pulse).getByText('Live').parentElement).toHaveTextContent('Live2');
    expect(within(pulse).getByText('Joined').parentElement).toHaveTextContent('Joined2');
    expect(within(pulse).getByText('Check-ins').parentElement).toHaveTextContent('Check-ins4');
    expect(within(pulse).getByText('Ready').parentElement).toHaveTextContent('Ready1');
    expect(within(pulse).getByText('Completed').parentElement).toHaveTextContent('Completed1');
    expect(screen.getByRole('tab', { name: /Active 2/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Upcoming 1/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Completed 1/i })).toBeInTheDocument();
  });
  it('keeps status counts scoped to the selected challenge category', async () => {
    mocks.useChallenges.mockReturnValue(hookState({
      challenges: [
        joinedChallenge,
        { ...joinedChallenge, id: 'challenge-2', title: 'Cardio Sprint', category: 'cardio', joined: false, progress: 0 },
        { ...joinedChallenge, id: 'challenge-3', title: 'Scheduled Phase', status: 'upcoming', joined: false, progress: 0, startsIn: '2 days' },
        { ...joinedChallenge, id: 'challenge-4', title: 'Finished Run', category: 'cardio', status: 'completed', participantStatus: 'completed', progress: 100 },
      ],
    }));

    const user = userEvent.setup();
    renderChallengesView();

    expect(screen.getByRole('tab', { name: /Active 2/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cardio' }));

    expect(screen.getByRole('tab', { name: /Active 1/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Upcoming 0/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Completed 1/i })).toBeInTheDocument();
    expect(screen.queryByText('150-Minute Week')).not.toBeInTheDocument();
    expect(screen.getByText('Cardio Sprint')).toBeInTheDocument();
  });

  it('keeps upcoming and completed empty states aligned with the Log Workout action', async () => {
    mocks.useChallenges.mockReturnValue(hookState());

    const user = userEvent.setup();
    renderChallengesView();

    await user.click(screen.getByRole('tab', { name: /upcoming/i }));
    expect(await screen.findByText(/keep challenge-ready progress moving/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log workout/i })).toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');

    await user.click(screen.getByRole('tab', { name: /completed/i }));
    expect(await screen.findByText(/Log today's workout/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log workout/i })).toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');
  });

  it('records aggregate challenge view events once for rendered challenge cards', async () => {
    const secondChallenge = {
      ...joinedChallenge,
      id: 'challenge-2',
      title: 'Team Streak',
      joined: false,
      progress: 0,
      currentProgress: 0,
      progressLabel: '0 of 150 minutes',
    };
    mocks.useChallenges.mockReturnValue(hookState({
      challenges: [joinedChallenge, secondChallenge],
    }));

    const { rerender } = renderChallengesView();

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledTimes(2));
    expect(mocks.apiPost).toHaveBeenNthCalledWith(1, '/api/v1/gamification/challenges/challenge-1/view');
    expect(mocks.apiPost).toHaveBeenNthCalledWith(2, '/api/v1/gamification/challenges/challenge-2/view');

    rerender(
      <MemoryRouter>
        <ChallengesView />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledTimes(2));
  });

  it('does not record challenge views while the list is loading or unavailable', () => {
    mocks.useChallenges.mockReturnValue(hookState({
      challenges: [joinedChallenge],
      loading: true,
    }));

    const { rerender } = renderChallengesView();

    expect(mocks.apiPost).not.toHaveBeenCalled();

    mocks.useChallenges.mockReturnValue(hookState({
      challenges: [joinedChallenge],
      error: 'Challenge list unavailable. Refresh to try again.',
    }));

    rerender(
      <MemoryRouter>
        <ChallengesView />
      </MemoryRouter>,
    );

    expect(mocks.apiPost).not.toHaveBeenCalled();

    mocks.useChallenges.mockReturnValue(hookState({
      challenges: [joinedChallenge],
      isDemoData: true,
    }));

    rerender(
      <MemoryRouter>
        <ChallengesView />
      </MemoryRouter>,
    );

    expect(mocks.apiPost).not.toHaveBeenCalled();
  });

  it('keeps challenge view tracking fail-soft when analytics cannot be recorded', async () => {
    mocks.apiPost.mockRejectedValue(new Error('analytics offline'));
    mocks.useChallenges.mockReturnValue(hookState({
      challenges: [joinedChallenge],
    }));

    renderChallengesView();

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/gamification/challenges/challenge-1/view'));
    expect(screen.getByText('150-Minute Week')).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
  it('confirms and reports a successful leave action for joined challenges', async () => {
    const leaveChallenge = vi.fn().mockResolvedValue(true);
    mocks.useChallenges.mockReturnValue(hookState({
      challenges: [joinedChallenge],
      leaveChallenge,
    }));

    const user = userEvent.setup();
    renderChallengesView();

    await user.click(screen.getByRole('button', { name: /leave challenge/i }));

    const dialog = screen.getByRole('dialog', { name: /leave challenge/i });
    expect(dialog).toHaveTextContent('150-Minute Week will stop syncing from future workouts');

    await user.click(within(dialog).getByRole('button', { name: /leave challenge/i }));

    await waitFor(() => expect(leaveChallenge).toHaveBeenCalledWith('challenge-1'));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Challenge left',
      description: '150-Minute Week will stop syncing from future workouts.',
    }));
  });

  it('does not call the leave API when the user cancels the leave confirmation', async () => {
    const leaveChallenge = vi.fn().mockResolvedValue(true);
    mocks.useChallenges.mockReturnValue(hookState({
      challenges: [joinedChallenge],
      leaveChallenge,
    }));

    const user = userEvent.setup();
    renderChallengesView();

    await user.click(screen.getByRole('button', { name: /leave challenge/i }));

    const dialog = screen.getByRole('dialog', { name: /leave challenge/i });
    await user.click(within(dialog).getByRole('button', { name: /keep challenge/i }));

    expect(screen.queryByRole('dialog', { name: /leave challenge/i })).not.toBeInTheDocument();
    expect(leaveChallenge).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
