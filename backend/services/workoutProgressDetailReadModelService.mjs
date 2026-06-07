/**
 * Workout Progress Detail Read Model Service
 * ==========================================
 * Builds progress-chart analysis rows from canonical WorkoutSession/WorkoutLog
 * data first, with legacy DailyWorkoutForm JSON as a compatibility fallback.
 */

import { Op } from 'sequelize';

import { getWorkoutLog, getWorkoutSession } from '../models/index.mjs';

const toPlainObject = (value) => {
  if (!value) return {};
  if (typeof value.get === 'function') return value.get({ plain: true });
  if (typeof value.toJSON === 'function') return value.toJSON();
  return value;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const toDateOnly = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/);
    if (match) return match[1];
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const toDateOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toNonNegativeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const toNonNegativeInteger = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : 0;
};

const toNullableRpe = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) return null;
  return Math.trunc(parsed);
};

const toNullableText = (value) => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

const getSessionLogs = (session) => toArray(toPlainObject(session).logs)
  .map(toPlainObject)
  .filter((log) => toNullableText(log.exerciseName));

const buildExercisesFromLogs = (logs) => {
  const exerciseMap = new Map();

  for (const log of logs) {
    const exerciseName = toNullableText(log.exerciseName);
    if (!exerciseName) continue;

    if (!exerciseMap.has(exerciseName)) {
      exerciseMap.set(exerciseName, {
        exerciseName,
        sets: [],
      });
    }

    const exercise = exerciseMap.get(exerciseName);
    const exerciseNote = toNullableText(log.exerciseNote);
    if (exerciseNote && !exercise.exerciseNote) {
      exercise.exerciseNote = exerciseNote;
      exercise.performanceNotes = exerciseNote;
    }

    const set = {
      setNumber: toNonNegativeInteger(log.setNumber) || exercise.sets.length + 1,
      reps: toNonNegativeInteger(log.reps),
      weight: toNonNegativeNumber(log.weight),
    };
    const rpe = toNullableRpe(log.rpe);
    if (rpe !== null) set.rpe = rpe;
    const tempo = toNullableText(log.tempo);
    if (tempo) set.tempo = tempo;
    const notes = toNullableText(log.notes);
    if (notes) set.notes = notes;
    if (log.rest !== undefined && log.rest !== null && log.rest !== '') {
      set.rest = toNonNegativeInteger(log.rest);
    }

    exercise.sets.push(set);
  }

  return [...exerciseMap.values()];
};

const buildCanonicalRows = (workoutSessions) => toArray(workoutSessions)
  .map((session) => {
    const plainSession = toPlainObject(session);
    const date = toDateOnly(plainSession.date || plainSession.completedAt);
    const logs = getSessionLogs(plainSession);
    const exercises = buildExercisesFromLogs(logs);
    if (!plainSession.id || !date || exercises.length === 0) return null;

    return {
      id: `session:${plainSession.id}`,
      sessionId: plainSession.id,
      date,
      source: 'workout_logs',
      submittedAt: plainSession.completedAt || plainSession.updatedAt || plainSession.date || null,
      createdAt: plainSession.createdAt || plainSession.date || null,
      totalPointsEarned: null,
      formData: {
        estimatedDuration: toNonNegativeInteger(plainSession.duration),
        overallIntensity: plainSession.intensity ?? null,
        exercises,
      },
    };
  })
  .filter(Boolean);

const buildLegacyRows = (forms, canonicalRows) => {
  const canonicalSessionIds = new Set(
    canonicalRows.map((row) => String(row.sessionId)).filter(Boolean)
  );
  const canonicalDates = new Set(canonicalRows.map((row) => row.date).filter(Boolean));

  return toArray(forms).map((form) => {
    const plainForm = toPlainObject(form);
    const date = toDateOnly(plainForm.date || plainForm.submittedAt || plainForm.createdAt);
    if (!date) return null;

    const sessionId = plainForm.sessionId || plainForm.formData?.sessionId || null;
    if (sessionId && canonicalSessionIds.has(String(sessionId))) return null;
    if (!sessionId && canonicalDates.has(date)) return null;

    return {
      ...plainForm,
      date,
      sessionId,
      source: 'daily_workout_forms',
      formData: {
        ...(plainForm.formData || {}),
        exercises: toArray(plainForm.formData?.exercises),
      },
    };
  }).filter(Boolean);
};

export function buildProgressDetailedAnalysisRows({ forms = [], workoutSessions = [] } = {}) {
  const canonicalRows = buildCanonicalRows(workoutSessions);
  const legacyRows = buildLegacyRows(forms, canonicalRows);

  return [...canonicalRows, ...legacyRows].sort((a, b) => (
    a.date.localeCompare(b.date)
    || (a.source === 'workout_logs' ? -1 : 1)
    || String(a.id || '').localeCompare(String(b.id || ''))
  ));
}

export async function fetchCanonicalProgressWorkoutSessions(clientId, startDate, options = {}) {
  const parsedClientId = Number(clientId);
  if (!Number.isInteger(parsedClientId) || parsedClientId <= 0) return [];

  const WorkoutSession = options.WorkoutSession || getWorkoutSession();
  const WorkoutLog = options.WorkoutLog || getWorkoutLog();
  if (!WorkoutSession?.findAll || !WorkoutLog) return [];

  const where = { userId: parsedClientId, status: 'completed' };
  const parsedStartDate = toDateOrNull(startDate);
  if (parsedStartDate) {
    where.date = { [Op.gte]: parsedStartDate };
  }

  const logAssociation = { model: WorkoutLog, as: 'logs' };
  return WorkoutSession.findAll({
    where,
    include: [{
      ...logAssociation,
      required: true,
      attributes: [
        'id',
        'exerciseName',
        'setNumber',
        'reps',
        'weight',
        'tempo',
        'rest',
        'rpe',
        'notes',
        'exerciseNote',
      ],
    }],
    order: [
      ['date', 'ASC'],
      [logAssociation, 'exerciseName', 'ASC'],
      [logAssociation, 'setNumber', 'ASC'],
    ],
  });
}
