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
import GamificationSettings from '../../models/GamificationSettings.mjs';
import { Op } from 'sequelize';
import db from '../../database.mjs';
import { calculateLevel, getTier } from '../../utils/levelingAlgorithm.mjs';

const MAX_SINGLE_AWARD = 500;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

function normalizeInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeIdempotencyKey(value) {
  if (!value) return null;
  return String(value).slice(0, MAX_IDEMPOTENCY_KEY_LENGTH);
}

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

  /**
   * Record one point ledger entry and keep User.points/level/tier in sync.
   * This is the shared write path for visible gamification point balances.
   */
  static async recordLedgerEntry({
    userId,
    points,
    transactionType = 'earn',
    source,
    sourceId = null,
    description,
    metadata = null,
    awardedBy = null,
    idempotencyKey = null,
    applyMultiplier = false,
    dedupeBySourceToday = false
  }, outerTransaction = null) {
    const validation = this.validateAward(points, source, description);
    if (!validation.valid) {
      const error = new Error(validation.error);
      error.statusCode = 400;
      throw error;
    }

    const execute = async (transaction) => {
      const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
      const normalizedSourceId = normalizeInteger(sourceId);

      if (normalizedKey) {
        const existing = await PointTransaction.findOne({
          where: { userId, source, idempotencyKey: normalizedKey },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (existing) {
          return {
            success: true,
            duplicate: true,
            pointsAwarded: 0,
            newBalance: existing.balance,
            pointTransaction: existing
          };
        }
      } else if (dedupeBySourceToday && await this.checkDuplicate(userId, source, normalizedSourceId, transaction)) {
        return {
          success: true,
          duplicate: true,
          pointsAwarded: 0,
          newBalance: null,
          pointTransaction: null
        };
      }

      const user = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      const pointsToRecord = applyMultiplier
        ? await this.getMultipliedPoints(validation.parsedPoints, transaction)
        : validation.parsedPoints;

      const lastTransaction = await PointTransaction.findOne({
        where: { userId },
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const currentBalance = Math.max(
        Number(user.points || 0),
        Number(lastTransaction?.balance || 0)
      );
      const newBalance = this.calculateBalance(currentBalance, pointsToRecord, transactionType);
      const newLevel = calculateLevel(Math.max(newBalance, 0));
      const newTier = getTier(newLevel);

      const pointTransaction = await PointTransaction.create({
        userId,
        points: pointsToRecord,
        balance: newBalance,
        transactionType,
        source,
        sourceId: normalizedSourceId,
        idempotencyKey: normalizedKey,
        description,
        metadata,
        awardedBy
      }, { transaction });

      const userUpdates = { points: newBalance };
      if (newLevel !== user.level) userUpdates.level = newLevel;
      if (newTier !== user.tier) userUpdates.tier = newTier;
      await user.update(userUpdates, { transaction });

      return {
        success: true,
        duplicate: false,
        pointsAwarded: pointsToRecord,
        newBalance,
        newLevel,
        newTier,
        previousLevel: user.level,
        previousTier: user.tier,
        pointTransaction
      };
    };

    if (outerTransaction) return execute(outerTransaction);
    return db.transaction(execute);
  }
}

export default GamificationPointsService;
