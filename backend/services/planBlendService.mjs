/**
 * planBlendService.mjs — combine two plans into a NEW one (charter v3 P3)
 * =========================================================================
 * Sean: "possibly blend and combine both of those plans to make one new plan"
 * — typically the trainer's primary + the AI backup (P2), but any two of the
 * client's plans work.
 *
 * V1 semantics (charter V3-E): a guided PICK LIST — whole weeks or specific
 * days from either source — composed sequentially into a brand-new DRAFT plan.
 * Sources are NEVER mutated; provenance records blendedFrom + the pick map.
 * Activation stays a separate explicit step (nothing auto-activates).
 */
import { getWorkoutPlan } from '../models/index.mjs';
import {
  sanitizeWorkoutPlanDataForPersistence,
  sanitizeWorkoutPlanMetadataForPersistence,
} from './workoutPlanDataPrivacyService.mjs';
import logger from '../utils/logger.mjs';

const toPlain = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
};

const weeksOf = (planData) => {
  const data = toPlain(planData) ?? {};
  return Array.isArray(data.weeks) ? data.weeks : [];
};

const daysOf = (weekEntry) =>
  Array.isArray(weekEntry?.days) ? weekEntry.days : Array.isArray(weekEntry?.sessions) ? weekEntry.sessions : [];

/**
 * PURE: compose a new planData from picks against two sources.
 * @param {{ sources: {A: object, B: object}, picks: Array<{source:'A'|'B', weekNumber:number, dayNumbers?:number[]}> }} input
 */
export function composeBlendedPlanData({ sources, picks }) {
  if (!Array.isArray(picks) || picks.length === 0) {
    throw new Error('Blend requires at least one week/day pick');
  }
  const weeks = [];
  picks.forEach((pick, index) => {
    const source = sources?.[pick.source];
    if (!source) throw new Error(`Unknown blend source "${pick.source}"`);
    const sourceWeeks = weeksOf(source);
    const week =
      sourceWeeks.find((w) => Number(w?.weekNumber ?? w?.week) === Number(pick.weekNumber)) ??
      sourceWeeks[Number(pick.weekNumber) - 1];
    if (!week) throw new Error(`Source ${pick.source} has no week ${pick.weekNumber}`);

    let days = daysOf(week).map((d) => ({ ...d }));
    if (Array.isArray(pick.dayNumbers) && pick.dayNumbers.length > 0) {
      const wanted = new Set(pick.dayNumbers.map(Number));
      days = days.filter((d, i) => wanted.has(Number(d?.dayNumber ?? d?.day ?? i + 1)));
      if (days.length === 0) throw new Error(`Source ${pick.source} week ${pick.weekNumber} has none of the requested days`);
    }
    // Renumber sequentially so the blended plan is internally consistent.
    weeks.push({
      weekNumber: index + 1,
      days: days.map((d, i) => ({ ...d, dayNumber: i + 1 })),
    });
  });
  return { weeks, category: 'full_body' };
}

/**
 * Persist a blend as a NEW draft plan for the client. Both sources must
 * belong to the same client (cross-client blending is refused).
 */
export async function blendPlans({ trainerId, planAId, planBId, picks, title }) {
  const WorkoutPlan = getWorkoutPlan();
  const [planA, planB] = await Promise.all([
    WorkoutPlan.findByPk(planAId),
    WorkoutPlan.findByPk(planBId),
  ]);
  if (!planA || !planB) {
    const err = new Error('Both source plans must exist');
    err.statusCode = 404;
    throw err;
  }
  if (planA.userId !== planB.userId) {
    const err = new Error('Source plans must belong to the same client');
    err.statusCode = 400;
    throw err;
  }

  const blendedData = composeBlendedPlanData({
    sources: { A: planA.planData, B: planB.planData },
    picks,
  });

  const blended = await WorkoutPlan.create({
    userId: planA.userId,
    trainerId,
    title:
      typeof title === 'string' && title.trim().length > 0
        ? title.trim()
        : `Blended Plan — ${new Date().toISOString().slice(0, 10)}`,
    description: 'Composed from two existing plans (blend). Activation is a separate explicit step.',
    durationWeeks: blendedData.weeks.length,
    status: 'draft',
    currentWeek: 1,
    currentDay: 1,
    planData: sanitizeWorkoutPlanDataForPersistence(blendedData),
    createdBy: 'trainer',
    metadata: sanitizeWorkoutPlanMetadataForPersistence({
      blendedFrom: [planA.id, planB.id],
      blendPicks: picks,
      blendedAt: new Date().toISOString(),
      blendedBy: trainerId,
    }),
  });

  logger.info('[PlanBlend] created blended plan #%d from #%d + #%d (client %d)', blended.id, planA.id, planB.id, planA.userId);
  return { blended, sources: { planAId: planA.id, planBId: planB.id } };
}
