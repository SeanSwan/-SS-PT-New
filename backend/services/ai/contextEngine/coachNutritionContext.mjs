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

export function summarizeNutritionLogs(rows) {
  const logs = Array.isArray(rows) ? rows : [];
  const loggedDates = new Set(logs.map((row) => row?.date).filter(Boolean));
  const latest = logs[0] || null;

  return {
    sampleEntries: logs.length,
    loggedDays: loggedDates.size,
    latestDate: latest?.date || null,
    latestMealType: latest?.mealType || null,
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
