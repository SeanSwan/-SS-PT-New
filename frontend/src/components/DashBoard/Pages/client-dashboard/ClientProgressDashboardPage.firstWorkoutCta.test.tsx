/**
 * ClientProgressDashboardPage first-workout CTA — Slice 13 tests
 * ==============================================================
 * Locks: a zero-history non-Guardian client sees the "Start your progress
 * story" card with a 44px CTA that routes to the logger with today's plan;
 * any real history (workouts this week OR personal records) hides it.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

const mockAxiosGet = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ get: mockAxiosGet }));
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 42 }, authAxios: mockAuthAxios }),
}));

vi.mock('../../../../hooks/gamification/useGamificationData', () => ({
  getSafeGamificationIdSegment: (id: unknown) => String(id),
  useGamificationData: () => ({
    profile: {
      data: {
        id: '42', points: 0, level: 1, tier: 'bronze', streakDays: 0,
        achievements: [], nextLevelProgress: 0, nextLevelPoints: 100,
      },
    },
  }),
}));

vi.mock('../../../../hooks/useSubscription', () => ({
  useSubscription: () => ({ hasGuardianAccess: false }),
}));

vi.mock('../../../AdvancedGamification/components/CompanionPet/CompanionPet', () => ({
  default: () => <div data-testid="companion-pet" />,
}));
vi.mock('../../../Shared/CrystallineLockOverlay', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('./CanonicalProgressChartsGrid', () => ({
  default: () => <div data-testid="canonical-progress-charts-grid" />,
}));

import ClientProgressDashboardPage from './ClientProgressDashboardPage';

const recapWith = (workouts: number) => ({
  data: {
    success: true,
    data: {
      thisWeek: { totalXP: 0, workouts, surpriseMultipliers: 0 },
      lastWeek: { totalXP: 0, workouts: 0 },
      trends: { xpChange: 0, workoutChange: 0, xpDirection: 'flat', workoutDirection: 'flat' },
      current: { streak: 0, longestStreak: 0, level: 1, tier: 'bronze', totalXP: 0 },
      weekStarting: '2026-06-29T00:00:00.000Z',
    },
  },
});

const wire = (workouts: number, records: unknown[]) => {
  mockAxiosGet.mockImplementation((url: string) => {
    if (url.includes('weekly-recap')) return Promise.resolve(recapWith(workouts));
    if (url.includes('personal-records')) return Promise.resolve({ data: { success: true, data: records } });
    return Promise.resolve({ data: {} });
  });
};

beforeEach(() => {
  mockAxiosGet.mockReset();
  mockNavigate.mockReset();
});

describe('ClientProgressDashboardPage first-workout CTA', () => {
  it('shows for a zero-history client and routes to the logger with today plan', async () => {
    wire(0, []);
    render(<ClientProgressDashboardPage />);
    const cta = await screen.findByRole('button', { name: 'Log your first workout' });
    expect(screen.getByTestId('first-workout-cta')).toBeInTheDocument();
    await userEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');
  });

  it('hides once any workout exists this week', async () => {
    wire(3, []);
    render(<ClientProgressDashboardPage />);
    await waitFor(() => expect(mockAxiosGet).toHaveBeenCalled());
    await screen.findAllByText('3');
    expect(screen.queryByTestId('first-workout-cta')).not.toBeInTheDocument();
  });

  it('hides when personal records exist even with a quiet week', async () => {
    wire(0, [{ exerciseName: 'Bench Press', weight: 185, reps: 5, unit: 'lbs' }]);
    render(<ClientProgressDashboardPage />);
    await screen.findByText('Bench Press');
    expect(screen.queryByTestId('first-workout-cta')).not.toBeInTheDocument();
  });
});
