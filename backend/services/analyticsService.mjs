import { WorkoutSession, WorkoutExercise, Set, User, Session, sequelize } from '../models/index.mjs';
import { Op } from 'sequelize';

/**
 * Analytics Service
 * Processes workout data for visualization and insights
 * Pools data from both solo client workouts AND trainer-led sessions
 */

/**
 * Calculate total volume and reps by exercise category
 * Used for strength profile radar chart and exercise distribution
 *
 * @param {string} userId - User ID
 * @param {Object} options - Time range and filter options
 * @returns {Object} Exercise totals by category
 */
export async function calculateExerciseTotals(userId, options = {}) {
  try {
    const whereClause = {
      userId,
      status: 'completed'
      // NOTE: No filter on sessionType - includes BOTH 'solo' and 'trainer-led'
    };

    // Apply date range filter
    if (options.startDate || options.endDate) {
      whereClause.sessionDate = {};
      if (options.startDate) whereClause.sessionDate[Op.gte] = options.startDate;
      if (options.endDate) whereClause.sessionDate[Op.lte] = options.endDate;
    }

    // Get all workout sessions
    const workoutSessions = await WorkoutSession.findAll({
      where: whereClause,
      include: [{
        model: WorkoutExercise,
        as: 'exercises',
        include: [{
          model: Set,
          as: 'sets'
        }]
      }],
      order: [['sessionDate', 'DESC']]
    });

    // Initialize category totals
    const categoryTotals = {
      chest: { volume: 0, reps: 0, exercises: 0, sessions: 0 },
      back: { volume: 0, reps: 0, exercises: 0, sessions: 0 },
      shoulders: { volume: 0, reps: 0, exercises: 0, sessions: 0 },
      arms: { volume: 0, reps: 0, exercises: 0, sessions: 0 },
      legs: { volume: 0, reps: 0, exercises: 0, sessions: 0 },
      core: { volume: 0, reps: 0, exercises: 0, sessions: 0 },
      cardio: { volume: 0, reps: 0, exercises: 0, sessions: 0 }
    };

    const sessionsWithCategory = new Set();

    // Process each workout session
    for (const workout of workoutSessions) {
      if (!workout.exercises || workout.exercises.length === 0) continue;

      const sessionCategories = new Set();

      for (const exercise of workout.exercises) {
        const category = categorizeExercise(exercise.exerciseName);

        if (!category) continue;

        sessionCategories.add(category);

        // Count exercise
        categoryTotals[category].exercises++;

        // Calculate volume and reps from sets
        if (exercise.sets && exercise.sets.length > 0) {
          for (const set of exercise.sets) {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps) || 0;
            const volume = weight * reps;

            categoryTotals[category].volume += volume;
            categoryTotals[category].reps += reps;
          }
        }
      }

      // Count sessions per category
      sessionCategories.forEach(cat => {
        categoryTotals[cat].sessions++;
        sessionsWithCategory.add(workout.id);
      });
    }

    // Calculate averages
    const totals = {
      categories: {},
      totalSessions: workoutSessions.length,
      totalExercises: 0,
      totalVolume: 0,
      totalReps: 0
    };

    for (const [category, data] of Object.entries(categoryTotals)) {
      totals.categories[category] = {
        totalVolume: Math.round(data.volume),
        totalReps: data.reps,
        totalExercises: data.exercises,
        sessionsCount: data.sessions,
        avgVolumePerSession: data.sessions > 0 ? Math.round(data.volume / data.sessions) : 0,
        avgRepsPerSession: data.sessions > 0 ? Math.round(data.reps / data.sessions) : 0
      };

      totals.totalExercises += data.exercises;
      totals.totalVolume += data.volume;
      totals.totalReps += data.reps;
    }

    totals.totalVolume = Math.round(totals.totalVolume);

    return totals;

  } catch (error) {
    console.error('Error calculating exercise totals:', error);
    throw error;
  }
}

/**
 * Categorize exercise by name
 * Maps exercise names to muscle group categories
 *
 * @param {string} exerciseName - Name of exercise
 * @returns {string|null} Category name or null
 */
function categorizeExercise(exerciseName) {
  if (!exerciseName) return null;

  const name = exerciseName.toLowerCase();

  // Chest exercises
  if (name.includes('bench') || name.includes('chest') || name.includes('press') && (name.includes('chest') || name.includes('pec'))) {
    return 'chest';
  }

  // Back exercises
  if (name.includes('row') || name.includes('pull') || name.includes('back') || name.includes('lat') || name.includes('deadlift')) {
    return 'back';
  }

  // Shoulder exercises
  if (name.includes('shoulder') || name.includes('overhead') || name.includes('military press') || name.includes('lateral') || name.includes('delt')) {
    return 'shoulders';
  }

  // Arm exercises
  if (name.includes('curl') || name.includes('tricep') || name.includes('bicep') || name.includes('arm')) {
    return 'arms';
  }

  // Leg exercises
  if (name.includes('squat') || name.includes('leg') || name.includes('lunge') || name.includes('calf') || name.includes('quad') || name.includes('hamstring')) {
    return 'legs';
  }

  // Core exercises
  if (name.includes('crunch') || name.includes('plank') || name.includes('ab') || name.includes('core') || name.includes('sit-up')) {
    return 'core';
  }

  // Cardio exercises
  if (name.includes('run') || name.includes('bike') || name.includes('cardio') || name.includes('treadmill') || name.includes('elliptical')) {
    return 'cardio';
  }

  return 'other';
}

/**
 * Calculate volume over time for trend analysis
 * Used for volume progression charts
 *
 * @param {string} userId - User ID
 * @param {Object} options - Time range and grouping options
 * @returns {Array} Time series data points
 */
export async function calculateVolumeOverTime(userId, options = {}) {
  try {
    const { startDate, endDate, groupBy = 'week' } = options;

    const whereClause = {
      userId,
      status: 'completed'
    };

    if (startDate || endDate) {
      whereClause.sessionDate = {};
      if (startDate) whereClause.sessionDate[Op.gte] = startDate;
      if (endDate) whereClause.sessionDate[Op.lte] = endDate;
    }

    const workoutSessions = await WorkoutSession.findAll({
      where: whereClause,
      include: [{
        model: WorkoutExercise,
        as: 'exercises',
        include: [{
          model: Set,
          as: 'sets'
        }]
      }],
      order: [['sessionDate', 'ASC']]
    });

    // Group sessions by time period
    const groupedData = {};

    for (const workout of workoutSessions) {
      const dateKey = getDateGroupKey(workout.sessionDate, groupBy);

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {
          date: dateKey,
          volume: 0,
          reps: 0,
          exercises: 0,
          sessions: 0,
          avgIntensity: 0,
          intensitySum: 0
        };
      }

      let sessionVolume = 0;
      let sessionReps = 0;

      if (workout.exercises && workout.exercises.length > 0) {
        for (const exercise of workout.exercises) {
          groupedData[dateKey].exercises++;

          if (exercise.sets && exercise.sets.length > 0) {
            for (const set of exercise.sets) {
              const weight = parseFloat(set.weight) || 0;
              const reps = parseInt(set.reps) || 0;
              const volume = weight * reps;

              sessionVolume += volume;
              sessionReps += reps;
            }
          }
        }
      }

      groupedData[dateKey].volume += sessionVolume;
      groupedData[dateKey].reps += sessionReps;
      groupedData[dateKey].sessions++;
      groupedData[dateKey].intensitySum += workout.intensity || 0;
    }

    // Calculate averages and format data
    const timeSeriesData = Object.values(groupedData).map(group => ({
      date: group.date,
      totalVolume: Math.round(group.volume),
      totalReps: group.reps,
      totalExercises: group.exercises,
      sessionsCount: group.sessions,
      avgVolumePerSession: Math.round(group.volume / group.sessions),
      avgIntensity: group.sessions > 0 ? (group.intensitySum / group.sessions).toFixed(1) : 0
    }));

    return timeSeriesData;

  } catch (error) {
    console.error('Error calculating volume over time:', error);
    throw error;
  }
}

/**
 * Get date group key for time series grouping
 *
 * @param {Date} date - Date to group
 * @param {string} groupBy - Grouping period (day, week, month)
 * @returns {string} Date key
 */
function getDateGroupKey(date, groupBy) {
  const d = new Date(date);

  if (groupBy === 'day') {
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  } else if (groupBy === 'week') {
    const year = d.getFullYear();
    const week = getWeekNumber(d);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  } else if (groupBy === 'month') {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  return d.toISOString().split('T')[0];
}

/**
 * Get ISO week number
 *
 * @param {Date} date - Date
 * @returns {number} Week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Calculate session usage statistics
 * Shows how client is using their session package (solo vs trainer-led ratio)
 *
 * @param {string} userId - User ID
 * @param {Object} options - Filter options
 * @returns {Object} Usage statistics
 */
export async function calculateSessionUsageStats(userId, options = {}) {
  try {
    const whereClause = {
      userId,
      status: 'completed'
    };

    if (options.startDate || options.endDate) {
      whereClause.sessionDate = {};
      if (options.startDate) whereClause.sessionDate[Op.gte] = options.startDate;
      if (options.endDate) whereClause.sessionDate[Op.lte] = options.endDate;
    }

    const [soloCount, trainerLedCount, totalWorkouts] = await Promise.all([
      WorkoutSession.count({
        where: { ...whereClause, sessionType: 'solo' }
      }),
      WorkoutSession.count({
        where: { ...whereClause, sessionType: 'trainer-led' }
      }),
      WorkoutSession.count({ where: whereClause })
    ]);

    const soloPercentage = totalWorkouts > 0 ? ((soloCount / totalWorkouts) * 100).toFixed(1) : 0;
    const trainerLedPercentage = totalWorkouts > 0 ? ((trainerLedCount / totalWorkouts) * 100).toFixed(1) : 0;

    return {
      total: totalWorkouts,
      solo: {
        count: soloCount,
        percentage: parseFloat(soloPercentage)
      },
      trainerLed: {
        count: trainerLedCount,
        percentage: parseFloat(trainerLedPercentage)
      }
    };

  } catch (error) {
    console.error('Error calculating session usage stats:', error);
    throw error;
  }
}

/**
 * Get personal records for a client
 * Finds maximum weight lifted for each exercise
 *
 * @param {string} userId - User ID
 * @returns {Array} Array of personal records
 */
export async function getPersonalRecords(userId) {
  try {
    const workoutSessions = await WorkoutSession.findAll({
      where: {
        userId,
        status: 'completed'
      },
      include: [{
        model: WorkoutExercise,
        as: 'exercises',
        include: [{
          model: Set,
          as: 'sets'
        }]
      }]
    });

    const exerciseRecords = {};

    for (const workout of workoutSessions) {
      if (!workout.exercises) continue;

      for (const exercise of workout.exercises) {
        const exerciseName = exercise.exerciseName;

        if (!exercise.sets || exercise.sets.length === 0) continue;

        for (const set of exercise.sets) {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;

          if (weight === 0) continue;

          if (!exerciseRecords[exerciseName]) {
            exerciseRecords[exerciseName] = {
              exerciseName,
              maxWeight: weight,
              repsAtMax: reps,
              date: workout.sessionDate,
              sessionId: workout.id
            };
          } else if (weight > exerciseRecords[exerciseName].maxWeight) {
            exerciseRecords[exerciseName].maxWeight = weight;
            exerciseRecords[exerciseName].repsAtMax = reps;
            exerciseRecords[exerciseName].date = workout.sessionDate;
            exerciseRecords[exerciseName].sessionId = workout.id;
          }
        }
      }
    }

    return Object.values(exerciseRecords).sort((a, b) => b.maxWeight - a.maxWeight);

  } catch (error) {
    console.error('Error getting personal records:', error);
    throw error;
  }
}

/**
 * Get workout frequency statistics
 *
 * @param {string} userId - User ID
 * @param {number} days - Number of days to analyze (default 30)
 * @returns {Object} Frequency statistics
 */
export async function getWorkoutFrequency(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const workouts = await WorkoutSession.findAll({
      where: {
        userId,
        status: 'completed',
        sessionDate: { [Op.gte]: startDate }
      },
      order: [['sessionDate', 'ASC']]
    });

    const totalWorkouts = workouts.length;
    const avgPerWeek = (totalWorkouts / days) * 7;

    // Calculate streak (consecutive days with workouts)
    let currentStreak = 0;
    let longestStreak = 0;
    let streakDays = 0;

    const workoutDates = workouts.map(w => new Date(w.sessionDate).toISOString().split('T')[0]);
    const uniqueDates = [...new Set(workoutDates)].sort();

    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) {
        streakDays = 1;
      } else {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          streakDays++;
        } else {
          if (streakDays > longestStreak) longestStreak = streakDays;
          streakDays = 1;
        }
      }
    }

    if (streakDays > longestStreak) longestStreak = streakDays;

    // Check if streak is current
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (uniqueDates.includes(today) || uniqueDates.includes(yesterdayStr)) {
      currentStreak = streakDays;
    }

    return {
      period: `${days} days`,
      totalWorkouts,
      avgPerWeek: parseFloat(avgPerWeek.toFixed(1)),
      currentStreak,
      longestStreak,
      uniqueWorkoutDays: uniqueDates.length
    };

  } catch (error) {
    console.error('Error getting workout frequency:', error);
    throw error;
  }
}
