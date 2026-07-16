import {
  appendHashtag,
  inferSmartPostIntent,
} from '../../../Social/Feed/utils/postIntentInference';

export const SAFE_COMMUNITY_LOAD_ERROR =
  'Community updates are unavailable right now. Please try again shortly.';
export const SAFE_CREATE_POST_ERROR =
  'Your post could not be shared right now. Please try again.';

export interface LeaderboardEntry {
  id?: string | number;
  userId?: string | number;
  firstName?: string;
  username?: string;
  totalPoints?: number;
  points?: number;
}

export interface CommunityChallenge {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  progress?: number;
  daysRemaining?: number;
}

export interface CommunityFeedPost {
  id?: string | number;
  user?: {
    firstName?: string;
  };
  authorName?: string;
  content?: string;
  text?: string;
  createdAt?: string;
}

const MAX_TEXT_LENGTH = 140;
const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

export const normalizeCommunityText = (
  value: unknown,
  fallback: string,
  maxLength = MAX_TEXT_LENGTH,
): string => {
  const text = typeof value === 'string'
    ? value.replace(/\p{Cc}/gu, '').replace(/\s+/g, ' ').trim()
    : '';
  if (!text) return fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}...` : text;
};

const parsePrimitiveNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampFiniteNumber = (value: unknown, min: number, max: number): number => {
  const numberValue = parsePrimitiveNumber(value);
  if (numberValue === null) return min;
  return Math.min(max, Math.max(min, Math.round(numberValue)));
};

const stableKeyPart = (value: unknown): string => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

export const communityChallengeKey = (challenge: CommunityChallenge, index: number): string => {
  const primary = challenge.id ?? challenge.title ?? challenge.name ?? challenge.description;
  return `challenge-${stableKeyPart(primary) || `slot-${index}`}`;
};

export const leaderboardEntryKey = (leader: LeaderboardEntry, index: number): string => {
  const primary = leader.id ?? leader.userId ?? leader.username ?? leader.firstName;
  return `leader-${stableKeyPart(primary) || `slot-${index}`}`;
};

export const communityFeedPostKey = (post: CommunityFeedPost, index: number): string => {
  const primary = post.id ?? post.createdAt ?? post.content ?? post.text ?? post.authorName ?? post.user?.firstName;
  return `post-${stableKeyPart(primary) || `slot-${index}`}`;
};

export const prepareCommunityPost = (content: string) => {
  const smartIntent = inferSmartPostIntent(content, 'general');
  const enrichedContent = smartIntent.hashtags.reduce(
    (nextContent, hashtag) => appendHashtag(nextContent, hashtag),
    content,
  );

  return {
    content: enrichedContent,
    type: smartIntent.submissionType,
    visibility: 'friends' as const,
  };
};

export const getAwardedPostPoints = (result: unknown): number | null => {
  const payload = result as {
    pointsAwarded?: unknown;
    data?: { pointsAwarded?: unknown };
  } | null;
  const points = parsePrimitiveNumber(payload?.pointsAwarded ?? payload?.data?.pointsAwarded);
  return points !== null && points > 0 ? Math.round(points) : null;
};

export const getSafeCommunityLoadError = (...errors: unknown[]): string | null => (
  errors.some(Boolean) ? SAFE_COMMUNITY_LOAD_ERROR : null
);

export const getSafeCreatePostErrorCopy = (error: unknown): string | null => (
  error ? SAFE_CREATE_POST_ERROR : null
);

export const normalizeLeaderboardEntry = (entry: LeaderboardEntry, index: number) => ({
  id: leaderboardEntryKey(entry, index),
  name: normalizeCommunityText(entry.firstName ?? entry.username, `Athlete ${index + 1}`, 72),
  xp: clampFiniteNumber(entry.totalPoints ?? entry.points, 0, 9999999),
});

export const normalizeCommunityChallenge = (challenge: CommunityChallenge, index: number) => ({
  id: communityChallengeKey(challenge, index),
  title: normalizeCommunityText(challenge.title ?? challenge.name, 'Challenge', 96),
  description: normalizeCommunityText(challenge.description, 'Complete this challenge to earn rewards.', 180),
  progress: clampFiniteNumber(challenge.progress, 0, 100),
  daysRemaining: clampFiniteNumber(challenge.daysRemaining, 0, 365),
});

export const normalizeCommunityFeedPost = (post: CommunityFeedPost, index: number) => {
  const createdAt = typeof post.createdAt === 'string' ? new Date(post.createdAt) : null;
  const safeCreatedAt = createdAt && Number.isFinite(createdAt.getTime()) ? createdAt.toLocaleString() : '';

  return {
    id: communityFeedPostKey(post, index),
    author: normalizeCommunityText(post.user?.firstName ?? post.authorName, 'Community Member', 72),
    body: normalizeCommunityText(post.content ?? post.text, '', 500),
    createdAt: safeCreatedAt,
  };
};
