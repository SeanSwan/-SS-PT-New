import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProfileStats } from '../types/UserDashboardTypes';
import UserDashboardSidebarV3, { buildSidebarQuickStats } from './UserDashboardSidebarV3';
import UserDashboardQuickStatsTicker from './UserDashboardQuickStatsTicker';

const displayStats: ProfileStats = {
  workouts: 18,
  level: 6,
  points: 2400,
  posts: 9,
  followers: 44,
  following: 21,
};

const buildStats = () => buildSidebarQuickStats({
  displayStats,
  canonicalLevel: 7,
  streakDays: 12,
  progressPercent: 64,
  pointsToNext: 250,
  trainingProof: {
    thisWeekCount: 3,
    minutesThisWeek: 145,
  },
  // Both flags are REQUIRED: omitting them suppresses the tiles, because the
  // builder now fails closed rather than fabricating a record.
  gamificationKnown: true,
  profileStatsKnown: true,
});

describe('UserDashboardQuickStatsTicker', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds the top 10 quick stats from real dashboard and training data', () => {
    const stats = buildStats();

    expect(stats).toHaveLength(10);
    expect(stats.slice(0, 3).map((stat) => stat.label)).toEqual(['Workouts', 'Level', 'Points']);
    expect(stats).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Streak', value: '12d' }),
      expect.objectContaining({ label: 'Level Progress', value: '64%' }),
      expect.objectContaining({ label: 'XP to Next', value: '250' }),
      expect.objectContaining({ label: 'This Week', value: '3' }),
      expect.objectContaining({ label: 'Training Time', value: '145m' }),
      expect.objectContaining({ label: 'Posts', value: '9' }),
      expect.objectContaining({ label: 'Followers', value: '44' }),
    ]));
  });

  it('rotates stat groups like a ticker without inventing fake data', () => {
    vi.useFakeTimers();
    const stats = buildStats();

    render(<UserDashboardQuickStatsTicker stats={stats} rotateMs={1000} />);

    expect(screen.getByLabelText('Quick stats ticker')).toBeInTheDocument();
    expect(screen.getByText('Workouts')).toBeInTheDocument();
    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('Level Progress')).toBeInTheDocument();
    expect(screen.getByText('XP to Next')).toBeInTheDocument();
    expect(screen.queryByText('Workouts')).not.toBeInTheDocument();
  });

  it('lets users pause and resume automatic rotation', () => {
    vi.useFakeTimers();
    const stats = buildStats();

    render(<UserDashboardQuickStatsTicker stats={stats} rotateMs={1000} />);

    expect(screen.getByText('Workouts')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /pause quick stats ticker/i }));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Workouts')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /resume quick stats ticker/i }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Streak')).toBeInTheDocument();
  });

  it('can rotate to a sponsor video spot without replacing real stat slides', () => {
    vi.useFakeTimers();

    render(
      <UserDashboardQuickStatsTicker
        stats={buildStats().slice(0, 3)}
        rotateMs={1000}
        sponsorSpot={{
          label: 'Partner Pulse',
          title: 'Hydration lab spotlight',
          body: 'Short sponsor clips can live here between real stats.',
          mediaType: 'video',
          mediaUrl: 'https://cdn.example.com/hydration-lab.mp4',
          ctaLabel: 'Learn more',
        }}
      />
    );

    expect(screen.getByText('Workouts')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Partner Pulse')).toBeInTheDocument();
    expect(screen.getByText('Hydration lab spotlight')).toBeInTheDocument();
    expect(screen.getByTestId('quick-stats-sponsor-video')).toBeInTheDocument();
  });

  it('upgrades the non-home sidebar to use the same ticker surface', () => {
    render(
      <UserDashboardSidebarV3
        displayStats={displayStats}
        canonicalLevel={7}
        gamificationKnown
        profileStatsKnown
      />,
    );

    expect(screen.getByLabelText('Quick stats ticker')).toBeInTheDocument();
    expect(screen.getByText('Workouts')).toBeInTheDocument();
  });

  it('frames the Home quick stats signal with a gold challenge-style outline', () => {
    const componentSource = readFileSync(resolve(__dirname, './UserDashboardQuickStatsTicker.tsx'), 'utf8');
    const stylesSource = readFileSync(resolve(__dirname, './UserDashboardQuickStatsTicker.styles.ts'), 'utf8');

    expect(componentSource).toContain('<TickerShell aria-label="Quick stats ticker" $goldFrame={showHeader}>');
    expect(stylesSource).toContain('var(--accent-gold, #C6A84B) 42%');
    expect(stylesSource).toContain('border-radius: 22px;');
    expect(stylesSource).toContain('0 16px 34px color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent)');
  });
});
