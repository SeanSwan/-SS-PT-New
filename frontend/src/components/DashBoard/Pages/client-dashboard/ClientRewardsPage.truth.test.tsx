
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mockAxiosGet = vi.hoisted(() => vi.fn());
const mockUseGamificationData = vi.hoisted(() => vi.fn());

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: { get: mockAxiosGet },
  }),
}));

vi.mock('../../../../hooks/gamification/useGamificationData', () => ({
  useGamificationData: () => mockUseGamificationData(),
}));

import ClientRewardsPage from './ClientRewardsPage';
import {
  describeTransaction,
  formatTransactionPoints,
  getAchievementDescription,
  getAchievementName,
  getAchievementRarity,
  getSourceLabel,
} from './ClientRewardsPage.logic';

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf-8');

const baseProfile = {
  points: 2500,
  level: 5,
  tier: 'silver',
  streakDays: 7,
  totalWorkouts: 18,
  achievements: [
    {
      id: 'ua-1',
      achievementId: 'ach-1',
      isCompleted: true,
      earnedAt: '2026-05-15T12:00:00.000Z',
      progress: 1,
      pointsAwarded: 150,
      achievement: {
        id: 'ach-1',
        name: 'First Workout',
        description: 'Logged the first complete workout.',
        icon: 'Trophy',
        pointValue: 150,
        requirementType: 'fitness',
        requirementValue: 1,
        tier: 'bronze',
        rarity: 'rare',
        isActive: true,
      },
    },
  ],
  recentTransactions: [
    {
      id: 'tx-1',
      points: 150,
      balance: 2500,
      transactionType: 'earn',
      source: 'workout',
      description: 'Session recap approved',
      createdAt: '2026-05-15T12:30:00.000Z',
    },
  ],
  rewards: [],
  milestones: [],
  leaderboardPosition: 3,
  nextLevelProgress: 65,
  nextLevelPoints: 3000,
  nextTierProgress: 40,
};

const createGamificationState = ({
  profileData = {},
  profileError = null,
  error = null,
  isLoading = false,
}: {
  profileData?: Record<string, unknown> | null;
  profileError?: Error | null;
  error?: Error | null;
  isLoading?: boolean;
} = {}) => ({
  profile: {
    data: profileData === null ? undefined : { ...baseProfile, ...profileData },
    isLoading,
    error: profileError,
  },
  achievements: { data: [] },
  rewards: { data: [] },
  isLoading,
  error,
});

describe('ClientRewardsPage gamification truth', () => {
  beforeEach(() => {
    mockAxiosGet.mockReset();
    mockUseGamificationData.mockReset();
    mockUseGamificationData.mockReturnValue(createGamificationState());
  });

  it('is the mounted client rewards surface backed by the v1 gamification profile hook', () => {
    const dashboardLayoutSource = readSource('../../UniversalDashboardLayout.tsx');
    const routeComponentsSource = readSource('../../UniversalDashboardLayout.routeComponents.tsx');
    const dashboardRoutesSource = readSource('../../UniversalDashboardLayout.routes.tsx');
    const sidebarSource = readSource('./ClientStellarSidebar.tsx');
    const hookSource = readSource('../../../../hooks/gamification/useGamificationData.ts');
    const routesSource = readFileSync(
      resolve(process.cwd(), '../backend/routes/gamificationV1Routes.mjs'),
      'utf-8'
    );

    expect(dashboardLayoutSource).toContain("from './UniversalDashboardLayout.routes'");
    expect(routeComponentsSource).toContain("export const ClientRewardsPage = React.lazy(() => import('./Pages/client-dashboard/ClientRewardsPage'))");
    expect(dashboardRoutesSource).toContain("{ path: '/rewards', component: ClientRewardsPage");
    expect(sidebarSource).toContain("path: '/dashboard/client/rewards'");
    expect(hookSource).toContain("authAxios.get('/api/v1/gamification/profile')");
    expect(routesSource).toContain("const requireProfileReader = requireAnyRole('user', 'client', 'trainer', 'admin');");
    expect(routesSource).toContain("router.get('/profile', authenticate, requireProfileReader");
  });

  it('uses the shared gamification profile for XP, achievements, and point history', async () => {
    mockAxiosGet.mockResolvedValue({ data: { data: {} } });

    render(<ClientRewardsPage />);

    expect((await screen.findAllByText(/2,500 XP/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/First Workout/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Session recap approved/i)).toBeInTheDocument();
    expect(screen.getAllByText(/7-day streak/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(mockAxiosGet).not.toHaveBeenCalledWith('/api/v1/gamification/dashboard');
    });
  });

  it('preserves signed XP deltas in the rewards ledger', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileData: {
        recentTransactions: [
          {
            id: 'tx-spend',
            points: -50,
            transactionType: 'spend',
            source: 'reward_redemption',
            description: 'Reward redeemed',
          },
        ],
      },
    }));

    render(<ClientRewardsPage />);

    expect(screen.getByText('-50 XP')).toBeInTheDocument();
    expect(screen.queryByText(/-0 XP|\+0 XP/)).not.toBeInTheDocument();
    expect(formatTransactionPoints({ transactionType: 'spend', points: 50 })).toBe('-50 XP');
    expect(formatTransactionPoints({ transactionType: 'adjustment', points: -25 })).toBe('-25 XP');
    expect(formatTransactionPoints({ transactionType: 'earn', points: 0 })).toBe('0 XP');
  });

  it('normalizes reward copy and rarity labels from malformed profile payloads', () => {
    const longCopy = `Apex ${'Victory '.repeat(20)}`;
    const normalizedName = getAchievementName({
      achievement: { name: `  ${longCopy}\n\u0007` },
    });
    const normalizedTransaction = describeTransaction({
      description: `  ${longCopy}\r\napproved\u0000`,
    });

    expect(normalizedName).not.toMatch(/\p{Cc}/u);
    expect(normalizedName).not.toMatch(/\s{2,}/);
    expect(normalizedName.length).toBeLessThanOrEqual(96);
    expect(normalizedName.endsWith('...')).toBe(true);
    expect(getAchievementDescription({
      achievement: { description: '  Rank\n\nclear\u0000copy ' },
    })).toBe('Rank clear copy');
    expect(getAchievementDescription({ description: '\u0000', pointsAwarded: 75 })).toBe('75 XP awarded');
    expect(getAchievementRarity({ achievement: { rarity: ' EPIC ' } })).toBe('epic');
    expect(getAchievementRarity({ achievement: { rarity: 'RARE\nbad' } })).toBe('common');
    expect(normalizedTransaction).not.toMatch(/\p{Cc}/u);
    expect(normalizedTransaction.length).toBeLessThanOrEqual(96);
    expect(getSourceLabel('reward_redemption\nadmin')).toBe('reward redemption admin');
  });

  it('drops malformed achievement and transaction rows before rendering rewards history', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileData: {
        achievements: [
          null,
          'bad-achievement-row',
          {
            id: 'clean-achievement',
            achievement: { name: 'Clean Badge', description: 'Valid earned badge' },
            pointsAwarded: 125,
          },
        ],
        recentTransactions: [
          undefined,
          42,
          {
            id: 'clean-transaction',
            points: 75,
            source: 'workout_log',
            description: 'Clean ledger entry',
          },
        ],
      },
    }));

    render(<ClientRewardsPage />);

    expect(screen.getAllByText('Clean Badge').length).toBeGreaterThan(0);
    expect(screen.getByText('Clean ledger entry')).toBeInTheDocument();
    expect(screen.queryByText('bad-achievement-row')).not.toBeInTheDocument();
    expect(screen.queryByText(/Rewards data could not be loaded/i)).not.toBeInTheDocument();
  });

  it('shows safe rewards error copy without rendering raw backend messages', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileError: new Error('SQLSTATE 23505 duplicate key tenant leak'),
    }));

    render(<ClientRewardsPage />);

    expect(screen.getByText(/Rewards data could not be loaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/SQLSTATE|duplicate key|tenant leak/i)).not.toBeInTheDocument();
  });

  it('does not render synthetic rank data when profile data is unavailable', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileData: null,
      profileError: new Error('SQLSTATE 08006 private rewards outage'),
    }));

    render(<ClientRewardsPage />);

    expect(screen.getByText(/Rewards data could not be loaded/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: /rank progression/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Bronze Forge')).not.toBeInTheDocument();
    expect(screen.queryByText('Level 1')).not.toBeInTheDocument();
    expect(screen.queryByText(/^0 XP$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No active streak|Log a first workout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SQLSTATE|private rewards outage/i)).not.toBeInTheDocument();
  });

  it('clamps malformed XP progress and exposes an accessible progressbar', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileData: { nextLevelProgress: 175, points: 999999, nextLevelPoints: 1000000 },
    }));

    render(<ClientRewardsPage />);

    const progress = screen.getByRole('progressbar', { name: /rank progression/i });
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
    expect(progress).toHaveAttribute('aria-valuenow', '100');
  });

  it('falls back to formula progress when profile target data is zeroed', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileData: {
        points: 2800,
        level: 5,
        nextLevelProgress: 0,
        nextLevelPoints: 0,
      },
    }));

    render(<ClientRewardsPage />);

    const progress = screen.getByRole('progressbar', { name: /rank progression/i });
    expect(Number(progress.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    expect(screen.getByText(/3,600 XP/i)).toBeInTheDocument();
  });

  it('keeps reward tier and badge colors connected to theme tokens', () => {
    const source = readSource('./ClientRewardsPage.tsx');
    const stylesSource = readSource('./ClientRewardsPage.styles.ts');
    const logicSource = readSource('./ClientRewardsPage.logic.ts');

    expect(`${source}\n${stylesSource}`).not.toMatch(/color:\s*'#[0-9A-Fa-f]{3,8}'/);
    expect(logicSource).not.toMatch(/Bronze Forge|Silver Edge|Titanium Core|Obsidian Warrior/);
    expect(`${source}\n${stylesSource}`).not.toMatch(/rgba\(/);
    expect(stylesSource).not.toContain('clamp(');
    expect(source).not.toContain('key={achievement.id || index}');
    expect(source).not.toContain('key={tx.id || index}');
    expect(source).not.toContain('.map((achievement, index)');
    expect(source).not.toContain('.map((tx, index)');
    expect(source.indexOf('if (hasProfileOutage)')).toBeLessThan(source.indexOf('const view = buildRewardsViewModel(profile)'));
    expect(source).toContain('getAchievementRowKey(achievement)');
    expect(source).toContain('getTransactionRowKey(tx)');
    expect(source).not.toContain('(error as Error).message');
    expect(source).not.toMatch(/\u00C3\u00A2|\uFFFD/);
    expect(stylesSource).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0)');
    expect(stylesSource).toContain('var(--accent-primary');
    expect(source.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(stylesSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
