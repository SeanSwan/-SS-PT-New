/**
 * ============================================================================
 * FILE: GamificationLeaderboardService.mjs
 * PURPOSE: Leaderboard queries, rank calculations, social features (Strangler Fig)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Encapsulates leaderboard-related business logic.
 * Handles ranked queries with pagination caps, rank change detection for
 * social alerts, and weekly recap data aggregation.
 *
 * ARCHITECTURE:
 * graph TD
 *   A[gamificationController] --> B[GamificationLeaderboardService]
 *   B --> C[User model]
 *   B --> D[Gamification model]
 *   B --> E[PointTransaction model]
 */

import User from '../../models/User.mjs';
import Gamification from '../../models/Gamification.mjs';
import PointTransaction from '../../models/PointTransaction.mjs';
import { Op } from 'sequelize';

const MAX_LEADERBOARD_LIMIT = 100;

export class GamificationLeaderboardService {
  /**
   * Get paginated leaderboard with capped limit.
   */
  static async getLeaderboard({ page = 1, limit = 10, tier = null }) {
    const cappedLimit = Math.min(parseInt(limit) || 10, MAX_LEADERBOARD_LIMIT);
    const offset = (parseInt(page) - 1) * cappedLimit;

    const whereClause = {};
    if (tier) whereClause.tier = tier;

    const [leaderboard, total] = await Promise.all([
      User.findAll({
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'points', 'level', 'tier'],
        where: whereClause,
        order: [['points', 'DESC']],
        limit: cappedLimit,
        offset,
      }),
      User.count({ where: whereClause }),
    ]);

    return {
      leaderboard,
      pagination: {
        total,
        page: parseInt(page),
        limit: cappedLimit,
        pages: Math.ceil(total / cappedLimit),
      },
    };
  }

  /**
   * Check if a point award caused the user to pass someone on the leaderboard.
   * Returns the passed user's info if a rank change occurred.
   */
  static async detectRankChange(userId, previousPoints, newPoints) {
    // Count users who were ranked above but are now ranked below
    const passedUsers = await User.findAll({
      where: {
        id: { [Op.ne]: userId },
        points: { [Op.gt]: previousPoints, [Op.lte]: newPoints },
      },
      attributes: ['id', 'firstName', 'lastName', 'username'],
      limit: 5,
    });

    return passedUsers.length > 0 ? passedUsers : null;
  }
}

export default GamificationLeaderboardService;
