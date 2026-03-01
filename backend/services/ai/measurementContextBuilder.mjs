/**
 * Measurement Context Builder
 * ─────────────────────────────────────────────────────────────
 * Extracts de-identified measurement trends from recent body
 * measurements for AI workout generation context.
 *
 * No PII — only derived numeric trends and dates.
 *
 * Phase 11F — AI Measurement Context
 */

/**
 * Compute a simple trend from an array of numeric values (most recent first).
 *
 * @param {number[]} values — ordered most-recent-first
 * @returns {'decreasing'|'increasing'|'stable'|null}
 */
function computeTrend(values) {
  const valid = values.filter(v => v != null && !isNaN(v));
  if (valid.length < 2) return null;

  // Compare most recent to oldest available
  const newest = valid[0];
  const oldest = valid[valid.length - 1];
  const delta = newest - oldest;
  const pctChange = Math.abs(delta / oldest) * 100;

  // Less than 1% change is stable
  if (pctChange < 1) return 'stable';
  return delta < 0 ? 'decreasing' : 'increasing';
}

/**
 * Build measurement context from recent BodyMeasurement records.
 *
 * @param {Array<Object>} measurements — BodyMeasurement instances or plain objects, most recent first
 * @returns {Object|null} — measurement context, or null if no data
 */
export function buildMeasurementContext(measurements) {
  if (!measurements || !Array.isArray(measurements) || measurements.length === 0) {
    return null;
  }

  const plains = measurements.map(m =>
    typeof m.get === 'function' ? m.get({ plain: true }) : m
  );

  const latest = plains[0];

  // Weight trend
  const weights = plains.map(m => m.weight).filter(w => w != null);
  const currentWeight = weights[0] || null;
  const weightTrend = computeTrend(weights);

  // Body fat trend
  const bodyFats = plains.map(m => m.bodyFatPercentage).filter(bf => bf != null);
  const currentBodyFat = bodyFats[0] || null;
  const bodyFatTrend = computeTrend(bodyFats);

  // Waist (naturalWaist) trend
  const waists = plains.map(m => m.naturalWaist).filter(w => w != null);
  const currentWaist = waists[0] || null;
  const waistTrend = computeTrend(waists);

  // Days since last measurement
  const lastDate = latest.measurementDate ? new Date(latest.measurementDate) : null;
  const daysSinceLastMeasurement = lastDate
    ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    currentWeight,
    weightUnit: latest.weightUnit || 'lbs',
    weightTrend,
    currentBodyFat,
    bodyFatTrend,
    currentWaist,
    waistUnit: latest.circumferenceUnit || 'inches',
    waistTrend,
    daysSinceLastMeasurement,
    measurementCount: plains.length,
  };
}
