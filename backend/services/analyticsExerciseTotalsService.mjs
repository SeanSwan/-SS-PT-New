import sequelize from '../database.mjs';

const CATEGORY_KEYS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'];

const emptyCategory = () => ({
  totalVolume: 0,
  totalReps: 0,
  totalExercises: 0,
  sessionsCount: 0,
  avgVolumePerSession: 0,
  avgRepsPerSession: 0,
});

const emptyTotals = () => ({
  categories: Object.fromEntries(CATEGORY_KEYS.map((key) => [key, emptyCategory()])),
  totalSessions: 0,
  totalExercises: 0,
  totalVolume: 0,
  totalReps: 0,
});

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const validDateOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function calculateExerciseTotalsFromLogs(userId, options = {}) {
  const parsedUserId = parsePositiveInteger(userId);
  if (!parsedUserId) return emptyTotals();

  const replacements = { userId: parsedUserId };
  const dateFilters = [];

  const startDate = validDateOrNull(options.startDate);
  if (startDate) {
    replacements.startDate = startDate;
    dateFilters.push('ws.date >= :startDate');
  }

  const endDate = validDateOrNull(options.endDate);
  if (endDate) {
    replacements.endDate = endDate;
    dateFilters.push('ws.date <= :endDate');
  }

  const dateWhere = dateFilters.length > 0 ? `AND ${dateFilters.join(' AND ')}` : '';
  const [rows = []] = await sequelize.query(
    `WITH logs AS (
       SELECT
         ws.id AS session_id,
         wl."exerciseName" AS exercise_name,
         wl.reps::int AS reps,
         COALESCE(wl.weight * wl.reps, 0)::float AS volume,
         CASE
           WHEN wl."exerciseName" ILIKE '%bench%'
             OR wl."exerciseName" ILIKE '%chest%'
             OR wl."exerciseName" ILIKE '%pec%'
             THEN 'chest'
           WHEN wl."exerciseName" ILIKE '%row%'
             OR wl."exerciseName" ILIKE '%pull%'
             OR wl."exerciseName" ILIKE '%back%'
             OR wl."exerciseName" ILIKE '%lat%'
             OR wl."exerciseName" ILIKE '%deadlift%'
             THEN 'back'
           WHEN wl."exerciseName" ILIKE '%shoulder%'
             OR wl."exerciseName" ILIKE '%overhead%'
             OR wl."exerciseName" ILIKE '%military press%'
             OR wl."exerciseName" ILIKE '%lateral%'
             OR wl."exerciseName" ILIKE '%delt%'
             THEN 'shoulders'
           WHEN wl."exerciseName" ILIKE '%curl%'
             OR wl."exerciseName" ILIKE '%tricep%'
             OR wl."exerciseName" ILIKE '%bicep%'
             OR wl."exerciseName" ILIKE '%arm%'
             THEN 'arms'
           WHEN wl."exerciseName" ILIKE '%squat%'
             OR wl."exerciseName" ILIKE '%leg%'
             OR wl."exerciseName" ILIKE '%lunge%'
             OR wl."exerciseName" ILIKE '%calf%'
             OR wl."exerciseName" ILIKE '%quad%'
             OR wl."exerciseName" ILIKE '%hamstring%'
             THEN 'legs'
           WHEN wl."exerciseName" ILIKE '%crunch%'
             OR wl."exerciseName" ILIKE '%plank%'
             OR wl."exerciseName" ILIKE '%ab%'
             OR wl."exerciseName" ILIKE '%core%'
             OR wl."exerciseName" ILIKE '%sit-up%'
             THEN 'core'
           WHEN wl."exerciseName" ILIKE '%run%'
             OR wl."exerciseName" ILIKE '%bike%'
             OR wl."exerciseName" ILIKE '%cardio%'
             OR wl."exerciseName" ILIKE '%treadmill%'
             OR wl."exerciseName" ILIKE '%elliptical%'
             THEN 'cardio'
           ELSE 'other'
         END AS category
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId
         AND ws.status = 'completed'
         ${dateWhere}
     ),
     category_totals AS (
       SELECT
         category,
         COALESCE(SUM(volume), 0)::float AS total_volume,
         COALESCE(SUM(reps), 0)::int AS total_reps,
         COUNT(DISTINCT exercise_name)::int AS total_exercises,
         COUNT(DISTINCT session_id)::int AS sessions_count
       FROM logs
       WHERE category != 'other'
       GROUP BY category
     ),
     overall AS (
       SELECT
         COUNT(DISTINCT session_id)::int AS overall_sessions,
         COUNT(DISTINCT exercise_name)::int AS overall_exercises,
         COALESCE(SUM(volume), 0)::float AS overall_volume,
         COALESCE(SUM(reps), 0)::int AS overall_reps
       FROM logs
     )
     SELECT category_totals.*, overall.*
     FROM category_totals
     CROSS JOIN overall`,
    { replacements }
  );

  const totals = emptyTotals();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = row.category;
    if (!CATEGORY_KEYS.includes(key)) continue;

    const totalVolume = Math.round(toNumber(row.total_volume));
    const totalReps = Math.round(toNumber(row.total_reps));
    const sessionsCount = Math.round(toNumber(row.sessions_count));

    totals.categories[key] = {
      totalVolume,
      totalReps,
      totalExercises: Math.round(toNumber(row.total_exercises)),
      sessionsCount,
      avgVolumePerSession: sessionsCount > 0 ? Math.round(totalVolume / sessionsCount) : 0,
      avgRepsPerSession: sessionsCount > 0 ? Math.round(totalReps / sessionsCount) : 0,
    };

    totals.totalSessions = Math.round(toNumber(row.overall_sessions));
    totals.totalExercises = Math.round(toNumber(row.overall_exercises));
    totals.totalVolume = Math.round(toNumber(row.overall_volume));
    totals.totalReps = Math.round(toNumber(row.overall_reps));
  }

  return totals;
}

export default calculateExerciseTotalsFromLogs;
