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
import GamificationPointsService from './gamification/GamificationPointsService.mjs';
import WorkoutSession from '../models/WorkoutSession.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';
import {
  buildWorkoutProgressStats,
  collectWorkoutMilestones,
  computeWorkoutPoints,
  emitWorkoutXpSideEffects,
  tagWorkoutSessionMilestone,
  toSafeIntegerId,
} from './awardWorkoutXPSupport.mjs';

export async function awardWorkoutXP({
  userId,
  workoutId,
  duration,
  exercisesCompleted,
  exerciseDetails,
  workoutDate,
  awardedBy,
}, transaction) {
  const effectiveDate = workoutDate ? new Date(workoutDate) : new Date();
  const workoutCompletionKey = workoutId ? String(workoutId) : effectiveDate.toISOString().slice(0, 10);
  const workoutIdempotencyKey = `workout:${userId}:${workoutCompletionKey}`;
  const numericWorkoutSourceId = toSafeIntegerId(workoutId);

  // ── Step 1: Acquire User row lock ──────────────────────────────────
  const user = await User.findByPk(userId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  // ── Step 2: Idempotency guard (same workoutId) ─────────────────────
  const priorKeyAward = await PointTransaction.findOne({
    where: {
      userId,
      source: 'workout_completion',
      idempotencyKey: workoutIdempotencyKey,
    },
    transaction,
  });
  if (priorKeyAward) {
    return { alreadyAwarded: true };
  }

  if (numericWorkoutSourceId !== null) {
    const priorSourceAward = await PointTransaction.findOne({
      where: {
        userId,
        source: 'workout_completion',
        sourceId: numericWorkoutSourceId,
      },
      transaction,
    });
    if (priorSourceAward) {
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
  const normalizedDateKey = normalizedDate.toISOString().slice(0, 10);

  // ── Step 5: Compute points and streak state ────────────────────────
  const settings = await GamificationSettings.findOne({ transaction });
  let { pointsToAward, comboResult } = computeWorkoutPoints({
    settings,
    duration,
    exercisesCompleted,
    exerciseDetails,
  });
  const progressState = await buildWorkoutProgressStats({
    user,
    normalizedDate,
    exercisesCompleted,
    pointsToAward,
    transaction,
  });
  if (progressState.sameDay) {
    return { sameDay: true };
  }
  const { updatedStats } = progressState;

  // ── Streak bonus ───────────────────────────────────────────────────
  if (updatedStats.streakDays % 7 === 0 && settings?.pointsPerStreak) {
    pointsToAward += settings.pointsPerStreak;
  }

  // ── Main workout completion transaction ────────────────────────────
  const workoutPointsOnly =
    pointsToAward -
    (updatedStats.streakDays % 7 === 0
      ? settings?.pointsPerStreak || 0
      : 0);

  const workoutLedgerResult = await GamificationPointsService.recordLedgerEntry({
    userId,
    points: workoutPointsOnly,
    transactionType: 'earn',
    source: 'workout_completion',
    sourceId: numericWorkoutSourceId,
    description: `Workout completed: ${duration || 'Unknown'} minutes, ${exercisesCompleted || 0} exercises${comboResult.combos.length > 0 ? ` (${comboResult.combos.map(c => c.name).join(', ')})` : ''}`,
    metadata: {
      workoutId,
      duration,
      exercisesCompleted,
      workoutDate: effectiveDate.toISOString(),
      combos: comboResult.combos.length > 0 ? comboResult.combos : undefined,
      comboMultiplier: comboResult.bestMultiplier > 1 ? comboResult.bestMultiplier : undefined,
    },
    awardedBy,
    idempotencyKey: workoutIdempotencyKey,
    maxPoints: Number.MAX_SAFE_INTEGER,
  }, transaction);

  updatedStats.points = workoutLedgerResult.newBalance ?? (user.points + workoutPointsOnly);

  // recordLedgerEntry is the single authority for level/tier (derived from lifetime XP).
  // Track the latest ledger result so level/tier are NEVER re-derived from the spendable balance.
  let latestLedger = workoutLedgerResult;
  if (updatedStats.streakDays % 7 === 0 && settings?.pointsPerStreak) {
    const streakBonus = settings.pointsPerStreak;
    const streakLedgerResult = await GamificationPointsService.recordLedgerEntry({
      userId,
      points: streakBonus,
      transactionType: 'bonus',
      source: 'streak_bonus',
      sourceId: null,
      description: `${updatedStats.streakDays}-day streak bonus`,
      metadata: { streakDays: updatedStats.streakDays, workoutId },
      awardedBy,
      idempotencyKey: `streak:${userId}:${updatedStats.streakDays}:${normalizedDateKey}`,
      maxPoints: Number.MAX_SAFE_INTEGER,
    }, transaction);
    updatedStats.points = streakLedgerResult.newBalance ?? (updatedStats.points + streakBonus);
    latestLedger = streakLedgerResult;
  }

  // ── Update user stats ──────────────────────────────────────────────
  // Level/tier come from the ledger authority (lifetime XP), NOT the spendable balance,
  // so a spend/redeem recorded elsewhere never retro-lowers the level on the next award.
  updatedStats.level = latestLedger.newLevel ?? updatedStats.level;
  updatedStats.tier = latestLedger.newTier ?? updatedStats.tier;

  await user.update(updatedStats, { transaction });

  // ── Achievement awards ─────────────────────────────────────────────
  // Production had 1,067 active achievements and ZERO ever awarded: the only achievement check in
  // the codebase hangs off `updateWorkoutSession` transitioning a session to completed, but the
  // canonical logger creates sessions already completed, so it never ran. This is the connection.
  //
  // BEST-EFFORT BY DESIGN: logging the workout is the user's actual intent. A gamification failure
  // must never roll back or fail that write, so this is caught and only logged.
  let awardedAchievements = [];
  try {
    const { evaluateWorkoutAchievements } = await import('./gamification/workoutAchievementEvaluator.mjs');
    const { getAllModels } = await import('../models/index.mjs');
    const result = await evaluateWorkoutAchievements({
      userId,
      models: getAllModels(),
      transaction,
    });
    awardedAchievements = result.awarded;
  } catch (achievementError) {
    logger.error('Achievement evaluation failed (workout XP still awarded)', {
      userId,
      workoutId,
      error: achievementError?.message,
    });
  }

  // ── Milestone detection + awards ───────────────────────────────────
  const { awardedMilestones, totalMilestoneBonus } = await collectWorkoutMilestones({
    userId,
    currentPoints: updatedStats.points,
    transaction,
  });

  let finalNewBalance = updatedStats.points;
  if (totalMilestoneBonus > 0) {
    const milestoneKey = awardedMilestones
      .map((milestone) => String(milestone.id))
      .join(':');
    const milestoneLedgerResult = await GamificationPointsService.recordLedgerEntry({
      userId,
      points: totalMilestoneBonus,
      transactionType: 'bonus',
      source: 'milestone_reached',
      description: `Milestone bonuses: ${awardedMilestones.map((m) => m.name).join(', ')}`,
      metadata: { milestoneIds: awardedMilestones.map((m) => m.id), workoutId },
      awardedBy,
      idempotencyKey: `milestone:award-workout-xp:${userId}:${milestoneKey}`,
      maxPoints: Number.MAX_SAFE_INTEGER,
    }, transaction);

    const finalBalance = milestoneLedgerResult.newBalance ?? (updatedStats.points + totalMilestoneBonus);
    // Level/tier from the ledger authority (lifetime XP), not the spendable balance.
    const finalLevel = milestoneLedgerResult.newLevel ?? updatedStats.level;
    const finalTier = milestoneLedgerResult.newTier ?? updatedStats.tier;

    await user.update({
      points: finalBalance,
      level: finalLevel,
      tier: finalTier,
    }, { transaction });
    updatedStats.points = finalBalance;
    updatedStats.level = finalLevel;
    updatedStats.tier = finalTier;
    finalNewBalance = finalBalance;
  }

  await tagWorkoutSessionMilestone({
    workoutId,
    userId,
    duration,
    updatedStats,
    awardedMilestones,
    transaction,
  });

  const totalPoints = pointsToAward + totalMilestoneBonus;
  await emitWorkoutXpSideEffects({
    userId,
    workoutId,
    duration,
    exercisesCompleted,
    awardedBy,
    streakDays: updatedStats.streakDays,
    totalPoints,
  });

  // ── Return result ──────────────────────────────────────────────────
  return {
    pointsAwarded: totalPoints,
    newBalance: finalNewBalance,
    streakDays: updatedStats.streakDays,
    totalWorkouts: updatedStats.totalWorkouts,
    awardedMilestones,
    combos: comboResult.combos,
    comboMultiplier: comboResult.bestMultiplier,
  };
}

export default { awardWorkoutXP };
