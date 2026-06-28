import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AboutSection from './AboutSection';
import {
  buildAchievementCards,
  buildSkillTreeStats,
  formatJoinDate,
  getRarityFlat,
} from './AboutSection.helpers';

const { mockUseAuth, mockUseGamificationData } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseGamificationData: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../../../hooks/gamification/useGamificationData', () => ({
  useGamificationData: mockUseGamificationData,
}));

describe('AboutSection', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { createdAt: '2026-01-14T12:00:00.000Z' },
    });
    mockUseGamificationData.mockReturnValue({
      profile: {
        data: {
          level: 9,
          points: 2400,
          streakDays: 3,
          achievements: [
            {
              id: 'ua-1',
              pointsAwarded: 120,
              achievement: {
                name: 'First Lift',
                description: 'Logged the first workout',
                rarity: 'rare',
                skillTree: 'iron_gravity',
              },
            },
          ],
        },
      },
      achievements: {
        data: [
          { id: 'a-1', name: 'First Lift', skillTree: 'iron_gravity' },
          { id: 'a-2', name: 'Consistency', skillTree: 'unbroken_streaks' },
        ],
      },
      levelProgress: {
        level: 9,
        currentPoints: 2400,
        tierDisplay: { name: 'First Flight' },
      },
      isLoading: false,
    });
  });

  it('renders profile progress and earned achievement information from gamification data', () => {
    render(<AboutSection />);

    expect(screen.getByText('Level 9 - First Flight')).toBeInTheDocument();
    expect(screen.getByText('2,400 points')).toBeInTheDocument();
    expect(screen.getByText('3 days')).toBeInTheDocument();
    expect(screen.getByText('First Lift')).toBeInTheDocument();
    expect(screen.getByText('120 XP - rare')).toBeInTheDocument();
    expect(screen.getAllByText('Ironwood Flight').length).toBeGreaterThan(0);
    expect(screen.getByText('Evergreen Current')).toBeInTheDocument();
    expect(screen.queryByText('The Forge')).not.toBeInTheDocument();
    expect(screen.queryByText('Holistic wellness')).not.toBeInTheDocument();
  });

  it('renders a loading state without leaking placeholder profile values', () => {
    mockUseGamificationData.mockReturnValue({
      profile: undefined,
      achievements: undefined,
      levelProgress: undefined,
      isLoading: true,
    });

    render(<AboutSection />);

    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });
});

describe('AboutSection helpers', () => {
  it('normalizes dates, duplicate achievements, skill counts, and legendary flat color', () => {
    expect(formatJoinDate('not-a-date')).toBe('Unknown');
    expect(buildAchievementCards([
      { id: '1', achievement: { name: 'Repeat', rarity: 'legendary' } },
      { id: '2', achievement: { name: 'Repeat', rarity: 'legendary' } },
    ])).toHaveLength(1);
    expect(buildSkillTreeStats(
      [{ id: 'a', name: 'Lift', skillTree: 'iron_gravity' }],
      [{ id: 'ua', achievement: { name: 'Lift', skillTree: 'iron_gravity' } }],
    )).toEqual({ total: { iron_gravity: 1 }, earned: { iron_gravity: 1 } });
    expect(getRarityFlat('legendary')).toBe('var(--accent-gold, #C6A84B)');
  });
});
