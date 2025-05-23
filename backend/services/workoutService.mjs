/**
 * Workout Service
 * ==============
 * Business logic for workout management, including session tracking,
 * exercise recommendations, progress analysis, and plan creation.
 * 
 * Enhanced with support for normalized data models replacing JSON fields.
 */

import { Op } from 'sequelize';
import sequelize from '../database.mjs';

// Import models
import User from '../models/User.mjs';
import Exercise from '../models/Exercise.mjs';
import WorkoutSession from '../models/WorkoutSession.mjs';
import WorkoutExercise from '../models/WorkoutExercise.mjs';
import WorkoutPlan from '../models/WorkoutPlan.mjs';
import ClientProgress from '../models/ClientProgress.mjs';
import Gamification from '../models/Gamification.mjs';
import Achievement from '../models/Achievement.mjs';
import Set from '../models/Set.mjs';
import MuscleGroup from '../models/MuscleGroup.mjs';
import ExerciseMuscleGroup from '../models/ExerciseMuscleGroup.mjs';
import Equipment from '../models/Equipment.mjs';
import ExerciseEquipment from '../models/ExerciseEquipment.mjs';
import WorkoutPlanDay from '../models/WorkoutPlanDay.mjs';
import WorkoutPlanDayExercise from '../models/WorkoutPlanDayExercise.mjs';

/**
 * Get all workout sessions for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, offset, status)
 * @returns {Promise<Array>} Array of workout sessions
 */
async function getWorkoutSessions(userId, options = {}) {
  const { limit = 10, offset = 0, status, startDate, endDate, sort = 'startedAt', order = 'DESC' } = options;
  
  const whereClause = { userId };
  
  if (status) {
    whereClause.status = status;
  }
  
  if (startDate || endDate) {
    whereClause.startedAt = {};
    if (startDate) whereClause.startedAt[Op.gte] = new Date(startDate);
    if (endDate) whereClause.startedAt[Op.lte] = new Date(endDate);
  }
  
  return WorkoutSession.findAll({
    where: whereClause,
    include: [
      {
        model: WorkoutExercise,
        as: 'exercises',
        include: [
          {
            model: Exercise,
            as: 'exercise',
            attributes: ['id', 'name', 'description', 'difficulty', 'category', 'exerciseType'],
            include: [
              {
                model: MuscleGroup,
                as: 'muscleGroups',
                through: { 
                  attributes: ['activationType', 'activationLevel'],
                  where: { activationType: 'primary' },
                  required: false
                }
              },
              {
                model: Equipment,
                as: 'equipment',
                through: { attributes: ['required'] }
              }
            ]
          },
          {
            model: Set,
            as: 'sets',
            order: [['setNumber', 'ASC']]
          }
        ]
      }
    ],
    order: [[sort, order]],
    limit,
    offset
  });
}

/**
 * Get a single workout session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Workout session
 */
async function getWorkoutSessionById(sessionId) {
  return WorkoutSession.findByPk(sessionId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'role']
      },
      {
        model: WorkoutExercise,
        as: 'exercises',
        include: [
          {
            model: Exercise,
            as: 'exercise',
            attributes: ['id', 'name', 'description', 'difficulty', 'category', 'exerciseType'],
            include: [
              {
                model: MuscleGroup,
                as: 'muscleGroups',
                through: { attributes: ['activationType', 'activationLevel'] }
              },
              {
                model: Equipment,
                as: 'equipment',
                through: { attributes: ['required'] }
              }
            ]
          },
          {
            model: Set,
            as: 'sets',
            order: [['setNumber', 'ASC']]
          }
        ]
      },
      {
        model: WorkoutPlan,
        as: 'workoutPlan',
        attributes: ['id', 'name', 'description']
      }
    ]
  });
}

/**
 * Create a new workout session
 * @param {Object} sessionData - Session data object
 * @returns {Promise<Object>} Created workout session
 */
async function createWorkoutSession(sessionData) {
  // Start a transaction to ensure all operations succeed or fail together
  const transaction = await sequelize.transaction();
  
  try {
    // Create the workout session
    const workoutSession = await WorkoutSession.create({
      userId: sessionData.userId,
      workoutPlanId: sessionData.workoutPlanId,
      title: sessionData.title,
      description: sessionData.description,
      plannedStartTime: sessionData.plannedStartTime,
      status: sessionData.status || 'planned',
      notes: sessionData.notes
    }, { transaction });
    
    // If there are exercises, create them
    if (sessionData.exercises && Array.isArray(sessionData.exercises)) {
      for (let i = 0; i < sessionData.exercises.length; i++) {
        const exerciseData = sessionData.exercises[i];
        
        // Create the workout exercise
        const workoutExercise = await WorkoutExercise.create({
          workoutSessionId: workoutSession.id,
          exerciseId: exerciseData.exerciseId,
          orderInWorkout: i + 1,
          notes: exerciseData.notes,
          isRehabExercise: exerciseData.isRehabExercise || false
        }, { transaction });
        
        // Create the sets if they exist
        if (exerciseData.sets && Array.isArray(exerciseData.sets)) {
          const setsToCreate = exerciseData.sets.map((set, setIndex) => ({
            workoutExerciseId: workoutExercise.id,
            setNumber: setIndex + 1,
            setType: set.setType || 'working',
            repsGoal: set.repsGoal,
            weightGoal: set.weightGoal,
            restGoal: set.restGoal,
            tempo: set.tempo
          }));
          
          await Set.bulkCreate(setsToCreate, { transaction });
        }
      }
    }
    
    await transaction.commit();
    
    // Return the created session with all its associations
    return getWorkoutSessionById(workoutSession.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Update a workout session
 * @param {string} sessionId - Session ID
 * @param {Object} sessionData - Updated session data
 * @returns {Promise<Object>} Updated workout session
 */
async function updateWorkoutSession(sessionId, sessionData) {
  const transaction = await sequelize.transaction();
  
  try {
    // Get the existing session
    const existingSession = await WorkoutSession.findByPk(sessionId);
    
    if (!existingSession) {
      throw new Error('Workout session not found');
    }
    
    // Update the session fields
    await existingSession.update({
      title: sessionData.title || existingSession.title,
      description: sessionData.description || existingSession.description,
      status: sessionData.status || existingSession.status,
      notes: sessionData.notes !== undefined ? sessionData.notes : existingSession.notes,
      startedAt: sessionData.startedAt || existingSession.startedAt,
      completedAt: sessionData.completedAt || existingSession.completedAt,
      duration: sessionData.duration || existingSession.duration,
      caloriesBurned: sessionData.caloriesBurned || existingSession.caloriesBurned,
      feelingRating: sessionData.feelingRating || existingSession.feelingRating,
      intensityRating: sessionData.intensityRating || existingSession.intensityRating
    }, { transaction });
    
    // If exercise updates are provided
    if (sessionData.exercises && Array.isArray(sessionData.exercises)) {
      // Get existing exercises
      const existingExercises = await WorkoutExercise.findAll({
        where: { workoutSessionId: sessionId }
      });
      
      const existingExerciseMap = {};
      existingExercises.forEach(ex => {
        existingExerciseMap[ex.id] = ex;
      });
      
      // Process each exercise
      for (const exerciseData of sessionData.exercises) {
        if (exerciseData.id && existingExerciseMap[exerciseData.id]) {
          // Update existing exercise
          const existingExercise = existingExerciseMap[exerciseData.id];
          
          await existingExercise.update({
            performanceRating: exerciseData.performanceRating || existingExercise.performanceRating,
            difficultyRating: exerciseData.difficultyRating || existingExercise.difficultyRating,
            painLevel: exerciseData.painLevel !== undefined ? exerciseData.painLevel : existingExercise.painLevel,
            formRating: exerciseData.formRating || existingExercise.formRating,
            formNotes: exerciseData.formNotes || existingExercise.formNotes,
            notes: exerciseData.notes !== undefined ? exerciseData.notes : existingExercise.notes,
            startedAt: exerciseData.startedAt || existingExercise.startedAt,
            completedAt: exerciseData.completedAt || existingExercise.completedAt
          }, { transaction });
          
          // Update sets if provided
          if (exerciseData.sets && Array.isArray(exerciseData.sets)) {
            // Get existing sets
            const existingSets = await Set.findAll({
              where: { workoutExerciseId: existingExercise.id }
            });
            
            const existingSetMap = {};
            existingSets.forEach(set => {
              existingSetMap[set.id] = set;
            });
            
            // Process each set
            for (const setData of exerciseData.sets) {
              if (setData.id && existingSetMap[setData.id]) {
                // Update existing set
                const existingSet = existingSetMap[setData.id];
                
                await existingSet.update({
                  repsCompleted: setData.repsCompleted !== undefined ? setData.repsCompleted : existingSet.repsCompleted,
                  weightUsed: setData.weightUsed !== undefined ? setData.weightUsed : existingSet.weightUsed,
                  duration: setData.duration !== undefined ? setData.duration : existingSet.duration,
                  distance: setData.distance !== undefined ? setData.distance : existingSet.distance,
                  restTaken: setData.restTaken !== undefined ? setData.restTaken : existingSet.restTaken,
                  rpe: setData.rpe !== undefined ? setData.rpe : existingSet.rpe,
                  notes: setData.notes !== undefined ? setData.notes : existingSet.notes,
                  isPR: setData.isPR !== undefined ? setData.isPR : existingSet.isPR,
                  completedAt: setData.completedAt || existingSet.completedAt
                }, { transaction });
              } else {
                // Create new set
                await Set.create({
                  workoutExerciseId: existingExercise.id,
                  setNumber: setData.setNumber || existingSets.length + 1,
                  setType: setData.setType || 'working',
                  repsGoal: setData.repsGoal,
                  repsCompleted: setData.repsCompleted,
                  weightGoal: setData.weightGoal,
                  weightUsed: setData.weightUsed,
                  duration: setData.duration,
                  distance: setData.distance,
                  restGoal: setData.restGoal,
                  restTaken: setData.restTaken,
                  rpe: setData.rpe,
                  tempo: setData.tempo,
                  notes: setData.notes,
                  isPR: setData.isPR || false,
                  completedAt: setData.completedAt
                }, { transaction });
              }
            }
          }
        } else {
          // Create new exercise
          const newExercise = await WorkoutExercise.create({
            workoutSessionId: sessionId,
            exerciseId: exerciseData.exerciseId,
            orderInWorkout: exerciseData.orderInWorkout || existingExercises.length + 1,
            performanceRating: exerciseData.performanceRating,
            difficultyRating: exerciseData.difficultyRating,
            painLevel: exerciseData.painLevel || 0,
            formRating: exerciseData.formRating,
            formNotes: exerciseData.formNotes,
            isRehabExercise: exerciseData.isRehabExercise || false,
            notes: exerciseData.notes,
            startedAt: exerciseData.startedAt,
            completedAt: exerciseData.completedAt
          }, { transaction });
          
          // Create sets if provided
          if (exerciseData.sets && Array.isArray(exerciseData.sets)) {
            const setsToCreate = exerciseData.sets.map((set, setIndex) => ({
              workoutExerciseId: newExercise.id,
              setNumber: set.setNumber || setIndex + 1,
              setType: set.setType || 'working',
              repsGoal: set.repsGoal,
              repsCompleted: set.repsCompleted,
              weightGoal: set.weightGoal,
              weightUsed: set.weightUsed,
              duration: set.duration,
              distance: set.distance,
              restGoal: set.restGoal,
              restTaken: set.restTaken,
              rpe: set.rpe,
              tempo: set.tempo,
              notes: set.notes,
              isPR: set.isPR || false,
              completedAt: set.completedAt
            }));
            
            await Set.bulkCreate(setsToCreate, { transaction });
          }
        }
      }
    }
    
    // If the session is completed, update client progress
    if (sessionData.status === 'completed' && (!existingSession.status || existingSession.status !== 'completed')) {
      await updateClientProgress(existingSession.userId, sessionId, transaction);
    }
    
    await transaction.commit();
    
    // Return the updated session
    return getWorkoutSessionById(sessionId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Delete a workout session
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteWorkoutSession(sessionId) {
  const session = await WorkoutSession.findByPk(sessionId);
  
  if (!session) {
    throw new Error('Workout session not found');
  }
  
  await session.destroy();
  return true;
}

/**
 * Update client progress based on completed workout
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID 
 * @param {Transaction} transaction - Sequelize transaction
 * @returns {Promise<Object>} Updated client progress
 */
async function updateClientProgress(userId, sessionId, transaction) {
  // Get the workout session with exercises
  const session = await WorkoutSession.findByPk(sessionId, {
    include: [
      {
        model: WorkoutExercise,
        as: 'exercises',
        include: [
          {
            model: Exercise,
            as: 'exercise'
          },
          {
            model: Set,
            as: 'sets'
          }
        ]
      }
    ]
  });
  
  if (!session) {
    throw new Error('Workout session not found');
  }
  
  // Get or create client progress
  let clientProgress = await ClientProgress.findOne({
    where: { userId }
  });
  
  if (!clientProgress) {
    clientProgress = await ClientProgress.create({
      userId,
      strengthLevel: 1,
      cardioLevel: 1,
      flexibilityLevel: 1,
      balanceLevel: 1,
      coreLevel: 1
    }, { transaction });
  }
  
  // Calculate progress metrics
  const metrics = calculateProgressMetrics(session);
  
  // Update the client progress
  await clientProgress.update({
    // Update levels based on the metrics
    strengthLevel: calculateNewLevel(clientProgress.strengthLevel, metrics.strengthXP),
    cardioLevel: calculateNewLevel(clientProgress.cardioLevel, metrics.cardioXP),
    flexibilityLevel: calculateNewLevel(clientProgress.flexibilityLevel, metrics.flexibilityXP),
    balanceLevel: calculateNewLevel(clientProgress.balanceLevel, metrics.balanceXP),
    coreLevel: calculateNewLevel(clientProgress.coreLevel, metrics.coreXP),
    
    // Update totals
    totalWorkouts: (clientProgress.totalWorkouts || 0) + 1,
    totalSets: (clientProgress.totalSets || 0) + metrics.totalSets,
    totalReps: (clientProgress.totalReps || 0) + metrics.totalReps,
    totalWeight: (clientProgress.totalWeight || 0) + metrics.totalWeight,
    totalExercises: (clientProgress.totalExercises || 0) + session.exercises.length,
    
    // Update dates
    lastWorkoutDate: session.completedAt || new Date(),
    
    // Update streak if applicable
    currentStreak: updateStreak(clientProgress.lastWorkoutDate, clientProgress.currentStreak),
    
    // Update PR data
    personalRecords: updatePersonalRecords(clientProgress.personalRecords || {}, metrics.personalRecords)
  }, { transaction });
  
  // Update gamification data
  await updateGamification(userId, metrics, session, transaction);
  
  return clientProgress;
}

/**
 * Calculate progress metrics from a workout session
 * @param {Object} session - Workout session with exercises
 * @returns {Object} Metrics object
 */
function calculateProgressMetrics(session) {
  const metrics = {
    strengthXP: 0,
    cardioXP: 0,
    flexibilityXP: 0,
    balanceXP: 0,
    coreXP: 0,
    totalSets: 0,
    totalReps: 0,
    totalWeight: 0,
    personalRecords: {}
  };
  
  // Process each exercise
  session.exercises.forEach(workoutExercise => {
    const exercise = workoutExercise.exercise;
    
    if (!exercise) return;
    
    // Determine the exercise category
    let category = 'strength';
    if (exercise.category) {
      category = exercise.category.toLowerCase();
    }
    
    // Process each set
    workoutExercise.sets.forEach(set => {
      metrics.totalSets++;
      
      if (set.repsCompleted) {
        metrics.totalReps += set.repsCompleted;
      }
      
      if (set.weightUsed && set.repsCompleted) {
        const weight = set.weightUsed * set.repsCompleted;
        metrics.totalWeight += weight;
        
        // Record potential PR
        if (set.isPR) {
          if (!metrics.personalRecords[exercise.id]) {
            metrics.personalRecords[exercise.id] = [];
          }
          
          metrics.personalRecords[exercise.id].push({
            setId: set.id,
            weight: set.weightUsed,
            reps: set.repsCompleted,
            date: set.completedAt || new Date()
          });
        }
      }
      
      // Calculate XP
      const setXP = calculateSetXP(set, workoutExercise);
      
      // Allocate XP based on exercise category
      switch (category) {
        case 'strength':
        case 'power':
        case 'hypertrophy':
          metrics.strengthXP += setXP;
          break;
        case 'cardio':
        case 'endurance':
          metrics.cardioXP += setXP;
          break;
        case 'flexibility':
        case 'mobility':
          metrics.flexibilityXP += setXP;
          break;
        case 'balance':
        case 'stability':
          metrics.balanceXP += setXP;
          break;
        case 'core':
          metrics.coreXP += setXP;
          break;
        default:
          // Default to strength
          metrics.strengthXP += setXP;
      }
    });
  });
  
  return metrics;
}

/**
 * Calculate XP gained from a set
 * @param {Object} set - Set data
 * @param {Object} workoutExercise - Parent workout exercise
 * @returns {number} XP gained
 */
function calculateSetXP(set, workoutExercise) {
  let xp = 0;
  
  // Base XP for completing a set
  xp += 5;
  
  // XP based on reps
  if (set.repsCompleted) {
    xp += Math.min(set.repsCompleted, 20);
  }
  
  // XP based on weight
  if (set.weightUsed) {
    xp += Math.min(Math.floor(set.weightUsed / 10), 30);
  }
  
  // XP based on RPE
  if (set.rpe) {
    xp += set.rpe;
  }
  
  // XP multiplier based on form rating
  if (workoutExercise.formRating) {
    xp *= (0.8 + (workoutExercise.formRating / 10));
  }
  
  // XP bonus for PR
  if (set.isPR) {
    xp *= 1.5;
  }
  
  return Math.round(xp);
}

/**
 * Calculate a new level based on XP gain
 * @param {number} currentLevel - Current level
 * @param {number} xpGained - XP gained
 * @returns {number} New level
 */
function calculateNewLevel(currentLevel, xpGained) {
  // Define XP required for each level (exponential curve)
  const baseXP = 100;
  const levelFactor = 1.5;
  
  // Calculate XP required for next level
  const xpForNextLevel = Math.round(baseXP * Math.pow(levelFactor, currentLevel - 1));
  
  // If XP gained is enough for next level
  if (xpGained >= xpForNextLevel) {
    return currentLevel + 1;
  }
  
  return currentLevel;
}

/**
 * Update streak based on last workout date
 * @param {Date} lastWorkoutDate - Last workout date
 * @param {number} currentStreak - Current streak
 * @returns {number} New streak
 */
function updateStreak(lastWorkoutDate, currentStreak) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // If no last workout date, start streak at 1
  if (!lastWorkoutDate) {
    return 1;
  }
  
  // Convert to date without time
  const lastDate = new Date(lastWorkoutDate);
  const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
  
  // Calculate difference in days
  const dayDiff = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));
  
  // If workout was today, maintain streak
  if (dayDiff === 0) {
    return currentStreak;
  }
  
  // If workout was yesterday, increment streak
  if (dayDiff === 1) {
    return currentStreak + 1;
  }
  
  // If workout was more than a day ago but less than 3 days, maintain streak
  // This gives a 2-day grace period
  if (dayDiff <= 3) {
    return currentStreak;
  }
  
  // Otherwise, reset streak to 1
  return 1;
}

/**
 * Update personal records
 * @param {Object} currentPRs - Current personal records
 * @param {Object} newPRs - New personal records
 * @returns {Object} Updated personal records
 */
function updatePersonalRecords(currentPRs, newPRs) {
  const updatedPRs = { ...currentPRs };
  
  // Merge new PRs with current PRs
  Object.keys(newPRs).forEach(exerciseId => {
    if (!updatedPRs[exerciseId]) {
      updatedPRs[exerciseId] = [];
    }
    
    // Add new PRs
    updatedPRs[exerciseId] = [
      ...updatedPRs[exerciseId],
      ...newPRs[exerciseId]
    ];
    
    // Sort by date (descending)
    updatedPRs[exerciseId].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Keep only the 5 most recent PRs
    if (updatedPRs[exerciseId].length > 5) {
      updatedPRs[exerciseId] = updatedPRs[exerciseId].slice(0, 5);
    }
  });
  
  return updatedPRs;
}

/**
 * Update gamification data based on workout
 * @param {string} userId - User ID
 * @param {Object} metrics - Progress metrics
 * @param {Object} session - Workout session
 * @param {Transaction} transaction - Sequelize transaction
 * @returns {Promise<Object>} Updated gamification data
 */
async function updateGamification(userId, metrics, session, transaction) {
  // Get or create gamification data
  let gamification = await Gamification.findOne({
    where: { userId }
  });
  
  if (!gamification) {
    gamification = await Gamification.create({
      userId,
      level: 1,
      experience: 0,
      achievements: [],
      streakCount: 0,
      totalXP: 0
    }, { transaction });
  }
  
  // Calculate total XP gained
  const totalXP = metrics.strengthXP + metrics.cardioXP + metrics.flexibilityXP + 
                  metrics.balanceXP + metrics.coreXP;
  
  // Determine if level up occurs
  const currentLevel = gamification.level;
  const currentXP = gamification.experience;
  const newTotalXP = currentXP + totalXP;
  
  // Calculate XP needed for next level
  const xpForNextLevel = 100 * Math.pow(1.5, currentLevel - 1);
  
  // Check if level up occurs
  let newLevel = currentLevel;
  let remainingXP = newTotalXP;
  
  while (remainingXP >= xpForNextLevel) {
    remainingXP -= xpForNextLevel;
    newLevel++;
  }
  
  // Update gamification data
  await gamification.update({
    level: newLevel,
    experience: remainingXP,
    streakCount: updateStreak(gamification.lastUpdateDate, gamification.streakCount),
    totalXP: (gamification.totalXP || 0) + totalXP,
    lastUpdateDate: new Date()
  }, { transaction });
  
  // Check for achievements
  await checkAchievements(userId, gamification, metrics, session, transaction);
  
  return gamification;
}

/**
 * Check and award achievements
 * @param {string} userId - User ID
 * @param {Object} gamification - User's gamification data
 * @param {Object} metrics - Progress metrics
 * @param {Object} session - Workout session
 * @param {Transaction} transaction - Sequelize transaction
 * @returns {Promise<void>}
 */
async function checkAchievements(userId, gamification, metrics, session, transaction) {
  // Get all available achievements
  const achievements = await Achievement.findAll();
  
  // Get user's current achievements
  const userAchievements = await sequelize.models.UserAchievements.findAll({
    where: { userId }
  });
  
  const userAchievementIds = userAchievements.map(ua => ua.achievementId);
  
  // Check each achievement
  for (const achievement of achievements) {
    // Skip if user already has this achievement
    if (userAchievementIds.includes(achievement.id)) {
      continue;
    }
    
    // Check achievement criteria
    let achieved = false;
    
    switch (achievement.type) {
      case 'workout_count':
        // Check workout count criteria
        if (gamification.totalWorkouts >= achievement.criteria.count) {
          achieved = true;
        }
        break;
      
      case 'streak':
        // Check streak criteria
        if (gamification.streakCount >= achievement.criteria.days) {
          achieved = true;
        }
        break;
      
      case 'level':
        // Check level criteria
        if (gamification.level >= achievement.criteria.level) {
          achieved = true;
        }
        break;
      
      case 'exercise_specific':
        // Check if the workout included the specific exercise
        if (session.exercises.some(we => we.exerciseId === achievement.criteria.exerciseId)) {
          achieved = true;
        }
        break;
      
      case 'weight_lifted':
        // Check total weight lifted
        if (metrics.totalWeight >= achievement.criteria.weight) {
          achieved = true;
        }
        break;
      
      // Add more achievement types as needed
    }
    
    // If achievement is achieved, award it
    if (achieved) {
      await sequelize.models.UserAchievements.create({
        userId,
        achievementId: achievement.id,
        awardedAt: new Date()
      }, { transaction });
      
      // Add XP reward
      await gamification.update({
        totalXP: gamification.totalXP + (achievement.xpReward || 0),
        experience: gamification.experience + (achievement.xpReward || 0)
      }, { transaction });
    }
  }
}

/**
 * Get exercise recommendations for a user
 * @param {string} userId - User ID
 * @param {Object} options - Recommendation options
 * @returns {Promise<Array>} Array of recommended exercises
 */
async function getExerciseRecommendations(userId, options = {}) {
  const { 
    goal = 'general',
    difficulty = 'all',
    equipment = [],
    muscleGroups = [],
    excludeExercises = [],
    limit = 10,
    rehabFocus = false,
    optPhase = null
  } = options;
  
  // Get user's progress to tailor recommendations
  const clientProgress = await ClientProgress.findOne({
    where: { userId }
  });
  
  // Build query based on options
  const whereClause = {};
  const includeClause = [];
  
  // Filter by difficulty
  if (difficulty !== 'all') {
    whereClause.difficulty = difficulty;
  }
  
  // Filter by rehab focus
  if (rehabFocus) {
    whereClause.isRehabExercise = true;
  }
  
  // Filter by OPT phase
  if (optPhase) {
    whereClause.optPhase = optPhase;
  }
  
  // Exclude specific exercises
  if (excludeExercises.length > 0) {
    whereClause.id = { [Op.notIn]: excludeExercises };
  }
  
  // Filter by muscle groups
  if (muscleGroups.length > 0) {
    includeClause.push({
      model: MuscleGroup,
      as: 'muscleGroups',
      through: {
        where: {
          muscleGroupId: { [Op.in]: muscleGroups }
        }
      },
      required: true
    });
  } else {
    // Include muscle groups without requiring them
    includeClause.push({
      model: MuscleGroup,
      as: 'muscleGroups',
      required: false
    });
  }
  
  // Filter by equipment
  if (equipment.length > 0) {
    includeClause.push({
      model: Equipment,
      as: 'equipment',
      through: {
        where: {
          equipmentId: { [Op.in]: equipment }
        }
      },
      required: true
    });
  } else {
    // Include equipment without requiring it
    includeClause.push({
      model: Equipment,
      as: 'equipment',
      required: false
    });
  }
  
  // Get exercises
  const exercises = await Exercise.findAll({
    where: whereClause,
    include: includeClause,
    limit
  });
  
  // Sort exercises based on user's goals and progress
  if (clientProgress) {
    return sortExercisesByUserGoals(exercises, clientProgress, goal);
  }
  
  return exercises;
}

/**
 * Sort exercises based on user's goals and progress
 * @param {Array} exercises - Array of exercises
 * @param {Object} clientProgress - Client progress data
 * @param {string} goal - Training goal
 * @returns {Array} Sorted exercises
 */
function sortExercisesByUserGoals(exercises, clientProgress, goal) {
  // Create a scoring function based on the goal
  const scoreExercise = (exercise) => {
    let score = 0;
    
    switch (goal) {
      case 'strength':
        // Prioritize strength exercises
        if (exercise.category === 'strength' || exercise.category === 'power') {
          score += 10;
        }
        break;
      
      case 'cardio':
        // Prioritize cardio exercises
        if (exercise.category === 'cardio' || exercise.category === 'endurance') {
          score += 10;
        }
        break;
      
      case 'flexibility':
        // Prioritize flexibility exercises
        if (exercise.category === 'flexibility' || exercise.category === 'mobility') {
          score += 10;
        }
        break;
      
      case 'balance':
        // Prioritize balance exercises
        if (exercise.category === 'balance' || exercise.category === 'stability') {
          score += 10;
        }
        break;
      
      case 'hypertrophy':
        // Prioritize hypertrophy exercises
        if (exercise.category === 'hypertrophy') {
          score += 10;
        }
        break;
      
      case 'weight_loss':
        // Prioritize high-calorie burning exercises
        if (exercise.category === 'cardio' || exercise.category === 'endurance') {
          score += 8;
        }
        if (exercise.category === 'strength' || exercise.category === 'hypertrophy') {
          score += 5;
        }
        break;
      
      case 'rehabilitation':
        // Prioritize rehab exercises
        if (exercise.isRehabExercise) {
          score += 10;
        }
        break;
      
      case 'balanced':
      default:
        // Balanced approach - no specific prioritization
        break;
    }
    
    // Adjust score based on personal records
    if (clientProgress.personalRecords && clientProgress.personalRecords[exercise.id]) {
      // Add bonus for exercises the user has PRs in (they enjoy/succeed at these)
      score += 3;
    }
    
    // Add variety by slightly randomizing the score
    score += Math.random() * 2;
    
    return score;
  };
  
  // Score and sort exercises
  return exercises
    .map(exercise => ({
      exercise,
      score: scoreExercise(exercise)
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.exercise);
}

/**
 * Create a workout plan for a user
 * @param {Object} planData - Plan data
 * @returns {Promise<Object>} Created workout plan
 */
async function createWorkoutPlan(planData) {
  const transaction = await sequelize.transaction();
  
  try {
    // Create the workout plan
    const workoutPlan = await WorkoutPlan.create({
      name: planData.name,
      description: planData.description,
      trainerId: planData.trainerId,
      clientId: planData.clientId,
      goal: planData.goal,
      startDate: planData.startDate,
      endDate: planData.endDate,
      status: planData.status || 'active'
    }, { transaction });
    
    // Create workout plan days if provided
    if (planData.days && Array.isArray(planData.days)) {
      for (let i = 0; i < planData.days.length; i++) {
        const dayData = planData.days[i];
        
        // Create the workout plan day
        const workoutPlanDay = await WorkoutPlanDay.create({
          workoutPlanId: workoutPlan.id,
          dayNumber: dayData.dayNumber || i + 1,
          name: dayData.name || `Day ${i + 1}`,
          focus: dayData.focus,
          dayType: dayData.dayType || 'training',
          optPhase: dayData.optPhase,
          notes: dayData.notes,
          warmupInstructions: dayData.warmupInstructions,
          cooldownInstructions: dayData.cooldownInstructions,
          estimatedDuration: dayData.estimatedDuration,
          sortOrder: dayData.sortOrder || i + 1
        }, { transaction });
        
        // Create day exercises if provided
        if (dayData.exercises && Array.isArray(dayData.exercises)) {
          for (let j = 0; j < dayData.exercises.length; j++) {
            const exerciseData = dayData.exercises[j];
            
            // Create the workout plan day exercise
            await WorkoutPlanDayExercise.create({
              workoutPlanDayId: workoutPlanDay.id,
              exerciseId: exerciseData.exerciseId,
              orderInWorkout: exerciseData.orderInWorkout || j + 1,
              setScheme: exerciseData.setScheme,
              repGoal: exerciseData.repGoal,
              restPeriod: exerciseData.restPeriod,
              tempo: exerciseData.tempo,
              intensityGuideline: exerciseData.intensityGuideline,
              supersetGroup: exerciseData.supersetGroup,
              notes: exerciseData.notes,
              isOptional: exerciseData.isOptional || false,
              alternateExerciseId: exerciseData.alternateExerciseId
            }, { transaction });
          }
        }
      }
    }
    
    await transaction.commit();
    
    // Return the created plan with all its associations
    return getWorkoutPlanById(workoutPlan.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Get a workout plan by ID
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Workout plan
 */
async function getWorkoutPlanById(planId) {
  return WorkoutPlan.findByPk(planId, {
    include: [
      {
        model: User,
        as: 'trainer',
        attributes: ['id', 'firstName', 'lastName', 'role']
      },
      {
        model: User,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'role']
      },
      {
        model: WorkoutPlanDay,
        as: 'days',
        include: [
          {
            model: WorkoutPlanDayExercise,
            as: 'exercises',
            include: [
              {
                model: Exercise,
                as: 'exercise'
              },
              {
                model: Exercise,
                as: 'alternateExercise'
              }
            ]
          }
        ]
      }
    ]
  });
}

/**
 * Update a workout plan
 * @param {string} planId - Plan ID
 * @param {Object} planData - Updated plan data
 * @returns {Promise<Object>} Updated workout plan
 */
async function updateWorkoutPlan(planId, planData) {
  const transaction = await sequelize.transaction();
  
  try {
    // Get the existing plan
    const existingPlan = await WorkoutPlan.findByPk(planId);
    
    if (!existingPlan) {
      throw new Error('Workout plan not found');
    }
    
    // Update the plan fields
    await existingPlan.update({
      name: planData.name || existingPlan.name,
      description: planData.description || existingPlan.description,
      goal: planData.goal || existingPlan.goal,
      startDate: planData.startDate || existingPlan.startDate,
      endDate: planData.endDate || existingPlan.endDate,
      status: planData.status || existingPlan.status
    }, { transaction });
    
    // If day updates are provided
    if (planData.days && Array.isArray(planData.days)) {
      // Process each day
      for (const dayData of planData.days) {
        // If day has ID, update it
        if (dayData.id) {
          const day = await WorkoutPlanDay.findByPk(dayData.id);
          
          if (day && day.workoutPlanId === planId) {
            await day.update({
              name: dayData.name || day.name,
              focus: dayData.focus || day.focus,
              dayType: dayData.dayType || day.dayType,
              optPhase: dayData.optPhase || day.optPhase,
              notes: dayData.notes !== undefined ? dayData.notes : day.notes,
              warmupInstructions: dayData.warmupInstructions || day.warmupInstructions,
              cooldownInstructions: dayData.cooldownInstructions || day.cooldownInstructions,
              estimatedDuration: dayData.estimatedDuration || day.estimatedDuration,
              sortOrder: dayData.sortOrder || day.sortOrder
            }, { transaction });
            
            // Process day exercises if provided
            if (dayData.exercises && Array.isArray(dayData.exercises)) {
              for (const exerciseData of dayData.exercises) {
                // If exercise has ID, update it
                if (exerciseData.id) {
                  const exercise = await WorkoutPlanDayExercise.findByPk(exerciseData.id);
                  
                  if (exercise && exercise.workoutPlanDayId === day.id) {
                    await exercise.update({
                      exerciseId: exerciseData.exerciseId || exercise.exerciseId,
                      orderInWorkout: exerciseData.orderInWorkout || exercise.orderInWorkout,
                      setScheme: exerciseData.setScheme || exercise.setScheme,
                      repGoal: exerciseData.repGoal || exercise.repGoal,
                      restPeriod: exerciseData.restPeriod || exercise.restPeriod,
                      tempo: exerciseData.tempo || exercise.tempo,
                      intensityGuideline: exerciseData.intensityGuideline || exercise.intensityGuideline,
                      supersetGroup: exerciseData.supersetGroup || exercise.supersetGroup,
                      notes: exerciseData.notes !== undefined ? exerciseData.notes : exercise.notes,
                      isOptional: exerciseData.isOptional !== undefined ? exerciseData.isOptional : exercise.isOptional,
                      alternateExerciseId: exerciseData.alternateExerciseId || exercise.alternateExerciseId
                    }, { transaction });
                  }
                } else {
                  // Create new exercise
                  await WorkoutPlanDayExercise.create({
                    workoutPlanDayId: day.id,
                    exerciseId: exerciseData.exerciseId,
                    orderInWorkout: exerciseData.orderInWorkout,
                    setScheme: exerciseData.setScheme,
                    repGoal: exerciseData.repGoal,
                    restPeriod: exerciseData.restPeriod,
                    tempo: exerciseData.tempo,
                    intensityGuideline: exerciseData.intensityGuideline,
                    supersetGroup: exerciseData.supersetGroup,
                    notes: exerciseData.notes,
                    isOptional: exerciseData.isOptional || false,
                    alternateExerciseId: exerciseData.alternateExerciseId
                  }, { transaction });
                }
              }
            }
          }
        } else {
          // Create new day
          const newDay = await WorkoutPlanDay.create({
            workoutPlanId: planId,
            dayNumber: dayData.dayNumber,
            name: dayData.name,
            focus: dayData.focus,
            dayType: dayData.dayType || 'training',
            optPhase: dayData.optPhase,
            notes: dayData.notes,
            warmupInstructions: dayData.warmupInstructions,
            cooldownInstructions: dayData.cooldownInstructions,
            estimatedDuration: dayData.estimatedDuration,
            sortOrder: dayData.sortOrder
          }, { transaction });
          
          // Create day exercises if provided
          if (dayData.exercises && Array.isArray(dayData.exercises)) {
            for (let j = 0; j < dayData.exercises.length; j++) {
              const exerciseData = dayData.exercises[j];
              
              // Create the workout plan day exercise
              await WorkoutPlanDayExercise.create({
                workoutPlanDayId: newDay.id,
                exerciseId: exerciseData.exerciseId,
                orderInWorkout: exerciseData.orderInWorkout || j + 1,
                setScheme: exerciseData.setScheme,
                repGoal: exerciseData.repGoal,
                restPeriod: exerciseData.restPeriod,
                tempo: exerciseData.tempo,
                intensityGuideline: exerciseData.intensityGuideline,
                supersetGroup: exerciseData.supersetGroup,
                notes: exerciseData.notes,
                isOptional: exerciseData.isOptional || false,
                alternateExerciseId: exerciseData.alternateExerciseId
              }, { transaction });
            }
          }
        }
      }
    }
    
    await transaction.commit();
    
    // Return the updated plan
    return getWorkoutPlanById(planId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Delete a workout plan
 * @param {string} planId - Plan ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteWorkoutPlan(planId) {
  const plan = await WorkoutPlan.findByPk(planId);
  
  if (!plan) {
    throw new Error('Workout plan not found');
  }
  
  await plan.destroy();
  return true;
}

/**
 * Generate workout sessions from a workout plan
 * @param {string} planId - Plan ID
 * @param {Object} options - Generation options
 * @returns {Promise<Array>} Array of created workout sessions
 */
async function generateWorkoutSessions(planId, options = {}) {
  const { startDate = new Date(), weeks = 4, userId } = options;
  
  // Get the workout plan
  const workoutPlan = await getWorkoutPlanById(planId);
  
  if (!workoutPlan) {
    throw new Error('Workout plan not found');
  }
  
  // Verify the user is authorized for this plan
  if (userId && userId !== workoutPlan.clientId) {
    throw new Error('User not authorized for this workout plan');
  }
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    const createdSessions = [];
    
    // Get the days in order
    const days = workoutPlan.days.sort((a, b) => a.dayNumber - b.dayNumber);
    
    // Calculate total days in plan
    const totalDays = days.length;
    
    if (totalDays === 0) {
      throw new Error('Workout plan has no days defined');
    }
    
    // Generate sessions for the specified number of weeks
    const startDateObj = new Date(startDate);
    
    for (let week = 0; week < weeks; week++) {
      for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
        const day = days[dayIndex];
        
        // Calculate date for this session (start date + (week * 7 days) + day index)
        const sessionDate = new Date(startDateObj);
        sessionDate.setDate(sessionDate.getDate() + (week * 7) + dayIndex);
        
        // Create the workout session
        const session = await WorkoutSession.create({
          userId: userId || workoutPlan.clientId,
          workoutPlanId: workoutPlan.id,
          title: `${workoutPlan.name} - ${day.name} (Week ${week + 1})`,
          description: day.focus || workoutPlan.description,
          plannedStartTime: sessionDate,
          status: 'planned',
          notes: day.notes
        }, { transaction });
        
        // Get the exercises for this day
        const exercises = day.exercises.sort((a, b) => a.orderInWorkout - b.orderInWorkout);
        
        // Create workout exercises
        for (let i = 0; i < exercises.length; i++) {
          const exerciseData = exercises[i];
          
          // Create the workout exercise
          const workoutExercise = await WorkoutExercise.create({
            workoutSessionId: session.id,
            exerciseId: exerciseData.exerciseId,
            orderInWorkout: exerciseData.orderInWorkout,
            isRehabExercise: exerciseData.exercise?.isRehabExercise || false,
            notes: exerciseData.notes
          }, { transaction });
          
          // Parse set scheme and create sets
          const setScheme = exerciseData.setScheme || '3x10';
          const sets = parseSetScheme(setScheme);
          
          // Create the sets
          for (let j = 0; j < sets.length; j++) {
            await Set.create({
              workoutExerciseId: workoutExercise.id,
              setNumber: j + 1,
              setType: j === 0 && sets.length > 1 ? 'warmup' : 'working',
              repsGoal: exerciseData.repGoal ? parseInt(exerciseData.repGoal, 10) : sets[j],
              restGoal: exerciseData.restPeriod,
              tempo: exerciseData.tempo
            }, { transaction });
          }
        }
        
        createdSessions.push(session);
      }
    }
    
    await transaction.commit();
    
    // Return the created sessions with all associations
    const sessionIds = createdSessions.map(session => session.id);
    
    // Fetch complete sessions with associations
    return Promise.all(sessionIds.map(id => getWorkoutSessionById(id)));
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Parse set scheme string (e.g., "3x10" or "5,5,5")
 * @param {string} setScheme - Set scheme string
 * @returns {Array<number>} Array of reps per set
 */
function parseSetScheme(setScheme) {
  // Default to 3 sets of 10 reps
  if (!setScheme || typeof setScheme !== 'string') {
    return [10, 10, 10];
  }
  
  // Check for "sets x reps" format (e.g., "3x10")
  if (setScheme.includes('x')) {
    const parts = setScheme.split('x');
    const sets = parseInt(parts[0], 10) || 3;
    const reps = parseInt(parts[1], 10) || 10;
    
    return Array(sets).fill(reps);
  }
  
  // Check for comma-separated values (e.g., "12,10,8")
  if (setScheme.includes(',')) {
    return setScheme.split(',').map(rep => parseInt(rep.trim(), 10) || 10);
  }
  
  // Default to 3 sets of the specified reps (or 10 if invalid)
  const reps = parseInt(setScheme, 10) || 10;
  return [reps, reps, reps];
}

/**
 * Get client progress data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Client progress data
 */
async function getClientProgress(userId) {
  return ClientProgress.findOne({
    where: { userId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'role']
      }
    ]
  });
}

/**
 * Get workout statistics for a user
 * @param {string} userId - User ID 
 * @param {Object} options - Options for filtering the statistics
 * @returns {Promise<Object>} Workout statistics
 */
async function getWorkoutStatistics(userId, options = {}) {
  const { 
    startDate, 
    endDate,
    includeExerciseBreakdown = true,
    includeMuscleGroupBreakdown = true,
    includeWeekdayBreakdown = true,
    includeIntensityTrends = true
  } = options;
  
  // Build date filter
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.startedAt = {};
    if (startDate) dateFilter.startedAt[Op.gte] = new Date(startDate);
    if (endDate) dateFilter.startedAt[Op.lte] = new Date(endDate);
  }
  
  // Get all completed workout sessions
  const workouts = await WorkoutSession.findAll({
    where: {
      userId,
      status: 'completed',
      ...dateFilter
    },
    include: [
      {
        model: WorkoutExercise,
        as: 'exercises',
        include: [
          {
            model: Exercise,
            as: 'exercise',
            include: [
              {
                model: MuscleGroup,
                as: 'muscleGroups',
                through: { attributes: ['activationType'] }
              }
            ]
          },
          {
            model: Set,
            as: 'sets'
          }
        ]
      }
    ],
    order: [['startedAt', 'ASC']]
  });
  
  // Prepare statistics object
  const statistics = {
    totalWorkouts: workouts.length,
    totalDuration: 0,
    totalExercises: 0,
    totalSets: 0,
    totalReps: 0,
    totalWeight: 0,
    averageIntensity: 0,
    weekdayBreakdown: [0, 0, 0, 0, 0, 0, 0], // Sun-Sat
    exerciseBreakdown: {},
    muscleGroupBreakdown: {},
    intensityTrends: [],
    recentWorkouts: []
  };
  
  // If no workouts found, return the empty statistics
  if (workouts.length === 0) {
    return statistics;
  }
  
  // Prepare data for intensity trends
  let totalIntensity = 0;
  const intensityDataPoints = [];
  
  // Process each workout
  workouts.forEach(workout => {
    // Add to basic stats
    statistics.totalDuration += workout.duration || 0;
    statistics.totalExercises += workout.exercises.length;
    
    // Add to weekday breakdown
    const workoutDate = new Date(workout.startedAt || workout.completedAt || workout.createdAt);
    statistics.weekdayBreakdown[workoutDate.getDay()]++;
    
    // Add to intensity trends
    if (workout.intensityRating) {
      totalIntensity += workout.intensityRating;
      intensityDataPoints.push({
        date: workoutDate.toISOString().split('T')[0],
        intensity: workout.intensityRating
      });
    }
    
    // Process each exercise in the workout
    workout.exercises.forEach(workoutExercise => {
      const exercise = workoutExercise.exercise;
      
      if (!exercise) return;
      
      // Add to exercise breakdown
      if (includeExerciseBreakdown) {
        if (!statistics.exerciseBreakdown[exercise.id]) {
          statistics.exerciseBreakdown[exercise.id] = {
            name: exercise.name,
            count: 0,
            sets: 0,
            reps: 0,
            totalWeight: 0,
            category: exercise.category
          };
        }
        
        statistics.exerciseBreakdown[exercise.id].count++;
      }
      
      // Add to muscle group breakdown
      if (includeMuscleGroupBreakdown && exercise.muscleGroups) {
        const primaryMuscles = exercise.muscleGroups.filter(mg => 
          mg.ExerciseMuscleGroup && mg.ExerciseMuscleGroup.activationType === 'primary'
        );
        
        primaryMuscles.forEach(muscle => {
          if (!statistics.muscleGroupBreakdown[muscle.id]) {
            statistics.muscleGroupBreakdown[muscle.id] = {
              name: muscle.name,
              shortName: muscle.shortName,
              count: 0,
              bodyRegion: muscle.bodyRegion
            };
          }
          
          statistics.muscleGroupBreakdown[muscle.id].count++;
        });
      }
      
      // Process each set in the exercise
      workoutExercise.sets.forEach(set => {
        statistics.totalSets++;
        
        if (set.repsCompleted) {
          statistics.totalReps += set.repsCompleted;
          
          if (includeExerciseBreakdown) {
            statistics.exerciseBreakdown[exercise.id].sets++;
            statistics.exerciseBreakdown[exercise.id].reps += set.repsCompleted;
          }
        }
        
        if (set.weightUsed && set.repsCompleted) {
          const totalWeight = set.weightUsed * set.repsCompleted;
          statistics.totalWeight += totalWeight;
          
          if (includeExerciseBreakdown) {
            statistics.exerciseBreakdown[exercise.id].totalWeight += totalWeight;
          }
        }
      });
    });
    
    // Add to recent workouts list (limited to last 5)
    if (statistics.recentWorkouts.length < 5) {
      statistics.recentWorkouts.push({
        id: workout.id,
        title: workout.title,
        date: workoutDate.toISOString().split('T')[0],
        duration: workout.duration,
        exerciseCount: workout.exercises.length,
        intensity: workout.intensityRating
      });
    }
  });
  
  // Calculate average intensity
  if (totalIntensity > 0) {
    statistics.averageIntensity = totalIntensity / workouts.length;
  }
  
  // Prepare intensity trends by week (if requested)
  if (includeIntensityTrends) {
    // Group by week
    const weeklyIntensity = {};
    
    intensityDataPoints.forEach(point => {
      const date = new Date(point.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Beginning of the week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyIntensity[weekKey]) {
        weeklyIntensity[weekKey] = {
          week: weekKey,
          intensitySum: 0,
          count: 0
        };
      }
      
      weeklyIntensity[weekKey].intensitySum += point.intensity;
      weeklyIntensity[weekKey].count++;
    });
    
    // Calculate averages and format the trends
    statistics.intensityTrends = Object.values(weeklyIntensity)
      .map(weekData => ({
        week: weekData.week,
        averageIntensity: weekData.intensitySum / weekData.count
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }
  
  // Convert exercise breakdown from object to array for easier consumption
  if (includeExerciseBreakdown) {
    statistics.exerciseBreakdown = Object.keys(statistics.exerciseBreakdown)
      .map(id => ({
        id,
        ...statistics.exerciseBreakdown[id]
      }))
      .sort((a, b) => b.count - a.count);
  }
  
  // Convert muscle group breakdown from object to array
  if (includeMuscleGroupBreakdown) {
    statistics.muscleGroupBreakdown = Object.keys(statistics.muscleGroupBreakdown)
      .map(id => ({
        id,
        ...statistics.muscleGroupBreakdown[id]
      }))
      .sort((a, b) => b.count - a.count);
  }
  
  // Return the compiled statistics
  return statistics;
}

// Export all service functions
export default {
  // Workout Session functions
  getWorkoutSessions,
  getWorkoutSessionById,
  createWorkoutSession,
  updateWorkoutSession,
  deleteWorkoutSession,
  
  // Exercise functions
  getExerciseRecommendations,
  
  // Workout Plan functions
  createWorkoutPlan,
  getWorkoutPlanById,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  generateWorkoutSessions,
  
  // Progress functions
  updateClientProgress,
  getClientProgress,
  getWorkoutStatistics,
  
  // Helper functions (exported for testing)
  calculateProgressMetrics,
  calculateSetXP,
  calculateNewLevel,
  updateStreak,
  updatePersonalRecords,
  parseSetScheme
};