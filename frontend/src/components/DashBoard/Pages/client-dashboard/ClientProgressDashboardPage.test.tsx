/**
 * ClientProgressDashboardPage — canonical KPI truth tests
 * ========================================================
 * Locks the canonical /dashboard/client/progress surface against the
 * weekly-recap shape-mismatch regression discovered in the
 * canonical-surface-audit 2026-04-13:
 *
 *   Backend gamificationController.getWeeklyRecap returns
 *     { data: { thisWeek: { workouts, totalXP, surpriseMultipliers }, current: { streak, ... }, ... } }
 *   but the prior UI read flat fields like `totalWorkouts`, `workoutsThisWeek`,
 *   `exercisesCompleted`, `pointsEarned`, `streakDays` at the top level, so
 *   every weekly stat rendered as 0 (or silently fell back to wrong data
 *   like achievements count).
 *
 * These tests mock authAxios at the useAuth level and drive the component
 * with a realistic getWeeklyRecap payload, then assert the rendered numbers
 * match the real backend fields.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock react-router-dom ────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// ── Mock auth context (provides user + authAxios) ────────────────────────
const mockAxiosGet = vi.fn();
const mockUser = { id: 42, firstName: 'Test', lastName: 'Client' };
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    authAxios: { get: mockAxiosGet },
  }),
}));

// ── Mock useGamificationData — returns a baseline profile ───────────────
const mockGamificationProfile = {
  id: '42',
  firstName: 'Test',
  lastName: 'Client',
  username: 'testclient',
  points: 2500,
  level: 5,
  tier: 'silver' as const,
  streakDays: 0, // P1-1: hook bug zeros this — tracked separately
  achievements: [],
  rewards: [],
  milestones: [],
  leaderboardPosition: 0,
  recentTransactions: [],
  nextLevelProgress: 65,
  nextLevelPoints: 3000,
  nextTierProgress: 0,
};
vi.mock('../../../../hooks/gamification/useGamificationData', () => ({
  useGamificationData: () => ({
    profile: { data: mockGamificationProfile, isLoading: false, error: null },
    achievements: { data: [] },
    rewards: { data: [] },
    leaderboard: { data: [] },
    isLoading: false,
    error: null,
  }),
}));

// ── Mock useSubscription ─────────────────────────────────────────────────
vi.mock('../../../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    isPro: false,
    isElite: false,
    isTrial: true,
    tier: 'trial',
  }),
}));

// ── Stub the lazy children so the test doesn't try to load them ─────────
vi.mock('../../../UserDashboard/components/ProfileChartsGrid', () => ({
  default: () => <div data-testid="profile-charts-grid" />,
}));
vi.mock('../../../AdvancedGamification/components/CompanionPet/CompanionPet', () => ({
  default: () => <div data-testid="companion-pet" />,
}));
vi.mock('../../../Shared/CrystallineLockOverlay', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ClientProgressDashboardPage from './ClientProgressDashboardPage';

// ── Real-shape weekly-recap fixture — matches gamificationController.getWeeklyRecap ──
const realWeeklyRecapResponse = {
  data: {
    success: true,
    data: {
      thisWeek: {
        totalXP: 420,
        workouts: 5,
        surpriseMultipliers: 2,
      },
      lastWeek: {
        totalXP: 350,
        workouts: 4,
      },
      trends: {
        xpChange: 70,
        workoutChange: 1,
        xpDirection: 'up',
        workoutDirection: 'up',
      },
      current: {
        streak: 12,
        longestStreak: 20,
        level: 5,
        tier: 'silver',
        totalXP: 2500,
      },
      weekStarting: '2026-04-13T00:00:00.000Z',
    },
  },
};

const realPersonalRecordsResponse = {
  data: {
    success: true,
    // 3 records — PR count uniquely 3 so getByText('3') doesn't collide
    // with other numbers like surpriseMultipliers (2) or workouts (5).
    data: [
      { exerciseName: 'Bench Press', weight: 185, reps: 5, unit: 'lbs' },
      { exerciseName: 'Squat', weight: 245, reps: 3, unit: 'lbs' },
      { exerciseName: 'Deadlift', weight: 315, reps: 2, unit: 'lbs' },
    ],
  },
};

// Helper — wires the axios mock to return the real shapes per URL
const wireRealResponses = () => {
  mockAxiosGet.mockImplementation((url: string) => {
    if (url.includes('weekly-recap')) return Promise.resolve(realWeeklyRecapResponse);
    if (url.includes('personal-records')) return Promise.resolve(realPersonalRecordsResponse);
    return Promise.resolve({ data: {} });
  });
};

describe('ClientProgressDashboardPage — canonical KPI truth', () => {
  beforeEach(() => {
    mockAxiosGet.mockReset();
    mockNavigate.mockReset();
  });

  it('reads weekly-recap from the real nested shape (data.thisWeek.workouts) — not from flat legacy keys', async () => {
    wireRealResponses();
    render(<ClientProgressDashboardPage />);

    // Wait for the useEffect to fire and state to update
    await waitFor(() => {
      // The "This Week" recap card should show 5 workouts (real field)
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    // XP Earned should show 420 from thisWeek.totalXP
    expect(screen.getByText('420')).toBeInTheDocument();
  });

  it('renders streak from current.streak (12) when weekly-recap provides it, not 0', async () => {
    wireRealResponses();
    render(<ClientProgressDashboardPage />);

    await waitFor(() => {
      // Real streak from data.current.streak is 12 — must appear
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  it('does NOT render achievements.length in place of "Workouts" (the misleading fallback)', async () => {
    // Simulate a stale/empty weekly-recap response so the UI would have
    // historically fallen back to achievements.length. With the fix, it
    // should render 0 workouts instead of silently substituting achievements.
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('weekly-recap')) return Promise.resolve({ data: { data: {} } });
      if (url.includes('personal-records')) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: {} });
    });

    // Give the hook a profile with 7 achievements — the old code would
    // have shown "7" in the Workouts stat card on empty recap. New code
    // must show 0.
    mockGamificationProfile.achievements = new Array(7).fill(null).map((_, i) => ({
      id: `a${i}`,
      achievementId: `a${i}`,
      isCompleted: true,
      earnedAt: new Date().toISOString(),
    })) as any;

    render(<ClientProgressDashboardPage />);

    // Locate the "Wk Workouts" stat card specifically and scope assertions to it.
    // canonical-surface-audit 2026-04-13 strengthening: the previous version of
    // this test only asserted the label existed, never that the rendered value
    // was 0 or that 7 (achievements.length) was absent. That left the regression
    // unguarded — a revert to the achievements fallback would still pass.
    await waitFor(() => {
      expect(screen.getByText(/wk workouts/i)).toBeInTheDocument();
    });

    const weekWorkoutsLabel = screen.getByText(/wk workouts/i);
    // Walk up from the label to the containing StatCard (label + value siblings).
    const statCard = weekWorkoutsLabel.closest('div');
    expect(statCard).not.toBeNull();

    // HARD ASSERTIONS: value must be 0 AND must not be 7 (achievements.length)
    expect(within(statCard as HTMLElement).getByText('0')).toBeInTheDocument();
    expect(within(statCard as HTMLElement).queryByText('7')).not.toBeInTheDocument();

    // Reset for other tests
    mockGamificationProfile.achievements = [];
  });

  it('reads personal-records correctly (data.data is an array)', async () => {
    wireRealResponses();
    render(<ClientProgressDashboardPage />);

    await waitFor(() => {
      // PR count is 3 — must appear in the "PRs" stat card
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('calls the canonical weekly-recap endpoint with the authenticated userId', async () => {
    wireRealResponses();
    render(<ClientProgressDashboardPage />);

    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledWith(
        expect.stringContaining(`/api/gamification/users/${mockUser.id}/weekly-recap`),
      );
    });
  });

  it('calls the client-safe personal-records endpoint (not the legacy /api/analytics/:id path)', async () => {
    wireRealResponses();
    render(<ClientProgressDashboardPage />);

    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledWith(
        expect.stringContaining('/api/client/analytics/personal-records'),
      );
    });
    // Negative assertion: the legacy path must not be used
    const calls = mockAxiosGet.mock.calls.map((call) => call[0] as string);
    expect(calls.some((url) => url.match(/\/api\/analytics\/\d+\/personal-records/))).toBe(false);
  });

  // ── PR rewire slice — canonical-surface-audit 2026-04-13 ────────────────
  // Locks the Personal Records Highlights block against regression back to
  // the silently-empty state caused by the prior schema-drifted service.
  // ClientProgressDashboardPage.tsx:474 gates the Highlights block on
  // `personalRecords.length > 0`, and :478-487 maps each record as:
  //   pr.exerciseName || pr.exercise → title
  //   pr.weight || pr.estimated1RM || pr.value → value
  //   pr.reps → subtitle "N reps"
  it('renders the Personal Records Highlights block with real records (exerciseName + weight + reps visible)', async () => {
    wireRealResponses();
    render(<ClientProgressDashboardPage />);

    // Wait for the block header to appear (gated on length > 0)
    await waitFor(() => {
      expect(screen.getByText(/personal records/i)).toBeInTheDocument();
    });

    // All three exercise names from the fixture must render
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('Deadlift')).toBeInTheDocument();

    // And each max-weight value must render (matched with flexible text
    // because the component appends the unit: e.g. "185lbs")
    expect(screen.getByText(/185/)).toBeInTheDocument();
    expect(screen.getByText(/245/)).toBeInTheDocument();
    expect(screen.getByText(/315/)).toBeInTheDocument();

    // Reps subtext for each row (from the test fixture: 5 / 3 / 2 reps)
    expect(screen.getByText(/5 reps/i)).toBeInTheDocument();
    expect(screen.getByText(/3 reps/i)).toBeInTheDocument();
    expect(screen.getByText(/2 reps/i)).toBeInTheDocument();
  });

  it('does NOT render the Personal Records Highlights block when the service returns an empty array', async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.includes('weekly-recap')) return Promise.resolve(realWeeklyRecapResponse);
      if (url.includes('personal-records')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClientProgressDashboardPage />);

    await waitFor(() => {
      // PRs stat card shows "0"
      const prsLabel = screen.getByText(/^PRs$/);
      expect(prsLabel).toBeInTheDocument();
    });

    // Highlights block header must NOT appear when no records
    // (the header "Personal Records" is rendered inside the length>0 gate)
    // Use queryAllByText to allow for the possibility that future copy could
    // reuse the phrase — assert ZERO matches.
    const allPRHeaders = screen.queryAllByText(/^Personal Records$/);
    expect(allPRHeaders.length).toBe(0);
  });
});
