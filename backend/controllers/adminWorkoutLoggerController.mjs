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

    // --- Strict integer validation for intensity ---
    if (!Number.isInteger(parsedIntensity)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'intensity must be an integer between 1 and 10' });
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
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Workout logging failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to log workout', error: error.message });
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
