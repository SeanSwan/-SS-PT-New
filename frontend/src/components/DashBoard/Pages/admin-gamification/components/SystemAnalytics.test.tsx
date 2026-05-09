import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SystemAnalytics from './SystemAnalytics';
import type { SystemAnalyticsData } from './SystemAnalytics.types';

const analyticsData: SystemAnalyticsData = {
  userEngagement: {
    totalUsers: 12,
    activeUsers: 9,
    engagementRate: 75,
    averagePointsPerUser: 420,
    averageLevelPerUser: 4,
  },
  achievementStats: {
    totalAchievementsEarned: 18,
    achievementCompletionRate: 62,
    mostPopularAchievement: { name: 'First Workout', description: 'Complete one workout', count: 10 },
    leastPopularAchievement: { name: 'Hydration Pro', description: 'Track hydration', count: 2 },
  },
  rewardStats: {
    totalRewardsRedeemed: 6,
    totalPointsSpent: 1200,
    mostRedeemedReward: { name: 'Recovery Hoodie', description: 'Premium reward', count: 4 },
    leastRedeemedReward: { name: 'Gold Mat', description: 'Rare reward', count: 1 },
  },
  tierDistribution: [
    { tier: 'bronze', count: 7, percentage: 58 },
    { tier: 'silver', count: 3, percentage: 25 },
    { tier: 'gold', count: 2, percentage: 17 },
  ],
  timeSeriesData: [
    { date: '2026-05-08', newUsers: 2, achievementsEarned: 3, pointsEarned: 500, pointsSpent: 120 },
  ],
};

describe('SystemAnalytics', () => {
  it('renders overview KPIs from the active analytics data contract', () => {
    render(<SystemAnalytics data={analyticsData} />);

    expect(screen.getByText('Gamification System Analytics')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Recovery Hoodie')).toBeInTheDocument();
  });

  it('switches to rewards and user time-range sections without remounting the dormant enhanced surface', () => {
    render(<SystemAnalytics data={analyticsData} />);

    fireEvent.click(screen.getByRole('tab', { name: /rewards/i }));
    expect(screen.getByText('Reward Statistics')).toBeInTheDocument();
    expect(screen.getByText(/1,200 total points spent/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /user engagement/i }));
    expect(screen.getByText('Last Month')).toBeInTheDocument();
  });

  it('shows a loading state while the controller is still fetching analytics', () => {
    render(<SystemAnalytics data={null} />);

    expect(screen.getByRole('status', { name: /loading analytics/i })).toBeInTheDocument();
  });
});
