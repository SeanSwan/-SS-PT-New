/**
 * planQueueService.mjs — plan queue depth (charter v3 P1, Plan-Ahead OS core)
 * =============================================================================
 * Sean's operating model: every active client always has ≥2 weeks of workouts
 * pre-queued; the system — not the trainer's memory — watches the runway.
 *
 * QUEUE DEPTH = programmed work remaining ahead of the plan cursor, expressed
 * as estimated CALENDAR days: remainingTrainingDays ÷ trainingDaysPerWeek × 7.
 * (WorkoutPlanDay.dayNumber is a session index, not a weekday — cadence-based
 * projection is the truthful calendar mapping.)
 *
 * Thresholds (charter §6 V3-A, Sean-overridable): warn < 14, urgent < 7.
 * Pure math exported for tests; the DB wrapper reads the SAME active-plan
 * source the NBA context uses (one truth per metric).
 */
import { getWorkoutPlan } from '../models/index.mjs';

export const PLAN_QUEUE_THRESHOLD_DAYS = 14;
export const PLAN_QUEUE_URGENT_DAYS = 7;

const toPlain = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
};

const isTrainingDay = (dayEntry) => {
  const type = String(dayEntry?.dayType ?? dayEntry?.type ?? 'training').toLowerCase();
  return type !== 'rest';
};

const weekDays = (weekEntry) => {
  if (Array.isArray(weekEntry?.days)) return weekEntry.days;
  if (Array.isArray(weekEntry?.sessions)) return weekEntry.sessions;
  return [];
};

/**
 * PURE: queue depth from planData + cursor. Handles the modern
 * weeks[].days[]/sessions[] shape AND the legacy single-week shape
 * (projected across durationWeeks).
 */
export function computePlanQueueDepth(planData, {
  durationWeeks = 1,
  currentWeek = 1,
  currentDay = 1,
  threshold = PLAN_QUEUE_THRESHOLD_DAYS,
  urgentBelow = PLAN_QUEUE_URGENT_DAYS,
} = {}) {
  const data = toPlain(planData) ?? {};
  const weeks = Array.isArray(data.weeks) && data.weeks.length > 0 ? data.weeks : null;
  const totalWeeks = Math.max(1, Number(durationWeeks) || (weeks ? weeks.length : 1));

  /** Training days for week N (1-based), from explicit weeks or the legacy template. */
  const trainingDaysForWeek = (weekNumber) => {
    if (weeks) {
      const entry =
        weeks.find((w) => Number(w?.weekNumber ?? w?.week) === weekNumber) ??
        weeks[weekNumber - 1] ??
        null;
      return weekDays(entry).filter(isTrainingDay);
    }
    // Legacy: one repeating week template at the top level.
    const template = Array.isArray(data.days) ? data.days : Array.isArray(data.weeklySchedule) ? data.weeklySchedule : [];
    return template.filter(isTrainingDay);
  };

  let remainingTrainingDays = 0;
  let cadenceSum = 0;
  let cadenceWeeks = 0;

  for (let w = 1; w <= totalWeeks; w += 1) {
    const days = trainingDaysForWeek(w);
    cadenceSum += days.length;
    cadenceWeeks += 1;
    if (w < currentWeek) continue;
    if (w === currentWeek) {
      // dayNumber is a 1-based session index within the week; the cursor day
      // itself still counts (it is today's queued work).
      remainingTrainingDays += days.filter((d, index) => {
        const dayNumber = Number(d?.dayNumber ?? d?.day ?? index + 1);
        return dayNumber >= Number(currentDay) || Number.isNaN(dayNumber);
      }).length;
    } else {
      remainingTrainingDays += days.length;
    }
  }

  const trainingDaysPerWeek = cadenceWeeks > 0 ? Math.max(1, Math.round(cadenceSum / cadenceWeeks)) : 1;
  const estimatedCalendarDaysLeft =
    remainingTrainingDays === 0 ? 0 : Math.round((remainingTrainingDays / trainingDaysPerWeek) * 7);

  return {
    remainingTrainingDays,
    trainingDaysPerWeek,
    estimatedCalendarDaysLeft,
    threshold,
    belowThreshold: estimatedCalendarDaysLeft < threshold,
    urgent: estimatedCalendarDaysLeft < urgentBelow,
  };
}

/** DB wrapper: depth for the user's active plan (null-honest when none). */
export async function getPlanQueueDepth(userId) {
  const WorkoutPlan = getWorkoutPlan();
  if (!WorkoutPlan?.findOne) return { hasActivePlan: false, ...computePlanQueueDepth(null) };
  const plan = await WorkoutPlan.findOne({
    where: { userId, status: 'active' },
    order: [['updatedAt', 'DESC']],
    attributes: ['id', 'name', 'planData', 'durationWeeks', 'currentWeek', 'currentDay'],
  });
  if (!plan) return { hasActivePlan: false, ...computePlanQueueDepth(null) };
  const depth = computePlanQueueDepth(plan.planData, {
    durationWeeks: plan.durationWeeks,
    currentWeek: plan.currentWeek,
    currentDay: plan.currentDay,
  });
  return { hasActivePlan: true, planId: plan.id, planName: plan.name ?? null, ...depth };
}
