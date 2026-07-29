/**
 * Badge Gamification Bridge
 * =========================
 *
 * Connects durable gamification events to admin-created badge rules. Badge
 * evaluation is best-effort: core workout/social/challenge writes must remain
 * successful even if badge storage is temporarily unavailable.
 */

import badgeService from './badgeService.mjs';
import { piiSafeLogger } from '../utils/monitoring/piiSafeLogging.mjs';

export async function checkBadgesForGamificationEvent({
  userId,
  type,
  activityData = {},
  logger = piiSafeLogger
}) {
  if (!userId || !type) return [];

  try {
    return await badgeService.checkBadgeEarnings(userId, {
      ...activityData,
      type
    });
  } catch (error) {
    logger?.warn?.('Badge event evaluation skipped after gamification event', {
      userId,
      activityType: type,
      error: error.message
    });
    return [];
  }
}

/**
 * Post-commit badge sweep for a freshly-awarded workout (Workout-OS C3).
 * Call ONLY after the XP transaction commits — the activity payload is the
 * PERSISTED stats, so a rolled-back award can never mint a phantom badge.
 * Duplicate protection is layered: userHasBadge pre-check + the DB's
 * unique_user_badge_ownership constraint; this wrapper never throws.
 */
export async function fireWorkoutBadgeChecks({
  userId,
  xpResult,
  exerciseCount = 0,
  logger = piiSafeLogger
}) {
  if (!userId || !xpResult || xpResult.sameDay || xpResult.alreadyAwarded) return [];

  const milestones = Array.isArray(xpResult.awardedMilestones) ? xpResult.awardedMilestones : [];
  const badgeActivity = {
    streakDays: xpResult.streakDays,
    currentStreak: xpResult.streakDays,
    totalWorkouts: xpResult.totalWorkouts,
    exerciseCount,
    count: exerciseCount,
    milestoneIds: milestones.map((m) => m.id),
    milestoneNames: milestones.map((m) => m.name),
    points: xpResult.newBalance,
    totalPoints: xpResult.newBalance,
    completed: true
  };

  const checks = [
    checkBadgesForGamificationEvent({ userId, type: 'workout_completion', activityData: badgeActivity, logger }),
    checkBadgesForGamificationEvent({ userId, type: 'streak_update', activityData: badgeActivity, logger })
  ];
  if (badgeActivity.milestoneIds.length > 0) {
    checks.push(checkBadgesForGamificationEvent({ userId, type: 'milestone_reached', activityData: badgeActivity, logger }));
  }
  return (await Promise.all(checks)).flat();
}

export default { checkBadgesForGamificationEvent, fireWorkoutBadgeChecks };
