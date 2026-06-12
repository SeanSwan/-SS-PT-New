/**
 * Pure data helpers for the UserDashboard V3 Home tab.
 */

import { Mail, Radio, Search, type LucideIcon } from 'lucide-react';
import type { PostType } from '../../Social/Feed/types/CreatePostTypes';
import {
  appendHashtag,
  inferSmartPostIntent,
} from '../../Social/Feed/utils/postIntentInference';
import { firstMediaUrl, formatAgo } from './HomeTabLiveWidgetViewModel';
export {
  buildHomeBadgeShowcase,
  buildHomeLiveActivity,
  extractTrendingTagNames,
  selectActiveChallengeSummary,
} from './HomeTabLiveWidgetViewModel';
export type {
  HomeBadgeItem,
  HomeChallengeSummary,
  HomeLeaderboardRow,
  HomeLiveActivityItem,
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

export interface HomePostPayload {
  content: string;
  type: PostType;
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

const MOOD_TO_POST_TYPE: Record<string, PostType> = {
  workout: 'workout',
  transformation: 'transformation',
  achievement: 'achievement',
  challenge: 'challenge',
  music: 'music',
  art: 'art',
  community: 'general',
};

export function buildHomePostPayload(content: string, mood: string, media?: File | null): HomePostPayload {
  const selectedType = MOOD_TO_POST_TYPE[mood] || 'general';
  const smartIntent = inferSmartPostIntent(content, selectedType);
  const taggedContent = smartIntent.hashtags.reduce(
    (nextContent, hashtag) => appendHashtag(nextContent, hashtag),
    content.trim(),
  );
  const payload: HomePostPayload = {
    content: taggedContent,
    type: smartIntent.submissionType,
    visibility: 'friends',
  };
  if (media) payload.media = media;
  return payload;
}

/** Real view of the user's latest feed post — no fabricated engagement. */
export interface HomeLatestPostView {
  caption: string;
  mediaUrl: string | null;
  isVideo: boolean;
  timeAgo: string;
  likes: number;
  comments: number;
}

const VIDEO_URL_PATTERN = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export function buildLatestPostView(
  feedPosts: unknown[] | null | undefined,
  nowMs: number,
): HomeLatestPostView | null {
  const first = (feedPosts || [])[0];
  if (!first || typeof first !== 'object') return null;
  const record = first as Record<string, unknown>;

  const readCount = (keys: string[]): number => {
    for (const key of keys) {
      const value = Number(record[key]);
      if (Number.isFinite(value) && value >= 0) return Math.floor(value);
    }
    return 0;
  };

  const caption = [record.caption, record.content, record.text]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    ?.trim() ?? '';
  const mediaUrl = firstMediaUrl(record) || null;

  return {
    caption,
    mediaUrl,
    isVideo: !!mediaUrl && VIDEO_URL_PATTERN.test(mediaUrl),
    timeAgo: formatAgo(record.createdAt ?? record.timestamp ?? record.updatedAt, nowMs),
    likes: readCount(['likesCount', 'likes', 'likeCount']),
    comments: readCount(['commentsCount', 'comments', 'commentCount']),
  };
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
