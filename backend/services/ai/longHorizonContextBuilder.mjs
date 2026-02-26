/**
 * Long-Horizon Context Builder — Phase 5C-B
 * ==========================================
 * Builds de-identified, trend-aware client context for 3/6/12 month
 * NASM-aligned training program generation.
 *
 * Called AFTER auth, RBAC, assignment, and consent checks.
 * All returned data is de-identified — no PII fields in output.
 *
 * Architecture:
 *   buildLongHorizonContext()          — async orchestrator (queries DB)
 *   computeProgressionTrends()        — pure (per-exercise trend analysis)
 *   computeAdherence()                — pure (scheduled vs completed)
 *   computeFatigueTrends()            — pure (RPE over 4w/8w windows)
 *   extractInjuryRestrictions()       — pure (OHSA compensations + corrective)
 *   extractGoalProgress()             — pure (active goals + milestones)
 *   computeBodyCompositionTrend()     — pure (body measurement direction)
 *
 * Phase 5C — Long-Horizon Planning Engine
 */
import { Op } from 'sequelize';
import { buildProgressContext } from './progressContextBuilder.mjs';
import logger from '../../utils/logger.mjs';

// ── Horizon → window mapping ────────────────────────────────────────

const HORIZON_WINDOW = {
  3:  { weeks: 4,  label: '4w'  },
  6:  { weeks: 8,  label: '8w'  },
  12: { weeks: 12, label: '12w' },
};

// ── Main orchestrator ───────────────────────────────────────────────

/**
 * Build long-horizon context for AI planning generation.
 *
 * @param {number} userId - Target client user ID
 * @param {3|6|12} horizonMonths - Plan duration
 * @param {Object} models - Sequelize models object from getAllModels()
 * @returns {Promise<LongHorizonContext>}
 */
export async function buildLongHorizonContext(userId, horizonMonths, models) {
  const window = HORIZON_WINDOW[horizonMonths] || HORIZON_WINDOW[12];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - window.weeks * 7);

  // Parallel data fetches — each is null-safe on failure
  const [sessions, baseline, goals, bodyMeasurements] = await Promise.all([
    fetchWorkoutSessions(userId, cutoffDate, models),
    fetchLatestBaseline(userId, models),
    fetchActiveGoals(userId, models),
    fetchBodyMeasurements(userId, cutoffDate, models),
  ]);

  // Extract per-set logs from sessions
  const workoutLogs = extractWorkoutLogs(sessions);

  // Normalize session log alias for buildProgressContext compatibility.
  // Our Sequelize include uses `as: 'logs'`, but buildProgressContext
  // reads `session.workoutLogs` (progressContextBuilder.mjs:164).
  const normalizedSessions = sessions.map(s => {
    if (s.logs && !s.workoutLogs) {
      const plain = s.get ? s.get({ plain: true }) : { ...s };
      plain.workoutLogs = plain.logs;
      return plain;
    }
    return s;
  });
  const progressSummary = buildProgressContext(normalizedSessions);

  // Compute long-horizon specific data
  const progressionTrends = computeProgressionTrends(workoutLogs, window);
  const adherence = computeAdherence(sessions, window.weeks);
  const fatigueTrends = computeFatigueTrends(sessions);
  const injuryRestrictions = extractInjuryRestrictions(baseline);
  const goalProgress = extractGoalProgress(goals);
  const bodyComposition = computeBodyCompositionTrend(bodyMeasurements);

  return {
    progressSummary,
    progressionTrends,
    adherence,
    fatigueTrends,
    injuryRestrictions,
    goalProgress,
    bodyComposition,
  };
}

// ── Data fetch helpers (null-safe) ──────────────────────────────────

async function fetchWorkoutSessions(userId, cutoffDate, models) {
  try {
    const { WorkoutSession, WorkoutLog } = models;
    if (!WorkoutSession) return [];

    const include = WorkoutLog
      ? [{ model: WorkoutLog, as: 'logs', required: false }]
      : [];

    return await WorkoutSession.findAll({
      where: {
        userId,
        status: 'completed',
        date: { [Op.gte]: cutoffDate },
      },
      include,
      order: [['date', 'DESC']],
    });
  } catch (err) {
    logger.warn('5C-B: Failed to fetch workout sessions:', err.message);
    return [];
  }
}

async function fetchLatestBaseline(userId, models) {
  try {
    const { ClientBaselineMeasurements } = models;
    if (!ClientBaselineMeasurements) return null;

    return await ClientBaselineMeasurements.findOne({
      where: { userId },
      order: [['takenAt', 'DESC']],
    });
  } catch (err) {
    logger.warn('5C-B: Failed to fetch baseline:', err.message);
    return null;
  }
}

async function fetchActiveGoals(userId, models) {
  try {
    const { Goal } = models;
    if (!Goal) return [];

    return await Goal.findAll({
      where: { userId, status: 'active' },
      order: [['priority', 'DESC'], ['deadline', 'ASC']],
    });
  } catch (err) {
    logger.warn('5C-B: Failed to fetch goals:', err.message);
    return [];
  }
}

async function fetchBodyMeasurements(userId, cutoffDate, models) {
  try {
    const { BodyMeasurement } = models;
    if (!BodyMeasurement) {
      // BodyMeasurement uses factory pattern and is not yet registered
      // in the model registry (pre-existing gap). Returns null gracefully.
      return [];
    }

    return await BodyMeasurement.findAll({
      where: {
        userId,
        measurementDate: { [Op.gte]: cutoffDate },
      },
      order: [['measurementDate', 'ASC']],
    });
  } catch (err) {
    logger.warn('5C-B: Failed to fetch body measurements:', err.message);
    return [];
  }
}

// ── Extract logs from sessions ──────────────────────────────────────

function extractWorkoutLogs(sessions) {
  const logs = [];
  for (const session of sessions) {
    // Handle both association alias ('logs') and raw field ('workoutLogs')
    const sessionLogs = session.logs || session.workoutLogs || [];
    for (const log of sessionLogs) {
      logs.push({
        exerciseName: log.exerciseName,
        weight: log.weight || 0,
        reps: log.reps || 0,
        rpe: log.rpe ?? null,
        date: session.date,
      });
    }
  }
  return logs;
}

// ── Pure computation helpers (exported for unit testing) ────────────

/**
 * Compute per-exercise load/volume/rep trends over a time window.
 * Uses same 10% threshold as progressContextBuilder.
 *
 * @param {Array} workoutLogs - [{exerciseName, weight, reps, date}]
 * @param {{ weeks: number, label: string }} window
 * @returns {{ period: string, metrics: Array }}
 */
export function computeProgressionTrends(workoutLogs, window) {
  if (!workoutLogs || workoutLogs.length === 0) {
    return { period: window.label, metrics: [] };
  }

  // Group by exercise
  const byExercise = {};
  for (const log of workoutLogs) {
    const name = log.exerciseName;
    if (!name) continue;
    if (!byExercise[name]) byExercise[name] = [];
    byExercise[name].push(log);
  }

  const metrics = [];
  for (const [exercise, logs] of Object.entries(byExercise)) {
    if (logs.length < 2) {
      metrics.push({
        exercise,
        volumeTrend: 'insufficient_data',
        loadTrend: 'insufficient_data',
        repTrend: 'insufficient_data',
        dataPoints: logs.length,
      });
      continue;
    }

    // Sort ascending for first-half / second-half comparison
    logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const mid = Math.floor(logs.length / 2);
    const first = logs.slice(0, mid);
    const second = logs.slice(mid);

    metrics.push({
      exercise,
      volumeTrend: detectTrend(
        first.map(l => l.weight * l.reps),
        second.map(l => l.weight * l.reps)
      ),
      loadTrend: detectTrend(
        first.map(l => l.weight),
        second.map(l => l.weight)
      ),
      repTrend: detectTrend(
        first.map(l => l.reps),
        second.map(l => l.reps)
      ),
      dataPoints: logs.length,
    });
  }

  // Sort by data points descending, keep top 15
  metrics.sort((a, b) => b.dataPoints - a.dataPoints);
  return { period: window.label, metrics: metrics.slice(0, 15) };
}

/**
 * Compute adherence metrics over a time window.
 *
 * @param {Array} sessions - Completed WorkoutSession rows
 * @param {number} windowWeeks - Time window in weeks
 * @param {Date} [referenceDate] - "now" for recency calculations
 * @returns {{ scheduledSessions, completedSessions, adherenceRate, consistencyFlags }}
 */
export function computeAdherence(sessions, windowWeeks, referenceDate = new Date()) {
  const completedSessions = sessions ? sessions.length : 0;

  if (completedSessions === 0) {
    return {
      scheduledSessions: 0,
      completedSessions: 0,
      adherenceRate: 0,
      consistencyFlags: ['no_workout_data'],
    };
  }

  // Target: 3 sessions/week (standard personal training frequency)
  const targetPerWeek = 3;
  const scheduledSessions = windowWeeks * targetPerWeek;
  const adherenceRate = Math.min(
    Math.round((completedSessions / scheduledSessions) * 100) / 100,
    1
  );

  // Detect consistency gaps
  const consistencyFlags = [];
  const sortedDates = sessions
    .map(s => new Date(s.date || s.createdAt))
    .sort((a, b) => a - b);

  // Find largest gap between consecutive sessions
  let maxGapDays = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    const gap = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    if (gap > maxGapDays) maxGapDays = gap;
  }

  // Days since last workout
  const daysSinceLast =
    (referenceDate - sortedDates[sortedDates.length - 1]) / (1000 * 60 * 60 * 24);

  if (maxGapDays > 21) consistencyFlags.push('missed_3_consecutive_weeks');
  else if (maxGapDays > 14) consistencyFlags.push('missed_2_consecutive_weeks');

  if (daysSinceLast > 14) consistencyFlags.push('inactive_14_plus_days');
  else if (daysSinceLast > 7) consistencyFlags.push('inactive_7_plus_days');

  if (adherenceRate < 0.5) consistencyFlags.push('low_adherence');

  if (consistencyFlags.length === 0) consistencyFlags.push('consistent');

  return { scheduledSessions, completedSessions, adherenceRate, consistencyFlags };
}

/**
 * Compute RPE/fatigue trends over 4-week and 8-week windows.
 *
 * @param {Array} sessions - WorkoutSession rows with avgRPE or intensity
 * @returns {{ avgRpe4w, avgRpe8w, trend }}
 */
export function computeFatigueTrends(sessions) {
  if (!sessions || sessions.length === 0) {
    return { avgRpe4w: null, avgRpe8w: null, trend: 'insufficient_data' };
  }

  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const eightWeeksAgo = new Date(now);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const rpe4w = [];
  const rpe8w = [];

  for (const session of sessions) {
    const date = new Date(session.date || session.createdAt);
    const rpe = session.avgRPE ?? session.intensity;
    if (rpe == null) continue;

    if (date >= fourWeeksAgo) rpe4w.push(rpe);
    if (date >= eightWeeksAgo) rpe8w.push(rpe);
  }

  const avgRpe4w = rpe4w.length > 0 ? round1(avg(rpe4w)) : null;
  const avgRpe8w = rpe8w.length > 0 ? round1(avg(rpe8w)) : null;

  let trend = 'insufficient_data';
  if (avgRpe4w !== null && avgRpe8w !== null) {
    const diff = avgRpe4w - avgRpe8w;
    if (diff > 0.5) trend = 'increasing';
    else if (diff < -0.5) trend = 'decreasing';
    else trend = 'stable';
  }

  return { avgRpe4w, avgRpe8w, trend };
}

/**
 * Extract injury/restriction data from ClientBaselineMeasurements.
 * Returns only movement compensations and clinical notes — no PII.
 *
 * @param {Object|null} baseline - ClientBaselineMeasurements record
 * @returns {{ active: Array, resolved: Array }}
 */
export function extractInjuryRestrictions(baseline) {
  if (!baseline) {
    return { active: [], resolved: [] };
  }

  const active = [];

  // Extract OHSA compensations as movement restrictions
  const ohsa = baseline.overheadSquatAssessment;
  if (ohsa && typeof ohsa === 'object') {
    for (const view of ['anteriorView', 'lateralView']) {
      const data = ohsa[view];
      if (!data || typeof data !== 'object') continue;

      for (const [area, severity] of Object.entries(data)) {
        if (severity && severity !== 'none') {
          active.push({
            area: camelToReadable(area),
            type: `${severity} compensation`,
            since: baseline.takenAt
              ? new Date(baseline.takenAt).toISOString().split('T')[0]
              : null,
          });
        }
      }
    }
  }

  // Extract corrective strategy compensations (dedup against OHSA)
  const strategy = baseline.correctiveExerciseStrategy;
  if (strategy?.compensationsIdentified && Array.isArray(strategy.compensationsIdentified)) {
    const existingAreas = new Set(active.map(a => a.area));
    for (const comp of strategy.compensationsIdentified) {
      if (typeof comp === 'string') {
        const readable = comp.toLowerCase();
        if (!existingAreas.has(readable)) {
          active.push({
            area: readable,
            type: 'compensation',
            since: baseline.takenAt
              ? new Date(baseline.takenAt).toISOString().split('T')[0]
              : null,
          });
          existingAreas.add(readable);
        }
      }
    }
  }

  // Note: no dedicated injury model exists — resolved list stays empty
  return { active, resolved: [] };
}

/**
 * Extract goal progress from active Goal records.
 * Uses category (ENUM, PII-safe) rather than user-authored title/label
 * text which could contain names or identifying information.
 *
 * @param {Array} goals - Goal rows sorted by priority
 * @returns {{ primaryGoal, milestones }}
 */
export function extractGoalProgress(goals) {
  if (!goals || goals.length === 0) {
    return { primaryGoal: null, milestones: [] };
  }

  // Use category ENUM (PII-safe) as primary goal, not user-authored title
  const primary = goals[0];
  const milestones = [];

  for (const goal of goals) {
    const goalMilestones = goal.milestones;
    if (Array.isArray(goalMilestones)) {
      for (const m of goalMilestones) {
        milestones.push({
          // Use percentage-based label only — never user-authored text
          label: `${goal.category || 'goal'} milestone at ${m.percentage || 0}%`,
          achieved: !!m.achieved,
          achievedOn: m.achievedAt
            ? new Date(m.achievedAt).toISOString().split('T')[0]
            : null,
        });
      }
    }
  }

  return {
    primaryGoal: primary.category || null,
    milestones,
  };
}

/**
 * Compute body composition trend from BodyMeasurement records.
 * For body fat: decreasing = improving. For weight: context-dependent.
 *
 * @param {Array} measurements - BodyMeasurement rows sorted by date ASC
 * @returns {{ available, trend, dataPoints } | null}
 */
export function computeBodyCompositionTrend(measurements) {
  if (!measurements || measurements.length === 0) {
    return null;
  }

  // Extract body fat or weight values
  const values = measurements
    .map(m => m.bodyFatPercentage ?? m.weight)
    .filter(v => v != null);

  if (values.length < 2) {
    return { available: true, trend: 'insufficient_data', dataPoints: values.length };
  }

  const mid = Math.floor(values.length / 2);
  const firstAvg = avg(values.slice(0, mid));
  const secondAvg = avg(values.slice(mid));

  let trend = 'stable';
  if (firstAvg === 0) {
    trend = 'insufficient_data';
  } else {
    const pctChange = ((secondAvg - firstAvg) / firstAvg) * 100;
    // For body fat/weight, decreasing is typically "improving"
    if (pctChange < -3) trend = 'improving';
    else if (pctChange > 3) trend = 'regressing';
    else trend = 'stable';
  }

  return { available: true, trend, dataPoints: values.length };
}

// ── Internal helpers ────────────────────────────────────────────────

/**
 * Detect trend direction from two halves of numeric data.
 * 10% threshold matches progressContextBuilder convention.
 */
function detectTrend(firstValues, secondValues) {
  const avgFirst = avg(firstValues);
  const avgSecond = avg(secondValues);
  if (avgFirst === 0 && avgSecond === 0) return 'stable';
  if (avgFirst === 0) return 'increasing';
  const pctChange = ((avgSecond - avgFirst) / avgFirst) * 100;
  if (pctChange > 10) return 'increasing';
  if (pctChange < -10) return 'decreasing';
  return 'stable';
}

function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + (v || 0), 0) / arr.length;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Convert camelCase to readable lowercase (e.g., 'kneeValgus' → 'knee valgus') */
function camelToReadable(str) {
  return str.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
}

export default buildLongHorizonContext;
