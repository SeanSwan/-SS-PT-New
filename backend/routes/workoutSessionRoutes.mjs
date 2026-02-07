/**
 * Workout Session Routes
 * ====================
 * API routes for workout sessions
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { validationMiddleware } from '../middleware/validationMiddleware.mjs';
import { z } from 'zod';

const router = express.Router();

// Import models
import WorkoutSession from '../models/WorkoutSession.mjs';
import User from '../models/User.mjs';
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
      sortBy = 'workoutDate',
      sortDirection = 'desc',
      startDate,
      endDate,
      searchTerm = ''
    } = req.query;
    
    // Build where clause
    const where = {};
    
    // Add userId filter if provided, otherwise use current user
    if (userId) {
      // Allow trainers and admins to view other users' sessions
      if (userId !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
        return res.status(403).json({ 
          message: 'You are not authorized to view this user\'s workout sessions' 
        });
      }
      where.userId = userId;
    } else {
      where.userId = req.user.id;
    }
    
    // Add date range filters if provided
    if (startDate || endDate) {
      where.workoutDate = {};
      if (startDate) {
        where.workoutDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.workoutDate[Op.lte] = new Date(endDate);
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
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort order
    const order = [[sortBy, sortDirection.toUpperCase()]];
    
    // Execute query with pagination
    const { rows: workouts, count: totalCount } = await WorkoutSession.findAndCountAll({
      where,
      order,
      offset,
      limit: parseInt(limit),
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    res.json({ 
      success: true,
      data: {
        workouts,
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: offset + workouts.length < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching workout sessions:', error);
    res.status(500).json({ success: false, message: 'Failed to get workout sessions', error: error.message });
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
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Workout session not found' });
    }

    // Check authorization - compare as integers
    if (session.userId !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this workout session'
      });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error fetching workout session:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
  totalSets: z.number().int().min(0)
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
      
      // Override userId with authenticated user if not admin/trainer
      if (!['admin', 'trainer'].includes(req.user.role)) {
        sessionData.userId = req.user.id;
      } else {
        // Verify the target user exists if admin/trainer is creating for someone else
        if (sessionData.userId !== req.user.id) {
          // FIXED: Use Sequelize findByPk instead of Mongoose findById
          const userExists = await User.findByPk(sessionData.userId);
          if (!userExists) {
            return res.status(404).json({ success: false, message: 'Target user not found' });
          }
        }
      }
      
      // Create the session
      const session = await WorkoutSession.create(sessionData);
      
      // Update user's progress metrics (if we had a ClientProgress model)
      // await updateClientProgress(sessionData.userId, sessionData);
      
      res.status(201).json({ session });
    } catch (error) {
      console.error('Error creating workout session:', error);
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

      // Check authorization - compare as integers
      if (existingSession.userId !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
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
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
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

    // Check authorization - compare as integers
    if (session.userId !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
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
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
    
    // Override userId with authenticated user if not admin/trainer
    if (!['admin', 'trainer'].includes(req.user.role)) {
      sessionData.userId = req.user.id;
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

    // Check authorization - compare as integers
    if (session.userId !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
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
    
    session.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        totalWeight += set.weight * set.reps;
        totalReps += set.reps;
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
    
    // Check authorization
    if (userId !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You are not authorized to view this user\'s statistics' 
      });
    }
    
    // FIXED: Build Sequelize where clause instead of Mongoose query
    const where = { userId };

    // Add date range filters if provided
    if (startDate || endDate) {
      where.workoutDate = {};
      if (startDate) {
        where.workoutDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.workoutDate[Op.lte] = new Date(endDate);
      }
    }

    // FIXED: Use Sequelize findAll instead of Mongoose find
    const sessions = await WorkoutSession.findAll({
      where,
      order: [['workoutDate', 'DESC']]
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
        // FIXED: Use workoutDate instead of date (Sequelize field name)
        const sessionDate = new Date(session.workoutDate);
        const weekday = sessionDate.getDay(); // 0 = Sunday, 6 = Saturday
        weekdayCounts[weekday]++;
      }

      // Intensity trends
      if (includeIntensityTrends) {
        // FIXED: Use workoutDate instead of date (Sequelize field name)
        const sessionDate = new Date(session.workoutDate);
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
    res.status(500).json({ message: 'Server error' });
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
