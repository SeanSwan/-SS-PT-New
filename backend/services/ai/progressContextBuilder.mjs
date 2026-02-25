/**
 * progressContextBuilder.mjs
 * ─────────────────────────────────────────────────────────────
 * Summarizes recent training history into PII-free derived context
 * for the AI workout generation pipeline.
 *
 * INPUT:  Array of WorkoutSession objects (with nested workoutLogs)
 * OUTPUT: ProgressContext — safe derived summary (no IDs, no names, no PII)
 *
 * Phase 5A — Smart Workout Logger MVP Coach Copilot
 */

/**
 * Build a PII-free progress context from recent workout sessions.
 *
 * @param {Array|null|undefined} sessions — Recent WorkoutSession rows (newest first preferred)
 * @param {object} [opts]
 * @param {Date}   [opts.referenceDate] — "now" for adherence calculations (default: Date.now())
 * @returns {ProgressContext}
 */
export function buildProgressContext(sessions, opts = {}) {
  const referenceDate = opts.referenceDate || new Date();

  // ── Guard: no data ──────────────────────────────────────────
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
    return emptyContext();
  }

  // ── Filter completed sessions only ──────────────────────────
  const completed = sessions.filter(s => s.status === 'completed');
  if (completed.length === 0) {
    return emptyContext();
  }

  // ── Sort by date ascending (oldest → newest) ────────────────
  const sorted = [...completed].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // ── Aggregate stats ─────────────────────────────────────────
  const count = sorted.length;
  const totalVolume = sum(sorted, s => s.totalWeight || 0);
  const totalReps = sum(sorted, s => s.totalReps || 0);
  const totalSets = sum(sorted, s => s.totalSets || 0);
  const totalDuration = sum(sorted, s => s.duration || 0);
  const totalIntensity = sum(sorted, s => s.intensity || 0);

  // ── RPE analysis ────────────────────────────────────────────
  const rpeValues = sorted
    .map(s => s.avgRPE)
    .filter(v => v != null && !isNaN(v));

  // ── Frequency / adherence ───────────────────────────────────
  const oldestDate = new Date(sorted[0].date);
  const newestDate = new Date(sorted[sorted.length - 1].date);
  const spanDays = Math.max(1, (newestDate - oldestDate) / (1000 * 60 * 60 * 24));
  const spanWeeks = Math.max(1, spanDays / 7);
  const avgPerWeek = round2(count / spanWeeks);

  // Days since last workout
  const daysSinceLast = Math.floor(
    (referenceDate - newestDate) / (1000 * 60 * 60 * 24)
  );

  // ── Exercise history (top exercises by frequency + best) ────
  const exerciseHistory = buildExerciseHistory(sorted);

  // ── Trend detection ─────────────────────────────────────────
  const volumeTrend = detectTrend(sorted.map(s => s.totalWeight || 0));
  const rpeTrend = rpeValues.length >= 2 ? detectTrend(rpeValues) : 'no_data';

  // Adherence: based on frequency and recency
  let adherenceTrend = 'no_data';
  if (count >= 2) {
    if (avgPerWeek >= 3 && daysSinceLast <= 4) {
      adherenceTrend = 'consistent';
    } else if (avgPerWeek >= 2 && daysSinceLast <= 7) {
      adherenceTrend = 'moderate';
    } else if (daysSinceLast > 14) {
      adherenceTrend = 'declining';
    } else if (avgPerWeek >= 2) {
      adherenceTrend = 'improving';
    } else {
      adherenceTrend = 'low';
    }
  }

  // ── Warnings ────────────────────────────────────────────────
  const warnings = [];
  if (rpeTrend === 'increasing' && rpeValues.length >= 2 && rpeValues[rpeValues.length - 1] >= 9) {
    warnings.push('RPE trending high (≥9) — consider deload or recovery session');
  }
  if (daysSinceLast > 14) {
    warnings.push('No workout in 14+ days — ease back in with reduced volume');
  }

  return {
    recentSessionCount: count,
    avgSessionsPerWeek: avgPerWeek,
    avgVolumePerSession: round2(totalVolume / count),
    avgRepsPerSession: round2(totalReps / count),
    avgSetsPerSession: round2(totalSets / count),
    avgDurationMin: round2(totalDuration / count),
    avgIntensity: round2(totalIntensity / count),
    rpeTrend,
    volumeTrend,
    adherenceTrend,
    exerciseHistory,
    warnings,
    missingInputs: [],
  };
}

// ─── Internals ────────────────────────────────────────────────

function emptyContext() {
  return {
    recentSessionCount: 0,
    avgSessionsPerWeek: 0,
    avgVolumePerSession: 0,
    avgRepsPerSession: 0,
    avgSetsPerSession: 0,
    avgDurationMin: 0,
    avgIntensity: 0,
    rpeTrend: 'no_data',
    volumeTrend: 'no_data',
    adherenceTrend: 'no_data',
    exerciseHistory: [],
    warnings: [],
    missingInputs: ['workout_history'],
  };
}

/**
 * Detect a simple trend from an ordered numeric series.
 * Uses first-half vs second-half average comparison.
 */
function detectTrend(values) {
  if (!values || values.length < 2) return 'no_data';

  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid || 1);
  const secondHalf = values.slice(mid);

  const avgFirst = sum(firstHalf, v => v) / firstHalf.length;
  const avgSecond = sum(secondHalf, v => v) / secondHalf.length;

  const changePct = avgFirst === 0 ? 0 : ((avgSecond - avgFirst) / avgFirst) * 100;

  if (changePct > 10) return 'increasing';
  if (changePct < -10) return 'decreasing';
  return 'stable';
}

/**
 * Build per-exercise history from workout logs across sessions.
 * Returns top exercises by frequency with best weight/reps.
 * NO session IDs, user IDs, or timestamps in output.
 */
function buildExerciseHistory(sessions) {
  const exerciseMap = new Map();

  for (const session of sessions) {
    if (!session.workoutLogs || !Array.isArray(session.workoutLogs)) continue;

    for (const log of session.workoutLogs) {
      const name = log.exerciseName;
      if (!name) continue;

      if (!exerciseMap.has(name)) {
        exerciseMap.set(name, {
          exerciseName: name,
          totalSets: 0,
          bestWeight: 0,
          bestReps: 0,
          avgRpe: null,
          rpeSum: 0,
          rpeCount: 0,
        });
      }

      const entry = exerciseMap.get(name);
      entry.totalSets++;
      if ((log.weight || 0) > entry.bestWeight) entry.bestWeight = log.weight;
      if ((log.reps || 0) > entry.bestReps) entry.bestReps = log.reps;
      if (log.rpe != null) {
        entry.rpeSum += log.rpe;
        entry.rpeCount++;
      }
    }
  }

  return [...exerciseMap.values()]
    .map(e => ({
      exerciseName: e.exerciseName,
      totalSets: e.totalSets,
      bestWeight: e.bestWeight,
      bestReps: e.bestReps,
      avgRpe: e.rpeCount > 0 ? round2(e.rpeSum / e.rpeCount) : null,
    }))
    .sort((a, b) => b.totalSets - a.totalSets)
    .slice(0, 15); // top 15 exercises
}

function sum(arr, fn) {
  return arr.reduce((acc, v) => acc + (fn(v) || 0), 0);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
