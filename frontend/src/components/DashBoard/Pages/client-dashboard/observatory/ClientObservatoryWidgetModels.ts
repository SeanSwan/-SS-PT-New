/**
 * FILE: ClientObservatoryWidgetModels.ts
 * PURPOSE: Pure helpers for live client observatory rail widgets.
 */

import type {
  ChallengePreview,
  FeedPostPreview,
  LeaderboardPreview,
} from './ClientObservatoryData';
import { clampPercent, timeLabel } from './ClientObservatoryData';

export interface AchievementPreview {
  id?: string | number;
  progress?: number;
  isCompleted?: boolean;
  achievement?: {
    name?: string;
    title?: string;
    icon?: string;
    iconEmoji?: string;
    pointValue?: number;
    xpReward?: number;
    badgeImageUrl?: string;
    iconUrl?: string;
    imageUrl?: string;
  };
}

export interface ClientObservatoryWidgetsProps {
  achievements: AchievementPreview[];
  challenge?: ChallengePreview;
  displayName: string;
  feedLoading: boolean;
  leaderboard: LeaderboardPreview[];
  points: number;
  posts: FeedPostPreview[];
  progress: number;
  streakDays: number;
  tags: string[];
}

export const WIDGET_TONES = ['cyan', 'violet', 'gold'] as const;
export const MOMENTUM_SHAPE = [28, 42, 54, 66, 74, 86, 100];

export function challengeProgress(challenge?: ChallengePreview): number {
  if (!challenge) return 0;
  if (typeof challenge.progress === 'number') return clampPercent(challenge.progress);
  if (typeof challenge.currentProgress === 'number' && typeof challenge.target === 'number' && challenge.target > 0) {
    return clampPercent((challenge.currentProgress / challenge.target) * 100);
  }
  return 0;
}

export function leaderName(entry: LeaderboardPreview): string {
  const first = entry.client?.firstName;
  const last = entry.client?.lastName;
  const username = entry.client?.username;
  return [first, last].filter(Boolean).join(' ') || username || 'Athlete';
}

export function postAuthor(post: FeedPostPreview, fallback: string): string {
  const first = post.user?.firstName;
  const last = post.user?.lastName;
  const username = post.user?.username;
  return [first, last].filter(Boolean).join(' ') || username || fallback;
}

export function storyPosts(posts: FeedPostPreview[]) {
  return posts.filter((post) => post.mediaUrl).slice(0, 4);
}

export function activityPosts(posts: FeedPostPreview[], displayName: string) {
  return posts.slice(0, 4).map((post, index) => ({
    id: String(post.id || `activity-${index}`),
    user: postAuthor(post, displayName),
    action: `shared a ${post.type || 'training'} update`,
    time: timeLabel(post.createdAt),
  }));
}
