import sequelize from '../database.mjs';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const groupRowsBySession = (rows) => {
  const sessions = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const sessionId = row.sessionId;
    if (!sessionId) continue;

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        id: sessionId,
        date: row.date,
        intensity: row.intensity,
        exercises: [],
      });
    }

    if (!row.exerciseName) continue;
    const session = sessions.get(sessionId);
    let exercise = session.exercises.find((item) => item.exerciseName === row.exerciseName);

    if (!exercise) {
      exercise = { exerciseName: row.exerciseName, sets: [] };
      session.exercises.push(exercise);
    }

    exercise.sets.push({
      setNumber: Math.round(toNumber(row.setNumber)),
      reps: Math.round(toNumber(row.reps)),
      weight: toNumber(row.weight),
    });
  }

  return [...sessions.values()];
};

export async function getWorkoutSessionWithLogs(userId, workoutSessionId, options = {}) {
  const db = options.sequelize || sequelize;
  if (!db || typeof db.query !== 'function' || !userId || !workoutSessionId) return null;

  const [rows = []] = await db.query(
    `SELECT
       ws.id AS "sessionId",
       ws.date,
       ws.intensity,
       wl."exerciseName",
       wl."setNumber",
       wl.reps,
       wl.weight
     FROM workout_sessions ws
     JOIN workout_logs wl ON wl."sessionId" = ws.id
     WHERE ws.id = :workoutSessionId
       AND ws."userId" = :userId
       AND ws.status = 'completed'
     ORDER BY wl."exerciseName" ASC, wl."setNumber" ASC`,
    { replacements: { userId, workoutSessionId } }
  );

  return groupRowsBySession(rows)[0] || null;
}

export async function getRecentWorkoutSessionsWithLogs(userId, options = {}) {
  const db = options.sequelize || sequelize;
  if (!db || typeof db.query !== 'function' || !userId) return [];

  const limit = Math.min(Math.max(Number(options.limit) || 6, 1), 12);
  const [rows = []] = await db.query(
    `WITH recent_sessions AS (
       SELECT ws.id, ws.date, ws.intensity
       FROM workout_sessions ws
       WHERE ws."userId" = :userId
         AND ws.status = 'completed'
       ORDER BY ws.date DESC
       LIMIT :limit
     )
     SELECT
       rs.id AS "sessionId",
       rs.date,
       rs.intensity,
       wl."exerciseName",
       wl."setNumber",
       wl.reps,
       wl.weight
     FROM recent_sessions rs
     JOIN workout_logs wl ON wl."sessionId" = rs.id
     ORDER BY rs.date DESC, wl."exerciseName" ASC, wl."setNumber" ASC`,
    { replacements: { userId, limit } }
  );

  return groupRowsBySession(rows);
}
