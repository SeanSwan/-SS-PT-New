import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockApiGet = vi.hoisted(() => vi.fn());
const mockCreatePostMutate = vi.hoisted(() => vi.fn());
const mockAuthUser = vi.hoisted(() => ({
  current: {
    id: 42,
    firstName: 'Test',
    username: 'testclient',
    clientSource: 'swanstudios',
  } as Record<string, unknown>,
}));
const mockGamificationProfile = vi.hoisted(() => ({
  current: {
    id: '42',
    firstName: 'Test',
    username: 'testclient',
    points: 2500,
    level: 5,
    tier: 'silver_edge',
    streakDays: 12,
    nextLevelProgress: 65,
  } as Record<string, unknown>,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}));

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser.current,
  }),
}));

vi.mock('../../../../../services/api.service', () => ({
  default: {
    get: mockApiGet,
  },
}));

vi.mock('../../../../../hooks/gamification/useGamificationData', () => ({
  useGamificationData: () => ({
    profile: {
      data: mockGamificationProfile.current,
      isLoading: false,
      error: null,
    },
    achievements: {
      data: [],
      isLoading: false,
      error: null,
    },
    levelProgress: {
      progressPercent: mockGamificationProfile.current.nextLevelProgress,
    },
    isLoading: false,
  }),
}));

vi.mock('../../../../../hooks/useDashboardQueries', () => ({
  useSocialFeed: () => ({
    data: [],
    isLoading: false,
  }),
  useSocialChallenges: () => ({
    data: [],
    isLoading: false,
  }),
  useLeaderboard: () => ({
    data: [],
    isLoading: false,
  }),
  useCreatePost: () => ({
    mutateAsync: mockCreatePostMutate,
    isPending: false,
  }),
}));

import ClientHomeTab from '../ClientHomeTab';

describe('ClientObservatoryHome profile metric truth', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockCreatePostMutate.mockReset();
    mockCreatePostMutate.mockResolvedValue({ success: true });
    mockApiGet.mockReset();
    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: null,
        plan: null,
      },
    });
    mockAuthUser.current = {
      id: 42,
      firstName: 'Test',
      username: 'testclient',
      clientSource: 'swanstudios',
    };
    mockGamificationProfile.current = {
      id: '42',
      firstName: 'Test',
      username: 'testclient',
      points: 2500,
      level: 5,
      tier: 'silver_edge',
      streakDays: 12,
      nextLevelProgress: 65,
    };
  });

  it('sanitizes malformed gamification profile metrics before they reach the visible observatory', async () => {
    mockGamificationProfile.current = {
      ...mockGamificationProfile.current,
      points: -500,
      level: Number.NaN,
      streakDays: Number.POSITIVE_INFINITY,
      nextLevelProgress: 150,
    };

    render(<ClientHomeTab />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/api/workouts/42/current');
    });

    const profileMomentum = screen.getByLabelText('Profile momentum');
    expect(within(profileMomentum).getByText('0')).toBeInTheDocument();
    expect(within(profileMomentum).getByText('1')).toBeInTheDocument();
    expect(within(profileMomentum).getByText('0d')).toBeInTheDocument();
    expect(screen.getByText('Level 1 orbit, 100% toward the next unlock.')).toBeInTheDocument();
    expect(screen.getByText('0 day streak')).toBeInTheDocument();

    expect(document.body.textContent).not.toMatch(/NaN|Infinity|-500/);
  });

  it('does not coerce malformed quick-post awarded points into visible XP proof', async () => {
    mockCreatePostMutate.mockResolvedValueOnce({
      pointsAwarded: [50],
      pointMessage: 'You earned 50 points for sharing an update.',
    });
    const user = userEvent.setup();

    render(<ClientHomeTab />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/api/workouts/42/current');
    });

    await user.type(screen.getByLabelText('Create a community post'), 'Logged a milestone today');
    await user.click(screen.getByRole('button', { name: /^post$/i }));

    await waitFor(() => {
      expect(mockCreatePostMutate).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText('+50 XP')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
