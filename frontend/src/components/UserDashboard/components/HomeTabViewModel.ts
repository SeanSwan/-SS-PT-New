/**
 * Pure data helpers for the UserDashboard V3 Home tab.
 */

import { Mail, Radio, Search, type LucideIcon } from 'lucide-react';
export {
  buildHomeBadgeShowcase,
  buildHomeLiveActivity,
  buildHomeStories,
  extractTrendingTagNames,
  selectActiveChallengeSummary,
} from './HomeTabLiveWidgetViewModel';
export type {
  HomeBadgeItem,
  HomeChallengeSummary,
  HomeLeaderboardRow,
  HomeLiveActivityItem,
  HomeStoryItem,
  TrendingTagSummary,
} from './HomeTabLiveWidgetViewModel';

type CountValue = number | string | null | undefined;

interface CountList {
  count?: CountValue;
  list?: unknown[];
}

interface FollowStatsLike {
  followers?: CountList;
  following?: CountList;
}

interface ProfileStatsLike {
  posts?: CountValue;
  followers?: CountValue;
  following?: CountValue;
}

interface CreatorStatsInput {
  profileStats?: ProfileStatsLike | null;
  profilePosts?: unknown[] | null;
  feedPosts?: unknown[] | null;
  followStats?: FollowStatsLike | null;
}

interface AvatarInput {
  profilePhoto?: string | null;
  authPhoto?: string | null;
  fallbackAvatar: string;
}

export interface HomeTopBarAction {
  label: string;
  Icon: LucideIcon;
  count: number;
}

export type HomePostType =
  | 'general'
  | 'workout'
  | 'achievement'
  | 'challenge'
  | 'transformation'
  | 'creative'
  | 'music'
  | 'art';

export interface HomePostPayload {
  content: string;
  type: HomePostType;
  visibility: 'friends';
  media?: File;
}

function toSafeCount(value: CountValue): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function hasCount(value: CountValue): boolean {
  return value !== undefined && value !== null && value !== '';
}

function countFromList(source?: CountList): number | null {
  if (!source) return null;
  if (hasCount(source.count)) return toSafeCount(source.count);
  return Array.isArray(source.list) ? source.list.length : null;
}

export function buildCreatorStats({
  profileStats,
  profilePosts,
  feedPosts,
  followStats,
}: CreatorStatsInput) {
  const posts = hasCount(profileStats?.posts)
    ? toSafeCount(profileStats?.posts)
    : (profilePosts?.length || feedPosts?.length || 0);
  const followers = countFromList(followStats?.followers) ?? toSafeCount(profileStats?.followers);
  const following = countFromList(followStats?.following) ?? toSafeCount(profileStats?.following);

  return { posts, followers, following };
}

export function resolveHomeAvatarSrc({ profilePhoto, authPhoto, fallbackAvatar }: AvatarInput): string {
  return profilePhoto?.trim() || authPhoto?.trim() || fallbackAvatar;
}

export function buildHomeTopBarActions({
  inboxUnread,
  notificationUnread,
}: {
  inboxUnread: number;
  notificationUnread: number;
}): HomeTopBarAction[] {
  return [
    { label: 'Search dashboard', Icon: Search, count: 0 },
    { label: 'Open inbox', Icon: Mail, count: toSafeCount(inboxUnread) },
    { label: 'View notifications', Icon: Radio, count: toSafeCount(notificationUnread) },
  ];
}

const MOOD_TO_POST_TYPE: Record<string, HomePostType> = {
  workout: 'workout',
  transformation: 'transformation',
  achievement: 'achievement',
  challenge: 'challenge',
  music: 'music',
  art: 'art',
  community: 'general',
};

export function buildHomePostPayload(content: string, mood: string, media?: File | null): HomePostPayload {
  const payload: HomePostPayload = {
    content: content.trim(),
    type: MOOD_TO_POST_TYPE[mood] || 'general',
    visibility: 'friends',
  };
  if (media) payload.media = media;
  return payload;
}

export function parseUnreadNotificationCount(payload: unknown): number {
  const data = payload as { unreadCount?: CountValue; notifications?: Array<Record<string, unknown>> } | undefined;
  if (hasCount(data?.unreadCount)) return toSafeCount(data?.unreadCount);
  if (!Array.isArray(data?.notifications)) return 0;
  return data.notifications.filter((notification) => {
    if ('isRead' in notification) return notification.isRead === false;
    if ('read' in notification) return notification.read === false;
    return false;
  }).length;
}

export function sumUnreadConversations(payload: unknown): number {
  const maybeArray = Array.isArray(payload)
    ? payload
    : (payload as { conversations?: unknown[] } | undefined)?.conversations;
  if (!Array.isArray(maybeArray)) return 0;
  return maybeArray.reduce((total, conversation) => {
    return total + toSafeCount((conversation as { unreadCount?: CountValue })?.unreadCount);
  }, 0);
}
