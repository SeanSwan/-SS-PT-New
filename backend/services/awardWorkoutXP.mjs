/**
 * awardWorkoutXP — XP Service for Admin Workout Logging
 * ======================================================
 * Extracted from gamificationController.recordWorkoutCompletion (lines 2064–2377).
 * This is a DB-heavy service (not a pure function): reads GamificationSettings,
 * locks User rows, writes PointTransaction/UserMilestone, updates User stats.
 *
 * Called by: adminWorkoutLoggerController (best-effort, separate transaction)
 * The existing gamificationController.recordWorkoutCompletion remains intact
 * for the client-facing gamification route.
 *
 * Concurrency-safe execution order:
 *   1. Acquire User row lock
 *   2. Idempotency guard (PointTransaction.sourceId)
 *   3. Day-level guard (WorkoutSession.date + experiencePoints > 0)
 *   4. Same-day guard (lastActivityDate match)
 *   5. Compute points, update stats, create audit records
 */

import User from '../models/User.mjs';
import GamificationSettings from '../models/GamificationSettings.mjs';
import PointTransaction from '../models/PointTransaction.mjs';
import Milestone from '../models/Milestone.mjs';
import UserMilestone from '../models/UserMilestone.mjs';
import WorkoutSession from '../models/WorkoutSession.mjs';
import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';

/**
 * Award XP for a workout completion.
 *
 * @param {Object} params
 * @param {number} params.userId - Client user ID
 * @param {string} params.workoutId - WorkoutSession UUID
 * @param {number} params.duration - Workout duration in minutes
 * @param {number} params.exercisesCompleted - Number of exercises
 * @param {Date}   [params.workoutDate] - When the workout was performed (defaults to now)
 * @param {number} [params.awardedBy] - Admin/trainer user ID who triggered the award
 * @param {Transaction} transaction - Sequelize transaction (caller manages commit/rollback)
 *
 * @returns {Object} result
 * @returns {boolean} [result.alreadyAwarded] - true if this workoutId already earned XP
 * @returns {boolean} [result.sameDay] - true if XP already earned for this calendar day
 * @returns {number}  [result.pointsAwarded] - total XP awarded (including milestones)
 * @returns {number}  [result.newBalance] - user's new point balance
 * @returns {number}  [result.streakDays] - current streak after this workout
 * @returns {number}  [result.totalWorkouts] - total workout count after this workout
 * @returns {Array}   [result.awardedMilestones] - newly awarded milestones
 */
export async function awardWorkoutXP({
  userId,
  workoutId,
  duration,
  exercisesCompleted,
  workoutDate,
  awardedBy,
}, transaction) {
  const effectiveDate = workoutDate ? new Date(workoutDate) : new Date();

  // ── Step 1: Acquire User row lock ──────────────────────────────────
  const user = await User.findByPk(userId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  // ── Step 2: Idempotency guard (same workoutId) ─────────────────────
  if (workoutId) {
    const priorAward = await PointTransaction.findOne({
      where: {
        userId,
        source: 'workout_completion',
        sourceId: String(workoutId),
      },
      transaction,
    });
    if (priorAward) {
      return { alreadyAwarded: true };
    }
  }

  // ── Step 3: Day-level guard (WorkoutSession.date + experiencePoints > 0) ──
  const startOfDay = new Date(effectiveDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(effectiveDate);
  endOfDay.setHours(23, 59, 59, 999);

  const priorXpSession = await WorkoutSession.findOne({
    where: {
      userId,
      date: { [Op.between]: [startOfDay, endOfDay] },
      experiencePoints: { [Op.gt]: 0 },
    },
    transaction,
  });
  if (priorXpSession) {
    return { sameDay: true };
  }

  // ── Step 4: Same-day guard (lastActivityDate match) ────────────────
  const normalizedDate = new Date(effectiveDate);
  normalizedDate.setHours(0, 0, 0, 0);

  const lastActivity = user.lastActivityDate
    ? new Date(user.lastActivityDate)
    : null;
  if (lastActivity) lastActivity.setHours(0, 0, 0, 0);

  if (lastActivity && lastActivity.getTime() === normalizedDate.getTime()) {
    return { sameDay: true };
  }

  // ── Step 5: Compute points ─────────────────────────────────────────
  const settings = await GamificationSettings.findOne({ transaction });

  let pointsToAward = settings?.pointsPerWorkout || 50;

  // Bonus for exercises
  if (exercisesCompleted && settings?.pointsPerExercise) {
    pointsToAward += exercisesCompleted * settings.pointsPerExercise;
  }

  // Bonus for duration (1 point per 5 extra minutes over 30)
  if (duration && duration > 30) {
    pointsToAward += Math.floor((duration - 30) / 5);
  }

  // Apply multiplier
  if (settings?.pointsMultiplier) {
    pointsToAward = Math.round(pointsToAward * settings.pointsMultiplier);
  }

  // ── Streak calculation ─────────────────────────────────────────────
  const daysSinceLast = lastActivity
    ? Math.floor((normalizedDate - lastActivity) / (1000 * 60 * 60 * 24))
    : Infinity;

  const updatedStats = {
    totalWorkouts: (user.totalWorkouts || 0) + 1,
    totalExercises: (user.totalExercises || 0) + (exercisesCompleted || 0),
    points: user.points + pointsToAward,
  };

  if (daysSinceLast === 0) {
    // Same day — keep current streak (defensive, guard should have caught this)
    updatedStats.streakDays = user.streakDays || 1;
  } else if (daysSinceLast === 1) {
    // Consecutive day — extend streak
    updatedStats.streakDays = (user.streakDays || 0) + 1;
  } else if (daysSinceLast === 2) {
    // Grace day — 1 per rolling 30-day window
    const thirtyDaysAgo = new Date(normalizedDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const GRACE_PREFIX = '[STREAK_GRACE]';
    const graceUsedRecently = await PointTransaction.count({
      where: {
        userId,
        transactionType: 'adjustment',
        source: 'admin_adjustment',
        description: { [Op.startsWith]: GRACE_PREFIX },
        createdAt: { [Op.gte]: thirtyDaysAgo },
      },
      transaction,
    });

    if (graceUsedRecently === 0) {
      updatedStats.streakDays = (user.streakDays || 0) + 1;
      await PointTransaction.create(
        {
          userId,
          points: 0,
          balance: user.points,
          transactionType: 'adjustment',
          source: 'admin_adjustment',
          description: `${GRACE_PREFIX} Streak grace day used (1 per 30-day window)`,
          metadata: {
            streakDays: updatedStats.streakDays,
            windowStart: thirtyDaysAgo.toISOString(),
          },
          awardedBy: null,
        },
        { transaction }
      );
    } else {
      updatedStats.streakDays = 1;
    }
  } else {
    // Streak broken — reset to 1
    updatedStats.streakDays = 1;
  }

  // Only advance lastActivityDate if effectiveDate is newer
  if (!lastActivity || normalizedDate > lastActivity) {
    updatedStats.lastActivityDate = normalizedDate;
  }

  // ── Streak bonus ───────────────────────────────────────────────────
  if (updatedStats.streakDays % 7 === 0 && settings?.pointsPerStreak) {
    const streakBonus = settings.pointsPerStreak;
    pointsToAward += streakBonus;
    updatedStats.points += streakBonus;

    await PointTransaction.create(
      {
        userId,
        points: streakBonus,
        balance: updatedStats.points,
        transactionType: 'bonus',
        source: 'streak_bonus',
        sourceId: null,
        description: `${updatedStats.streakDays}-day streak bonus`,
        metadata: { streakDays: updatedStats.streakDays },
        awardedBy,
      },
      { transaction }
    );
  }

  // ── Main workout completion transaction ────────────────────────────
  const workoutPointsOnly =
    pointsToAward -
    (updatedStats.streakDays % 7 === 0
      ? settings?.pointsPerStreak || 0
      : 0);

  await PointTransaction.create(
    {
      userId,
      points: workoutPointsOnly,
      balance:
        user.points +
        pointsToAward -
        (updatedStats.streakDays % 7 === 0
          ? settings?.pointsPerStreak || 0
          : 0),
      transactionType: 'earn',
      source: 'workout_completion',
      sourceId: workoutId ? String(workoutId) : null,
      description: `Workout completed: ${duration || 'Unknown'} minutes, ${exercisesCompleted || 0} exercises`,
      metadata: {
        workoutId,
        duration,
        exercisesCompleted,
        workoutDate: effectiveDate.toISOString(),
      },
      awardedBy,
    },
    { transaction }
  );

  // ── Update user stats ──────────────────────────────────────────────
  await user.update(updatedStats, { transaction });

  // ── Milestone detection + awards ───────────────────────────────────
  const newMilestones = await Milestone.findAll({
    where: {
      targetPoints: { [Op.lte]: updatedStats.points },
      isActive: true,
    },
    include: [
      {
        model: UserMilestone,
        as: 'userMilestones',
        where: { userId },
        required: false,
      },
    ],
    transaction,
  });

  const unAwardedMilestones = newMilestones.filter(
    (milestone) => milestone.userMilestones.length === 0
  );

  let totalMilestoneBonus = 0;
  const awardedMilestones = [];

  for (const milestone of unAwardedMilestones) {
    await UserMilestone.create(
      {
        userId,
        milestoneId: milestone.id,
        reachedAt: new Date(),
        bonusPointsAwarded: milestone.bonusPoints,
      },
      { transaction }
    );

    awardedMilestones.push(milestone);
    totalMilestoneBonus += milestone.bonusPoints;
  }

  if (totalMilestoneBonus > 0) {
    const finalBalance = updatedStats.points + totalMilestoneBonus;

    await PointTransaction.create(
      {
        userId,
        points: totalMilestoneBonus,
        balance: finalBalance,
        transactionType: 'bonus',
        source: 'milestone_reached',
        description: `Milestone bonuses: ${awardedMilestones.map((m) => m.name).join(', ')}`,
        metadata: { milestoneIds: awardedMilestones.map((m) => m.id) },
        awardedBy,
      },
      { transaction }
    );

    await user.update({ points: finalBalance }, { transaction });
  }

  // ── Tag workout session with milestone info ────────────────────────
  if (workoutId) {
    let milestoneType = null;

    const workoutCount = updatedStats.totalWorkouts;
    const WORKOUT_MILESTONES = [500, 250, 100, 50, 25, 10, 1];
    for (const threshold of WORKOUT_MILESTONES) {
      if (workoutCount === threshold) {
        milestoneType = `workout_count_${threshold}`;
        break;
      }
    }

    if (!milestoneType && updatedStats.streakDays) {
      const STREAK_MILESTONES = [365, 180, 90, 60, 30, 14, 7];
      for (const threshold of STREAK_MILESTONES) {
        if (updatedStats.streakDays === threshold) {
          milestoneType = `streak_${threshold}`;
          break;
        }
      }
    }

    if (!milestoneType && duration && duration >= 60) {
      const priorLongSession = await WorkoutSession.count({
        where: {
          userId,
          duration: { [Op.gte]: 60 },
          id: { [Op.ne]: workoutId },
        },
        transaction,
      });
      if (priorLongSession === 0) {
        milestoneType = 'first_60min';
      }
    }

    if (!milestoneType && awardedMilestones.length > 0) {
      milestoneType = `milestone_${awardedMilestones[0].name.replace(/\s+/g, '_').toLowerCase()}`;
    }

    if (milestoneType) {
      await WorkoutSession.update(
        { isMilestone: true, milestoneType },
        { where: { id: workoutId }, transaction }
      );
    }
  }

  // ── Return result ──────────────────────────────────────────────────
  const totalPoints = pointsToAward + totalMilestoneBonus;
  const finalNewBalance = updatedStats.points + totalMilestoneBonus;

  return {
    pointsAwarded: totalPoints,
    newBalance: finalNewBalance,
    streakDays: updatedStats.streakDays,
    totalWorkouts: updatedStats.totalWorkouts,
    awardedMilestones,
  };
}

export default { awardWorkoutXP };
