/**
 * Badge Reward Points Service
 * ===========================
 *
 * Purpose: Converts admin-created badge point rewards into canonical
 * gamification ledger entries without adding a badge-specific DB enum value.
 *
 * Design:
 * - Badges are UUID-backed, while PointTransaction.sourceId is integer-only.
 * - The legal ledger source is achievement_earned; badge identity stays in
 *   metadata and the deterministic idempotency key.
 * - Badge reward points are capped at 500 to match the central service's
 *   normal award-safety boundary.
 */

import GamificationPointsService from './gamification/GamificationPointsService.mjs';

export const BADGE_POINT_SOURCE = 'achievement_earned';
export const BADGE_REWARD_REASON = 'badge_earned';
export const MAX_BADGE_REWARD_POINTS = 500;

export function normalizeBadgeRewardPoints(value) {
  let parsed = null;

  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    parsed = value;
  } else if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    parsed = Number.parseInt(value.trim(), 10);
  }

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.min(parsed, MAX_BADGE_REWARD_POINTS);
}

function normalizeBadgeRewardId(sourceId) {
  if (typeof sourceId === 'string' && sourceId.trim()) {
    return sourceId.trim();
  }

  if (typeof sourceId === 'number' && Number.isSafeInteger(sourceId)) {
    return String(sourceId);
  }

  return 'unknown';
}

export async function awardBadgeRewardPoints({
  userId,
  points,
  source = BADGE_REWARD_REASON,
  sourceId,
  logger = null
}) {
  const normalizedPoints = normalizeBadgeRewardPoints(points);
  if (normalizedPoints <= 0) {
    return { pointsAwarded: 0, duplicate: false };
  }

  const badgeId = normalizeBadgeRewardId(sourceId);
  const ledgerResult = await GamificationPointsService.recordLedgerEntry({
    userId,
    points: normalizedPoints,
    transactionType: 'bonus',
    source: BADGE_POINT_SOURCE,
    sourceId: null,
    description: 'Badge reward points',
    metadata: {
      reason: source || BADGE_REWARD_REASON,
      badgeId,
      rewardSource: source || BADGE_REWARD_REASON
    },
    awardedBy: null,
    idempotencyKey: `badge:${userId}:${badgeId}`,
    maxPoints: MAX_BADGE_REWARD_POINTS
  });

  logger?.info?.('Badge reward points recorded', {
    userId,
    badgeId,
    pointsAwarded: ledgerResult.pointsAwarded,
    duplicate: ledgerResult.duplicate
  });

  return ledgerResult;
}
