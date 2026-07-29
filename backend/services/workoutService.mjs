/**
 * Workout Service
 * ==============
 * Enhanced with coordinated model imports and modern best practices
 * Business logic for workout management, including session tracking,
 * exercise recommendations, progress analysis, and plan creation.
 */

import { Op } from 'sequelize';
import sequelize from '../database.mjs';

// 🚀 ENHANCED: Coordinated model imports for consistent associations
import { getAllModels } from '../models/index.mjs';

// 🎯 ENHANCED P0 FIX: Lazy loading models to prevent initialization race condition
// Models will be retrieved via getAllModels() inside each service function when needed

const MAX_REPS_FOR_XP = 20;
const MAX_WEIGHT_BONUS_FOR_XP = 30;
const MAX_RPE_FOR_XP = 10;
const MAX_FORM_RATING_FOR_XP = 10;
const MIN_FORM_RATING_FOR_XP = 0;
let gamificationPointsServiceModule;

async function getGamificationPointsService() {
  if (!gamificationPointsServiceModule) {
    gamificationPointsServiceModule = (await import('./gamification/GamificationPointsService.mjs')).default;
  }
  return gamificationPointsServiceModule;
}

const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

function toFinitePrimitiveNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}

function toPositiveNumber(value) {
  const numeric = toFinitePrimitiveNumber(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function clampNumber(value, min, max) {
  const numeric = toFinitePrimitiveNumber(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(Math.max(numeric, min), max);
}

function toNonNegativeInteger(value) {
  const numeric = toFinitePrimitiveNumber(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : 0;
}

/**
 * 🚀 ENHANCED: Get workout sessions with simplified query building
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, offset, status)
 * @returns {Promise<Array>} Array of workout sessions
 */
async function getWorkoutSessions(userId, options = {}) {
  // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
  const models = getAllModels();
  const { WorkoutSession, WorkoutExercise, Exercise, MuscleGroup, Set, WorkoutLog } = models;

  // Canonical-surface-audit 2026-04-12 fix: admin logger writes detail rows
  // into WorkoutLog (not WorkoutExercise), leaves startedAt null, and sets
  // date+completedAt. Without these changes, trainer-logged sessions render
  // with "No exercise data recorded" and sort to the bottom via NULLS LAST.
  const { limit = 10, offset = 0, status, startDate, endDate, sort, order = 'DESC' } = options;

  // Where clause — filter by `date` (admin logger's canonical column)
  // rather than `startedAt` (null for trainer-logged rows).
  const whereClause = { userId, ...(status && { status }) };
  if (startDate || endDate) {
    whereClause.date = {
      ...(startDate && { [Op.gte]: new Date(startDate) }),
      ...(endDate && { [Op.lte]: new Date(endDate) })
    };
  }

  // Exercise sub-includes — only add associations whose join tables exist
  const exerciseIncludes = [];
  if (MuscleGroup) {
    exerciseIncludes.push({
      model: MuscleGroup,
      as: 'muscleGroups',
      through: {
        attributes: ['activationType', 'activationLevel'],
        where: { activationType: 'primary' },
        required: false
      },
      required: false
    });
  }
  // Equipment association skipped — exercise_equipment join table does not exist in production

  // Build include list. Both hasMany relations use `separate: true` so they
  // each run as an independent SELECT keyed on the parent row ids. Without
  // separate, stacking two hasMany includes under a parent LIMIT produces
  // row multiplication that breaks LIMIT semantics and can return the wrong
  // parent rows.
  const include = [];

  // Primary canonical source for trainer-logged detail rows. The admin
  // workout logger writes one WorkoutLog row per set via bulkCreate.
  if (WorkoutLog) {
    include.push({
      model: WorkoutLog,
      as: 'logs',
      separate: true,
      required: false,
      attributes: ['id', 'exerciseName', 'setNumber', 'reps', 'weight', 'tempo', 'rest', 'rpe', 'notes'],
      order: [['setNumber', 'ASC']],
    });
  }

  // Legacy normalized workout structure — still supported for consumers
  // that expect the WorkoutExercise → Exercise → Set chain.
  if (WorkoutExercise) {
    const exerciseInnerIncludes = [];
    if (Exercise) {
      // Note: no `category` column — Exercise model has id/name/description/difficulty/exerciseType.
      // Pre-existing stale attribute was previously masked by the controller's silent-failure
      // fallback on SequelizeDatabaseError; removed here so `separate:true` includes can succeed.
      exerciseInnerIncludes.push({
        model: Exercise,
        as: 'exercise',
        attributes: ['id', 'name', 'description', 'difficulty', 'exerciseType'],
        include: exerciseIncludes,
      });
    }
    if (Set) {
      exerciseInnerIncludes.push({
        model: Set,
        as: 'sets',
        order: [['setNumber', 'ASC']],
      });
    }
    include.push({
      model: WorkoutExercise,
      as: 'exercises',
      separate: true,
      required: false,
      include: exerciseInnerIncludes,
    });
  }

  // Ordering: an explicit caller sort always wins (back-compat). Default
  // fallback ranks trainer-logged (startedAt=null, completedAt+date=set)
  // and self-logged sessions fairly via a Postgres literal with NULLS LAST.
  const orderClause = sort
    ? [[sort, order]]
    : sequelize.literal('"completedAt" DESC NULLS LAST, "date" DESC NULLS LAST, "startedAt" DESC NULLS LAST');

  return WorkoutSession.findAll({
    where: whereClause,
    include,
    order: orderClause,
    limit,
    offset,
  });
}

/**
 * Get a single workout session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Workout session
 */
async function getWorkoutSessionById(sessionId) {
  // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
  const models = getAllModels();
  const { WorkoutSession, User, WorkoutExercise, Exercise, MuscleGroup, Equipment, Set, WorkoutPlan } = models;
  
  // Build Exercise sub-includes — skip Equipment (join table missing in prod)
  const exerciseIncludes = [];
  if (MuscleGroup) {
    exerciseIncludes.push({
      model: MuscleGroup,
      as: 'muscleGroups',
      through: { attributes: ['activationType', 'activationLevel'] },
      required: false
    });
  }

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
        required: false,
        include: [
          {
            model: Exercise,
            as: 'exercise',
            // Canonical-surface-audit 2026-04-13: `category` column does not exist on
            // Exercise model (see backend/models/Exercise.mjs). Stale attribute removed
            // here to match the sibling fix already landed on getWorkoutSessions.
            attributes: ['id', 'name', 'description', 'difficulty', 'exerciseType'],
            include: exerciseIncludes
          },
          {
            model: Set,
            as: 'sets',
            order: [['setNumber', 'ASC']]
          }
        ]
      },
      ...(WorkoutPlan ? [{
        model: WorkoutPlan,
        as: 'workoutPlan',
        attributes: ['id', 'title', 'description'],
        required: false
      }] : [])
    ]
  });
}

/**
 * Create a new workout session
 * @param {Object} sessionData - Session data object
 * @returns {Promise<Object>} Created workout session
 */
async function createWorkoutSession(sessionData) {
  // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
  const models = getAllModels();
  const { WorkoutSession, WorkoutExercise, Set } = models;
  const clientRequestId = sessionData.clientRequestId || null;
  
  // Start a transaction to ensure all operations succeed or fail together
  const transaction = await sequelize.transaction();
  
  try {
    // Create the workout session
    const workoutSession = await WorkoutSession.create({
      userId: sessionData.userId,
      workoutPlanId: sessionData.workoutPlanId,
      title: sessionData.title,
      date: sessionData.sessionDate || sessionData.date || sessionData.plannedStartTime,
      duration: sessionData.duration,
      intensity: sessionData.intensity,
      clientRequestId: sessionData.clientRequestId || null,
      startedAt: sessionData.actualStartTime,
      completedAt: sessionData.actualEndTime,
      status: sessionData.status || 'planned',
      notes: sessionData.notes
    }, { transaction });
    
    // Workout-OS C5 FREEZE: the normalized WorkoutExercise/Set store is frozen —
    // canonical sets live in workout_logs (POST /api/workout-forms). Readers keep
    // serving any historical rows; NO new legacy rows are written from any lane.

    await transaction.commit();
    
    // Return the created session with all its associations
    return getWorkoutSessionById(workoutSession.id);
  } catch (error) {
    await transaction.rollback();

    // The canonical /api/workout/sessions path must replay only the composite
    // per-user retry-key conflict. Other unique failures remain real errors.
    const IDEM_INDEX = 'workout_sessions_user_client_request_uidx';
    const isIdempotencyConflict = error?.name === 'SequelizeUniqueConstraintError'
      && clientRequestId
      && (
        Object.prototype.hasOwnProperty.call(error?.fields || {}, 'clientRequestId')
        || error?.original?.constraint === IDEM_INDEX
        || error?.parent?.constraint === IDEM_INDEX
      );
    if (isIdempotencyConflict) {
      const existing = await WorkoutSession.findOne({
        where: { userId: sessionData.userId, clientRequestId }
      });
      if (existing) {
        return getWorkoutSessionById(existing.id);
      }
    }

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
  const { WorkoutSession, WorkoutExercise, Set } = getAllModels();
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
    
    // Workout-OS C5 FREEZE: the normalized WorkoutExercise/Set store is frozen —
    // canonical sets live in workout_logs (POST /api/workout-forms). Readers keep
    // serving any historical rows; NO new legacy rows are written from any lane.

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
  const { WorkoutSession } = getAllModels();
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
  const { WorkoutSession, WorkoutExercise, Exercise, Set, ClientProgress } = getAllModels();
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
    currentStreak: updateStreak(clientProgress.lastWorkoutDate, clientProgress.currentStreak)
    // NOTE (Δ3/M10): the legacy `personalRecords` write was removed — ClientProgress has no
    // such column, so Sequelize silently dropped it. PRs are the durable `personal_records`
    // table (workoutPrDetectionService), the single source of truth.
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
    totalWeight: 0
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
  const repsCompleted = toPositiveNumber(set.repsCompleted);
  const weightUsed = toPositiveNumber(set.weightUsed);
  const rpe = clampNumber(set.rpe, 0, MAX_RPE_FOR_XP);
  const formRating = clampNumber(workoutExercise.formRating, MIN_FORM_RATING_FOR_XP, MAX_FORM_RATING_FOR_XP);

  // Base XP for completing a set
  xp += 5;

  // XP based on reps
  if (repsCompleted) {
    xp += Math.min(repsCompleted, MAX_REPS_FOR_XP);
  }

  // XP based on weight
  if (weightUsed) {
    xp += Math.min(Math.floor(weightUsed / 10), MAX_WEIGHT_BONUS_FOR_XP);
  }

  // XP based on RPE
  if (rpe) {
    xp += rpe;
  }

  // XP multiplier based on form rating
  if (formRating) {
    xp *= (0.8 + (formRating / 10));
  }
  
  // XP bonus for PR
  if (set.isPR) {
    xp *= 1.5;
  }
  
  return Math.max(0, Math.round(xp));
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
 * Update gamification data based on workout
 * @param {string} userId - User ID
 * @param {Object} metrics - Progress metrics
 * @param {Object} session - Workout session
 * @param {Transaction} transaction - Sequelize transaction
 * @returns {Promise<Object>} Updated gamification data
 */
async function updateGamification(userId, metrics, session, transaction) {
  const { Gamification } = getAllModels();
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
  if (totalXP > 0) {
    const GamificationPointsService = await getGamificationPointsService();
    await GamificationPointsService.recordLedgerEntry({
      userId,
      points: totalXP,
      transactionType: 'earn',
      source: 'workout_completion',
      sourceId: null,
      description: 'Workout session completed',
      metadata: {
        reason: 'workout_service_session_completed',
        workoutSessionId: session.id ?? null,
        strengthXP: metrics.strengthXP,
        cardioXP: metrics.cardioXP,
        flexibilityXP: metrics.flexibilityXP,
        balanceXP: metrics.balanceXP,
        coreXP: metrics.coreXP,
      },
      awardedBy: null,
      idempotencyKey: `workout-service:${userId}:${session.id ?? 'unknown'}:completion`,
      maxPoints: Math.max(totalXP, 500),
    }, transaction);
  }

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
  const totalExercises = Array.isArray(session.exercises) ? session.exercises.length : 0;
  const nextStreakCount = updateStreak(gamification.lastUpdateDate, gamification.streakCount);
  const nextTotalWorkouts = (gamification.totalWorkouts || 0) + 1;
  const nextTotalExercises = (gamification.totalExercises || 0) + totalExercises;

  // Keep the legacy gamification profile's non-ledger state in sync. Visible
  // point balance is written through PointTransaction/User via the ledger above.
  await gamification.update({
    level: newLevel,
    experience: remainingXP,
    streakCount: nextStreakCount,
    totalWorkouts: nextTotalWorkouts,
    totalExercises: nextTotalExercises,
    lastUpdateDate: new Date()
  }, { transaction });

  // Check for achievements
  await checkAchievements(userId, {
    level: newLevel,
    experience: remainingXP,
    streakCount: nextStreakCount,
    totalWorkouts: nextTotalWorkouts,
    totalExercises: nextTotalExercises,
  }, metrics, session, transaction);
  
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
  const { Achievement } = getAllModels();
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

      const rewardPoints = toNonNegativeInteger(achievement.xpReward);
      if (rewardPoints > 0) {
        const GamificationPointsService = await getGamificationPointsService();
        await GamificationPointsService.recordLedgerEntry({
          userId,
          points: rewardPoints,
          transactionType: 'bonus',
          source: 'achievement_earned',
          sourceId: null,
          description: 'Workout achievement earned',
          metadata: {
            reason: 'workout_service_achievement',
            achievementId: achievement.id,
            achievementType: achievement.type,
            workoutSessionId: session.id ?? null,
          },
          awardedBy: null,
          idempotencyKey: `workout-service-achievement:${userId}:${achievement.id}`,
        }, transaction);
      }
    }
  }
}

/**
 * Get exercise recommendations for a user
 * @param {string} userId - User ID
 * @param {Object} options - Recommendation options
 * @returns {Promise<Array>} Array of recommended exercises
 */
const normalizeDifficultyFilter = (difficulty) => {
  if (!difficulty || difficulty === 'all') return null;
  if (typeof difficulty === 'number') return difficulty;

  const normalized = String(difficulty).trim().toLowerCase();
  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) return numeric;

  const difficultyBands = {
    beginner: [0, 333],
    easy: [0, 333],
    low: [0, 333],
    intermediate: [334, 666],
    medium: [334, 666],
    moderate: [334, 666],
    advanced: [667, 1000],
    hard: [667, 1000],
    high: [667, 1000],
  };

  return difficultyBands[normalized]
    ? { [Op.between]: difficultyBands[normalized] }
    : null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BODY_REGION_ALIASES = new Map([
  ['upper_body', 'upper_body'],
  ['upper body', 'upper_body'],
  ['upper-body', 'upper_body'],
  ['upper', 'upper_body'],
  ['arms', 'upper_body'],
  ['chest', 'upper_body'],
  ['back', 'upper_body'],
  ['shoulders', 'upper_body'],
  ['lower_body', 'lower_body'],
  ['lower body', 'lower_body'],
  ['lower-body', 'lower_body'],
  ['lower', 'lower_body'],
  ['legs', 'lower_body'],
  ['leg', 'lower_body'],
  ['glutes', 'lower_body'],
  ['quads', 'lower_body'],
  ['hamstrings', 'lower_body'],
  ['core', 'core'],
  ['abs', 'core'],
  ['abdominals', 'core'],
  ['full_body', 'full_body'],
  ['full body', 'full_body'],
  ['full-body', 'full_body'],
  ['total body', 'full_body'],
  ['total-body', 'full_body'],
]);

const normalizeStringList = (value, maxItems = 10) => {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, maxItems);
};

const normalizeLikeToken = (value) => String(value || '')
  .trim()
  .replace(/[%_]/g, '')
  .slice(0, 80);

const normalizeBodyRegions = (values) => [...new Set(
  normalizeStringList(values)
    .map((value) => BODY_REGION_ALIASES.get(value.toLowerCase()))
    .filter(Boolean)
)];

const buildMuscleGroupWhere = ({ muscleGroups = [], muscleGroupNames = [], bodyRegions = [] }) => {
  const requestedMuscleGroups = normalizeStringList(muscleGroups);
  const muscleGroupIds = requestedMuscleGroups.filter((value) => UUID_PATTERN.test(value));
  const spokenMuscleGroups = requestedMuscleGroups.filter((value) => !UUID_PATTERN.test(value));
  const nameFilters = [...spokenMuscleGroups, ...normalizeStringList(muscleGroupNames)]
    .map(normalizeLikeToken)
    .filter(Boolean);
  const regionFilters = normalizeBodyRegions([...bodyRegions, ...spokenMuscleGroups]);
  const filters = [];

  if (muscleGroupIds.length > 0) {
    filters.push({ id: { [Op.in]: muscleGroupIds } });
  }

  if (regionFilters.length > 0) {
    filters.push({ bodyRegion: { [Op.in]: regionFilters } });
  }

  nameFilters.forEach((name) => {
    filters.push({ name: { [Op.iLike]: `%${name}%` } });
    filters.push({ shortName: { [Op.iLike]: `%${name}%` } });
  });

  return filters.length > 0 ? { [Op.or]: filters } : null;
};

const REHAB_EXERCISE_TYPE_FILTER = [
  'injury_prevention',
  'injury_recovery',
  'flexibility',
  'stability',
];

async function getExerciseRecommendations(userId, options = {}) {
  const { ClientProgress, MuscleGroup, Exercise } = getAllModels();
  const {
    goal = 'general',
    difficulty = 'all',
    equipment = [],
    muscleGroups = [],
    muscleGroupNames = [],
    bodyRegions = [],
    excludeExercises = [],
    limit = 10,
    rehabFocus = false,
    optPhase = null,
    libraryMode = false
  } = options;

  // Get user's progress to tailor recommendations
  const clientProgress = libraryMode ? null : await ClientProgress.findOne({
    where: { userId }
  });
  
  // Build query based on options
  const whereClause = {};
  const includeClause = [];
  
  // Filter by difficulty
  const difficultyFilter = normalizeDifficultyFilter(difficulty);
  if (difficultyFilter !== null) {
    whereClause.difficulty = difficultyFilter;
  }
  
  // Filter by rehab focus
  if (rehabFocus) {
    whereClause[Op.or] = [
      { exerciseType: { [Op.in]: REHAB_EXERCISE_TYPE_FILTER } },
      { cesProtocolStep: { [Op.ne]: null } },
    ];
  }
  
  // Filter by OPT phase
  if (optPhase) {
    whereClause.optPhases = { [Op.iLike]: `%${optPhase}%` };
  }
  
  // Exclude specific exercises
  if (excludeExercises.length > 0) {
    whereClause.id = { [Op.notIn]: excludeExercises };
  }
  
  const muscleGroupWhere = buildMuscleGroupWhere({ muscleGroups, muscleGroupNames, bodyRegions });
  if (MuscleGroup && muscleGroupWhere) {
    includeClause.push({
      model: MuscleGroup,
      as: 'muscleGroups',
      where: muscleGroupWhere,
      required: true
    });
  }
  
  // Equipment association skipped: exercise_equipment is absent in production.
  // The Exercise catalog carries equipmentNeeded as a JSON-encoded text column.
  if (equipment.length > 0) {
    whereClause.equipmentNeeded = {
      [Op.or]: equipment.map(item => ({ [Op.iLike]: `%${item}%` }))
    };
  }
  
  // Get exercises
  const exercises = await Exercise.findAll({
    where: whereClause,
    include: includeClause,
    limit
  });
  
  // Sort exercises based on user's goals and progress
  if (clientProgress) {
    return sortExercisesByUserGoals(exercises, clientProgress, goal, userId);
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
function deterministicExerciseTieBreaker(userId, exerciseId) {
  const seed = `${userId || ''}:${exerciseId || ''}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) >>> 0;
  }

  return (hash % 200) / 100;
}

function sortExercisesByUserGoals(exercises, clientProgress, goal, userId) {
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
    
    // Stable tie-breaker keeps repeated recommendations deterministic.
    score += deterministicExerciseTieBreaker(userId, exercise.id);
    
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
  const { WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise } = getAllModels();
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
  const { WorkoutPlan, User, WorkoutPlanDay, WorkoutPlanDayExercise, Exercise } = getAllModels();
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
  const { WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise } = getAllModels();
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
  const { WorkoutPlan } = getAllModels();
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
  const { WorkoutSession, WorkoutExercise, Set } = getAllModels();
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
        
        // Workout-OS C5 FREEZE: the normalized WorkoutExercise/Set store is frozen —
        // canonical sets live in workout_logs (POST /api/workout-forms). Readers keep
        // serving any historical rows; NO new legacy rows are written from any lane.

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
 * Get client progress data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Client progress data
 */
async function getClientProgress(userId) {
  const { ClientProgress, User } = getAllModels();
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
  const { WorkoutSession, WorkoutExercise, Exercise, MuscleGroup, Set } = getAllModels();
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
};
