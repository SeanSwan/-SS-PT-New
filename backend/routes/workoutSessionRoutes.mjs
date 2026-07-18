/**
 * Workout Session Routes
 * ====================
 * API routes for workout sessions
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { validationMiddleware } from '../middleware/validationMiddleware.mjs';
import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';
import { z } from 'zod';

const router = express.Router();
const INTERNAL_ERROR = 'INTERNAL_ERROR';

const SORT_FIELDS = new Set([
  'date',
  'createdAt',
  'updatedAt',
  'title',
  'duration',
  'intensity',
  'totalWeight',
  'totalReps',
  'totalSets',
  'status',
]);

const sendInternalError = (res, message) => res.status(500).json({
  success: false,
  message,
  code: INTERNAL_ERROR,
});

const isPrivileged = (role) => ['admin', 'trainer'].includes(role);
const sameId = (a, b) => String(a) === String(b);

const parsePositiveInteger = (value, label, maxValue = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined || value === null || value === '') {
    return { ok: false, message: `Invalid ${label}` };
  }

  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    return { ok: false, message: `Invalid ${label}` };
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { ok: false, message: `Invalid ${label}` };
  }

  return { ok: true, value: Math.min(parsed, maxValue) };
};

const parseDateQuery = (value, label) => {
  if (!value) return { ok: true, value: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, message: `Invalid ${label}` };
  }
  return { ok: true, value: date };
};

// Import models
import WorkoutSession from '../models/WorkoutSession.mjs';
import WorkoutLog from '../models/WorkoutLog.mjs';
import User from '../models/User.mjs';
import { getAllModels } from '../models/index.mjs';
import { safeAssemble } from '../services/postSaveHandoffAssembler.mjs';
import { Op } from 'sequelize';

/**
 * @route   GET /api/workout/sessions
 * @desc    Get all workout sessions for a user
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { 
      userId, 
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortDirection = 'desc',
      startDate,
      endDate,
      searchTerm = ''
    } = req.query;

    const parsedPage = parsePositiveInteger(page, 'page');
    if (!parsedPage.ok) {
      return res.status(400).json({ success: false, message: parsedPage.message });
    }

    const parsedLimit = parsePositiveInteger(limit, 'limit', 100);
    if (!parsedLimit.ok) {
      return res.status(400).json({ success: false, message: parsedLimit.message });
    }

    if (!SORT_FIELDS.has(String(sortBy))) {
      return res.status(400).json({ success: false, message: 'Invalid sortBy' });
    }

    const direction = String(sortDirection).toLowerCase();
    if (!['asc', 'desc'].includes(direction)) {
      return res.status(400).json({ success: false, message: 'Invalid sortDirection' });
    }

    const parsedStartDate = parseDateQuery(startDate, 'startDate');
    if (!parsedStartDate.ok) {
      return res.status(400).json({ success: false, message: parsedStartDate.message });
    }

    const parsedEndDate = parseDateQuery(endDate, 'endDate');
    if (!parsedEndDate.ok) {
      return res.status(400).json({ success: false, message: parsedEndDate.message });
    }
    
    // Build where clause
    const where = {};
    
    // Add userId filter if provided, otherwise use current user
    if (userId) {
      const parsedUserId = parsePositiveInteger(userId, 'userId');
      if (!parsedUserId.ok) {
        return res.status(400).json({ success: false, message: parsedUserId.message });
      }

      // Allow self, admins, and trainers with an active assignment to the target client
      const authorized = await assertAssignmentOrAdmin(req.user.id, req.user.role, parsedUserId.value);
      if (!authorized) {
        return res.status(403).json({
          message: 'You are not authorized to view this user\'s workout sessions'
        });
      }
      where.userId = parsedUserId.value;
    } else {
      where.userId = req.user.id;
    }
    
    // Add date range filters if provided
    if (startDate || endDate) {
      where.date = {};
      if (parsedStartDate.value) {
        where.date[Op.gte] = parsedStartDate.value;
      }
      if (parsedEndDate.value) {
        where.date[Op.lte] = parsedEndDate.value;
      }
    }
    
    // Add search term filter if provided
    if (searchTerm) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${searchTerm}%` } },
        { notes: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }
    
    // Calculate pagination
    const offset = (parsedPage.value - 1) * parsedLimit.value;
    
    // Determine sort order
    const order = [[String(sortBy), direction.toUpperCase()]];
    
    // Execute query with pagination
    const { rows: workouts, count: totalCount } = await WorkoutSession.findAndCountAll({
      where,
      order,
      offset,
      limit: parsedLimit.value,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: WorkoutLog,
          as: 'logs',
          attributes: ['id', 'exerciseName', 'setNumber', 'reps', 'weight', 'tempo', 'rest', 'rpe'],
        }
      ]
    });

    res.json({
      success: true,
      data: {
        workouts,
        total: totalCount,
        page: parsedPage.value,
        limit: parsedLimit.value,
        hasMore: offset + workouts.length < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching workout sessions:', error);
    return sendInternalError(res, 'Failed to get workout sessions');
  }
});

/**
 * @route   GET /api/workout/sessions/:id
 * @desc    Get a specific workout session
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    // FIXED: Use Sequelize findByPk instead of Mongoose findById
    const session = await WorkoutSession.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Workout session not found' });
    }

    // Authorization: self, admin, or trainer with an active assignment to the session's client
    const authorized = await assertAssignmentOrAdmin(req.user.id, req.user.role, session.userId);
    if (!authorized) {
      // 404 (not 403) so a non-owner cannot distinguish "exists-not-yours" from "doesn't-exist"
      // (matches the miss branch above + the /:id/handoff route — no existence oracle).
      return res.status(404).json({ success: false, message: 'Workout session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error fetching workout session:', error);
    return sendInternalError(res, 'Server error');
  }
});

// Validation schema for creating/updating a workout session
const workoutSetSchema = z.object({
  setNumber: z.number().int().positive(),
  weight: z.number().min(0),
  reps: z.number().int().min(0),
  notes: z.string().optional()
});

const sessionExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  muscleGroups: z.array(z.string()),
  sets: z.array(workoutSetSchema)
});

const workoutSessionSchema = z.object({
  userId: z.string(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  date: z.string().datetime(), 
  duration: z.number().int().min(1, 'Duration must be at least 1 minute'),
  intensity: z.number().int().min(1).max(10),
  exercises: z.array(sessionExerciseSchema),
  notes: z.string().optional(),
  totalWeight: z.number().min(0),
  totalReps: z.number().int().min(0),
  totalSets: z.number().int().min(0),
  clientRequestId: z.string().max(64).optional() // idempotency key (offline-retry-safe save)
});

/**
 * @route   GET /api/workout/sessions/:id/handoff
 * @desc    Re-fetch the Post-Save Handoff for a session (re-entry / offline-sync refresh).
 * @access  Private — self, admin, or assigned trainer. 404 for miss AND unauthorized (no existence leak).
 */
router.get('/:id/handoff', protect, async (req, res) => {
  try {
    const s = await WorkoutSession.findByPk(req.params.id, { attributes: ['id', 'userId'] });
    if (!s) return res.sendStatus(404);
    const isSelf = sameId(req.user.id, s.userId);
    const authorized = isSelf || await assertAssignmentOrAdmin(req.user.id, req.user.role, s.userId);
    if (!authorized) return res.sendStatus(404);
    let models = null;
    try { models = getAllModels(); } catch { models = null; }
    const handoff = await safeAssemble({
      viewerUserId: req.user.id, viewerRole: req.user.role,
      targetUserId: s.userId, todaySessionId: s.id, models,
    });
    if (!handoff) return res.sendStatus(404);
    return res.json({ handoff });
  } catch (error) {
    console.error('Error building session handoff:', error?.name, error?.message); // sanitized: no SQL/params/PII
    return res.sendStatus(404);
  }
});

/**
 * @route   POST /api/workout/sessions
 * @desc    Create a new workout session
 * @access  Private
 */
router.post('/',
  protect, 
  validationMiddleware(workoutSessionSchema), 
  async (req, res) => {
    try {
      const sessionData = req.body;
      
      // Clients may only create for themselves. Trainers/admins may create for another
      // user only with an active assignment to that client (admins bypass the assignment).
      if (!isPrivileged(req.user.role)) {
        sessionData.userId = req.user.id;
      } else if (!sameId(sessionData.userId, req.user.id)) {
        const authorized = await assertAssignmentOrAdmin(req.user.id, req.user.role, sessionData.userId);
        if (!authorized) {
          return res.status(403).json({ success: false, message: 'You are not authorized to create a session for this user' });
        }
        const userExists = await User.findByPk(sessionData.userId);
        if (!userExists) {
          return res.status(404).json({ success: false, message: 'Target user not found' });
        }
      }
      
      // Resolve the model registry ONCE, guarded — a corrupt/uninitialized registry must never throw
      // into the create/replay path and 500 a committed save (mirrors the form-path guard).
      let models = null;
      try { models = getAllModels(); } catch { models = null; }

      // Create the session (idempotent: a repeated offline retry with the same clientRequestId
      // hits the partial unique index → we replay the original result instead of double-writing).
      const clientRequestId = sessionData.clientRequestId || null;
      let session;
      try {
        session = await WorkoutSession.create(sessionData);
      } catch (err) {
        // Replay ONLY on the per-user idempotency constraint — not any unique violation (a different
        // constraint failing while the body carries a stale clientRequestId must never fake a success).
        // Match by column key OR the constraint/index name (locale-proof + survives a future field-map).
        const IDEM_INDEX = 'workout_sessions_user_client_request_uidx';
        const isIdemConflict = err?.name === 'SequelizeUniqueConstraintError' && clientRequestId && (
          (err?.fields && Object.prototype.hasOwnProperty.call(err.fields, 'clientRequestId'))
          || err?.original?.constraint === IDEM_INDEX
          || err?.parent?.constraint === IDEM_INDEX
        );
        if (isIdemConflict) {
          // IDOR is closed by the user-SCOPING here (+ the userId-forcing above), NOT by the index — the
          // composite index only provides idempotency integrity. This findOne is scoped to THIS user, so
          // it can never return another user's session even with a known clientRequestId.
          const existing = await WorkoutSession.findOne({ where: { clientRequestId, userId: sessionData.userId } });
          if (existing) {
            const handoff = await safeAssemble({
              viewerUserId: req.user.id, viewerRole: req.user.role,
              targetUserId: existing.userId, todaySessionId: existing.id, models,
            });
            return res.status(200).json({ session: existing, handoff, deduplicated: true });
          }
          return res.status(409).json({ success: false, message: 'Duplicate submission conflict' });
        }
        throw err;
      }

      // ← save committed. The handoff is BEST-EFFORT and never blocks/duplicates/rolls back the save.
      const handoff = await safeAssemble({
        viewerUserId: req.user.id, viewerRole: req.user.role,
        targetUserId: session.userId, todaySessionId: session.id, models,
      });
      res.status(201).json({ session, handoff, deduplicated: false });
    } catch (error) {
      console.error('Error creating workout session:', error?.name, error?.message); // sanitized: no SQL/params
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * @route   PUT /api/workout/sessions/:id
 * @desc    Update a workout session
 * @access  Private
 */
router.put('/:id',
  protect,
  validationMiddleware(workoutSessionSchema),
  async (req, res) => {
    try {
      const sessionData = req.body;

      // FIXED: Use Sequelize findByPk instead of Mongoose findById
      const existingSession = await WorkoutSession.findByPk(req.params.id);

      if (!existingSession) {
        return res.status(404).json({ success: false, message: 'Workout session not found' });
      }

      // Authorization: self, admin, or trainer with an active assignment to the session's client
      const authorized = await assertAssignmentOrAdmin(req.user.id, req.user.role, existingSession.userId);
      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this workout session'
        });
      }

      // FIXED: Use Sequelize update instead of Mongoose findByIdAndUpdate
      await existingSession.update(sessionData);

      // Reload to get the updated version
      await existingSession.reload();

      res.json({ success: true, session: existingSession });
    } catch (error) {
      console.error('Error updating workout session:', error);
      return sendInternalError(res, 'Server error');
    }
  }
);

/**
 * @route   DELETE /api/workout/sessions/:id
 * @desc    Delete a workout session
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    // FIXED: Use Sequelize findByPk instead of Mongoose findById
    const session = await WorkoutSession.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Workout session not found' });
    }

    // Authorization: self, admin, or trainer with an active assignment to the session's client
    const authorized = await assertAssignmentOrAdmin(req.user.id, req.user.role, session.userId);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this workout session'
      });
    }

    // FIXED: Use Sequelize destroy instead of Mongoose findByIdAndDelete
    await session.destroy();

    res.json({ success: true, message: 'Workout session deleted' });
  } catch (error) {
    console.error('Error deleting workout session:', error);
    return sendInternalError(res, 'Server error');
  }
});

/**
 * @route   POST /api/workout/sessions/start
 * @desc    Start a new workout session (real-time tracking)
 * @access  Private
 */
router.post('/start', protect, async (req, res) => {
  try {
    const { title, userId, exercises = [] } = req.body;
    
    // Create a new session with initial data
    const sessionData = {
      title: title || 'Workout Session',
      userId: userId || req.user.id,
      date: new Date(),
      duration: 0, // Will be updated when ended
      intensity: 0, // Will be updated when ended
      exercises,
      notes: '',
      totalWeight: 0,
      totalReps: 0,
      totalSets: 0,
      isActive: true // Flag to indicate an active session
    };
    
    // Clients may only start for themselves. Trainers/admins may start for another
    // user only with an active assignment to that client (admins bypass the assignment).
    if (!isPrivileged(req.user.role)) {
      sessionData.userId = req.user.id;
    } else if (!sameId(sessionData.userId, req.user.id)) {
      const authorized = await assertAssignmentOrAdmin(req.user.id, req.user.role, sessionData.userId);
      if (!authorized) {
        return res.status(403).json({ success: false, message: 'You are not authorized to start a session for this user' });
      }
    }

    // Create the session
    const session = await WorkoutSession.create(sessionData);

    res.status(201).json({ session });
  } catch (error) {
    console.error('Error starting workout session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workout/sessions/:id/end
 * @desc    End an active workout session
 * @access  Private
 */
router.post('/:id/end', protect, async (req, res) => {
  try {
    const { duration, notes } = req.body;

    // FIXED: Use Sequelize findByPk instead of Mongoose findById
    const session = await WorkoutSession.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Workout session not found' });
    }

    // Authorization: self, admin, or trainer with an active assignment to the session's client
    const authorized = await assertAssignmentOrAdmin(req.user.id, req.user.role, session.userId);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this workout session'
      });
    }

    // Update session data
    session.isActive = false;
    
    if (duration) {
      session.duration = duration;
    } else {
      // Calculate duration based on start time
      const startTime = new Date(session.date);
      const endTime = new Date();
      const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
      session.duration = durationMinutes;
    }
    
    if (notes) {
      session.notes = notes;
    }
    
    // Calculate total stats
    let totalWeight = 0;
    let totalReps = 0;
    let totalSets = 0;
    
    (session.exercises || []).forEach(exercise => {
      (exercise.sets || []).forEach(set => {
        totalWeight += (set.weight || 0) * (set.reps || 0);
        totalReps += (set.reps || 0);
        totalSets++;
      });
    });
    
    session.totalWeight = totalWeight;
    session.totalReps = totalReps;
    session.totalSets = totalSets;
    
    // Save the updated session
    await session.save();
    
    // Update user's progress metrics (if we had a ClientProgress model)
    // await updateClientProgress(session.userId, session);
    
    res.json({ session });
  } catch (error) {
    console.error('Error ending workout session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/workout/sessions/statistics/:userId
 * @desc    Get workout session statistics for a user
 * @access  Private
 */
router.get('/statistics/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate,
      includeExerciseBreakdown = false,
      includeMuscleGroupBreakdown = false,
      includeWeekdayBreakdown = false,
      includeIntensityTrends = false
    } = req.query;

    const parsedUserId = parsePositiveInteger(userId, 'userId');
    if (!parsedUserId.ok) {
      return res.status(400).json({ success: false, message: parsedUserId.message });
    }
    
    // Authorization: self, admin, or trainer with an active assignment to the target client
    const authorized = await assertAssignmentOrAdmin(req.user.id, req.user.role, parsedUserId.value);
    if (!authorized) {
      return res.status(403).json({
        message: 'You are not authorized to view this user\'s statistics'
      });
    }
    
    // FIXED: Build Sequelize where clause instead of Mongoose query
    const where = { userId: parsedUserId.value };

    // Add date range filters if provided
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.date[Op.lte] = new Date(endDate);
      }
    }

    // FIXED: Use Sequelize findAll instead of Mongoose find
    const sessions = await WorkoutSession.findAll({
      where,
      order: [['date', 'DESC']]
    });
    
    // Calculate basic statistics
    const totalWorkouts = sessions.length;
    let totalDuration = 0;
    let totalExercises = 0;
    let totalSets = 0;
    let totalReps = 0;
    let totalWeight = 0;
    let totalIntensity = 0;
    
    // Track exercises and muscle groups for breakdowns
    const exerciseCounts = {};
    const muscleGroupCounts = {};
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // [Sun, Mon, ..., Sat]
    const weeklyIntensity = {};
    
    // Process sessions
    sessions.forEach(session => {
      totalDuration += session.duration;
      totalSets += session.totalSets;
      totalReps += session.totalReps;
      totalWeight += session.totalWeight;
      totalIntensity += session.intensity;
      
      // Count unique exercises
      const uniqueExerciseIds = new Set();
      
      // Process exercises
      session.exercises.forEach(exercise => {
        uniqueExerciseIds.add(exercise.id);
        
        // Exercise breakdown
        if (includeExerciseBreakdown) {
          if (!exerciseCounts[exercise.id]) {
            exerciseCounts[exercise.id] = {
              id: exercise.id,
              name: exercise.name,
              count: 0,
              sets: 0,
              reps: 0,
              totalWeight: 0,
              category: exercise.category || 'unknown'
            };
          }
          exerciseCounts[exercise.id].count++;
          exerciseCounts[exercise.id].sets += exercise.sets.length;
          
          // Sum reps and weight
          exercise.sets.forEach(set => {
            exerciseCounts[exercise.id].reps += set.reps;
            exerciseCounts[exercise.id].totalWeight += set.weight * set.reps;
          });
        }
        
        // Muscle group breakdown
        if (includeMuscleGroupBreakdown && exercise.muscleGroups) {
          exercise.muscleGroups.forEach(group => {
            if (!muscleGroupCounts[group]) {
              muscleGroupCounts[group] = {
                id: group.toLowerCase().replace(/\s+/g, '-'),
                name: group,
                shortName: group.substring(0, 8),
                count: 0,
                bodyRegion: getBodyRegion(group)
              };
            }
            muscleGroupCounts[group].count++;
          });
        }
      });
      
      totalExercises += uniqueExerciseIds.size;
      
      // Weekday breakdown
      if (includeWeekdayBreakdown) {
        // Model field is 'date' (not workoutDate)
        const sessionDate = new Date(session.date);
        const weekday = sessionDate.getDay(); // 0 = Sunday, 6 = Saturday
        weekdayCounts[weekday]++;
      }

      // Intensity trends
      if (includeIntensityTrends) {
        // Model field is 'date' (not workoutDate)
        const sessionDate = new Date(session.date);
        // Calculate ISO week number from the session date
        const startOfYear = new Date(sessionDate.getFullYear(), 0, 1);
        const daysSinceStart = Math.floor((sessionDate - startOfYear) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
        const weekKey = `W${weekNumber}`;
        
        if (!weeklyIntensity[weekKey]) {
          weeklyIntensity[weekKey] = { 
            total: 0, 
            count: 0 
          };
        }
        
        weeklyIntensity[weekKey].total += session.intensity;
        weeklyIntensity[weekKey].count++;
      }
    });
    
    // Calculate average intensity
    const averageIntensity = totalWorkouts > 0 ? (totalIntensity / totalWorkouts) : 0;
    
    // Build response object
    const statistics = {
      totalWorkouts,
      totalDuration,
      totalExercises,
      totalSets,
      totalReps,
      totalWeight,
      averageIntensity
    };
    
    // Add exercise breakdown if requested
    if (includeExerciseBreakdown) {
      statistics.exerciseBreakdown = Object.values(exerciseCounts)
        .sort((a, b) => b.count - a.count);
    }
    
    // Add muscle group breakdown if requested
    if (includeMuscleGroupBreakdown) {
      statistics.muscleGroupBreakdown = Object.values(muscleGroupCounts)
        .sort((a, b) => b.count - a.count);
    }
    
    // Add weekday breakdown if requested
    if (includeWeekdayBreakdown) {
      statistics.weekdayBreakdown = weekdayCounts;
    }
    
    // Add intensity trends if requested
    if (includeIntensityTrends) {
      const intensityTrends = Object.keys(weeklyIntensity)
        .map(week => ({
          week,
          averageIntensity: weeklyIntensity[week].count > 0 
            ? (weeklyIntensity[week].total / weeklyIntensity[week].count) 
            : 0
        }))
        .sort((a, b) => {
          // Sort by week number (W1, W2, etc.)
          const aNum = parseInt(a.week.substring(1));
          const bNum = parseInt(b.week.substring(1));
          return aNum - bNum;
        });
      
      statistics.intensityTrends = intensityTrends;
    }
    
    res.json({ statistics });
  } catch (error) {
    console.error('Error fetching workout statistics:', error);
    return sendInternalError(res, 'Server error');
  }
});

// Helper function to determine body region from muscle group
function getBodyRegion(muscleGroup) {
  const lowerBodyMuscles = [
    'quadriceps', 'hamstrings', 'calves', 'glutes', 'quads', 'adductors', 'abductors'
  ];
  
  const upperBodyMuscles = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'lats', 'trapezius',
    'deltoids', 'pectorals', 'rhomboids'
  ];
  
  const coreMuscles = [
    'core', 'abs', 'abdominals', 'obliques', 'lower back'
  ];
  
  const normalized = muscleGroup.toLowerCase();
  
  if (lowerBodyMuscles.some(muscle => normalized.includes(muscle))) {
    return 'lower_body';
  } else if (upperBodyMuscles.some(muscle => normalized.includes(muscle))) {
    return 'upper_body';
  } else if (coreMuscles.some(muscle => normalized.includes(muscle))) {
    return 'core';
  } else {
    return 'other';
  }
}

// Helper function to get week number in year
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export default router;
