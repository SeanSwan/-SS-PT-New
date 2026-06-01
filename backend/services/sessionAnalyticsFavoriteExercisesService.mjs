import defaultSequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getSessionAnalyticsFavoriteExercises = async (
  userId,
  { sequelize: db = defaultSequelize, limit = DEFAULT_LIMIT } = {}
) => {
  const parsedUserId = parsePositiveInteger(userId);
  if (!parsedUserId || typeof db?.query !== 'function') return [];

  const parsedLimit = Math.min(parsePositiveInteger(limit) || DEFAULT_LIMIT, MAX_LIMIT);

  try {
    const [rows = []] = await db.query(
      `SELECT
         wl."exerciseName" AS "exerciseName",
         COUNT(DISTINCT wl."sessionId")::int AS sessions,
         COUNT(*)::int AS sets
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId
         AND ws.status = 'completed'
       GROUP BY wl."exerciseName"
       ORDER BY sessions DESC, sets DESC, wl."exerciseName" ASC
       LIMIT :limit`,
      { replacements: { userId: parsedUserId, limit: parsedLimit } }
    );

    return (Array.isArray(rows) ? rows : [])
      .map((row) => (typeof row?.exerciseName === 'string' ? row.exerciseName.trim() : ''))
      .filter(Boolean);
  } catch (error) {
    logger.warn('[SessionAnalytics] Failed to load favorite exercises', {
      userId: parsedUserId,
      message: error?.message || 'unknown error'
    });
    return [];
  }
};

export default getSessionAnalyticsFavoriteExercises;
