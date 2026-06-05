import React from 'react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockAxiosGet = vi.hoisted(() => vi.fn());

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: { get: mockAxiosGet },
  }),
}));

vi.mock('../../../../hooks/gamification/useGamificationData', () => ({
  useGamificationData: () => ({
    profile: {
      data: {
        points: 2500,
        level: 5,
        tier: 'silver',
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
      },
      isLoading: false,
      error: null,
    },
    achievements: { data: [] },
    rewards: { data: [] },
    isLoading: false,
    error: null,
  }),
}));

import ClientRewardsPage from './ClientRewardsPage';

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf-8');

describe('ClientRewardsPage gamification truth', () => {
  it('is the mounted client rewards surface backed by the v1 gamification profile hook', () => {
    const layoutSource = readSource('../../UniversalDashboardLayout.tsx');
    const sidebarSource = readSource('./ClientStellarSidebar.tsx');
    const hookSource = readSource('../../../../hooks/gamification/useGamificationData.ts');
    const routesSource = readFileSync(
      resolve(process.cwd(), '../backend/routes/gamificationV1Routes.mjs'),
      'utf-8'
    );

    expect(layoutSource).toContain("const ClientRewardsPage = React.lazy(() => import('./Pages/client-dashboard/ClientRewardsPage'))");
    expect(layoutSource).toContain("{ path: '/rewards', component: ClientRewardsPage");
    expect(sidebarSource).toContain("path: '/dashboard/client/rewards'");
    expect(hookSource).toContain("authAxios.get('/api/v1/gamification/profile')");
    expect(routesSource).toContain("router.get('/profile', authenticate, requireUser");
  });

  it('uses the shared gamification profile for XP, achievements, and point history', async () => {
    mockAxiosGet.mockResolvedValue({ data: { data: {} } });

    render(<ClientRewardsPage />);

    expect(await screen.findByText(/2,500 xp/i)).toBeInTheDocument();
    expect(screen.getByText(/first workout/i)).toBeInTheDocument();
    expect(screen.getByText(/session recap approved/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockAxiosGet).not.toHaveBeenCalledWith('/api/v1/gamification/dashboard');
    });
  });

  it('keeps reward tier and badge colors connected to theme tokens', () => {
    const source = readSource('./ClientRewardsPage.tsx');

    expect(source).not.toMatch(/color:\s*'#[0-9A-Fa-f]{3,8}'/);
    expect(source).not.toMatch(/rgba\(/);
    expect(source).toContain('const BORDER_SOFT');
    expect(source).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0)');
    expect(source).toContain('var(--accent-primary');
  });
});
