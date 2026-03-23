/**
 * ============================================================================
 * FILE: GamificationPointsService.mjs
 * PURPOSE: Point award logic, validation, idempotency (Strangler Fig extract)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Encapsulates all point-related business logic that was
 * previously in gamificationController.mjs (2600+ line monolith). Handles
 * point awards, validation, idempotency checks, and multiplier application.
 *
 * HOW IT FITS IN THE APP (Strangler Fig Pattern):
 *   gamificationController → GamificationPointsService (NEW delegation target)
 *                          → direct Sequelize queries (LEGACY — migrate gradually)
 *
 * ARCHITECTURE:
 * graph TD
 *   A[gamificationController.awardPoints] --> B[GamificationPointsService]
 *   B --> C[PointTransaction model]
 *   B --> D[User model]
 *   B --> E[GamificationSettings model]
 *   B --> F[levelingAlgorithm.mjs]
 */

import PointTransaction from '../../models/PointTransaction.mjs';
import User from '../../models/User.mjs';
import Gamification from '../../models/Gamification.mjs';
import GamificationSettings from '../../models/GamificationSettings.mjs';
import { Op } from 'sequelize';
import db from '../../database.mjs';

const MAX_SINGLE_AWARD = 500;

export class GamificationPointsService {
  /**
   * Validate point award request.
   * @returns {{ valid: boolean, error?: string, parsedPoints?: number }}
   */
  static validateAward(points, source, description) {
    if (!points || !source || !description) {
      return { valid: false, error: 'Points, source, and description are required' };
    }
    const parsedPoints = parseInt(points);
    if (!Number.isInteger(parsedPoints) || parsedPoints < 1 || parsedPoints > MAX_SINGLE_AWARD) {
      return { valid: false, error: `Points must be between 1 and ${MAX_SINGLE_AWARD}` };
    }
    return { valid: true, parsedPoints };
  }

  /**
   * Check idempotency — has this action already been awarded today?
   * @returns {boolean} true if duplicate exists
   */
  static async checkDuplicate(userId, source, sourceId, transaction) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const where = {
      userId,
      source: source || 'manual',
      createdAt: { [Op.gte]: startOfToday }
    };
    if (sourceId) where.sourceId = sourceId;

    const existing = await PointTransaction.findOne({ where, transaction });
    return !!existing;
  }

  /**
   * Apply settings multiplier to base points.
   */
  static async getMultipliedPoints(basePoints, transaction) {
    const settings = await GamificationSettings.findOne({ transaction });
    if (settings?.isEnabled && settings?.pointsMultiplier) {
      return Math.round(basePoints * Math.min(settings.pointsMultiplier, 5.0));
    }
    return basePoints;
  }

  /**
   * Calculate new balance based on transaction type.
   */
  static calculateBalance(currentPoints, pointsToAward, transactionType) {
    if (transactionType === 'spend' || transactionType === 'expire') {
      return currentPoints - pointsToAward;
    }
    return currentPoints + pointsToAward;
  }
}

export default GamificationPointsService;
