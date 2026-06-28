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

export default { checkBadgesForGamificationEvent };
