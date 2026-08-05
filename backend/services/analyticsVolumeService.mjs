import sequelize from '../database.mjs';

const GROUP_CONFIG = {
  day: {
    bucket: 'DATE_TRUNC(\'day\', ws.date)',
    label: 'TO_CHAR(DATE_TRUNC(\'day\', ws.date), \'YYYY-MM-DD\')',
  },
  week: {
    bucket: 'DATE_TRUNC(\'week\', ws.date)',
    label: 'TO_CHAR(DATE_TRUNC(\'week\', ws.date), \'IYYY-"W"IW\')',
  },
  month: {
    bucket: 'DATE_TRUNC(\'month\', ws.date)',
    label: 'TO_CHAR(DATE_TRUNC(\'month\', ws.date), \'YYYY-MM\')',
  },
};

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

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundNullableTenths = (value) => {
  const parsed = toNullableNumber(value);
  return parsed === null ? null : Math.round(parsed * 10) / 10;
};

export async function calculateVolumeOverTimeFromLogs(userId, options = {}) {
  const parsedUserId = parsePositiveInteger(userId);
  if (!parsedUserId) return [];

  // hasOwnProperty, not plain indexing — inherited keys (constructor/toString) would
  // otherwise reach the interpolated GROUP BY / ORDER BY and 500 the request.
  const groupConfig = (typeof options.groupBy === 'string'
    && Object.prototype.hasOwnProperty.call(GROUP_CONFIG, options.groupBy))
    ? GROUP_CONFIG[options.groupBy]
    : GROUP_CONFIG.week;
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
    `SELECT
       ${groupConfig.label} AS period,
       COALESCE(SUM(wl.weight * wl.reps), 0)::float AS total_volume,
       COALESCE(SUM(wl.reps), 0)::int AS total_reps,
       COUNT(DISTINCT wl."exerciseName")::int AS total_exercises,
       COUNT(DISTINCT ws.id)::int AS sessions_count,
       AVG(ws.intensity)::float AS avg_intensity
     FROM workout_sessions ws
     LEFT JOIN workout_logs wl ON wl."sessionId" = ws.id
     WHERE ws."userId" = :userId
       AND ws.status = 'completed'
       ${dateWhere}
     GROUP BY ${groupConfig.bucket}
     ORDER BY ${groupConfig.bucket} ASC`,
    { replacements }
  );

  return (Array.isArray(rows) ? rows : []).map((row) => {
    const period = row.period;
    const totalVolume = Math.round(toNumber(row.total_volume));
    const sessionsCount = Math.max(0, Math.round(toNumber(row.sessions_count)));

    return {
      date: period,
      week: period,
      volume: totalVolume,
      totalVolume,
      totalReps: Math.max(0, Math.round(toNumber(row.total_reps))),
      totalExercises: Math.max(0, Math.round(toNumber(row.total_exercises))),
      sessionsCount,
      workoutCount: sessionsCount,
      avgVolumePerSession: sessionsCount > 0 ? Math.round(totalVolume / sessionsCount) : 0,
      avgIntensity: roundNullableTenths(row.avg_intensity),
    };
  });
}
