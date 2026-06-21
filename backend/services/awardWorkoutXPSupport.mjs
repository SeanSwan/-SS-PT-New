/**
 * Support helpers for awardWorkoutXP.
 * Keeps the main service focused on transaction order and point-ledger writes.
 */

import PointTransaction from '../models/PointTransaction.mjs';
import WorkoutSession from '../models/WorkoutSession.mjs';
import Milestone from '../models/Milestone.mjs';
import UserMilestone from '../models/UserMilestone.mjs';
import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';
import eventBus from './eventBus.mjs';
import { createWorkoutAutoPost, createStreakAutoPost } from './socialAutoPost.mjs';
import { detectCombos, sumExerciseXP } from './gamificationComboService.mjs';

const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

function toFinitePrimitiveNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNonNegativeInteger(value, fallback = 0) {
  const parsed = toFinitePrimitiveNumber(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function toPositiveMultiplier(value) {
  const parsed = toFinitePrimitiveNumber(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(parsed, 5);
}

export function toSafeIntegerId(value) {
  const parsed = toFinitePrimitiveNumber(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function computeWorkoutPoints({
  settings,
  duration,
  exercisesCompleted,
  exerciseDetails
}) {
  let pointsToAward = toNonNegativeInteger(settings?.pointsPerWorkout, 50);
  const safeExercisesCompleted = toNonNegativeInteger(exercisesCompleted, 0);
  const pointsPerExercise = toNonNegativeInteger(settings?.pointsPerExercise, 0);
  const safeDuration = toFinitePrimitiveNumber(duration) ?? 0;
  const hasExerciseDetails = Array.isArray(exerciseDetails) && exerciseDetails.length > 0;

  if (hasExerciseDetails) {
    pointsToAward += sumExerciseXP(exerciseDetails);
  } else if (safeExercisesCompleted > 0 && pointsPerExercise > 0) {
    pointsToAward += safeExercisesCompleted * pointsPerExercise;
  }

  if (safeDuration > 30) {
    pointsToAward += Math.floor((safeDuration - 30) / 5);
  }

  const pointsMultiplier = toPositiveMultiplier(settings?.pointsMultiplier);
  if (pointsMultiplier !== null) {
    pointsToAward = Math.round(pointsToAward * pointsMultiplier);
  }

  let comboResult = { combos: [], bestMultiplier: 1.0, comboBonus: 0 };
  if (hasExerciseDetails) {
    comboResult = detectCombos(exerciseDetails);
    if (comboResult.bestMultiplier > 1.0) {
      const comboExtra = Math.round(pointsToAward * comboResult.comboBonus);
      pointsToAward += comboExtra;
      logger.info(`Combo bonus: ${comboResult.combos.map(c => c.name).join(', ')} -> +${comboExtra} XP (${comboResult.bestMultiplier}x)`);
    }
  }

  return { pointsToAward, comboResult };
}

export async function buildWorkoutProgressStats({
  user,
  normalizedDate,
  exercisesCompleted,
  pointsToAward,
  transaction
}) {
  const lastActivity = user.lastActivityDate
    ? new Date(user.lastActivityDate)
    : null;
  if (lastActivity) lastActivity.setHours(0, 0, 0, 0);

  if (lastActivity && lastActivity.getTime() === normalizedDate.getTime()) {
    return { sameDay: true, updatedStats: null };
  }

  const daysSinceLast = lastActivity
    ? Math.floor((normalizedDate - lastActivity) / (1000 * 60 * 60 * 24))
    : Infinity;
  const updatedStats = {
    totalWorkouts: (user.totalWorkouts || 0) + 1,
    totalExercises: (user.totalExercises || 0) + (exercisesCompleted || 0),
    points: user.points + pointsToAward,
  };

  if (daysSinceLast === 0) {
    updatedStats.streakDays = user.streakDays || 1;
  } else if (daysSinceLast === 1) {
    updatedStats.streakDays = (user.streakDays || 0) + 1;
  } else if (daysSinceLast === 2) {
    const thirtyDaysAgo = new Date(normalizedDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const GRACE_PREFIX = '[STREAK_GRACE]';
    const graceUsedRecently = await PointTransaction.count({
      where: {
        userId: user.id,
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
          userId: user.id,
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
    updatedStats.streakDays = 1;
  }

  if (!lastActivity || normalizedDate > lastActivity) {
    updatedStats.lastActivityDate = normalizedDate;
  }

  return { sameDay: false, updatedStats };
}

export async function tagWorkoutSessionMilestone({
  workoutId,
  userId,
  duration,
  updatedStats,
  awardedMilestones,
  transaction
}) {
  if (!workoutId) return;

  let milestoneType = null;
  const workoutCount = updatedStats.totalWorkouts;
  const workoutMilestones = [500, 250, 100, 50, 25, 10, 1];
  for (const threshold of workoutMilestones) {
    if (workoutCount === threshold) {
      milestoneType = `workout_count_${threshold}`;
      break;
    }
  }

  if (!milestoneType && updatedStats.streakDays) {
    const streakMilestones = [365, 180, 90, 60, 30, 14, 7];
    for (const threshold of streakMilestones) {
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
    if (priorLongSession === 0) milestoneType = 'first_60min';
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

export async function collectWorkoutMilestones({
  userId,
  currentPoints,
  transaction
}) {
  const newMilestones = await Milestone.findAll({
    where: {
      targetPoints: { [Op.lte]: currentPoints },
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
  const awardedMilestones = [];
  let totalMilestoneBonus = 0;

  for (const milestone of unAwardedMilestones) {
    const safeBonusPoints = toNonNegativeInteger(milestone.bonusPoints, 0);

    await UserMilestone.create(
      {
        userId,
        milestoneId: milestone.id,
        reachedAt: new Date(),
        bonusPointsAwarded: safeBonusPoints,
      },
      { transaction }
    );

    awardedMilestones.push(milestone);
    totalMilestoneBonus += safeBonusPoints;
  }

  return { awardedMilestones, totalMilestoneBonus };
}

export async function emitWorkoutXpSideEffects({
  userId,
  workoutId,
  duration,
  exercisesCompleted,
  awardedBy,
  streakDays,
  totalPoints
}) {
  eventBus.safeEmit('workout:completed', {
    userId,
    workoutId,
    duration,
    exercisesCompleted,
    trainerId: awardedBy,
  });

  try {
    await createWorkoutAutoPost(userId, {
      workoutId,
      duration,
      exercisesCompleted,
      pointsAwarded: totalPoints,
    });
  } catch (_) { /* best-effort */ }

  try {
    await createStreakAutoPost(userId, streakDays);
  } catch (_) { /* best-effort */ }
}
