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
import { getAllModels } from '../models/index.mjs';
import sequelize from '../database.mjs';
import { Op } from 'sequelize';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import { awardWorkoutXP } from '../services/awardWorkoutXP.mjs';

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
  const transaction = await sequelize.transaction();

  try {
    // --- Access guard ---
    const access = await ensureClientAccess(req, req.params.clientId);
    if (!access.allowed) {
      await transaction.rollback();
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const { clientId, models } = access;
    const { WorkoutSession, WorkoutLog } = models;

    // --- Input validation ---
    const { title, date, duration, intensity, notes, exercises } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'title is required and must be non-empty' });
    }

    const parsedDate = new Date(date);
    if (!date || isNaN(parsedDate.getTime())) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'date must be a valid ISO date string' });
    }

    if (parsedDate > new Date()) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'date cannot be in the future' });
    }

    // Check for duplicate session on same date for same client
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);
    const existingSession = await WorkoutSession.findOne({
      where: {
        userId: clientId,
        date: { [Op.between]: [startOfDay, endOfDay] },
      },
      transaction,
    });
    if (existingSession) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: 'A workout session already exists for this client on this date' });
    }

    const parsedDuration = Number(duration);
    if (!Number.isInteger(parsedDuration) || parsedDuration < 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'duration must be a non-negative integer' });
    }

    const parsedIntensity = Number(intensity);
    if (!Number.isFinite(parsedIntensity) || parsedIntensity < 1 || parsedIntensity > 10) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'intensity must be between 1 and 10' });
    }

    if (!Array.isArray(exercises) || exercises.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'exercises must be a non-empty array' });
    }

    // --- Create WorkoutSession ---
    const session = await WorkoutSession.create({
      userId: clientId,
      date: parsedDate,
      trainerId: req.user?.id ?? null,
      sessionType: 'trainer-led',
      status: 'completed',
      completedAt: parsedDate,
      duration: parsedDuration,
      notes: notes || null,
      title: title.trim(),
      intensity: parsedIntensity,
    }, { transaction });

    // --- Build WorkoutLog rows ---
    const logRows = [];
    for (const exercise of exercises) {
      // Accept both { name } and { exerciseName } for flexibility
      const exName = exercise.exerciseName ?? exercise.name;
      if (typeof exName !== 'string' || !exName.trim()) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Each exercise must have a non-empty name or exerciseName' });
      }

      if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: `Exercise "${exName}" must have at least one set` });
      }

      for (const set of exercise.sets) {
        const setNumber = Number(set.setNumber);
        if (!Number.isInteger(setNumber) || setNumber < 1) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Each set must have an integer setNumber >= 1' });
        }

        // Strict integer validation — WorkoutLog.reps is INTEGER
        const reps = Number(set.reps);
        if (set.reps != null && (!Number.isInteger(reps) || reps < 0)) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: `Invalid reps value "${set.reps}" in set ${setNumber} — must be a non-negative integer` });
        }
        const weight = Number(set.weight);
        if (set.weight != null && !Number.isFinite(weight)) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: `Invalid weight value "${set.weight}" in set ${setNumber}` });
        }

        logRows.push({
          sessionId: session.id,
          exerciseName: exName.trim(),
          setNumber,
          reps: Number.isInteger(reps) ? reps : 0,
          weight: Number.isFinite(weight) ? weight : 0,
          tempo: set.tempo || null,
          rest: set.rest != null ? Number(set.rest) : null,
          rpe: set.rpe != null ? Number(set.rpe) : null,
          notes: set.notes || null,
        });
      }
    }

    await WorkoutLog.bulkCreate(logRows, { transaction, validate: true });

    // --- Compute aggregates ---
    const totalSets = logRows.length;
    const totalReps = logRows.reduce((sum, r) => sum + (r.reps || 0), 0);
    const totalWeight = logRows.reduce((sum, r) => sum + (r.reps || 0) * (r.weight || 0), 0);

    await session.update({
      totalSets,
      totalReps,
      totalWeight,
    }, { transaction });

    await transaction.commit();

    logger.info(`Workout logged for client ${clientId}: ${session.id} (${totalSets} sets, ${exercises.length} exercises)`);

    // --- Best-effort XP award (separate transaction) ---
    let xpResult = null;
    let xpTx = null;
    try {
      xpTx = await sequelize.transaction();
      xpResult = await awardWorkoutXP({
        userId: clientId,
        workoutId: session.id,
        duration: parsedDuration,
        exercisesCompleted: exercises.length,
        workoutDate: parsedDate,
        awardedBy: req.user?.id,
      }, xpTx);

      if (xpResult && !xpResult.sameDay && !xpResult.alreadyAwarded) {
        const { WorkoutSession: WS } = getAllModels();
        await WS.update(
          { experiencePoints: xpResult.pointsAwarded },
          { where: { id: session.id }, transaction: xpTx }
        );
      }
      await xpTx.commit();

      // --- Best-effort auto-post to social feed ---
      if (xpResult && !xpResult.sameDay && !xpResult.alreadyAwarded) {
        try {
          const { createWorkoutAutoPost, createStreakAutoPost } = await import('../services/socialAutoPost.mjs');
          await createWorkoutAutoPost(clientId, {
            duration: parsedDuration,
            exercisesCompleted: exercises.length,
            pointsAwarded: xpResult.pointsAwarded,
          });
          if (xpResult.streakDays && [7, 14, 30, 60, 90, 180, 365].includes(xpResult.streakDays)) {
            await createStreakAutoPost(clientId, xpResult.streakDays);
          }
        } catch (autoPostErr) {
          logger.warn(`Auto-post failed for workout ${session.id}: ${autoPostErr.message}`);
        }
      }
    } catch (xpErr) {
      try { await xpTx?.rollback(); } catch (_) { /* already rolled back */ }
      logger.warn(`XP award failed for workout ${session.id}: ${xpErr.message}`);
      xpResult = null;
    }

    // Collapse sameDay/alreadyAwarded to null for response
    const xpResponse = (xpResult && !xpResult.sameDay && !xpResult.alreadyAwarded)
      ? {
          pointsAwarded: xpResult.pointsAwarded,
          newBalance: xpResult.newBalance,
          streakDays: xpResult.streakDays,
          milestones: (xpResult.awardedMilestones || []).map((m) => m.name),
        }
      : null;

    return res.status(201).json({
      success: true,
      workout: {
        id: session.id,
        userId: clientId,
        title: session.title,
        date: session.completedAt,
        duration: session.duration,
        intensity: session.intensity,
        totalSets,
        totalReps,
        totalWeight,
        exerciseCount: exercises.length,
      },
      xp: xpResponse,
    });
  } catch (error) {
    await transaction.rollback();
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
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime()) && parsedDate <= new Date()) {
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

      // Build new logs
      const logRows = [];
      for (const exercise of exercises) {
        const exName = exercise.exerciseName ?? exercise.name;
        if (!exName?.trim()) continue;

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
