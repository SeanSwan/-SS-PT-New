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

describe('ClientRewardsPage gamification truth', () => {
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
    const source = readFileSync(resolve(__dirname, './ClientRewardsPage.tsx'), 'utf-8');

    expect(source).not.toMatch(/color:\s*'#[0-9A-Fa-f]{3,8}'/);
    expect(source).not.toMatch(/'rgba\(/);
    expect(source).toContain('var(--accent-primary');
  });
});
