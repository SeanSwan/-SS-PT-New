/**
 * FILE: HomeTabLiveWidgetViewModel.ts
 * PURPOSE: Pure mappers for live Home tab rail widgets.
 *
 * These helpers keep the Creator Observatory UI honest: if an API has no real
 * data, the caller can render an empty state instead of static names or fake XP.
 */

type UnknownRecord = Record<string, unknown>;

export interface HomeLiveActivityItem {
  id: string;
  user: string;
  action: string;
  time: string;
  source: 'live' | 'feed';
}

export interface HomeChallengeSummary {
  id: string;
  title: string;
  progress: number;
  daysLeft: number;
  participants: number;
  reward: string;
  joined: boolean;
}

export interface HomeBadgeItem {
  id: string;
  name: string;
  icon: string;
  imageUrl?: string;
}

export interface HomeLeaderboardRow {
  id: string;
  name: string;
  points: number;
}

export interface TrendingTagSummary {
  name: string;
  count: number;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? value as UnknownRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function readNumber(record: UnknownRecord, keys: string[]): number {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function clampPercentValue(value: number): number {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

export function firstMediaUrl(post: UnknownRecord): string {
  const direct = readString(post, ['mediaUrl', 'media_url', 'imageUrl', 'thumbnailUrl', 'videoUrl']);
  if (direct) return direct;

  const media = asArray(post.media || post.mediaUrls || post.attachments || post.files);
  for (const item of media) {
    if (typeof item === 'string' && item.trim()) return item.trim();
    const mediaRecord = asRecord(item);
    const nested = readString(mediaRecord, ['url', 'mediaUrl', 'imageUrl', 'thumbnailUrl']);
    if (nested) return nested;
  }
  return '';
}

function displayNameFromPost(post: UnknownRecord, fallback: string): string {
  const user = asRecord(post.user || post.author || post.client || post.creator);
  return (
    readString(user, ['username', 'firstName', 'displayName', 'name']) ||
    readString(post, ['username', 'authorName', 'userName']) ||
    fallback
  );
}

export function formatAgo(timestamp: unknown, nowMs: number): string {
  const timeMs = new Date(String(timestamp || '')).getTime();
  if (!Number.isFinite(timeMs)) return 'recently';
  const seconds = Math.max(0, Math.floor((nowMs - timeMs) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function actionFromEvent(event: UnknownRecord): string {
  const type = readString(event, ['type']);
  const postType = readString(event, ['postType', 'contentType']) || 'post';
  if (type === 'reaction_added') return 'reacted to a post';
  if (type === 'comment_added') return 'commented on a post';
  if (type === 'workout_completed') return 'completed a workout';
  return `shared a ${postType}`;
}

/* Workstream N2: buildHomeStories removed — stories are not a real product
   feature (no backend), so the strip rendered feed media pretending to be one.
   The Home rail now only carries widgets backed by real data. */

export function buildHomeLiveActivity({
  events,
  feedPosts,
  displayName,
  nowMs = Date.now(),
  limit = 4,
}: {
  events?: unknown[] | null;
  feedPosts?: unknown[] | null;
  displayName: string;
  nowMs?: number;
  limit?: number;
}): HomeLiveActivityItem[] {
  const liveItems = (events || []).map((event, index) => {
    const record = asRecord(event);
    return {
      id: readString(record, ['id']) || `event-${index}`,
      user: readString(record, ['userName', 'username', 'actorName']) || displayName,
      action: actionFromEvent(record),
      time: formatAgo(record.timestamp || record.createdAt, nowMs),
      source: 'live' as const,
    };
  });

  if (liveItems.length) return liveItems.slice(0, limit);

  return (feedPosts || []).slice(0, limit).map((post, index) => {
    const record = asRecord(post);
    const type = readString(record, ['type', 'postType']) || 'post';
    return {
      id: readString(record, ['id', '_id', 'postId']) || `post-${index}`,
      user: displayNameFromPost(record, displayName),
      action: `shared a ${type}`,
      time: formatAgo(record.createdAt || record.timestamp || record.updatedAt, nowMs),
      source: 'feed' as const,
    };
  });
}

export function selectActiveChallengeSummary({
  challenges,
  isDemoData,
}: {
  challenges?: unknown[] | null;
  isDemoData?: boolean;
}): HomeChallengeSummary | null {
  if (isDemoData) return null;

  const active = (challenges || [])
    .map(asRecord)
    .filter((challenge) => readString(challenge, ['status']) === 'active');
  const selected = active.find((challenge) => challenge.joined === true) || active[0];
  if (!selected) return null;

  return {
    id: readString(selected, ['id', '_id', 'challengeId']),
    title: readString(selected, ['title', 'name']) || 'Active Challenge',
    progress: clampPercentValue(readNumber(selected, ['progress', 'progressPercentage'])),
    daysLeft: Math.max(0, Math.round(readNumber(selected, ['daysLeft', 'daysRemaining']))),
    participants: Math.max(0, Math.round(readNumber(selected, ['participants', 'currentParticipants']))),
    reward: readString(selected, ['reward', 'rewardText']) || 'XP Reward',
    joined: selected.joined === true,
  };
}

export function buildHomeBadgeShowcase({
  achievements,
  leaderboard,
}: {
  achievements?: unknown[] | null;
  leaderboard?: unknown[] | null;
}): { badges: HomeBadgeItem[]; leaderboardRows: HomeLeaderboardRow[] } {
  const badges = (achievements || []).slice(0, 3).map((item, index) => {
    const record = asRecord(item);
    const achievement = asRecord(record.achievement || record.badge);
    return {
      id: readString(record, ['id', '_id']) || readString(achievement, ['id', '_id']) || `badge-${index}`,
      name: readString(achievement, ['name', 'title']) || readString(record, ['name', 'title']) || 'Achievement',
      icon: readString(achievement, ['icon', 'iconEmoji']) || readString(record, ['icon', 'iconEmoji']) || 'A',
      imageUrl: readString(achievement, ['badgeImageUrl', 'iconUrl', 'imageUrl']) || readString(record, ['badgeImageUrl', 'iconUrl', 'imageUrl']) || undefined,
    };
  });

  const rows = (leaderboard || []).slice(0, 3).map((item, index) => {
    const record = asRecord(item);
    const client = asRecord(record.client || record.user);
    return {
      id: readString(record, ['id', 'userId', '_id']) || `leader-${index}`,
      name: readString(client, ['firstName', 'username', 'name']) || readString(record, ['firstName', 'username', 'name']) || 'SwanCreator',
      points: Math.max(0, Math.round(readNumber(record, ['points', 'totalPoints', 'score']))),
    };
  });

  // No synthetic self-row. An empty or failed leaderboard must render as
  // "not populated yet" and rank as "Unranked" — a fabricated row sat at
  // position 1 in gold and made findClientRank report #1 to every member.
  return { badges, leaderboardRows: rows };
}

export function extractTrendingTagNames(payload: unknown, limit = 5): TrendingTagSummary[] {
  const record = asRecord(payload);
  const source = Array.isArray(payload)
    ? payload
    : asArray(record.data || record.hashtags || record.tags);

  return source.slice(0, limit).map((tag, index) => {
    const tagRecord = asRecord(tag);
    const name = readString(tagRecord, ['name', 'slug', 'tag', 'hashtag']).replace(/^#/, '') || `trend-${index + 1}`;
    return {
      name,
      count: Math.max(0, Math.round(readNumber(tagRecord, ['weeklyCount', 'postCount', 'count', 'uses']))),
    };
  });
}
