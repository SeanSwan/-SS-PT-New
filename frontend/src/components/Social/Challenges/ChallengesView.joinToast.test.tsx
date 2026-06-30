import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

const assignedChallenge = {
  id: 'assigned-1',
  title: 'Three Planned Sessions',
  description: 'Complete trainer-assigned sessions this week.',
  category: 'strength',
  status: 'active',
  progress: 0,
  participants: 8,
  reward: '120 XP',
  joined: false,
  currentProgress: 0,
  maxProgress: 3,
  progressUnit: 'sessions',
  progressLabel: '0 of 3 sessions',
  targetLabel: '3 sessions target',
  participantStatus: undefined,
  checkInsCount: 0,
  tags: ['assigned-session'],
};

const renderChallengesView = () => render(
  <MemoryRouter>
    <ChallengesView />
  </MemoryRouter>,
);

describe('ChallengesView join toast copy', () => {
  beforeEach(() => {
    mocks.useChallenges.mockReset();
    mocks.toast.mockReset();
    mocks.apiPost.mockReset();
    mocks.apiPost.mockResolvedValue({ data: { success: true } });
  });

  it('uses assigned workout completion copy after joining assigned-session challenges', async () => {
    const joinChallenge = vi.fn().mockResolvedValue(true);
    mocks.useChallenges.mockReturnValue({
      challenges: [assignedChallenge],
      loading: false,
      error: null,
      isDemoData: false,
      joinChallenge,
      leaveChallenge: vi.fn(),
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    renderChallengesView();

    await user.click(screen.getByRole('button', { name: 'Join Challenge: Three Planned Sessions' }));

    await waitFor(() => expect(joinChallenge).toHaveBeenCalledWith('assigned-1'));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Challenge joined',
      description: 'Three Planned Sessions is now syncing from assigned workout completions.',
      variant: 'default',
    }));
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({
      description: 'Three Planned Sessions is now syncing from your completed workouts.',
    }));
  });
});
