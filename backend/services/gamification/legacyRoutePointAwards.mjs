/**
 * Legacy Route Point Awards
 * =========================
 *
 * Purpose: Routes that predate the canonical point ledger can award visible
 * user points without mutating legacy Gamification.totalXP fields directly.
 */

import GamificationPointsService from './GamificationPointsService.mjs';

export function awardOlympicEventPoints({
  userId,
  points,
  eventId,
  eventType,
  rank,
  isPersonalBest,
}) {
  return GamificationPointsService.recordLedgerEntry({
    userId,
    points,
    transactionType: 'bonus',
    source: 'challenge_completion',
    sourceId: eventId,
    description: 'Virtual Olympics performance XP',
    metadata: {
      reason: 'virtual_olympics_event',
      eventId,
      eventType,
      rank,
      isPersonalBest: Boolean(isPersonalBest),
    },
    awardedBy: null,
    idempotencyKey: `olympics:event:${eventId}`,
  });
}

export function awardRecoveryDayPoints({
  userId,
  points,
  date,
}) {
  return GamificationPointsService.recordLedgerEntry({
    userId,
    points,
    transactionType: 'bonus',
    source: 'streak_bonus',
    sourceId: null,
    description: 'Virtual Olympics recovery day XP',
    metadata: {
      reason: 'recovery_day',
      date,
    },
    awardedBy: null,
    idempotencyKey: `olympics:recovery:${userId}:${date}`,
  });
}

export function awardVideoMicroWinPoints({
  userId,
  points,
  videoSessionId,
  type,
  awardedBy,
}) {
  return GamificationPointsService.recordLedgerEntry({
    userId,
    points,
    transactionType: 'bonus',
    source: 'trainer_award',
    sourceId: videoSessionId,
    description: 'Video session micro-win XP',
    metadata: {
      reason: 'video_micro_win',
      videoSessionId,
      microWinType: type,
    },
    awardedBy,
    idempotencyKey: `video-session:micro-win:${videoSessionId}:${type}`,
  });
}
