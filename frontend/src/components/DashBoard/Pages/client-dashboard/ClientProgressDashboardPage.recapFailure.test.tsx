import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

const mockAxiosGet = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ get: mockAxiosGet }));
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, firstName: 'Test', lastName: 'Client' },
    authAxios: mockAuthAxios,
  }),
}));

vi.mock('../../../../hooks/gamification/useGamificationData', () => ({
  getSafeGamificationIdSegment: (value: unknown) => {
    const segment = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
    return /^[1-9]\d*$/.test(segment) && Number.isSafeInteger(Number(segment)) ? segment : null;
  },
  useGamificationData: () => ({
    profile: {
      data: {
        id: '42',
        points: 2500,
        level: 5,
        tier: 'silver',
        streakDays: 0,
        achievements: [],
        rewards: [],
        milestones: [],
        leaderboardPosition: 0,
        recentTransactions: [],
        nextLevelProgress: 65,
        nextLevelPoints: 3000,
        nextTierProgress: 0,
      },
      isLoading: false,
      error: null,
    },
    achievements: { data: [] },
    rewards: { data: [] },
    leaderboard: { data: [] },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../../hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: false, isElite: false, isTrial: true, tier: 'trial' }),
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
import { extractWeeklyRecapPayload } from './ClientProgressDashboardPage.recap';

const personalRecordsEmpty = { data: { success: true, data: [] } };

describe('ClientProgressDashboardPage weekly recap failure state', () => {
  beforeEach(() => {
    mockAxiosGet.mockReset();
    mockNavigate.mockReset();
  });

  it('settles the weekly recap card when the recap request rejects', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('weekly-recap')) return Promise.reject(new Error('recap unavailable'));
      if (url.includes('personal-records')) return Promise.resolve(personalRecordsEmpty);
      return Promise.resolve({ data: {} });
    });

    render(<ClientProgressDashboardPage />);

    expect(
      await screen.findByRole('status', { name: /weekly recap unavailable/i }),
    ).toHaveTextContent(/no weekly recap available yet/i);
  });

  it('settles the weekly recap card when the recap client throws synchronously', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('weekly-recap')) throw new Error('recap client failed');
      if (url.includes('personal-records')) return Promise.resolve(personalRecordsEmpty);
      return Promise.resolve({ data: {} });
    });

    render(<ClientProgressDashboardPage />);

    expect(
      await screen.findByRole('status', { name: /weekly recap unavailable/i }),
    ).toHaveTextContent(/no weekly recap available yet/i);
  });

  it('settles the weekly recap card when the recap endpoint returns a failed envelope', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('weekly-recap')) {
        return Promise.resolve({ data: { success: false, message: 'recap unavailable' } });
      }
      if (url.includes('personal-records')) return Promise.resolve(personalRecordsEmpty);
      return Promise.resolve({ data: {} });
    });

    render(<ClientProgressDashboardPage />);

    expect(
      await screen.findByRole('status', { name: /weekly recap unavailable/i }),
    ).toHaveTextContent(/no weekly recap available yet/i);
  });

  it('does not treat primitive or failed envelope responses as recap data', () => {
    expect(extractWeeklyRecapPayload(null)).toBeNull();
    expect(extractWeeklyRecapPayload('failed')).toBeNull();
    expect(extractWeeklyRecapPayload({ success: false, message: 'private failure' })).toBeNull();
    expect(extractWeeklyRecapPayload({ success: true })).toBeNull();
    expect(extractWeeklyRecapPayload({ message: 'not a recap' })).toBeNull();
  });

  it('preserves direct recap objects and successful empty data envelopes', () => {
    expect(extractWeeklyRecapPayload({
      current: { streak: 4 },
      thisWeek: { workouts: 2, totalXP: 120 },
    })).toEqual({
      current: { streak: 4 },
      thisWeek: { workouts: 2, totalXP: 120 },
    });
    expect(extractWeeklyRecapPayload({ success: true, data: {} })).toEqual({});
  });
});
