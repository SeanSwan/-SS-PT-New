import sequelize from '../database.mjs';

const EMPTY_HISTORY = {
  exercises: [],
  totalUniqueExercises: 0,
  totalAvailableExercises: 0,
  varietyScore: 0,
  usedMaterializedView: false,
};

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseLimit = (value) => {
  const parsed = parsePositiveInteger(value);
  return Math.min(parsed ?? 50, 100);
};

// hasOwnProperty, not plain indexing: `map[key] || default` resolves INHERITED keys, so
// sort=constructor/toString yields a function that stringifies into ORDER BY and 500s
// (same class proven live on the public /api/videos route, 2026-08-04).
const ORDER_BY_MAP = {
  timesPerformed: '"timesPerformed" DESC',
  totalVolume: '"totalVolume" DESC',
  lastPerformed: '"lastPerformedDate" DESC',
  alphabetical: '"exerciseName" ASC',
};
const orderByFor = (sort) =>
  (typeof sort === 'string' && Object.prototype.hasOwnProperty.call(ORDER_BY_MAP, sort))
    ? ORDER_BY_MAP[sort]
    : ORDER_BY_MAP.timesPerformed;

const parseCursor = (cursor) => {
  if (!cursor || typeof cursor !== 'string') return null;
  const [cursorDate, cursorId] = cursor.split(',');
  const parsedCursorId = parsePositiveInteger(cursorId);
  const parsedDate = new Date(cursorDate);
  if (!parsedCursorId || Number.isNaN(parsedDate.getTime())) return null;
  return { cursorDate: parsedDate, cursorId: parsedCursorId };
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeHistoryRow = (row) => ({
  exerciseId: Math.round(toNumber(row.exerciseId)),
  exerciseName: row.exerciseName || 'Unknown Exercise',
  primaryMuscles: row.primaryMuscles || '[]',
  category: row.category || 'uncategorized',
  timesPerformed: Math.round(toNumber(row.timesPerformed)),
  maxWeight: toNumber(row.maxWeight),
  maxReps: Math.round(toNumber(row.maxReps)),
  totalVolume: Math.round(toNumber(row.totalVolume)),
  lastPerformedDate: row.lastPerformedDate || null,
  firstPerformedDate: row.firstPerformedDate || null,
});

export async function getExerciseHistoryFromLogs(userId, options = {}) {
  const parsedUserId = parsePositiveInteger(userId);
  if (!parsedUserId) return { ...EMPTY_HISTORY };

  const db = options.sequelize || sequelize;
  if (!db || typeof db.query !== 'function') return { ...EMPTY_HISTORY };

  const replacements = {
    userId: parsedUserId,
    limit: parseLimit(options.limit),
  };

  const filters = [];
  if (options.muscleGroup && options.muscleGroup !== 'All') {
    replacements.muscleGroup = `%${String(options.muscleGroup)}%`;
    filters.push(`AND (
      e."primaryMuscles" ILIKE :muscleGroup
      OR e."bodyPartCategory" ILIKE :muscleGroup
      OR wl."exerciseName" ILIKE :muscleGroup
    )`);
  }

  const parsedCursor = parseCursor(options.cursor);
  let cursorClause = '';
  if (parsedCursor) {
    replacements.cursorDate = parsedCursor.cursorDate;
    replacements.cursorId = parsedCursor.cursorId;
    cursorClause = 'HAVING (MAX(ws.date), MIN(wl.id)) < (:cursorDate, :cursorId)';
  }

  const [rows = []] = await db.query(
    `SELECT
       MIN(wl.id)::int AS "exerciseId",
       MIN(wl."exerciseName") AS "exerciseName",
       COALESCE(MAX(e."primaryMuscles"), '[]') AS "primaryMuscles",
       COALESCE(NULLIF(MAX(e."bodyPartCategory"), ''), 'uncategorized') AS category,
       COUNT(DISTINCT ws.id)::int AS "timesPerformed",
       COALESCE(MAX(wl.weight), 0)::float AS "maxWeight",
       COALESCE(MAX(wl.reps), 0)::int AS "maxReps",
       COALESCE(SUM(wl.weight * wl.reps), 0)::float AS "totalVolume",
       MAX(ws.date) AS "lastPerformedDate",
       MIN(ws.date) AS "firstPerformedDate"
     FROM workout_logs wl
     JOIN workout_sessions ws ON wl."sessionId" = ws.id
     LEFT JOIN "Exercises" e ON LOWER(e.name) = LOWER(wl."exerciseName")
     WHERE ws."userId" = :userId
       AND ws.status = 'completed'
       ${filters.join('\n')}
     GROUP BY LOWER(wl."exerciseName")
     ${cursorClause}
     ORDER BY ${orderByFor(options.sort)}, "exerciseId" DESC
     LIMIT :limit`,
    { replacements }
  );

  const [uniqueRows = []] = await db.query(
    `SELECT COUNT(DISTINCT LOWER(wl."exerciseName"))::int AS total
     FROM workout_logs wl
     JOIN workout_sessions ws ON wl."sessionId" = ws.id
     WHERE ws."userId" = :userId
       AND ws.status = 'completed'`,
    { replacements: { userId: parsedUserId } }
  );

  const [availableRows = []] = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM "Exercises"
     WHERE "isActive" = true`
  );

  const totalUniqueExercises = Math.round(toNumber(uniqueRows?.[0]?.total));
  const totalAvailableExercises = Math.round(toNumber(availableRows?.[0]?.total));

  return {
    exercises: (Array.isArray(rows) ? rows : []).map(normalizeHistoryRow),
    totalUniqueExercises,
    totalAvailableExercises,
    varietyScore: totalAvailableExercises > 0
      ? Number(((totalUniqueExercises / totalAvailableExercises) * 100).toFixed(1))
      : 0,
    usedMaterializedView: false,
  };
}

export async function getExerciseVarietyFromLogs(userId, options = {}) {
  const parsedUserId = parsePositiveInteger(userId);
  if (!parsedUserId) {
    return { newExercisesThisMonth: 0, muscleGroupsHitThisMonth: 0 };
  }

  const db = options.sequelize || sequelize;
  if (!db || typeof db.query !== 'function') {
    return { newExercisesThisMonth: 0, muscleGroupsHitThisMonth: 0 };
  }

  const [newRows = []] = await db.query(
    `SELECT COUNT(DISTINCT LOWER(wl."exerciseName"))::int AS count
     FROM workout_logs wl
     JOIN workout_sessions ws ON wl."sessionId" = ws.id
     WHERE ws."userId" = :userId
       AND ws.status = 'completed'
       AND ws.date >= DATE_TRUNC('month', NOW())
       AND NOT EXISTS (
         SELECT 1
         FROM workout_logs prev_wl
         JOIN workout_sessions prev_ws ON prev_wl."sessionId" = prev_ws.id
         WHERE prev_ws."userId" = :userId
           AND prev_ws.status = 'completed'
           AND prev_ws.date < DATE_TRUNC('month', NOW())
           AND LOWER(prev_wl."exerciseName") = LOWER(wl."exerciseName")
       )`,
    { replacements: { userId: parsedUserId } }
  );

  const [groupRows = []] = await db.query(
    `SELECT COUNT(DISTINCT COALESCE(NULLIF(e."bodyPartCategory", ''), e."primaryMuscles", wl."exerciseName"))::int AS count
     FROM workout_logs wl
     JOIN workout_sessions ws ON wl."sessionId" = ws.id
     LEFT JOIN "Exercises" e ON LOWER(e.name) = LOWER(wl."exerciseName")
     WHERE ws."userId" = :userId
       AND ws.status = 'completed'
       AND ws.date >= DATE_TRUNC('month', NOW())`,
    { replacements: { userId: parsedUserId } }
  );

  return {
    newExercisesThisMonth: Math.round(toNumber(newRows?.[0]?.count)),
    muscleGroupsHitThisMonth: Math.round(toNumber(groupRows?.[0]?.count)),
  };
}
