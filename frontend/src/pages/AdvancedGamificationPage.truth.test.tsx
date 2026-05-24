import React from 'react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/gamification/useGamificationData', () => ({
  useGamificationData: () => ({
    profile: {
      data: {
        points: 8880,
        level: 14,
        leaderboardPosition: 11,
        nextLevelProgress: 72,
        nextLevelPoints: 9600,
        achievements: [
          {
            id: 'user-achievement-1',
            pointsAwarded: 200,
            achievement: {
              name: 'Tempo Architect',
              description: 'Completed a tempo-focused workout block.',
            },
          },
          {
            id: 'user-achievement-2',
            pointsAwarded: 100,
            achievement: {
              name: 'Consistency Lock',
              description: 'Protected a weekly training streak.',
            },
          },
        ],
        rewards: [],
        recentTransactions: [
          {
            id: 'tx-1',
            points: 200,
            transactionType: 'earn',
            source: 'workout',
            description: 'Workout approved',
          },
        ],
      },
      isLoading: false,
      error: null,
    },
    achievements: { data: [] },
    rewards: {
      data: [
        {
          id: 'reward-1',
          name: 'Recovery Credit',
          pointCost: 500,
        },
      ],
    },
    leaderboard: {
      data: [
        {
          userId: 'client-1',
          overallLevel: 18,
          client: { firstName: 'Test', lastName: 'Client' },
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));

import AdvancedGamificationPage from './AdvancedGamificationPage';

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <AdvancedGamificationPage />
      </MemoryRouter>
    </HelmetProvider>
  );

describe('AdvancedGamificationPage truth surface', () => {
  it('renders real shared gamification data instead of static demo numbers', () => {
    renderPage();

    expect(screen.getByText('8,880')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('11th')).toBeInTheDocument();
    expect(screen.getByText('Tempo Architect')).toBeInTheDocument();
    expect(screen.getByText('Recovery Credit')).toBeInTheDocument();
    expect(screen.getByText('Workout approved')).toBeInTheDocument();
    expect(screen.getByText(/Test Client/i)).toBeInTheDocument();
    expect(screen.queryByText(/Advanced Features Coming Soon/i)).not.toBeInTheDocument();
  });

  it('keeps the route free of static placeholder auth and fake dashboard copy', () => {
    const source = readFileSync(resolve(__dirname, './AdvancedGamificationPage.tsx'), 'utf-8');

    expect(source).not.toContain("setUser({ id: 'user123' })");
    expect(source).not.toContain('Advanced Features Coming Soon');
    expect(source).not.toContain('2,450');
    expect(source).not.toContain('Day Streak');
    expect(source).toContain('useGamificationData');
  });
});
