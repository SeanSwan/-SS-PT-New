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
    mocks.authAxios = {};
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
    expect(screen.getByRole('link', { name: /log workout/i })).toHaveAttribute(
      'href',
      '/dashboard/client/log-workout?loadPlan=today',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps upcoming and completed empty states aligned with the Log Workout action', async () => {
    mocks.useChallenges.mockReturnValue(hookState());

    const user = userEvent.setup();
    renderChallengesView();

    await user.click(screen.getByRole('tab', { name: /upcoming/i }));
    expect(await screen.findByText(/keep challenge-ready progress moving/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log workout/i })).toHaveAttribute(
      'href',
      '/dashboard/client/log-workout?loadPlan=today',
    );

    await user.click(screen.getByRole('tab', { name: /completed/i }));
    expect(await screen.findByText(/Log today's workout/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log workout/i })).toHaveAttribute(
      'href',
      '/dashboard/client/log-workout?loadPlan=today',
    );
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
  it('shows a generic share failure message without leaking backend details', async () => {
    const sharePost = vi.fn().mockRejectedValue({
      response: { data: { message: 'SQL timeout for userId=42' } },
    });
    mocks.authAxios = { post: sharePost };
    mocks.useChallenges.mockReturnValue(hookState({
      challenges: [{
        ...joinedChallenge,
        id: 'completed-1',
        title: 'Ten Session Sprint',
        status: 'completed',
        progress: 100,
        participantStatus: 'completed',
      }],
    }));

    const user = userEvent.setup();
    renderChallengesView();

    await user.click(screen.getByRole('tab', { name: /completed/i }));
    await user.click(await screen.findByRole('button', { name: 'Share to Feed: Ten Session Sprint' }));

    await waitFor(() => expect(sharePost).toHaveBeenCalledTimes(1));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Unable to share challenge',
      description: 'Please try again from your challenge card.',
      variant: 'destructive',
    }));
    expect(JSON.stringify(mocks.toast.mock.calls)).not.toContain('SQL timeout');
    expect(JSON.stringify(mocks.toast.mock.calls)).not.toContain('userId=42');
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