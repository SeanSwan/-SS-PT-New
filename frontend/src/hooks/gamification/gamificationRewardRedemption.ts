import type { Reward } from './gamificationLegacyTypes';

const REWARD_REDEEM_UNAVAILABLE_COPY = 'Reward could not be redeemed.';
const ID_SEGMENT_PATTERN = /^[1-9]\d*$/;
const REWARD_COPY_MAX = 64;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const WHITESPACE = /\s+/g;
const MARKUP_BOUNDARIES = /[<>]/;

const parseNonNegativeInteger = (value: unknown) => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
  return parsed;
};

export interface RewardRedemptionCachePatch {
  pointCost: number;
  nextStock: number;
  nextRedemptionCount: number;
}

export interface RewardRedemptionProof {
  id: string;
  rewardId: string;
  redeemedAt: string;
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
  pointsCost?: number;
}

const REWARD_REDEMPTION_STATUSES = new Set<RewardRedemptionProof['status']>([
  'pending',
  'fulfilled',
  'cancelled',
  'expired',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function getSafeGamificationIdSegment(value: unknown) {
  const segment =
    typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!ID_SEGMENT_PATTERN.test(segment)) return null;
  return Number.isSafeInteger(Number(segment)) ? segment : null;
}

export function getSafeGamificationToastDescription(_error?: unknown) {
  return REWARD_REDEEM_UNAVAILABLE_COPY;
}

const getSafeRewardName = (value: unknown, fallback = 'your reward') => {
  const rawName = typeof value === 'string' ? value : '';
  const cleaned = rawName.replace(CONTROL_CHARS, ' ').replace(WHITESPACE, ' ').trim();
  if (MARKUP_BOUNDARIES.test(cleaned)) return fallback;
  const safeName = cleaned || fallback;

  if (safeName.length <= REWARD_COPY_MAX) return safeName;

  return `${safeName.slice(0, REWARD_COPY_MAX - 3).trimEnd()}...`;
};

export function getSafeGamificationRewardSuccessDescription(rewardName: unknown, fallbackRewardName?: unknown) {
  return `You've successfully redeemed: ${getSafeRewardName(rewardName, getSafeRewardName(fallbackRewardName))}`;
}

export function getSafeGamificationRewardTransactionDescription(rewardName: unknown) {
  return `Reward Redeemed: ${getSafeRewardName(rewardName, 'Reward')}`;
}

export function buildRewardRedemptionCachePatch(
  reward?: Reward
): RewardRedemptionCachePatch | null {
  const pointCost = parseNonNegativeInteger(reward?.pointCost);
  const stock = parseNonNegativeInteger(reward?.stock);
  const redemptionCount = parseNonNegativeInteger(reward?.redemptionCount);

  if (pointCost === null || stock === null || redemptionCount === null) return null;

  return {
    pointCost,
    nextStock: Math.max(0, stock - 1),
    nextRedemptionCount: redemptionCount + 1,
  };
}

export function buildRewardRedemptionProof(
  responseData: unknown,
  fallbackRewardId: unknown
): RewardRedemptionProof | null {
  const response = isRecord(responseData) ? responseData : {};
  const userReward = isRecord(response.userReward) ? response.userReward : {};
  const id = getSafeGamificationIdSegment(userReward.id);
  const rewardId = getSafeGamificationIdSegment(userReward.rewardId) || getSafeGamificationIdSegment(fallbackRewardId);
  const rawRedeemedAt = typeof userReward.redeemedAt === 'string' ? userReward.redeemedAt.trim() : '';
  const redeemedAtDate = new Date(rawRedeemedAt);
  const redeemedAt = Number.isFinite(redeemedAtDate.getTime()) ? redeemedAtDate.toISOString() : null;
  const status = typeof userReward.status === 'string' && REWARD_REDEMPTION_STATUSES.has(userReward.status as RewardRedemptionProof['status'])
    ? (userReward.status as RewardRedemptionProof['status'])
    : 'pending';
  const pointsCost = parseNonNegativeInteger(userReward.pointsCost);

  if (!id || !rewardId || !redeemedAt) return null;

  return {
    id,
    rewardId,
    redeemedAt,
    status,
    ...(pointsCost === null ? {} : { pointsCost }),
  };
}
