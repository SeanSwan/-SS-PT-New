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

  // ── Per-exercise progression curves (4-week buckets) ────────
  const exerciseProgressionCurves = buildExerciseProgressionCurves(sorted);

  // ── Training frequency patterns ───────────────────────────────
  const frequencyPatterns = buildFrequencyPatterns(sorted, referenceDate);

  // ── Session-level details (recovery, fatigue) ─────────────────
  const sessionDetails = buildSessionDetails(sorted);

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
    exerciseProgressionCurves,
    frequencyPatterns,
    sessionDetails,
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

// ─── NEW: Per-exercise progression curves ────────────────────────
/**
 * Build per-exercise weight/volume progression in 4-week buckets.
 * Shows top 8 exercises with their week-over-week progression.
 * Output is PII-free: no session IDs, user IDs, or timestamps.
 *
 * @param {Array} sortedSessions — Sessions sorted oldest→newest
 * @returns {Array} Per-exercise progression curves
 */
function buildExerciseProgressionCurves(sortedSessions) {
  if (!sortedSessions || sortedSessions.length < 2) return [];

  // Group sessions into 4-week buckets
  const firstDate = new Date(sortedSessions[0].date);
  const exerciseWeeklyData = new Map(); // exerciseName → Map<weekNum, { totalWeight, totalSets, bestWeight, bestReps }>

  for (const session of sortedSessions) {
    const sessionDate = new Date(session.date);
    const weekNum = Math.floor((sessionDate - firstDate) / (1000 * 60 * 60 * 24 * 7));

    if (!session.workoutLogs || !Array.isArray(session.workoutLogs)) continue;

    for (const log of session.workoutLogs) {
      const name = log.exerciseName;
      if (!name) continue;

      if (!exerciseWeeklyData.has(name)) {
        exerciseWeeklyData.set(name, new Map());
      }
      const weekMap = exerciseWeeklyData.get(name);

      if (!weekMap.has(weekNum)) {
        weekMap.set(weekNum, { totalVolume: 0, totalSets: 0, bestWeight: 0, bestReps: 0 });
      }
      const bucket = weekMap.get(weekNum);
      bucket.totalVolume += (log.weight || 0) * (log.reps || 0);
      bucket.totalSets++;
      if ((log.weight || 0) > bucket.bestWeight) bucket.bestWeight = log.weight;
      if ((log.reps || 0) > bucket.bestReps) bucket.bestReps = log.reps;
    }
  }

  // Build curves for top 8 exercises (by total data points)
  const ranked = [...exerciseWeeklyData.entries()]
    .map(([name, weekMap]) => ({
      exerciseName: name,
      dataPoints: [...weekMap.values()].reduce((a, b) => a + b.totalSets, 0),
      weekMap,
    }))
    .sort((a, b) => b.dataPoints - a.dataPoints)
    .slice(0, 8);

  return ranked.map(({ exerciseName, weekMap }) => {
    const weeks = [...weekMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([weekNum, data]) => ({
        week: weekNum + 1,
        bestWeight: data.bestWeight,
        bestReps: data.bestReps,
        totalVolume: round2(data.totalVolume),
        sets: data.totalSets,
      }));

    // Calculate progression slope (first week vs last week best weight)
    const firstWeight = weeks[0]?.bestWeight || 0;
    const lastWeight = weeks[weeks.length - 1]?.bestWeight || 0;
    const progressionPct = firstWeight > 0
      ? round2(((lastWeight - firstWeight) / firstWeight) * 100)
      : 0;

    return {
      exerciseName,
      weeks,
      progressionPct,
      trend: progressionPct > 5 ? 'progressing' : progressionPct < -5 ? 'regressing' : 'plateau',
    };
  });
}

// ─── NEW: Training frequency patterns ────────────────────────────
/**
 * Analyze day-of-week distribution, time-of-day patterns,
 * and rest day behavior from workout sessions.
 * All PII-free — only statistical patterns.
 *
 * @param {Array} sortedSessions — Sessions sorted oldest→newest
 * @param {Date} referenceDate — "now"
 * @returns {Object} Frequency patterns
 */
function buildFrequencyPatterns(sortedSessions, referenceDate) {
  if (!sortedSessions || sortedSessions.length < 2) {
    return { dayDistribution: {}, preferredDays: [], avgRestDaysBetween: 0, consistencyScore: 0 };
  }

  // Day-of-week distribution (0=Sunday ... 6=Saturday)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayCounts = new Array(7).fill(0);
  const restGaps = [];

  let prevDate = null;
  for (const session of sortedSessions) {
    const d = new Date(session.date);
    dayCounts[d.getDay()]++;

    if (prevDate) {
      const gap = Math.round((d - prevDate) / (1000 * 60 * 60 * 24));
      if (gap > 0) restGaps.push(gap);
    }
    prevDate = d;
  }

  // Preferred training days (any day with >= 20% of max)
  const maxCount = Math.max(...dayCounts);
  const dayDistribution = {};
  const preferredDays = [];
  for (let i = 0; i < 7; i++) {
    const pct = round2((dayCounts[i] / sortedSessions.length) * 100);
    dayDistribution[dayNames[i]] = pct;
    if (dayCounts[i] >= maxCount * 0.5 && dayCounts[i] > 0) {
      preferredDays.push(dayNames[i]);
    }
  }

  // Average rest days between sessions
  const avgRestDays = restGaps.length > 0
    ? round2(restGaps.reduce((a, b) => a + b, 0) / restGaps.length)
    : 0;

  // Consistency score: how evenly distributed are sessions across weeks
  // Higher = more consistent (1.0 = perfect)
  const weeks = new Map();
  for (const session of sortedSessions) {
    const d = new Date(session.date);
    const weekKey = `${d.getFullYear()}-W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}`;
    weeks.set(weekKey, (weeks.get(weekKey) || 0) + 1);
  }
  const weekCounts = [...weeks.values()];
  const avgPerWeek = weekCounts.reduce((a, b) => a + b, 0) / weekCounts.length;
  const variance = weekCounts.reduce((a, c) => a + Math.pow(c - avgPerWeek, 2), 0) / weekCounts.length;
  const consistencyScore = avgPerWeek > 0 ? round2(Math.max(0, 1 - (Math.sqrt(variance) / avgPerWeek))) : 0;

  // Session duration patterns
  const durations = sortedSessions.map(s => s.duration || 0).filter(d => d > 0);
  const avgDuration = durations.length > 0
    ? round2(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  return {
    dayDistribution,
    preferredDays,
    avgRestDaysBetween: avgRestDays,
    consistencyScore,
    avgSessionDurationMin: avgDuration,
    totalWeeksTracked: weekCounts.length,
  };
}

// ─── NEW: Session-level details ──────────────────────────────────
/**
 * Build session-level recovery and fatigue metrics.
 * Shows per-session volume/intensity to detect overtraining or plateaus.
 * All PII-free — no session IDs or timestamps, only relative week numbers.
 *
 * @param {Array} sortedSessions — Sessions sorted oldest→newest
 * @returns {Object} Session-level metrics
 */
function buildSessionDetails(sortedSessions) {
  if (!sortedSessions || sortedSessions.length < 2) {
    return { weeklyVolumeTrend: [], recoveryPattern: 'insufficient_data', fatigueIndicator: 'none' };
  }

  const firstDate = new Date(sortedSessions[0].date);

  // Weekly volume aggregation
  const weeklyVolume = new Map();
  for (const session of sortedSessions) {
    const weekNum = Math.floor((new Date(session.date) - firstDate) / (1000 * 60 * 60 * 24 * 7));
    if (!weeklyVolume.has(weekNum)) {
      weeklyVolume.set(weekNum, { totalVolume: 0, sessions: 0, totalIntensity: 0, totalDuration: 0 });
    }
    const w = weeklyVolume.get(weekNum);
    w.totalVolume += session.totalWeight || 0;
    w.sessions++;
    w.totalIntensity += session.intensity || 0;
    w.totalDuration += session.duration || 0;
  }

  const weeklyVolumeTrend = [...weeklyVolume.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekNum, data]) => ({
      week: weekNum + 1,
      totalVolume: round2(data.totalVolume),
      sessions: data.sessions,
      avgIntensity: data.sessions > 0 ? round2(data.totalIntensity / data.sessions) : 0,
      totalDurationMin: round2(data.totalDuration),
    }));

  // Recovery pattern analysis (gap between sessions)
  const gaps = [];
  for (let i = 1; i < sortedSessions.length; i++) {
    const gap = (new Date(sortedSessions[i].date) - new Date(sortedSessions[i - 1].date)) / (1000 * 60 * 60 * 24);
    gaps.push(gap);
  }
  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  let recoveryPattern = 'insufficient_data';
  if (gaps.length >= 3) {
    if (avgGap >= 1.5 && avgGap <= 3) recoveryPattern = 'optimal';
    else if (avgGap < 1.5) recoveryPattern = 'under_recovered';
    else if (avgGap <= 5) recoveryPattern = 'moderate';
    else recoveryPattern = 'infrequent';
  }

  // Fatigue indicator: last 2 weeks vs prior 2 weeks
  const recentWeeks = weeklyVolumeTrend.slice(-2);
  const priorWeeks = weeklyVolumeTrend.slice(-4, -2);
  let fatigueIndicator = 'none';
  if (recentWeeks.length >= 1 && priorWeeks.length >= 1) {
    const recentAvgIntensity = recentWeeks.reduce((a, w) => a + w.avgIntensity, 0) / recentWeeks.length;
    const priorAvgIntensity = priorWeeks.reduce((a, w) => a + w.avgIntensity, 0) / priorWeeks.length;
    const recentVolume = recentWeeks.reduce((a, w) => a + w.totalVolume, 0) / recentWeeks.length;
    const priorVolume = priorWeeks.reduce((a, w) => a + w.totalVolume, 0) / priorWeeks.length;

    if (recentAvgIntensity > priorAvgIntensity * 1.15 && recentVolume < priorVolume * 0.85) {
      fatigueIndicator = 'possible_overreaching';
    } else if (recentVolume > priorVolume * 1.2) {
      fatigueIndicator = 'progressive_overload';
    } else if (recentVolume < priorVolume * 0.7) {
      fatigueIndicator = 'deload_detected';
    }
  }

  return {
    weeklyVolumeTrend,
    recoveryPattern,
    fatigueIndicator,
    avgRecoveryDays: round2(avgGap),
  };
}
