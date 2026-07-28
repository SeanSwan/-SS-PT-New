/**
 * adminWorkoutLoggerController.mjs
 * =================================
 * Admin/Trainer endpoints for logging workouts and viewing workout history.
 *
 * Routes handled:
 *   POST /api/admin/clients/:clientId/workouts  (log a workout)
 *   GET  /api/admin/clients/:clientId/workouts  (get workout history)
 */

import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';
import { Op } from 'sequelize';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import {
  logWorkoutForClient,
  parseWorkoutLogDate,
  WorkoutLogError,
} from '../services/workout/workoutLogService.mjs';
import { isHistoricalWorkoutLogSource } from '../services/workout/workoutLogSourcePolicy.mjs';

const WORKOUT_LOG_CLIENT_ERROR_MESSAGES = {
  DUPLICATE_DATE: 'A workout session already exists for this client on this date.',
  VALIDATION_ERROR: 'Workout log data is invalid. Check the workout details and try again.',
};

const getWorkoutLogClientErrorMessage = (err = {}) => (
  WORKOUT_LOG_CLIENT_ERROR_MESSAGES[err.code]
  || 'Workout log data is invalid. Check the workout details and try again.'
);

/**
 * POST /api/admin/clients/:clientId/workouts
 *
 * Body: {
 *   title: string,
 *   date: string (ISO),
 *   duration: number (minutes),
 *   intensity: number (1-10),
 *   notes?: string,
 *   exercises: [{ name|exerciseName, sets: [{ setNumber, reps, weight, tempo?, rest?, rpe?, notes? }] }]
 * }
 */
export const logWorkout = async (req, res) => {
  try {
    // --- Access guard ---
    const access = await ensureClientAccess(req, req.params.clientId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const { clientId } = access;

    const { title, date, duration, intensity, notes, exercises, source, mergeRequestId } = req.body;

    // HTTP route requires title (service auto-generates it, but this contract is preserved)
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'title is required and must be non-empty' });
    }

    // Phase 3 Slice 3.8 (2026-05-04): if this apply originates from a
    // PLAUD merge, validate the mergeRequestId format before service
    // call. Only the source==='plaud_merge' branch hits this path.
    let isPlaudMergeApply = false;
    if (source === 'plaud_merge') {
      if (typeof mergeRequestId !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(mergeRequestId)) {
        return res.status(400).json({
          success: false,
          message: 'mergeRequestId is required and must be a UUID when source=plaud_merge',
        });
      }
      isPlaudMergeApply = true;
    }
    const isHistoricalImport = isHistoricalWorkoutLogSource(source);

    let serviceResult;
    try {
      serviceResult = await logWorkoutForClient({
        clientId,
        exercises,
        date,
        notes,
        title,
        duration,
        intensity,
        trainerId: req.user?.id ?? null,
        sequelize,
        suppressEngagementSideEffects: isHistoricalImport,
      });
    } catch (err) {
      if (err instanceof WorkoutLogError) {
        const status = err.code === 'DUPLICATE_DATE' ? 409 : 400;
        return res.status(status).json({
          success: false,
          message: getWorkoutLogClientErrorMessage(err),
        });
      }
      throw err;
    }

    // Phase 3 Slice 3.8: PLAUD merge approval — guarded UPDATE.
    // Codex Round 2 CRIT #4 + Round 4 HIGH atomic-finalization invariant:
    // mark the merge_request approved only when ownership + status +
    // already-approved invariants hold; rollback the workout form on
    // mismatch.
    if (isPlaudMergeApply) {
      const [approvalRows] = await sequelize.query(
        `UPDATE plaud_merge_requests
         SET status                   = 'approved',
             approved_workout_form_id = :formId,
             approved_at              = NOW(),
             payload_cipher           = NULL,
             payload_iv               = NULL,
             payload_tag              = NULL,
             cipher_purged_at         = NOW()
         WHERE merge_request_id = :mergeRequestId
           AND client_id        = :clientId
           AND status           = 'completed'
           AND ( :role = 'admin' OR user_id = :actingUserId )
           AND approved_workout_form_id IS NULL
         RETURNING id`,
        {
          replacements: {
            mergeRequestId,
            clientId: Number(clientId),
            actingUserId: Number(req.user?.id ?? 0),
            role: req.user?.role || 'trainer',
            formId: serviceResult.formId || serviceResult.sessionId, // sessionId fallback if service shape lacks formId
          },
        },
      );
      if (!approvalRows || approvalRows.length === 0) {
        // Approval invariant failed. Roll back the workout form.
        // logWorkoutForClient is its own transaction, so we delete the
        // freshly-created session + form rows here. If this best-effort
        // delete fails, surface 409 anyway — the failure to mark
        // approved is the bigger problem the trainer must see.
        try {
          await sequelize.query(
            `DELETE FROM workout_logs WHERE "sessionId" = :sessionId`,
            { replacements: { sessionId: serviceResult.sessionId } },
          );
          await sequelize.query(
            `DELETE FROM workout_sessions WHERE id = :sessionId`,
            { replacements: { sessionId: serviceResult.sessionId } },
          );
        } catch (cleanupErr) {
          logger.error('[plaudApply] failed to clean up workout session after approval invariant failure: %s', cleanupErr.message);
        }
        return res.status(409).json({
          success: false,
          message: 'MERGE_NOT_APPROVABLE: merge request not in approvable state (wrong owner / wrong client / already approved / not completed)',
          errorCode: 'MERGE_NOT_APPROVABLE',
        });
      }
      logger.info('[plaudApply] merge_request %s approved for client %d', mergeRequestId, clientId);
    }

    return res.status(201).json({
      success: true,
      workout: {
        id: serviceResult.sessionId,
        userId: serviceResult.userId,
        title: serviceResult.title,
        date: serviceResult.date,
        duration: serviceResult.duration,
        intensity: serviceResult.intensity,
        totalSets: serviceResult.totalSets,
        totalReps: serviceResult.totalReps,
        totalWeight: serviceResult.totalWeight,
        exerciseCount: serviceResult.exerciseCount,
        historicalImport: isHistoricalImport,
      },
      xp: serviceResult.xp,
      ...(isPlaudMergeApply ? { plaudMergeApproved: true } : {}),
    });
  } catch (error) {
    logger.error('Workout logging failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to log workout' });
  }
};

/**
 * GET /api/admin/clients/:clientId/workouts
 * Query: ?from=&to=&limit=20&offset=0
 */
export const getClientWorkouts = async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.clientId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const { clientId, models } = access;
    const { WorkoutSession, WorkoutLog } = models;

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const where = { userId: clientId };
    if (req.query.from || req.query.to) {
      where.completedAt = {};
      if (req.query.from) where.completedAt[Op.gte] = new Date(req.query.from);
      if (req.query.to) where.completedAt[Op.lte] = new Date(req.query.to);
    }

    const { count, rows: workouts } = await WorkoutSession.findAndCountAll({
      where,
      include: [{ model: WorkoutLog, as: 'logs' }],
      order: [['completedAt', 'DESC']],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      workouts: workouts.map((w) => ({
        id: w.id,
        title: w.title,
        date: w.completedAt,
        duration: w.duration,
        intensity: w.intensity,
        status: w.status,
        totalSets: w.totalSets,
        totalReps: w.totalReps,
        totalWeight: w.totalWeight,
        logs: w.logs,
      })),
      pagination: { total: count, limit, offset },
    });
  } catch (error) {
    logger.error('Get client workouts failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve workouts' });
  }
};

/**
 * PATCH /api/admin/clients/:clientId/workouts/:sessionId
 *
 * Edit a completed workout: update session fields, update/add/remove exercise sets.
 * Body: {
 *   title?: string,
 *   duration?: number,
 *   intensity?: number,
 *   notes?: string,
 *   exercises?: [{ name, sets: [{ id?, setNumber, reps, weight, tempo?, rest?, rpe?, notes? }] }]
 * }
 *
 * If exercises is provided, replaces ALL logs for this session (delete + re-create).
 * To add an exercise mid-workout, include it in the exercises array.
 * To remove an exercise, omit it from the array.
 */
export const editWorkout = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const access = await ensureClientAccess(req, req.params.clientId);
    if (!access.allowed) {
      await transaction.rollback();
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const { clientId, models } = access;
    const { WorkoutSession, WorkoutLog } = models;
    const { sessionId } = req.params;

    const session = await WorkoutSession.findOne({
      where: { id: sessionId, userId: clientId },
      transaction,
    });

    if (!session) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Workout session not found' });
    }

    // Update session-level fields
    const { title, duration, intensity, notes, exercises, date } = req.body;
    const updates = {};
    if (title != null) updates.title = title.trim();
    if (duration != null) updates.duration = Number(duration);
    if (intensity != null) updates.intensity = Number(intensity);
    if (notes != null) updates.notes = notes;
    if (date != null) {
      // Phase 13.1 parity (Phase 15.4 fix, 2026-04-16): edits use the same
      // local-calendar parser + end-of-today validation as create. Prior
      // `new Date(date)` parsed `YYYY-MM-DD` as UTC midnight (drift on local
      // timezone display), and `<= new Date()` rejected today's date in the
      // morning when paired with local-noon parsing. See
      // workoutLogService.mjs:266-278 for the canonical create path.
      const parsedDate = parseWorkoutLogDate(date);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      if (!isNaN(parsedDate.getTime()) && parsedDate <= endOfToday) {
        updates.date = parsedDate;
        updates.completedAt = parsedDate;
      }
    }

    if (Object.keys(updates).length > 0) {
      await session.update(updates, { transaction });
    }

    // If exercises provided, replace all logs (full edit)
    if (Array.isArray(exercises)) {
      // Delete existing logs
      await WorkoutLog.destroy({ where: { sessionId: session.id }, transaction });

      // Build new logs.
      // Phase 15.0 (2026-04-15): the exercise-level note is stamped on
      // every row in the exercise group, replacing the Phase 13.2
      // set-1-encoded `Coach: ` marker. Deleting any single row now
      // preserves the note on the remaining rows of the group.
      const logRows = [];
      for (const exercise of exercises) {
        const exName = exercise.exerciseName ?? exercise.name;
        if (!exName?.trim()) continue;

        const rawExerciseNote =
          (typeof exercise.exerciseNote === 'string' && exercise.exerciseNote.trim()) ||
          (typeof exercise.performanceNotes === 'string' && exercise.performanceNotes.trim()) ||
          null;

        const sets = exercise.sets || [{ setNumber: 1, reps: exercise.reps || 0, weight: exercise.weight || 0 }];
        for (const set of sets) {
          logRows.push({
            sessionId: session.id,
            exerciseName: exName.trim(),
            setNumber: Number(set.setNumber) || logRows.length + 1,
            reps: Number(set.reps) || 0,
            weight: Number(set.weight) || 0,
            tempo: set.tempo || null,
            rest: set.rest != null ? Number(set.rest) : null,
            rpe: set.rpe != null ? Number(set.rpe) : null,
            notes: set.notes || null,
            exerciseNote: rawExerciseNote,
          });
        }
      }

      if (logRows.length > 0) {
        await WorkoutLog.bulkCreate(logRows, { transaction, validate: true });
      }

      // Recompute aggregates
      const totalSets = logRows.length;
      const totalReps = logRows.reduce((sum, r) => sum + (r.reps || 0), 0);
      const totalWeight = logRows.reduce((sum, r) => sum + (r.reps || 0) * (r.weight || 0), 0);

      await session.update({ totalSets, totalReps, totalWeight }, { transaction });
    }

    await transaction.commit();

    // Fetch updated session with logs
    const updated = await WorkoutSession.findByPk(session.id, {
      include: [{ model: WorkoutLog, as: 'logs' }],
    });

    logger.info(`Workout edited: session ${session.id} for client ${clientId} by user ${req.user?.id}`);

    return res.status(200).json({
      success: true,
      workout: {
        id: updated.id,
        title: updated.title,
        date: updated.completedAt,
        duration: updated.duration,
        intensity: updated.intensity,
        status: updated.status,
        totalSets: updated.totalSets,
        totalReps: updated.totalReps,
        totalWeight: updated.totalWeight,
        logs: updated.logs,
      },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Workout edit failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to edit workout' });
  }
};

/**
 * DELETE /api/admin/clients/:clientId/workouts/:sessionId/logs/:logId
 *
 * Remove a single set from a workout and recompute aggregates.
 */
export const deleteWorkoutLog = async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.clientId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const { models } = access;
    const { WorkoutSession, WorkoutLog } = models;
    const { sessionId, logId } = req.params;

    const log = await WorkoutLog.findOne({ where: { id: logId, sessionId } });
    if (!log) {
      return res.status(404).json({ success: false, message: 'Workout log entry not found' });
    }

    await log.destroy();

    // Recompute session aggregates
    const remainingLogs = await WorkoutLog.findAll({ where: { sessionId } });
    const totalSets = remainingLogs.length;
    const totalReps = remainingLogs.reduce((sum, r) => sum + (r.reps || 0), 0);
    const totalWeight = remainingLogs.reduce((sum, r) => sum + (r.reps || 0) * (r.weight || 0), 0);

    await WorkoutSession.update(
      { totalSets, totalReps, totalWeight },
      { where: { id: sessionId } }
    );

    logger.info(`Deleted log ${logId} from session ${sessionId} by user ${req.user?.id}`);

    return res.status(200).json({ success: true, message: 'Log entry deleted', totalSets, totalReps, totalWeight });
  } catch (error) {
    logger.error('Delete workout log failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete log entry' });
  }
};
