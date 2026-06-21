import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockAxiosGet = vi.hoisted(() => vi.fn());
const malformedProfile = vi.hoisted(() => ({
  id: '42',
  points: [250],
  level: [3],
  tier: 'unknown-tier',
  streakDays: '1e2',
  achievements: [],
  rewards: [],
  milestones: [],
  leaderboardPosition: 0,
  recentTransactions: [],
  nextLevelProgress: '1e2',
  nextLevelPoints: 3000,
  nextTierProgress: 0,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42 },
    authAxios: { get: mockAxiosGet },
  }),
}));

vi.mock('../../../../hooks/gamification/useGamificationData', () => ({
  getSafeGamificationIdSegment: (value: unknown) => {
    const segment = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
    return /^[1-9]\d*$/.test(segment) && Number.isSafeInteger(Number(segment)) ? segment : null;
  },
  useGamificationData: () => ({
    profile: { data: malformedProfile, isLoading: false, error: null },
    achievements: { data: [] },
    rewards: { data: [] },
    leaderboard: { data: [] },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    isPro: false,
    isElite: false,
    isTrial: true,
    tier: 'trial',
  }),
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
import { normalizeClientPersonalRecords } from './ClientProgressDashboardPage.records';

describe('ClientProgressDashboardPage malformed metric hardening', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockAxiosGet.mockReset();
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('weekly-recap')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              thisWeek: {
                totalXP: [420],
                workouts: '0x5',
                surpriseMultipliers: ['2'],
              },
              current: {
                streak: '1e2',
              },
            },
          },
        });
      }
      if (url.includes('personal-records')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('clamps malformed gamification and weekly progress numbers before rendering', async () => {
    render(<ClientProgressDashboardPage />);

    const levelProgress = await screen.findByRole('progressbar', { name: /level progress/i });
    expect(levelProgress).toHaveAttribute('aria-valuemin', '0');
    expect(levelProgress).toHaveAttribute('aria-valuemax', '100');
    expect(levelProgress).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0%')).toBeInTheDocument();

    const levelCard = screen.getByText(/^Level$/).closest('div') as HTMLElement;
    const totalXpCard = screen.getByText(/^Total XP$/).closest('div') as HTMLElement;
    const weekWorkoutsCard = screen.getByText(/^Wk Workouts$/).closest('div') as HTMLElement;
    const streakCard = screen.getByText(/^Streak$/).closest('div') as HTMLElement;
    const weekBonusesCard = screen.getByText(/^Bonuses$/).parentElement as HTMLElement;
    const weekXpCard = screen.getByText(/^XP Earned$/).parentElement as HTMLElement;

    expect(within(levelCard).getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Bronze Forge')).toBeInTheDocument();
    expect(within(totalXpCard).getByText('0')).toBeInTheDocument();
    expect(within(weekWorkoutsCard).getByText('0')).toBeInTheDocument();
    expect(within(streakCard).getByText('0d')).toBeInTheDocument();
    expect(within(weekBonusesCard).getByText('0')).toBeInTheDocument();
    expect(within(weekXpCard).getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
    expect(screen.queryByText('250')).not.toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
    expect(screen.queryByText('100d')).not.toBeInTheDocument();
    expect(screen.queryByText('420')).not.toBeInTheDocument();
  });

  it('normalizes malformed personal-record rows before rendering', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('weekly-recap')) {
        return Promise.resolve({ data: { data: { thisWeek: {}, current: {} } } });
      }
      if (url.includes('personal-records')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                exerciseName: { unsafe: 'object' },
                weight: { unsafe: 185 },
                reps: { unsafe: 5 },
                unit: { unsafe: 'lbs' },
              },
              {
                exercise: 'Squat',
                estimated1RM: '225',
                reps: '3',
                unit: 'NaN',
              },
              {
                exercise: 'Bench Press',
                weight: '-225lbs',
                reps: '-3 reps',
                unit: 'lbs',
              },
              {
                exercise: 'Pull-up',
                weight: 'Infinity lbs',
                reps: 'NaN reps',
                unit: 'lbs',
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClientProgressDashboardPage />);

    expect(await screen.findByText(/^Exercise$/)).toBeInTheDocument();
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('225lbs')).toBeInTheDocument();
    expect(screen.getByText('3 reps')).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Pull-up')).toBeInTheDocument();
    expect(screen.queryByText(/-225/)).not.toBeInTheDocument();
    expect(screen.queryByText(/-3 reps/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Infinity/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('drops arbitrary metric text and malformed record dates', () => {
    expect(normalizeClientPersonalRecords([
      {
        exerciseName: 'Clean',
        value: 'not a metric',
        reps: 'later',
        date: 'Invalid Date',
      },
      {
        exerciseName: 'Deadlift',
        value: '405',
        reps: '2 reps',
        date: '2026-02-30T00:00:00.000Z',
      },
      {
        exerciseName: 'Squat',
        value: '315',
        reps: undefined,
        date: '2026-04-13T00:00:00.000Z',
      },
    ])).toEqual([
      {
        key: 'Clean-0',
        exerciseName: 'Clean',
        valueText: '-',
        detailText: '',
      },
      {
        key: 'Deadlift-1',
        exerciseName: 'Deadlift',
        valueText: '405lbs',
        detailText: '2 reps',
      },
      {
        key: 'Squat-2',
        exerciseName: 'Squat',
        valueText: '315lbs',
        detailText: 'Apr 13, 2026',
      },
    ]);
  });
});
