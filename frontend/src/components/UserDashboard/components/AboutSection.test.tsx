import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AboutSection from './AboutSection';
import {
  buildAchievementCards,
  buildPersonalInfo,
  buildSkillTreeStats,
  getRarityFlat,
} from './AboutSection.helpers';

const { mockEquipRankTitle, mockUseAuth, mockUseGamificationData, mockUseRankTitleSelection } = vi.hoisted(() => ({
  mockEquipRankTitle: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseGamificationData: vi.fn(),
  mockUseRankTitleSelection: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../../../hooks/gamification/useGamificationData', () => ({
  useGamificationData: mockUseGamificationData,
}));

vi.mock('../../../hooks/gamification/useRankTitleSelection', () => ({
  useRankTitleSelection: mockUseRankTitleSelection,
}));

describe('AboutSection', () => {
  beforeEach(() => {
    mockEquipRankTitle.mockClear();
    mockUseRankTitleSelection.mockReturnValue({
      equipRankTitle: mockEquipRankTitle,
      isEquippingRankTitle: false,
      equippingRankTitleKey: undefined,
    });
    mockUseAuth.mockReturnValue({
      user: { createdAt: '2026-01-14T12:00:00.000Z' },
    });
    mockUseGamificationData.mockReturnValue({
      profile: {
        data: {
          level: 9,
          points: 2400,
          streakDays: 3,
          selectedRankTitleKey: 'first_flight',
          selectedRankTitleDisplay: { key: 'first_flight', name: 'First Flight', rankNumber: 1, label: 'Rank 01 | First Flight', minLevel: 1, maxLevel: 10, levelRange: '1-10', earned: true, isSelected: true, isCurrent: true },
          currentRankTitleDisplay: { key: 'first_flight', name: 'First Flight', rankNumber: 1, label: 'Rank 01 | First Flight', minLevel: 1, maxLevel: 10, levelRange: '1-10', earned: true, isSelected: true, isCurrent: true },
          nextRankTitleDisplay: { key: 'swan_initiate', name: 'Swan Initiate', rankNumber: 2, label: 'Rank 02 | Swan Initiate', minLevel: 11, maxLevel: 20, levelRange: '11-20' },
          upcomingProgressionBeats: [
            { key: 'rank-title-swan-initiate', level: 11, type: 'rank_title', label: 'Rank Title Unlock', reward: 'Equip Swan Initiate', description: 'A new public Swan title becomes available for the profile tag.', intensity: 'title', pointsRequired: 12100, pointsRemaining: 9700, levelsAway: 2 },
          ],
          nextMajorProgressionBeat: { key: 'rank-title-swan-initiate', level: 11, type: 'rank_title', label: 'Rank Title Unlock', reward: 'Equip Swan Initiate', description: 'A new public Swan title becomes available for the profile tag.', intensity: 'title', pointsRequired: 12100, pointsRemaining: 9700, levelsAway: 2 },
          earnedRankTitleCount: 1,
          rankTitles: [
            { key: 'first_flight', name: 'First Flight', rankNumber: 1, label: 'Rank 01 | First Flight', minLevel: 1, maxLevel: 10, levelRange: '1-10', earned: true, isSelected: true, isCurrent: true },
            { key: 'swan_initiate', name: 'Swan Initiate', rankNumber: 2, label: 'Rank 02 | Swan Initiate', minLevel: 11, maxLevel: 20, levelRange: '11-20', earned: false, isSelected: false, isCurrent: false },
          ],
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
    expect(screen.getByText('Rank Titles')).toBeInTheDocument();
    expect(screen.getByText('Rank 01 | First Flight')).toBeInTheDocument();
    expect(screen.getByText('Rank 02')).toBeInTheDocument();
    expect(screen.getByText('Next progression beats')).toBeInTheDocument();
    expect(screen.getByText('Rank Title Unlock')).toBeInTheDocument();
    expect(screen.getByText('Equip Swan Initiate')).toBeInTheDocument();
    expect(screen.getByText('9,700 XP away')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rank 02 \| Swan Initiate locked until Level 11/i })).toBeDisabled();
  });

  it('lets users equip an earned rank title from the About ladder', () => {
    mockUseGamificationData.mockReturnValue({
      profile: {
        data: {
          level: 15,
          points: 22500,
          streakDays: 4,
          achievements: [],
          selectedRankTitleKey: 'first_flight',
          selectedRankTitleDisplay: { key: 'first_flight', name: 'First Flight', rankNumber: 1, label: 'Rank 01 | First Flight', minLevel: 1, maxLevel: 10, levelRange: '1-10', earned: true, isSelected: true },
          currentRankTitleDisplay: { key: 'swan_initiate', name: 'Swan Initiate', rankNumber: 2, label: 'Rank 02 | Swan Initiate', minLevel: 11, maxLevel: 20, levelRange: '11-20', earned: true, isCurrent: true },
          earnedRankTitleCount: 2,
          rankTitles: [
            { key: 'first_flight', name: 'First Flight', rankNumber: 1, label: 'Rank 01 | First Flight', minLevel: 1, maxLevel: 10, levelRange: '1-10', earned: true, isSelected: true },
            { key: 'swan_initiate', name: 'Swan Initiate', rankNumber: 2, label: 'Rank 02 | Swan Initiate', minLevel: 11, maxLevel: 20, levelRange: '11-20', earned: true, isSelected: false, isCurrent: true },
          ],
        },
      },
      achievements: { data: [] },
      levelProgress: {
        level: 15,
        currentPoints: 22500,
        tierDisplay: { name: 'Swan Initiate' },
      },
      isLoading: false,
    });

    render(<AboutSection />);

    fireEvent.click(screen.getByRole('button', { name: /Equip Rank 02 \| Swan Initiate/i }));
    expect(mockEquipRankTitle).toHaveBeenCalledWith('swan_initiate');
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
    const personalInfo = buildPersonalInfo(
      { createdAt: 'not-a-date' } as any,
      { points: 100, lifetimePointsEarned: 2500, level: 1, streakDays: 0 } as any,
      { currentPoints: 2500, level: 1, tierDisplay: { name: 'First Flight' } } as any,
    );
    expect(personalInfo[0].value).toBe('Unknown');
    expect(personalInfo[2].value).toBe('2,500 points');
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

  it('fails closed on malformed achievement rarity and skill-tree values', () => {
    const [card] = buildAchievementCards([
      {
        id: 'unsafe-achievement',
        achievement: {
          name: 'Malformed Metadata',
          rarity: 'private-rarity',
          skillTree: 'private-skill-tree',
        },
      },
    ]);

    expect(card.rarity).toBe('common');
    expect(card.skillTree).toBeUndefined();
    expect(JSON.stringify(card)).not.toContain('private');
  });
});
