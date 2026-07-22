/**
 * ============================================================================
 * FILE: restoreDataSources.mjs
 * PURPOSE: Real-client-data fetchers for the Restore (off-day recovery) panel.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-21
 * SPEC: docs/ai-workflow/AI-HANDOFF/RECOVERY-COMPASS-OFF-DAY-SPEC-2026-07-21.md
 * KIMI CO-DESIGN: KIMI-RECOVERY-COMPASS-CODESIGN-R1-2026-07-21.md (H2/H3 honored)
 *
 * HARD LAW (Sean 2026-07-21): every recommendation derives from the client's
 * REAL records. These fetchers are the only inputs the composer may use —
 * no synthetic data may ever be injected upstream of them.
 *
 * All day-boundary comparisons use the client's LOCAL calendar date computed
 * by clientTrainingDateService (Kimi H3) — sessions are classified by
 * formatDateOnlyInTimeZone equality, never by raw UTC ranges.
 * ============================================================================
 */
import { Op } from 'sequelize';
import { getAllModels } from '../../models/index.mjs';
import { formatDateOnlyInTimeZone } from '../clientTrainingDateService.mjs';
import { extractCurrentSession } from '../workoutPlanShapeService.mjs';

const RECENT_LOAD_HOURS = 72;

/** Parse a TEXT/JSON muscle column into a lowercase string array. */
export const parseMuscleList = (raw) => {
  if (Array.isArray(raw)) return raw.map((m) => String(m).toLowerCase().trim()).filter(Boolean);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((m) => String(m).toLowerCase().trim()).filter(Boolean);
  } catch {
    /* fall through to comma split */
  }
  return raw.split(',').map((m) => m.toLowerCase().trim()).filter(Boolean);
};

/** Active plan + cursor day (canonical planData JSONB path, Rule 58 verified). */
export async function fetchActivePlanContext(userId) {
  const { WorkoutPlan } = getAllModels();
  if (!WorkoutPlan) return { plan: null, cursorSession: null };
  const plan = await WorkoutPlan.findOne({
    where: { userId, status: 'active' },
    order: [['createdAt', 'DESC']],
  });
  if (!plan) return { plan: null, cursorSession: null };
  return { plan, cursorSession: extractCurrentSession(plan) };
}

/**
 * Sessions in a local-date-aware window: yesterday-2 → tomorrow.
 * Returns { completedToday, plannedToday, recentCompleted[] } classified by
 * the client's local calendar (Kimi H3).
 */
export async function fetchSessionWindow(userId, timeZone, now = new Date()) {
  const { WorkoutSession } = getAllModels();
  if (!WorkoutSession) return { completedToday: [], plannedToday: [], recentCompleted: [] };

  const windowStart = new Date(now.getTime() - RECENT_LOAD_HOURS * 3600 * 1000);
  const windowEnd = new Date(now.getTime() + 48 * 3600 * 1000);
  const sessions = await WorkoutSession.findAll({
    where: {
      userId,
      date: { [Op.between]: [windowStart, windowEnd] },
      status: { [Op.in]: ['planned', 'in_progress', 'completed'] },
    },
    order: [['date', 'DESC']],
  });

  const today = formatDateOnlyInTimeZone(now, timeZone);
  const completedToday = [];
  const plannedToday = [];
  const recentCompleted = [];
  for (const session of sessions) {
    const localDate = formatDateOnlyInTimeZone(session.date, timeZone);
    if (session.status === 'completed') {
      recentCompleted.push({ session, localDate });
      if (localDate === today) completedToday.push(session);
    } else if (localDate === today) {
      plannedToday.push(session);
    }
  }
  return { completedToday, plannedToday, recentCompleted };
}

/**
 * Muscle groups the client actually loaded in the recent completed sessions.
 * Joins WorkoutExercise → Exercise.primaryMuscles. Returns
 * [{ muscle, lastTrainedLocalDate }] sorted by recency then frequency.
 */
export async function fetchRecentLoad(recentCompleted) {
  const { WorkoutExercise, Exercise } = getAllModels();
  if (!WorkoutExercise || !Exercise || recentCompleted.length === 0) return [];

  const sessionIds = recentCompleted.map(({ session }) => session.id);
  const rows = await WorkoutExercise.findAll({
    where: { workoutSessionId: { [Op.in]: sessionIds } },
    include: [{ model: Exercise, as: 'exercise', attributes: ['id', 'name', 'primaryMuscles'] }],
  });

  const byDate = new Map(recentCompleted.map(({ session, localDate }) => [session.id, localDate]));
  const tally = new Map();
  for (const row of rows) {
    const muscles = parseMuscleList(row.exercise?.primaryMuscles);
    const localDate = byDate.get(row.workoutSessionId) || null;
    for (const muscle of muscles) {
      const entry = tally.get(muscle) || { muscle, count: 0, lastTrainedLocalDate: null };
      entry.count += 1;
      if (!entry.lastTrainedLocalDate || (localDate && localDate > entry.lastTrainedLocalDate)) {
        entry.lastTrainedLocalDate = localDate;
      }
      tally.set(muscle, entry);
    }
  }
  return [...tally.values()].sort((a, b) =>
    (b.lastTrainedLocalDate || '').localeCompare(a.lastTrainedLocalDate || '') || b.count - a.count);
}

/** Movement screen truth: compensations recorded by real analyses. */
export async function fetchMovementFlags(userId) {
  const { MovementProfile } = getAllModels();
  if (!MovementProfile) return { hasProfile: false, compensations: [] };
  const profile = await MovementProfile.findOne({ where: { userId } });
  if (!profile) return { hasProfile: false, compensations: [] };
  const raw = profile.commonCompensations;
  const list = Array.isArray(raw) ? raw : parseMuscleList(raw);
  return {
    hasProfile: true,
    compensations: list.map((c) => String(c).toLowerCase().replace(/[\s-]+/g, '_')),
    lastAnalysisAt: profile.lastAnalysisAt || null,
  };
}

/** Active pain entries — used to filter and, without a screen, to fail closed (Kimi H2). */
export async function fetchActivePain(userId) {
  const { ClientPainEntry } = getAllModels();
  if (!ClientPainEntry) return [];
  const rows = await ClientPainEntry.findAll({ where: { userId, isActive: true } });
  return rows.map((r) => ({
    bodyRegion: String(r.bodyRegion || '').toLowerCase(),
    painLevel: r.painLevel ?? null,
  }));
}

/** The client's stated goal text (User.fitnessGoal — real onboarding data). */
export async function fetchGoalText(userId) {
  const { User } = getAllModels();
  if (!User) return null;
  const user = await User.findByPk(userId, { attributes: ['id', 'fitnessGoal'] });
  return user?.fitnessGoal || null;
}

/**
 * Candidate recovery exercises by CES/flexibility taxonomy (two-system truth:
 * enum + cesProtocolStep + bodyPartCategory — Rule 58 receipt in spec).
 */
export async function fetchRecoveryCandidates() {
  const { Exercise } = getAllModels();
  if (!Exercise) return [];
  return Exercise.findAll({
    where: {
      [Op.or]: [
        { cesProtocolStep: { [Op.in]: ['inhibit', 'lengthen', 'activate'] } },
        { exerciseType: { [Op.in]: ['flexibility', 'stability', 'balance', 'injury_prevention', 'injury_recovery'] } },
        { bodyPartCategory: { [Op.in]: ['recovery', 'cardio'] } },
      ],
    },
    attributes: [
      'id', 'name', 'exerciseType', 'cesProtocolStep', 'nasmCorrectiveCategory',
      'primaryMuscles', 'bodyPartCategory', 'contraindicationNotes', 'difficulty',
      'canBePerformedAtHome', 'recommendedSets', 'recommendedReps', 'recommendedDuration',
      'experiencePointsEarned', 'videoUrl', 'thumbnailUrl', 'imageUrl',
    ],
  });
}
