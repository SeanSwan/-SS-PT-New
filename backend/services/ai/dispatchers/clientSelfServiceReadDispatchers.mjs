/**
 * Client self-service read dispatchers
 * ====================================
 * Authenticated-client-only summaries for workout, progress, XP, streaks, and
 * badges. Receipts never echo names, emails, notes, or freeform profile text.
 */
import { Op } from 'sequelize';

import { getAllModels } from '../../../models/index.mjs';
import { newAchievementCutoff } from './achievementRecency.mjs';
import availabilityService from '../../availabilityService.mjs';
import { toCurrentWorkoutPlanResponse } from '../../workoutPlanShapeService.mjs';
import { buildClientTrainingOverview } from '../../clientTrainingReadModelService.mjs';
import { resolveClientTrainingDateContext } from '../../clientTrainingDateService.mjs';
import {
  findPlannedAssignmentCompletionsForDate,
  findRecentPlannedAssignmentCompletions,
} from '../../clientTrainingAssignmentCompletionService.mjs';
import { summarizeAssignmentExercises } from '../../clientTrainingExercisePreviewService.mjs';
import { summarizeTrainingPlanCatalog } from './clientTrainingCatalogSummary.mjs';
import { summarizeHomeworkSummary } from './clientHomeworkSummaryReadSanitizer.mjs';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateOnly = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};
const todayDateOnly = () => resolveClientTrainingDateContext({
  storedTimeZone: process.env.SWAN_DISPLAY_TZ,
  storedTimeZoneConfigured: Boolean(process.env.SWAN_DISPLAY_TZ),
  referenceDate: new Date(),
}).localDate;

const selfUserId = (ctx = {}) => toNumber(ctx.user?.id);

const normalizeRow = (row) => (typeof row?.toJSON === 'function' ? row.toJSON() : row);

const parseDateOnlyLocal = (value) => {
  const text = String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error('Please provide a session date in YYYY-MM-DD format.');
  }

  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    throw new Error('Please provide a real session date.');
  }

  return parsed;
};

const summarizeTodayAssignment = (assignment = {}) => ({
  assignmentId: assignment.assignmentId ?? assignment.assignmentKey ?? null,
  assignmentKey: assignment.assignmentKey ?? assignment.assignmentId ?? null,
  assignmentType: assignment.assignmentType ?? 'none',
  status: assignment.status ?? 'none',
  sessionType: assignment.sessionType ?? 'solo',
  isLoggable: Boolean(assignment.isLoggable),
  isBillable: Boolean(assignment.isBillable),
  shouldDeductSession: Boolean(assignment.shouldDeductSession),
  title: assignment.title ?? null,
  weekNumber: assignment.weekNumber ?? null,
  dayNumber: assignment.dayNumber ?? null,
  exerciseCount: toNumber(assignment.exerciseCount),
  firstExerciseName: assignment.firstExerciseName ?? null,
  exercisePreview: summarizeAssignmentExercises(assignment.exercises),
  ctaLabel: assignment.ctaLabel ?? null,
  ...(assignment.completion ? {
    completion: {
      source: assignment.completion.source ?? null,
      formId: assignment.completion.formId ?? null,
      completedAt: toDateOnly(assignment.completion.completedAt),
    },
  } : {}),
});

const getGamificationRecord = async (userId) => {
  const { Gamification } = getAllModels();
  if (!Gamification?.findOne) return null;
  return normalizeRow(await Gamification.findOne({
    where: { userId },
    attributes: [
      'level',
      'experience',
      'totalXP',
      'streakCount',
      'longestStreak',
      'currentTier',
      'nextTierProgress',
      'totalWorkouts',
      'streakFreezes',
      'badges',
    ],
  }));
};

export const dispatchMyWorkoutToday = async (_params = {}, ctx = {}) => {
  const { WorkoutPlan, DailyWorkoutForm } = getAllModels();
  const userId = selfUserId(ctx);
  const today = todayDateOnly();
  if (!WorkoutPlan?.findOne) {
    return { userId, hasActivePlan: false, planId: null };
  }

  const plan = await WorkoutPlan.findOne({
    where: { userId, status: 'active' },
    order: [['createdAt', 'DESC']],
  });
  const relatedPlans = WorkoutPlan.findAll
    ? await WorkoutPlan.findAll({
      where: { userId, status: ['active', 'paused', 'draft'] },
      order: [['updatedAt', 'DESC']],
      limit: 20,
    })
    : plan ? [plan] : [];
  const catalogPlans = Array.isArray(relatedPlans) ? relatedPlans : [];

  if (!plan) {
    const overview = buildClientTrainingOverview({
      activePlan: null,
      plans: catalogPlans,
      currentSession: null,
      today,
    });

    return {
      userId,
      hasActivePlan: false,
      planId: null,
      currentWeek: null,
      currentDay: null,
      sessionLabel: null,
      exerciseCount: 0,
      firstExerciseName: null,
      todayAssignment: summarizeTodayAssignment(overview.todayAssignment),
      homeworkSummary: summarizeHomeworkSummary(overview.homeworkSummary),
      trainingPlanCatalog: summarizeTrainingPlanCatalog(overview.trainingPlanCatalog),
    };
  }

  const formatted = toCurrentWorkoutPlanResponse(plan);
  const currentSession = formatted.currentSession || null;
  const exercises = Array.isArray(currentSession?.exercises) ? currentSession.exercises : [];
  const firstExercise = exercises[0] || null;
  const assignmentCompletions = await findPlannedAssignmentCompletionsForDate(
    DailyWorkoutForm,
    { clientId: userId, date: today },
  );
  const recentAssignmentCompletions = await findRecentPlannedAssignmentCompletions(
    DailyWorkoutForm,
    { clientId: userId },
  );
  const overview = buildClientTrainingOverview({
    activePlan: plan,
    plans: catalogPlans.length ? catalogPlans : [plan],
    currentSession,
    today,
    assignmentCompletions,
    recentAssignmentCompletions: recentAssignmentCompletions.length
      ? recentAssignmentCompletions
      : assignmentCompletions,
  });

  return {
    userId,
    hasActivePlan: true,
    planId: formatted.id ?? null,
    currentWeek: formatted.currentWeek ?? null,
    currentDay: formatted.currentDay ?? null,
    sessionLabel: currentSession?.dayLabel ?? null,
    exerciseCount: exercises.length,
    firstExerciseName: firstExercise?.exerciseName || firstExercise?.name || null,
    todayAssignment: summarizeTodayAssignment(overview.todayAssignment),
    homeworkSummary: summarizeHomeworkSummary(overview.homeworkSummary),
    trainingPlanCatalog: summarizeTrainingPlanCatalog(overview.trainingPlanCatalog),
  };
};

export const dispatchMyProgress = async (params = {}, ctx = {}) => {
  const { WorkoutSession, BodyMeasurement } = getAllModels();
  const userId = selfUserId(ctx);
  const days = Math.min(365, Math.max(1, Number.parseInt(params.days, 10) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [workouts, latestMeasurement] = await Promise.all([
    WorkoutSession?.findAll ? WorkoutSession.findAll({
      where: {
        userId,
        status: 'completed',
        completedAt: { [Op.gte]: since },
      },
      attributes: ['id', 'duration', 'totalSets', 'totalReps', 'totalWeight', 'completedAt', 'date'],
      order: [['completedAt', 'DESC']],
      limit: 100,
    }) : [],
    BodyMeasurement?.findOne ? BodyMeasurement.findOne({
      where: { userId },
      attributes: ['measurementDate', 'weight', 'bodyFatPercentage', 'naturalWaist'],
      order: [['measurementDate', 'DESC']],
    }) : null,
  ]);
  const measurement = normalizeRow(latestMeasurement) || {};

  return {
    userId,
    days,
    workoutCount: workouts.length,
    totalSets: workouts.reduce((sum, row) => sum + toNumber(row.totalSets), 0),
    totalReps: workouts.reduce((sum, row) => sum + toNumber(row.totalReps), 0),
    totalVolume: workouts.reduce((sum, row) => sum + toNumber(row.totalWeight), 0),
    totalMinutes: workouts.reduce((sum, row) => sum + toNumber(row.duration), 0),
    latestMeasurementDate: toDateOnly(measurement.measurementDate),
    latestWeight: measurement.weight !== undefined ? toNumber(measurement.weight) : null,
    latestBodyFat: measurement.bodyFatPercentage !== undefined
      ? toNumber(measurement.bodyFatPercentage)
      : null,
    latestWaist: measurement.naturalWaist !== undefined ? toNumber(measurement.naturalWaist) : null,
  };
};

export const dispatchMyXp = async (_params = {}, ctx = {}) => {
  const userId = selfUserId(ctx);
  const record = await getGamificationRecord(userId);

  return {
    userId,
    level: toNumber(record?.level || 1),
    experience: toNumber(record?.experience),
    totalXP: toNumber(record?.totalXP),
    currentTier: record?.currentTier ?? null,
    nextTierProgress: toNumber(record?.nextTierProgress),
    totalWorkouts: toNumber(record?.totalWorkouts),
  };
};

export const dispatchMyStreaksBadges = async (_params = {}, ctx = {}) => {
  const { UserAchievement } = getAllModels();
  const userId = selfUserId(ctx);
  const record = await getGamificationRecord(userId);
  // "New" = completed AND earned inside the recency window — see achievementRecency.mjs for why
  // both earlier definitions (`isNew`, then `notificationSent`) produced wrong counts rather than
  // errors. Shared with `view_xp_streaks` so the two Coach reads cannot disagree.
  const [completedAchievementCount, newAchievementCount] = await Promise.all([
    UserAchievement?.count ? UserAchievement.count({ where: { userId, isCompleted: true } }) : 0,
    UserAchievement?.count
      ? UserAchievement.count({
        where: { userId, isCompleted: true, earnedAt: { [Op.gte]: newAchievementCutoff() } },
      })
      : 0,
  ]);
  const badges = Array.isArray(record?.badges) ? record.badges : [];

  return {
    userId,
    streakCount: toNumber(record?.streakCount),
    longestStreak: toNumber(record?.longestStreak),
    streakFreezes: toNumber(record?.streakFreezes),
    earnedBadgeCount: badges.length,
    completedAchievementCount: toNumber(completedAchievementCount),
    newAchievementCount: toNumber(newAchievementCount),
  };
};

export const dispatchScheduleMySession = async (params = {}, ctx = {}) => {
  const userId = selfUserId(ctx);
  const trainerId = toNumber(params.trainerId);
  const date = String(params.date);
  const durationMinutes = toNumber(params.duration) || 60;
  const slots = await availabilityService.getAvailableSlots(
    trainerId,
    parseDateOnlyLocal(date),
    durationMinutes,
  );
  const firstSlot = slots[0] || null;
  const lastSlot = slots[slots.length - 1] || null;

  return {
    userId,
    trainerId,
    date,
    durationMinutes,
    availableSlotCount: slots.length,
    firstSlotStartUtc: firstSlot?.startTime ?? null,
    lastSlotEndUtc: lastSlot?.endTime ?? null,
  };
};
