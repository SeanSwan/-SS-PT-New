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
 *   gamificationController -> GamificationPointsService (NEW delegation target)
 *                          -> direct Sequelize queries (LEGACY - migrate gradually)
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
import { scheduleLedgerRealtimeEvent } from './GamificationRealtimeEvents.mjs';

const MAX_SINGLE_AWARD = 500;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

function normalizeInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null;
  }
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!/^-?\d+$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeMultiplier(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())
      ? Number(value.trim())
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(parsed, 5.0);
}

function normalizeBalance(value) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = normalizeInteger(value);
  return parsed !== null && parsed >= 0 ? parsed : 0;
}

function normalizeIdempotencyKey(value) {
  if (!value) return null;
  return String(value).slice(0, MAX_IDEMPOTENCY_KEY_LENGTH);
}

function withIdempotencyMetadata(metadata, idempotencyKey) {
  if (!idempotencyKey) return metadata;
  const base = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : {};
  return { ...base, idempotencyKey };
}

function duplicateLedgerResult(existing) {
  return {
    success: true,
    duplicate: true,
    pointsAwarded: 0,
    newBalance: existing.balance,
    pointTransaction: existing
  };
}

export class GamificationPointsService {
  /**
   * Validate point award request.
   * @returns {{ valid: boolean, error?: string, parsedPoints?: number }}
   */
  static validateAward(points, source, description, maxPoints = MAX_SINGLE_AWARD) {
    if (points === undefined || points === null || points === '' || !source || !description) {
      return { valid: false, error: 'Points, source, and description are required' };
    }
    const parsedPoints = normalizeInteger(points);
    const normalizedMaxPoints = Number.isSafeInteger(maxPoints) && maxPoints >= 1
      ? maxPoints
      : MAX_SINGLE_AWARD;
    if (!Number.isInteger(parsedPoints) || parsedPoints < 1 || parsedPoints > normalizedMaxPoints) {
      return { valid: false, error: `Points must be between 1 and ${normalizedMaxPoints}` };
    }
    return { valid: true, parsedPoints };
  }

  /**
   * Check idempotency - has this action already been awarded today?
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
    const multiplier = normalizeMultiplier(settings?.pointsMultiplier);
    if (settings?.isEnabled && multiplier !== null) {
      return Math.round(basePoints * multiplier);
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
    dedupeBySourceToday = false,
    maxPoints = MAX_SINGLE_AWARD
  }, outerTransaction = null) {
    const validation = this.validateAward(points, source, description, maxPoints);
    if (!validation.valid) {
      const error = new Error(validation.error);
      error.statusCode = 400;
      throw error;
    }

    const execute = async (transaction) => {
      const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
      const normalizedSourceId = normalizeInteger(sourceId);

      const findExistingIdempotentTransaction = () => PointTransaction.findOne({
        where: {
          userId,
          source,
          idempotencyKey: normalizedKey
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (normalizedKey) {
        const existing = await findExistingIdempotentTransaction();
        if (existing) {
          return duplicateLedgerResult(existing);
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

      if (normalizedKey) {
        const existing = await findExistingIdempotentTransaction();
        if (existing) {
          return duplicateLedgerResult(existing);
        }
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

      const isSpendLike = transactionType === 'spend' || transactionType === 'expire';
      const userBalance = normalizeBalance(user.points);
      const ledgerBalance = normalizeBalance(lastTransaction?.balance);
      const currentBalance = isSpendLike
        ? userBalance
        : Math.max(userBalance, ledgerBalance);
      if (isSpendLike && pointsToRecord > currentBalance) {
        const error = new Error('Insufficient points for spend transaction');
        error.statusCode = 400;
        throw error;
      }
      const newBalance = this.calculateBalance(currentBalance, pointsToRecord, transactionType);
      const newLevel = calculateLevel(Math.max(newBalance, 0));
      const newTier = getTier(newLevel);
      const ledgerMetadata = withIdempotencyMetadata(metadata, normalizedKey);
      const previousLevel = user.level;
      const previousTier = user.tier;

      const pointTransaction = await PointTransaction.create({
        userId,
        points: pointsToRecord,
        balance: newBalance,
        transactionType,
        source,
        sourceId: normalizedSourceId,
        idempotencyKey: normalizedKey,
        description,
        metadata: ledgerMetadata,
        awardedBy
      }, { transaction });

      const userUpdates = { points: newBalance };
      if (newLevel !== previousLevel) userUpdates.level = newLevel;
      if (newTier !== previousTier) userUpdates.tier = newTier;
      await user.update(userUpdates, { transaction });

      return {
        success: true,
        duplicate: false,
        pointsAwarded: pointsToRecord,
        newBalance,
        newLevel,
        newTier,
        previousLevel,
        previousTier,
        pointTransaction
      };
    };

    const eventEntry = {
      userId,
      source,
      sourceId,
      transactionType,
    };
    if (outerTransaction) {
      const result = await execute(outerTransaction);
      scheduleLedgerRealtimeEvent(result, eventEntry, outerTransaction);
      return result;
    }
    const result = await db.transaction(execute);
    scheduleLedgerRealtimeEvent(result, eventEntry, null);
    return result;
  }
}

export default GamificationPointsService;
