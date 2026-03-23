/**
 * ============================================================================
 * FILE: GamificationStreakService.mjs
 * PURPOSE: Streak tracking, freeze logic, comeback challenges (Strangler Fig)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Encapsulates all streak-related business logic.
 * Handles streak calculation, freeze tokens, grace days, and comeback
 * challenge creation for inactive users.
 *
 * PSYCHOLOGY:
 * - Loss Aversion: Streak freeze reduces anxiety about losing progress
 * - Sunk Cost: Longer streaks create stronger retention
 * - Commitment/Consistency: Comeback challenges leverage prior investment
 *
 * ARCHITECTURE:
 * graph TD
 *   A[gamificationController] --> B[GamificationStreakService]
 *   B --> C[Gamification model]
 *   B --> D[ComebackChallenge model]
 *   B --> E[PointTransaction model]
 */

import Gamification from '../../models/Gamification.mjs';
import ComebackChallenge from '../../models/ComebackChallenge.mjs';
import { Op } from 'sequelize';

const MAX_FREEZES = 3;
const STREAK_FREEZE_INTERVAL_DAYS = 7; // Earn 1 freeze per 7-day streak

export class GamificationStreakService {
  /**
   * Check if user should earn a new streak freeze token.
   * Awards 1 freeze per 7-day streak milestone, max 3 total.
   */
  static async checkStreakFreezeEligibility(userId) {
    const record = await Gamification.findOne({ where: { userId } });
    if (!record) return null;

    const currentFreezes = record.streakFreezes || 0;
    if (currentFreezes >= MAX_FREEZES) return null;

    const streak = record.streakCount || 0;
    // Check if streak is a multiple of 7 and freeze not already earned for this milestone
    if (streak > 0 && streak % STREAK_FREEZE_INTERVAL_DAYS === 0) {
      const lastEarned = record.lastStreakFreezeEarned;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!lastEarned || new Date(lastEarned) < today) {
        await record.update({
          streakFreezes: currentFreezes + 1,
          lastStreakFreezeEarned: new Date()
        });
        return { newTotal: currentFreezes + 1, max: MAX_FREEZES };
      }
    }
    return null;
  }

  /**
   * Create a comeback challenge for an inactive user.
   * Called by a daily cron job checking lastActivityDate.
   */
  static async createComebackChallenge(userId, daysMissed) {
    // Don't create if one already exists
    const existing = await ComebackChallenge.findOne({
      where: {
        userId,
        status: { [Op.in]: ['pending', 'accepted'] },
        endDate: { [Op.gte]: new Date() }
      }
    });
    if (existing) return null;

    let type, targetWorkouts, xpMultiplier, durationDays;

    if (daysMissed >= 30) {
      type = 'fresh_start';
      targetWorkouts = 2;
      xpMultiplier = 1.5;
      durationDays = 14;
    } else if (daysMissed >= 7) {
      type = 'welcome_back';
      targetWorkouts = 3;
      xpMultiplier = 2.0;
      durationDays = 7;
    } else {
      type = 'streak_recovery';
      targetWorkouts = 1;
      xpMultiplier = 1.5;
      durationDays = 3;
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    return ComebackChallenge.create({
      userId,
      type,
      status: 'pending',
      startDate: new Date(),
      endDate,
      targetWorkouts,
      xpMultiplier,
      daysMissed,
    });
  }

  /**
   * Update comeback challenge progress when a workout is completed.
   */
  static async updateComebackProgress(userId) {
    const challenge = await ComebackChallenge.findOne({
      where: {
        userId,
        status: 'accepted',
        endDate: { [Op.gte]: new Date() }
      }
    });

    if (!challenge) return null;

    const newCompleted = (challenge.completedWorkouts || 0) + 1;
    const updates = { completedWorkouts: newCompleted };

    if (newCompleted >= challenge.targetWorkouts) {
      updates.status = 'completed';
      updates.completedAt = new Date();
    }

    await challenge.update(updates);
    return challenge;
  }
}

export default GamificationStreakService;
