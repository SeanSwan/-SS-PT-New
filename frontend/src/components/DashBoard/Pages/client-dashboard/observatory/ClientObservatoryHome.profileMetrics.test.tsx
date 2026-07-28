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
  ProductionTokenManager: {
    getToken: () => null,
  },
}));

vi.mock('../../../../../context/ThemeContext', () => ({
  UniversalThemeToggle: () => null,
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
  useMessageSummary: () => ({
    data: [],
    isLoading: false,
  }),
  useNotificationSummary: () => ({
    data: { notifications: [] },
    isLoading: false,
  }),
  useWorkoutSessions: () => ({
    data: [],
    isLoading: false,
  }),
  useTrendingHashtags: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('../../../../../hooks/social/useSocialFeed', () => ({
  useSocialFeed: () => ({
    posts: [],
    isLoading: false,
    error: null,
    createPost: mockCreatePostMutate,
    isCreatingPost: false,
  }),
}));

// These render tests mount ClientHomeTab outside the app Redux provider; the inbox has its own coverage.
vi.mock('../../../../Communications/CommunicationsInboxStrip', () => ({
  default: () => null,
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

    const pointsMetric = screen.getByText('Swan Points').parentElement as HTMLElement;
    const levelMetric = screen.getByText('Momentum Tier').parentElement as HTMLElement;
    const streakMetric = screen.getByText('Day Streak').parentElement as HTMLElement;

    expect(within(pointsMetric).getByText('0')).toBeInTheDocument();
    expect(within(levelMetric).getByText('Level 1')).toBeInTheDocument();
    expect(within(streakMetric).getByText('0')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Level progress' })).toHaveAttribute('aria-valuenow', '100');

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

    await user.type(screen.getByLabelText('Write a community post'), 'Logged a milestone today');
    await user.click(screen.getByRole('button', { name: /^post$/i }));

    await waitFor(() => {
      expect(mockCreatePostMutate).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText('+50 XP')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
