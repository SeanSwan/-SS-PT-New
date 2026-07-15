/**
 * Workout Last-Weight Service — smart weight suggestions for the logger
 * =====================================================================
 * PURPOSE: A plan loaded into the Workout Logger arrives with weight=0; this
 * read model answers "what did this client lift LAST time for these
 * exercises" so set rows can suggest a starting weight (placeholder +
 * tap-to-fill chip — NEVER auto-committed, blueprint 06-bans §9).
 *
 * DATA TRUTH: most recent `workout_logs` row (weight > 0) joined via
 * `workout_sessions.userId`, newest session date wins; within a session the
 * later log row wins. Names are normalized with the same helper the
 * familiarity service uses (free-text exercise names).
 *
 * BOUNDING: sessions LIMIT 300 → logs by sessionId LIMIT 5000 (mirrors
 * exerciseFamiliarityService.mjs). Requested names capped at 50.
 * FAIL-SOFT CONTRACT: empty `weights:{}` is a SUCCESS (new client, no
 * history, or query failure) — this endpoint never turns a suggestion lookup
 * into a 500 for the logger.
 */
import logger from '../utils/logger.mjs';
import { normalizeExerciseName } from './exerciseFamiliarityService.mjs';

const HISTORY_SESSION_LIMIT = 300;
const HISTORY_LOG_LIMIT = 5000;
export const MAX_REQUESTED_NAMES = 50;

const toIsoDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

/**
 * @param {number} clientId
 * @param {string[]} names - free-text exercise names from the loaded plan
 * @returns {Promise<{ weights: Record<string, { weight: number, reps: number|null, at: string|null }> }>}
 *   keys are lowercase-normalized names; only names with a logged weight > 0 appear.
 */
export async function getLastLoggedWeights(clientId, names) {
  const requested = new Set(
    (Array.isArray(names) ? names : [])
      .slice(0, MAX_REQUESTED_NAMES)
      .map(normalizeExerciseName)
      .filter(Boolean),
  );
  if (!requested.size) return { weights: {} };

  try {
    // Dynamic import mirrors exerciseFamiliarityService — harnesses that mock
    // models/index.mjs without workout models stay green (fail-soft).
    const models = await import('../models/index.mjs');
    const WorkoutSession = models.getWorkoutSession();
    const WorkoutLog = models.getWorkoutLog();
    if (!WorkoutSession?.findAll || !WorkoutLog?.findAll) {
      throw new Error('workout history models unavailable');
    }

    const sessions = await WorkoutSession.findAll({
      where: { userId: clientId },
      attributes: ['id', 'date'],
      order: [['date', 'DESC']],
      limit: HISTORY_SESSION_LIMIT,
      raw: true,
    });
    if (!sessions?.length) return { weights: {} };
    const sessionDateById = new Map(sessions.map((s) => [s.id, s.date]));

    const logs = await WorkoutLog.findAll({
      where: { sessionId: [...sessionDateById.keys()] },
      attributes: ['sessionId', 'exerciseName', 'weight', 'reps'],
      order: [['id', 'ASC']],
      limit: HISTORY_LOG_LIMIT,
      raw: true,
    });

    const weights = {};
    for (const log of logs || []) {
      const key = normalizeExerciseName(log?.exerciseName);
      if (!key || !requested.has(key)) continue;
      const weight = Number(log?.weight);
      if (!Number.isFinite(weight) || weight <= 0) continue;
      const at = sessionDateById.get(log.sessionId) ?? null;
      const existing = weights[key];
      // Newest session date wins; same date → later row (iteration order) wins.
      if (!existing || !existing.rawAt || (at && new Date(at) >= new Date(existing.rawAt))) {
        const reps = Number(log?.reps);
        weights[key] = {
          weight,
          reps: Number.isFinite(reps) && reps > 0 ? reps : null,
          at: toIsoDate(at),
          rawAt: at,
        };
      }
    }
    for (const entry of Object.values(weights)) delete entry.rawAt;
    return { weights };
  } catch (err) {
    logger.warn('[WorkoutLastWeight] history lookup failed — returning no suggestions', {
      clientId,
      error: err?.message,
    });
    return { weights: {} };
  }
}

export default { getLastLoggedWeights, MAX_REQUESTED_NAMES };
