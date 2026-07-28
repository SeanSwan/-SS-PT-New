import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseWorkoutSessions = vi.fn();
const mockLocationState = vi.hoisted(() => ({ value: null as unknown }));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/dashboard/client/workouts',
    search: '',
    hash: '',
    key: 'test',
    state: mockLocationState.value,
  }),
}));

vi.mock('../../../../hooks/useDashboardQueries', () => ({
  useWorkoutSessions: (params: unknown) => mockUseWorkoutSessions(params),
}));

import ClientMyWorkoutsPage from './ClientMyWorkoutsPage';

describe('ClientMyWorkoutsPage challenge impact receipt', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLocationState.value = null;
    mockUseWorkoutSessions.mockReturnValue({
      data: [{
        id: 'workout-1',
        title: 'Workout Session',
        date: '2026-06-30T12:00:00Z',
        duration: 45,
        intensity: 7,
        totalSets: 8,
        totalReps: 80,
        totalWeight: 4000,
        logs: [],
      }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('shows the challenge impact carried from the workout logger save route state', () => {
    mockLocationState.value = {
      workoutChallengeProgress: {
        status: 'processed',
        updatedCount: 1,
        skippedCount: 0,
        headline: '1 challenge updated',
        updates: [{
          challengeId: 'minute-week',
          title: '150 Minute Week',
          delta: 45,
          progressUnit: 'minutes',
          currentProgress: 150,
          progressPercentage: 100,
          completed: true,
          xpEarned: 250,
        }],
      },
    };

    render(<ClientMyWorkoutsPage />);

    expect(screen.getByRole('status', { name: /challenge impact/i })).toBeInTheDocument();
    expect(screen.getByText('150 Minute Week completed')).toBeInTheDocument();
    expect(screen.getByText('+250 XP earned from this workout.')).toBeInTheDocument();
  });
});
