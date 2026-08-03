/**
 * Quick stats sidebar rendered on non-home UserDashboard V3 tabs.
 */

import React, { useMemo } from 'react';
import { Crown, Dumbbell, Flame, Medal, MessageCircle, RadioTower, Sparkles, Star, Timer, TrendingUp } from 'lucide-react';
import {
  Sidebar,
  SidebarCard,
  SidebarTitle,
} from '../styles/DashboardV3Styles';
import type { ProfileStats } from '../types/UserDashboardTypes';
import UserDashboardQuickStatsTicker, { type QuickStatsTickerStat } from './UserDashboardQuickStatsTicker';

interface TrainingProofStats {
  thisWeekCount?: number;
  minutesThisWeek?: number;
}

export interface SidebarQuickStatsInput {
  displayStats: ProfileStats;
  canonicalLevel: number;
  streakDays?: number;
  progressPercent?: number;
  pointsToNext?: number;
  trainingProof?: TrainingProofStats | null;
}

interface UserDashboardSidebarV3Props extends SidebarQuickStatsInput {}

const asWhole = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.round(numberValue));
};

const statValue = (value: unknown): string => asWhole(value).toLocaleString();

export const buildSidebarQuickStats = ({
  displayStats,
  canonicalLevel,
  streakDays = 0,
  progressPercent = 0,
  pointsToNext = 0,
  trainingProof = null,
}: SidebarQuickStatsInput): QuickStatsTickerStat[] => ([
  {
    id: 'workouts',
    label: 'Workouts',
    value: statValue(displayStats.workouts),
    caption: 'Logged total',
    Icon: Dumbbell,
  },
  {
    id: 'level',
    label: 'Level',
    value: statValue(canonicalLevel || displayStats.level),
    caption: 'Current rank',
    Icon: Crown,
  },
  {
    id: 'points',
    label: 'Points',
    value: statValue(displayStats.points),
    caption: 'XP balance',
    Icon: Sparkles,
  },
  {
    id: 'streak',
    label: 'Streak',
    value: `${asWhole(streakDays)}d`,
    caption: 'Training rhythm',
    Icon: Flame,
  },
  {
    id: 'level-progress',
    label: 'Level Progress',
    value: `${asWhole(progressPercent)}%`,
    caption: 'Toward next level',
    Icon: TrendingUp,
  },
  {
    id: 'xp-to-next',
    label: 'XP to Next',
    value: statValue(pointsToNext),
    caption: 'Remaining XP',
    Icon: RadioTower,
  },
  // Absent proof is unknown, not zero. Rendering "0 / 0m" here told members on
  // every non-Home tab they had trained nothing this week.
  ...(trainingProof ? [
    {
      id: 'this-week',
      label: 'This Week',
      value: statValue(trainingProof.thisWeekCount),
      caption: 'Logged workouts',
      Icon: Medal,
    },
    {
      id: 'training-time',
      label: 'Training Time',
      value: `${asWhole(trainingProof.minutesThisWeek)}m`,
      caption: 'This week',
      Icon: Timer,
    },
  ] : []),
  {
    id: 'posts',
    label: 'Posts',
    value: statValue(displayStats.posts),
    caption: 'Community shares',
    Icon: MessageCircle,
  },
  {
    id: 'followers',
    label: 'Followers',
    value: statValue(displayStats.followers),
    caption: 'People watching',
    Icon: Star,
  },
]);

const UserDashboardSidebarV3: React.FC<UserDashboardSidebarV3Props> = (props) => {
  const stats = useMemo(() => buildSidebarQuickStats(props), [props]);

  return (
    <Sidebar
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <SidebarCard>
        <SidebarTitle>
          <Star size={20} />
          Quick Stats
        </SidebarTitle>
        <UserDashboardQuickStatsTicker stats={stats} showHeader={false} />
      </SidebarCard>
    </Sidebar>
  );
};

export default React.memo(UserDashboardSidebarV3);