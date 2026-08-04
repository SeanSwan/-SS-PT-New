/**
 * Coach Nutrition Context
 * =======================
 * Builds a PII-safe summary from DailyMacroLog rows for the Coach Hive Mind.
 * Raw meal descriptions and parsed items are intentionally excluded upstream;
 * this module only summarizes structured macro, rhythm, source, and flag data.
 */

const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

const toNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
};

const averageField = (rows, field) => {
  const values = rows
    .map((row) => toNumber(row?.[field]))
    .filter((value) => value !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const uniqueStrings = (rows, field) => [
  ...new Set(rows.map((row) => String(row?.[field] || '').trim()).filter(Boolean)),
];

const countTruthy = (rows, field) => rows.filter((row) => row?.[field] === true).length;

// S2.4 (2026-08-04): derived adherence fields computed from rows already
// loaded — zero new queries, and they flow to every coach surface through
// buildCoachContext automatically. Dates are compared as ISO strings; rows
// arrive DESC by (date, createdAt) from the domain loader.
const isoDay = (value) => {
  if (!value) return null;
  const s = value.toISOString?.()?.slice(0, 10) || String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const dayBeforeIso = (isoDate) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
};

const consecutiveDayRun = (dateSet, fromDay) => {
  let cursor = fromDay;
  let run = 0;
  while (dateSet.has(cursor)) {
    run += 1;
    cursor = dayBeforeIso(cursor);
  }
  return run;
};

export function summarizeNutritionLogs(rows) {
  const logs = Array.isArray(rows) ? rows : [];
  const loggedDates = new Set(logs.map((row) => isoDay(row?.date)).filter(Boolean));
  const latest = logs[0] || null;
  const latestDay = isoDay(latest?.date);

  // Run of consecutive logged days ending at the most recent log. Server-zone
  // "today" is deliberately NOT used here — the streak is relative to the
  // client's own latest entry, so timezone drift can't fake a broken streak.
  const currentLogRun = latestDay ? consecutiveDayRun(loggedDates, latestDay) : 0;
  const daysSinceLastLog = latestDay
    ? Math.max(0, Math.round((Date.now() - new Date(`${latestDay}T12:00:00Z`).getTime()) / 86400000))
    : null;

  return {
    sampleEntries: logs.length,
    loggedDays: loggedDates.size,
    latestDate: latest?.date || null,
    latestMealType: latest?.mealType || null,
    currentLogRun,
    daysSinceLastLog,
    inferredEntryCount: logs.filter((row) => row?.source === 'coach_inferred').length,
    verifiedCount: logs.filter((row) => row?.verified === true).length,
    estimateCount: logs.filter((row) => row?.verified !== true).length,
    sodiumFlagCount: countTruthy(logs, 'flagSodium'),
    sugarFlagCount: countTruthy(logs, 'flagSugar'),
    processedFlagCount: countTruthy(logs, 'flagProcessed'),
    sources: uniqueStrings(logs, 'source'),
    averages: {
      calories: averageField(logs, 'calories'),
      protein: averageField(logs, 'protein'),
      carbs: averageField(logs, 'carbs'),
      fat: averageField(logs, 'fat'),
      fiber: averageField(logs, 'fiber'),
      sugar: averageField(logs, 'sugar'),
      sodium: averageField(logs, 'sodium'),
    },
  };
}
