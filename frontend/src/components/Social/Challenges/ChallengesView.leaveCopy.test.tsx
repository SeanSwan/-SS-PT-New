import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChallengesView from './ChallengesView';

const mocks = vi.hoisted(() => ({
  useChallenges: vi.fn(),
  toast: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('../../../hooks/useChallenges', () => ({
  useChallenges: mocks.useChallenges,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: {} }),
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

const assignedJoinedChallenge = {
  id: 'assigned-1',
  title: 'Three Planned Sessions',
  description: 'Complete trainer-assigned sessions this week.',
  category: 'strength',
  status: 'active',
  progress: 33,
  participants: 8,
  reward: '120 XP',
  joined: true,
  currentProgress: 1,
  maxProgress: 3,
  progressUnit: 'sessions',
  progressLabel: '1 of 3 sessions',
  targetLabel: '3 sessions target',
  participantStatus: 'active',
  checkInsCount: 1,
  tags: ['assigned-session'],
};

const renderChallengesView = () => render(
  <MemoryRouter>
    <ChallengesView />
  </MemoryRouter>,
);

describe('ChallengesView leave copy', () => {
  beforeEach(() => {
    mocks.useChallenges.mockReset();
    mocks.toast.mockReset();
    mocks.apiPost.mockReset();
    mocks.apiPost.mockResolvedValue({ data: { success: true } });
  });

  it('uses assigned workout completion copy when leaving assigned-session challenges', async () => {
    const leaveChallenge = vi.fn().mockResolvedValue(true);
    mocks.useChallenges.mockReturnValue({
      challenges: [assignedJoinedChallenge],
      loading: false,
      error: null,
      isDemoData: false,
      joinChallenge: vi.fn(),
      leaveChallenge,
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    renderChallengesView();

    await user.click(screen.getByRole('button', { name: 'Leave Challenge: Three Planned Sessions' }));

    const dialog = screen.getByRole('dialog', { name: /leave challenge/i });
    expect(dialog).toHaveTextContent('Three Planned Sessions will stop syncing from future assigned workout completions');
    expect(dialog).not.toHaveTextContent('future workouts');

    await user.click(within(dialog).getByRole('button', { name: /leave challenge/i }));

    await waitFor(() => expect(leaveChallenge).toHaveBeenCalledWith('assigned-1'));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Challenge left',
      description: 'Three Planned Sessions will stop syncing from future assigned workout completions.',
    }));
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({
      description: 'Three Planned Sessions will stop syncing from future workouts.',
    }));
  });
});
