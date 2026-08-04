/**
 * Workout Session Routes
 * ====================
 * Live-session lifecycle + post-save handoff for workout sessions.
 *
 * SCOPE NARROWED 2026-07-30 (SWA-75). This router used to declare full CRUD for
 * `/api/workout/sessions`, but five of those routes were UNREACHABLE: `/api/workout`
 * is mounted ahead of `/api/workout/sessions` (core/routes.mjs), so GET `/`,
 * GET `/:id`, POST `/`, PUT `/:id` and DELETE `/:id` were all answered by
 * workoutController instead. Proven by execution, then deleted — a zero-behaviour
 * change, because nothing could reach them.
 *
 * What remains is what actually serves traffic, because `/api/workout` has no
 * matching pattern for it:
 *   GET  /:id/handoff        — post-save proof re-fetch (load-bearing: see
 *                              postSaveHandoffAssembler, workoutProofLoader,
 *                              workoutProofSeriesService)
 *   POST /start
 *   POST /:id/end
 *   GET  /statistics/:userId
 *
 * Session CRUD belongs to routes/workoutRoutes.mjs -> controllers/workoutController.mjs,
 * which is transactional and writes the normalized WorkoutExercise/Set rows. Do NOT
 * re-add CRUD here; it would be dead on arrival and
 * tests/api/routerStackMountTopology.test.mjs will fail if you do.
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';
import { handoffLimiter } from '../middleware/rateLimiter.mjs';
import { parsePositiveInteger } from '../utils/workoutSessionQuery.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'INTERNAL_ERROR';

const sendInternalError = (res, message) => res.status(500).json({
  success: false,
  message,
  code: INTERNAL_ERROR,
});

const isPrivileged = (role) => ['admin', 'trainer'].includes(role);
const sameId = (a, b) => String(a) === String(b);

// Import models
import WorkoutSession from '../models/WorkoutSession.mjs';
import { getAllModels } from '../models/index.mjs';
import { safeAssemble } from '../services/postSaveHandoffAssembler.mjs';
import { Op } from 'sequelize';

/**
 * @route   GET /api/workout/sessions/:id/handoff
 * @desc    Re-fetch the Post-Save Handoff for a session (re-entry / offline-sync refresh).
 * @access  Private — self, admin, or assigned trainer. 404 for miss AND unauthorized (no existence leak).
 */
// handoffLimiter BEFORE protect: throttle even unauthenticated hammering (each hit past auth triggers
// up to 2500ms of assembly DB work — a load-amplification vector flagged by the go-live review).
router.get('/:id/handoff', handoffLimiter, protect, async (req, res) => {
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
