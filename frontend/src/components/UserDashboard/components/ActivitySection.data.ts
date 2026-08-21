/**
 * Data definitions and mapping helpers for the UserDashboard V3 activity section.
 */

import {
  Activity,
  Award,
  Heart,
  MessageCircle,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import type {
  ActivityFilterId,
  ActivityFilterOption,
  ActivityStat,
  DashboardActivity,
  ProfileActivityPost,
  ProfileStatsSnapshot,
} from './ActivitySection.types';

export const ACTIVITY_FILTERS: ActivityFilterOption[] = [
  { id: 'all', label: 'All Activity', Icon: Activity },
  { id: 'workout', label: 'Workouts', Icon: Zap },
  { id: 'general', label: 'Posts', Icon: MessageCircle },
  { id: 'achievement', label: 'Achievements', Icon: Trophy },
  { id: 'progress', label: 'Progress', Icon: TrendingUp },
];

const ACTIVITY_TYPE_META = {
  workout: { Icon: Zap, color: 'var(--accent-primary, #60C0F0)', label: 'Workout' },
  achievement: { Icon: Award, color: 'var(--accent-gold, #C6A84B)', label: 'Achievement' },
  challenge: { Icon: Target, color: 'var(--accent-gold, #C6A84B)', label: 'Challenge' },
  milestone: { Icon: TrendingUp, color: 'var(--accent-purple, #8B5CF6)', label: 'Milestone' },
  general: { Icon: Activity, color: 'var(--arctic-cyan, #50A0F0)', label: 'Post' },
};

export function buildActivityStats(stats?: ProfileStatsSnapshot | null): ActivityStat[] {
  return [
    { Icon: Target, label: 'Workouts', value: String(stats?.workouts || 0), color: 'var(--accent-primary, #60C0F0)' },
    { Icon: Zap, label: 'Streak Days', value: String(stats?.streak || 0), color: 'var(--accent-gold, #C6A84B)' },
    { Icon: Heart, label: 'Followers', value: String(stats?.followers || 0), color: 'var(--swan-lavender, #4070C0)' },
    { Icon: TrendingUp, label: 'Level', value: String(stats?.level || 0), color: 'var(--arctic-cyan, #50A0F0)' },
  ];
}

export function mapPostsToActivities(posts?: ProfileActivityPost[] | null): DashboardActivity[] {
  if (!posts || posts.length === 0) return [];

  // NOTE: previously `posts.slice(0, 6)`. That cap ran BEFORE filtering, so
  // selecting "Workouts" searched only the six most recent posts and reported
  // "No recent activity yet" to members who did have workouts. The upstream
  // `loadUserPosts` already bounds this set (default limit 20).
  return posts.map((post, index) => {
    const typeInfo = ACTIVITY_TYPE_META[post.type as keyof typeof ACTIVITY_TYPE_META] || ACTIVITY_TYPE_META.general;
    const content = post.content || '';

    return {
      id: post.id || String(index),
      typeKey: post.type || 'general',
      type: typeInfo.label,
      title: content.substring(0, 60) || typeInfo.label,
      description: content,
      Icon: typeInfo.Icon,
      color: typeInfo.color,
      time: formatRelativeActivityTime(post.createdAt),
    };
  });
}

export function filterActivities(activities: DashboardActivity[], activeFilter: ActivityFilterId): DashboardActivity[] {
  if (activeFilter === 'all') return activities;
  if (activeFilter === 'progress') {
    return activities.filter((activity) => activity.typeKey === 'challenge' || activity.typeKey === 'milestone');
  }
  return activities.filter((activity) => activity.typeKey === activeFilter);
}

function formatRelativeActivityTime(createdAt?: string): string {
  const postDate = new Date(createdAt || '');
  const diffMs = Date.now() - postDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
}
