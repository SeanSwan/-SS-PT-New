/**
 * ============================================================================
 * FILE: workoutLogService.mjs
 * PURPOSE: Shared workout-write logic for HTTP route and AI command lane
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-10
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Pure service function called by:
 *     - adminWorkoutLoggerController.mjs (existing HTTP route)
 *     - commandDispatcher.mjs (AI command lane — log_workout)
 *
 * SUPPORTS BOTH EXERCISE PAYLOAD SHAPES:
 *   Nested (HTTP route):
 *     { name|exerciseName, sets: [{ setNumber, reps, weight, tempo?, rest?, rpe?, notes? }] }
 *   Flat (AI command):
 *     { name, sets: N, reps, weight, tempo?, restSeconds?, rpe?, notes? }
 *   Detection: Array.isArray(exercise.sets) → nested. Otherwise → flat.
 *
 * GUARANTEES:
 *   - Duplicate-date guard (same client, same day → DUPLICATE_DATE error)
 *   - Transaction-safe session + log writes
 *   - Best-effort XP award (failure logs, never fails the workout write)
 *   - Best-effort social auto-post (failure logs, never fails the workout write)
 *
 * ERRORS:
 *   Throws WorkoutLogError with .code:
 *     'VALIDATION_ERROR' → 400 (invalid input)
 *     'DUPLICATE_DATE'   → 409 (session already exists on this date)
 *   All other throws are unexpected — callers should return 500.
 * ============================================================================
 */

import { Op } from 'sequelize';
import logger from '../../utils/logger.mjs';
import { getAllModels } from '../../models/index.mjs';
import { awardWorkoutXP } from '../awardWorkoutXP.mjs';

// ── Typed error for callers to map to HTTP status codes ─────────────────────

export class WorkoutLogError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'WorkoutLogError';
    this.code = code; // 'VALIDATION_ERROR' | 'DUPLICATE_DATE'
  }
}

// ── Phase 13.1 (2026-04-15): local-calendar date parsing ───────────────────
//
// Clients (admin, trainer, and the Coach Assistant transcript intake lane)
// send date-only strings in the form `YYYY-MM-DD`, meaning "the user's
// intended calendar day". The old implementation used `new Date(dateStr)`,
// which parses a bare YYYY-MM-DD as UTC midnight. On a UTC-hosted server
// (Render), that gets stored as 2026-04-15T00:00:00Z for a user who picked
// "2026-04-15" — but when the same user in PDT refetches, the display
// renders as 2026-04-14 (5 PM the prior day local). The duplicate-date
// guard then bounds its WHERE clause by server-local calendar day, which
// splits the difference inconsistently.
//
// Fix: when we receive a date-only string, anchor it to server-local NOON
// of that calendar day. Noon is robust against ±12h timezone drift — the
// stored instant always falls within the same calendar day on both the
// server and any realistic client timezone. Full ISO timestamps (which
// carry their own TZ anchor) keep their prior behavior untouched.
export function parseWorkoutLogDate(input) {
  if (input instanceof Date) {
    return input;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]);
      const day = Number(dateOnly[3]);
      // Construct from local components → server-local midnight.
      // Add 12 hours so the instant lives at server-local noon, giving
      // >=12h safety against timezone differences when the same instant
      // is later bucketed by calendar day on the client.
      const dt = new Date(year, month - 1, day, 12, 0, 0, 0);
      // Guard against calendar overflow (Feb 30 etc).
      if (
        dt.getFullYear() === year &&
        dt.getMonth() === month - 1 &&
        dt.getDate() === day
      ) {
        return dt;
      }
      return new Date(NaN);
    }
    return new Date(trimmed);
  }
  return new Date(NaN);
}

// ── Exercise normalization ───────────────────────────────────────────────────

/**
 * Normalize exercises (either shape) into flat WorkoutLog rows.
 * sessionId is injected after the session is created.
 *
 * Nested: { name|exerciseName, sets: [{ setNumber, reps, weight, ... }] }
 * Flat:   { name, sets: N, reps, weight, restSeconds?, ... }
 *
 * @param {Object[]} exercises
 * @param {string|number} sessionId
 * @returns {Object[]} logRows ready for WorkoutLog.bulkCreate
 */
function buildLogRows(exercises, sessionId) {
  const logRows = [];

  for (const exercise of exercises) {
    const exName = ((exercise.exerciseName ?? exercise.name) || '').trim();
    if (!exName) {
      throw new WorkoutLogError(
        'Each exercise must have a non-empty name or exerciseName',
        'VALIDATION_ERROR'
      );
    }

    // Phase 15.0 (2026-04-15): exercise-level coaching note.
    // Stamped on EVERY row of this exercise group so deleting any single
    // row preserves the note on the remaining rows. This replaces the
    // Phase 13.2 `Coach: ` encoding into set 1's notes string, which
    // silently lost data when set 1 was deleted in the edit flow.
    //
    // Accepts two input shapes for backward compat:
    //   - exercise.exerciseNote  (Phase 15 canonical — preferred)
    //   - exercise.performanceNotes  (Phase 13.2 parser output — legacy)
    // If both are present, exerciseNote wins.
    const rawExerciseNote =
      (typeof exercise.exerciseNote === 'string' && exercise.exerciseNote.trim()) ||
      (typeof exercise.performanceNotes === 'string' && exercise.performanceNotes.trim()) ||
      null;
    const circuitName = typeof exercise.circuitName === 'string' && exercise.circuitName.trim()
      ? exercise.circuitName.trim()
      : null;
    const circuitOrder = Number.isInteger(Number(exercise.circuitOrder)) && Number(exercise.circuitOrder) > 0
      ? Number(exercise.circuitOrder)
      : null;
    const exerciseRole = typeof exercise.exerciseRole === 'string' && exercise.exerciseRole.trim()
      ? exercise.exerciseRole.trim()
      : null;

    if (Array.isArray(exercise.sets)) {
      // ── Nested format (existing HTTP route) ────────────────────────────
      if (exercise.sets.length === 0) {
        throw new WorkoutLogError(
          `Exercise "${exName}" must have at least one set`,
          'VALIDATION_ERROR'
        );
      }
      for (const set of exercise.sets) {
        const setNumber = Number(set.setNumber);
        if (!Number.isInteger(setNumber) || setNumber < 1) {
          throw new WorkoutLogError(
            'Each set must have an integer setNumber >= 1',
            'VALIDATION_ERROR'
          );
        }
        const reps = Number(set.reps);
        if (set.reps != null && (!Number.isInteger(reps) || reps < 0)) {
          throw new WorkoutLogError(
            `Invalid reps value "${set.reps}" in set ${setNumber} — must be a non-negative integer`,
            'VALIDATION_ERROR'
          );
        }
        const weight = Number(set.weight);
        if (set.weight != null && !Number.isFinite(weight)) {
          throw new WorkoutLogError(
            `Invalid weight value "${set.weight}" in set ${setNumber}`,
            'VALIDATION_ERROR'
          );
        }
        logRows.push({
          sessionId,
          exerciseName: exName,
          circuitName,
          circuitOrder,
          exerciseRole,
          setNumber,
          reps: Number.isInteger(reps) ? reps : 0,
          weight: Number.isFinite(weight) ? weight : 0,
          tempo: set.tempo || null,
          rest: set.rest != null ? Number(set.rest) : null,
          rpe: set.rpe != null ? Number(set.rpe) : null,
          notes: set.notes || null,
          // Phase 15.0: stamp the exercise-level note on every row.
          exerciseNote: rawExerciseNote,
          setType: typeof set.setType === 'string' && set.setType.trim() ? set.setType.trim() : 'working',
          isometricHoldSeconds: set.isometricHoldSeconds != null
            ? Math.max(0, Number(set.isometricHoldSeconds) || 0)
            : null,
        });
      }
    } else {
      // ── Flat format (AI command lane) ──────────────────────────────────
      // sets is a count; expand to N identical rows with incrementing setNumber
      const setCount = Math.max(1, Number(exercise.sets) || 1);
      const reps = Math.max(0, Number(exercise.reps) || 0);
      const weight = Math.max(0, Number(exercise.weight) || 0);
      // restSeconds (AI field) maps to rest (DB column)
      const rest = exercise.restSeconds != null ? Number(exercise.restSeconds) : null;

      for (let i = 0; i < setCount; i++) {
        logRows.push({
          sessionId,
          exerciseName: exName,
          circuitName,
          circuitOrder,
          exerciseRole,
          setNumber: i + 1,
          reps,
          weight,
          tempo: exercise.tempo || null,
          rest,
          rpe: exercise.rpe != null ? Number(exercise.rpe) : null,
          notes: exercise.notes || null,
          // Phase 15.0: stamp the exercise-level note on every row.
          exerciseNote: rawExerciseNote,
          setType: typeof exercise.setType === 'string' && exercise.setType.trim() ? exercise.setType.trim() : 'working',
          isometricHoldSeconds: exercise.isometricHoldSeconds != null
            ? Math.max(0, Number(exercise.isometricHoldSeconds) || 0)
            : null,
        });
      }
    }
  }

  return logRows;
}

// ── Main service function ────────────────────────────────────────────────────

/**
 * Log a workout for a client.
 * Caller is responsible for RBAC and client-existence checks before calling.
 *
 * @param {Object} params
 * @param {number}   params.clientId     - Client user ID (pre-authorized)
 * @param {Object[]} params.exercises    - Exercise array (nested or flat)
 * @param {string}  [params.date]        - ISO date string; defaults to today
 * @param {string}  [params.notes]       - Session notes
 * @param {string}  [params.title]       - Session title; auto-generated if absent
 * @param {number}  [params.duration]    - Duration in minutes; defaults to 0
 * @param {number|null}  [params.intensity]   - Intensity 1–10. Null / undefined = not rated (Phase 16). Only validated when provided.
 * @param {number}   params.trainerId    - Trainer/admin user ID performing the write
 * @param {Object}   params.sequelize    - Sequelize instance
 *
 * @returns {Promise<{
 *   sessionId: string|number,
 *   userId: number,
 *   title: string,
 *   date: Date,
 *   duration: number,
 *   intensity: number,
 *   exerciseCount: number,
 *   totalSets: number,
 *   totalReps: number,
 *   totalWeight: number,
 *   xpAwarded: number|null,
 *   streakDays: number|null,
 *   xp: Object|null,
 * }>}
 *
 * @throws {WorkoutLogError} code='VALIDATION_ERROR' | 'DUPLICATE_DATE'
 */
export async function logWorkoutForClient({
  clientId,
  exercises,
  date,
  notes,
  title,
  duration,
  intensity,
  trainerId,
  sequelize,
  suppressEngagementSideEffects = false,
}) {
  // ── Input validation ─────────────────────────────────────────────────────

  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new WorkoutLogError('exercises must be a non-empty array', 'VALIDATION_ERROR');
  }

  // Phase 13.1: parseWorkoutLogDate handles `YYYY-MM-DD` as server-local
  // noon, preserving full ISO strings unchanged. See the helper above for
  // the PDT-after-5pm bug this replaces.
  const parsedDate = date ? parseWorkoutLogDate(date) : new Date();
  if (isNaN(parsedDate.getTime())) {
    throw new WorkoutLogError('date must be a valid ISO date string', 'VALIDATION_ERROR');
  }
  // Phase 13.1: future-date check uses end-of-today in server-local time.
  // A same-day workout logged at local 11pm by a user picking today's
  // calendar date must not trip this guard. The prior `parsedDate > new Date()`
  // comparison was instant-vs-instant and would reject local-noon 2026-04-15
  // if called at 2026-04-15 08:00 local on the server.
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (parsedDate > endOfToday) {
    throw new WorkoutLogError('date cannot be in the future', 'VALIDATION_ERROR');
  }

  const parsedDuration = Number(duration ?? 0);
  if (!Number.isInteger(parsedDuration) || parsedDuration < 0) {
    throw new WorkoutLogError('duration must be a non-negative integer', 'VALIDATION_ERROR');
  }

  // Phase 16 (2026-04-16): null/undefined intensity = "not rated", persisted
  // as null. Validate the 1-10 range only when the caller actually supplied
  // a value. Previously this path substituted `?? 5`, seeding phantom 5/10
  // rows into the canonical intensity chart for every session where the
  // user hadn't touched the rating slider. Accepts both `undefined` (key
  // omitted from frontend payload — the wire contract) and explicit `null`
  // (defensive, mirrors set.rpe handling above).
  let parsedIntensity = null;
  if (intensity !== undefined && intensity !== null) {
    parsedIntensity = Number(intensity);
    if (!Number.isFinite(parsedIntensity) || parsedIntensity < 1 || parsedIntensity > 10) {
      throw new WorkoutLogError('intensity must be between 1 and 10', 'VALIDATION_ERROR');
    }
  }

  const resolvedTitle = (typeof title === 'string' && title.trim())
    ? title.trim()
    : `Session — ${parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const { WorkoutSession, WorkoutLog } = getAllModels();

  // ── DB write (single transaction) ────────────────────────────────────────

  const transaction = await sequelize.transaction();
  let committed = false;

  try {
    // Duplicate-date guard
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingSession = await WorkoutSession.findOne({
      where: { userId: clientId, date: { [Op.between]: [startOfDay, endOfDay] } },
      transaction,
    });
    if (existingSession) {
      await transaction.rollback();
      throw new WorkoutLogError(
        'A workout session already exists for this client on this date',
        'DUPLICATE_DATE'
      );
    }

    // Create session
    const session = await WorkoutSession.create({
      userId: clientId,
      date: parsedDate,
      trainerId: trainerId ?? null,
      sessionType: 'trainer-led',
      status: 'completed',
      completedAt: parsedDate,
      duration: parsedDuration,
      notes: notes || null,
      title: resolvedTitle,
      intensity: parsedIntensity,
    }, { transaction });

    // Build and bulk-insert log rows
    const logRows = buildLogRows(exercises, session.id);
    await WorkoutLog.bulkCreate(logRows, { transaction, validate: true });

    // Compute and persist aggregates
    const totalSets = logRows.length;
    const totalReps = logRows.reduce((sum, r) => sum + (r.reps || 0), 0);
    const totalWeight = logRows.reduce((sum, r) => sum + (r.reps || 0) * (r.weight || 0), 0);
    const exerciseCount = exercises.length;

    await session.update({ totalSets, totalReps, totalWeight }, { transaction });
    await transaction.commit();
    committed = true;

    logger.info(`[WorkoutLogService] Logged for client ${clientId}: session ${session.id} (${exerciseCount} exercises, ${totalSets} sets)`);

    // ── Best-effort XP (separate transaction) ───────────────────────────

    let xpResult = null;
    let xpTx = null;
    if (suppressEngagementSideEffects) {
      logger.info(`[WorkoutLogService] Engagement side effects skipped for historical import session ${session.id}`);
    } else {
      try {
        xpTx = await sequelize.transaction();
        xpResult = await awardWorkoutXP({
          userId: clientId,
          workoutId: session.id,
          duration: parsedDuration,
          exercisesCompleted: exerciseCount,
          workoutDate: parsedDate,
          awardedBy: trainerId,
        }, xpTx);

        if (xpResult && !xpResult.sameDay && !xpResult.alreadyAwarded) {
          const { WorkoutSession: WS } = getAllModels();
          await WS.update(
            { experiencePoints: xpResult.pointsAwarded },
            { where: { id: session.id }, transaction: xpTx }
          );
        }
        await xpTx.commit();

        // Best-effort social auto-post
        if (xpResult && !xpResult.sameDay && !xpResult.alreadyAwarded) {
          try {
            const { createWorkoutAutoPost, createStreakAutoPost } = await import('../socialAutoPost.mjs');
            await createWorkoutAutoPost(clientId, {
              duration: parsedDuration,
              exercisesCompleted: exerciseCount,
              pointsAwarded: xpResult.pointsAwarded,
            });
            if (xpResult.streakDays && [7, 14, 30, 60, 90, 180, 365].includes(xpResult.streakDays)) {
              await createStreakAutoPost(clientId, xpResult.streakDays);
            }
          } catch (autoPostErr) {
            logger.warn(`[WorkoutLogService] Auto-post failed for session ${session.id}: ${autoPostErr.message}`);
          }
        }
      } catch (xpErr) {
        try { await xpTx?.rollback(); } catch (_) { /* already rolled back */ }
        logger.warn(`[WorkoutLogService] XP award failed for session ${session.id}: ${xpErr.message}`);
        xpResult = null;
      }
    }

    // Collapse sameDay / alreadyAwarded → null for both callers
    const xpResponse = (xpResult && !xpResult.sameDay && !xpResult.alreadyAwarded)
      ? {
          pointsAwarded: xpResult.pointsAwarded,
          newBalance: xpResult.newBalance,
          streakDays: xpResult.streakDays,
          milestones: (xpResult.awardedMilestones || []).map(m => m.name),
        }
      : null;

    return {
      sessionId: session.id,
      userId: clientId,
      title: resolvedTitle,
      date: session.completedAt,
      duration: parsedDuration,
      intensity: parsedIntensity,
      exerciseCount,
      totalSets,
      totalReps,
      totalWeight,
      xpAwarded: xpResponse?.pointsAwarded ?? null,
      streakDays: xpResponse?.streakDays ?? null,
      xp: xpResponse,
    };
  } catch (err) {
    if (!committed) {
      try { await transaction.rollback(); } catch (_) { /* already rolled back */ }
    }
    throw err;
  }
}
