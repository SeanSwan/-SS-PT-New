import { WorkoutSession, WorkoutExercise, Set, User } from '../models/index.mjs';
import { Op } from 'sequelize';

/**
 * NASM Progression Service
 * Implements NASM OPT Model progression tracking
 * Phases: Stabilization → Strength → Power
 * Automatically recommends progression based on performance
 */

/**
 * NASM OPT Model Phases
 */
const NASM_PHASES = {
  // Phase 1: Stabilization Endurance
  stabilization: {
    name: 'Stabilization Endurance',
    level: 1,
    focus: 'Muscular endurance and core stability',
    repRange: '12-20',
    sets: '1-3',
    tempo: '4-2-1 (slow eccentric)',
    rest: '0-90 seconds',
    intensity: 'Low to moderate',
    description: 'Build foundation, improve balance, develop proper movement patterns'
  },

  // Phase 2: Strength Endurance
  strengthEndurance: {
    name: 'Strength Endurance',
    level: 2,
    focus: 'Prime mover strength with stabilization',
    repRange: '8-12',
    sets: '2-4',
    tempo: '2-0-2 (moderate)',
    rest: '0-60 seconds',
    intensity: 'Moderate',
    description: 'Enhance stabilization endurance while increasing prime mover strength'
  },

  // Phase 3: Muscular Development (Hypertrophy)
  hypertrophy: {
    name: 'Muscular Development',
    level: 3,
    focus: 'Maximal muscle growth',
    repRange: '6-12',
    sets: '3-5',
    tempo: '2-0-2',
    rest: '0-60 seconds',
    intensity: 'Moderate to high',
    description: 'Achieve optimal muscle growth through progressive overload'
  },

  // Phase 4: Maximal Strength
  maxStrength: {
    name: 'Maximal Strength',
    level: 4,
    focus: 'Maximal prime mover strength',
    repRange: '1-5',
    sets: '4-6',
    tempo: 'Explosive',
    rest: '3-5 minutes',
    intensity: 'High (85-100% 1RM)',
    description: 'Develop maximum neuromuscular efficiency and strength'
  },

  // Phase 5: Power
  power: {
    name: 'Power',
    level: 5,
    focus: 'Rate of force production',
    repRange: '1-10',
    sets: '3-6',
    tempo: 'Explosive',
    rest: '3-5 minutes',
    intensity: 'High',
    description: 'Develop speed and explosive power'
  }
};

/**
 * Exercise categories for NASM progression
 */
const EXERCISE_CATEGORIES = {
  compound: ['squat', 'deadlift', 'bench press', 'overhead press', 'row', 'pull-up', 'lunge'],
  isolation: ['curl', 'extension', 'raise', 'fly', 'calf'],
  core: ['plank', 'crunch', 'rotation', 'anti-rotation'],
  balance: ['single-leg', 'balance', 'stability'],
  power: ['jump', 'throw', 'sprint', 'olympic', 'clean', 'snatch']
};

/**
 * Update client's NASM progress based on latest workout
 *
 * @param {string} userId - Client user ID
 * @param {string} workoutSessionId - Latest workout session ID
 * @returns {Object} Progress update with recommendations
 */
export async function updateClientProgress(userId, workoutSessionId) {
  try {
    // Get user's current NASM level (assumes User model has nasmLevel field)
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentLevel = user.nasmLevel || 'stabilization';

    // Get latest workout
    const workout = await WorkoutSession.findByPk(workoutSessionId, {
      include: [{
        model: WorkoutExercise,
        as: 'exercises',
        include: [{
          model: Set,
          as: 'sets'
        }]
      }]
    });

    if (!workout || !workout.exercises || workout.exercises.length === 0) {
      return {
        currentLevel,
        readyForProgression: false,
        message: 'No exercise data to analyze'
      };
    }

    // Analyze workout performance
    const performanceAnalysis = analyzeWorkoutPerformance(workout, currentLevel);

    // Check if client is ready to progress
    const progressionCheck = await checkProgressionReadiness(userId, currentLevel, performanceAnalysis);

    return {
      currentLevel,
      currentPhase: NASM_PHASES[currentLevel],
      performanceAnalysis,
      readyForProgression: progressionCheck.ready,
      nextLevel: progressionCheck.nextLevel,
      recommendations: progressionCheck.recommendations,
      progressScore: progressionCheck.score
    };

  } catch (error) {
    console.error('Error updating NASM progress:', error);
    throw error;
  }
}

/**
 * Analyze workout performance against NASM guidelines
 *
 * @param {Object} workout - WorkoutSession with exercises and sets
 * @param {string} currentLevel - Current NASM level
 * @returns {Object} Performance analysis
 */
function analyzeWorkoutPerformance(workout, currentLevel) {
  const phase = NASM_PHASES[currentLevel];
  const analysis = {
    adherence: {
      reps: 0,
      sets: 0,
      intensity: 0,
      overall: 0
    },
    exerciseBreakdown: {
      compound: 0,
      isolation: 0,
      core: 0,
      balance: 0,
      power: 0
    },
    volumeProgression: 0,
    formQuality: workout.intensity || 5, // Intensity can be proxy for form (1-10 scale)
    totalSets: 0,
    totalReps: 0
  };

  let repAdherence = 0;
  let setAdherence = 0;
  let totalExercises = 0;

  for (const exercise of workout.exercises) {
    totalExercises++;

    // Categorize exercise
    const category = categorizeNASMExercise(exercise.exerciseName);
    if (category) {
      analysis.exerciseBreakdown[category]++;
    }

    if (!exercise.sets || exercise.sets.length === 0) continue;

    const exerciseSets = exercise.sets.length;
    analysis.totalSets += exerciseSets;

    // Check set adherence
    const [minSets, maxSets] = phase.sets.split('-').map(s => parseInt(s.trim()));
    if (exerciseSets >= minSets && exerciseSets <= maxSets) {
      setAdherence++;
    }

    // Check rep adherence
    const [minReps, maxReps] = phase.repRange.split('-').map(r => parseInt(r.trim()));
    let repCount = 0;

    for (const set of exercise.sets) {
      const reps = parseInt(set.reps) || 0;
      repCount += reps;
      analysis.totalReps += reps;

      if (reps >= minReps && reps <= maxReps) {
        repAdherence++;
      }
    }
  }

  // Calculate adherence percentages
  if (totalExercises > 0) {
    analysis.adherence.sets = Math.round((setAdherence / totalExercises) * 100);
  }

  if (analysis.totalSets > 0) {
    analysis.adherence.reps = Math.round((repAdherence / analysis.totalSets) * 100);
  }

  // Intensity adherence based on workout.intensity
  const targetIntensity = getTargetIntensityForPhase(currentLevel);
  if (workout.intensity) {
    const intensityDiff = Math.abs(workout.intensity - targetIntensity);
    analysis.adherence.intensity = Math.max(0, 100 - (intensityDiff * 20));
  }

  // Overall adherence
  analysis.adherence.overall = Math.round(
    (analysis.adherence.reps + analysis.adherence.sets + analysis.adherence.intensity) / 3
  );

  return analysis;
}

/**
 * Categorize exercise for NASM tracking
 *
 * @param {string} exerciseName - Exercise name
 * @returns {string|null} Category
 */
function categorizeNASMExercise(exerciseName) {
  if (!exerciseName) return null;

  const name = exerciseName.toLowerCase();

  for (const exercise of EXERCISE_CATEGORIES.compound) {
    if (name.includes(exercise)) return 'compound';
  }

  for (const exercise of EXERCISE_CATEGORIES.power) {
    if (name.includes(exercise)) return 'power';
  }

  for (const exercise of EXERCISE_CATEGORIES.core) {
    if (name.includes(exercise)) return 'core';
  }

  for (const exercise of EXERCISE_CATEGORIES.balance) {
    if (name.includes(exercise)) return 'balance';
  }

  for (const exercise of EXERCISE_CATEGORIES.isolation) {
    if (name.includes(exercise)) return 'isolation';
  }

  return 'other';
}

/**
 * Get target intensity for NASM phase
 *
 * @param {string} level - NASM level
 * @returns {number} Target intensity (1-10)
 */
function getTargetIntensityForPhase(level) {
  switch (level) {
    case 'stabilization': return 4;
    case 'strengthEndurance': return 5;
    case 'hypertrophy': return 6;
    case 'maxStrength': return 8;
    case 'power': return 9;
    default: return 5;
  }
}

/**
 * Check if client is ready to progress to next NASM phase
 *
 * @param {string} userId - User ID
 * @param {string} currentLevel - Current NASM level
 * @param {Object} performanceAnalysis - Latest performance analysis
 * @returns {Object} Progression readiness assessment
 */
async function checkProgressionReadiness(userId, currentLevel, performanceAnalysis) {
  try {
    // Get last 6 workouts to assess consistency
    const recentWorkouts = await WorkoutSession.findAll({
      where: {
        userId,
        status: 'completed'
      },
      order: [['sessionDate', 'DESC']],
      limit: 6,
      include: [{
        model: WorkoutExercise,
        as: 'exercises',
        include: [{
          model: Set,
          as: 'sets'
        }]
      }]
    });

    if (recentWorkouts.length < 4) {
      return {
        ready: false,
        score: 0,
        nextLevel: null,
        recommendations: ['Complete at least 4 workouts at current level before progressing']
      };
    }

    // Calculate average adherence over recent workouts
    let totalAdherence = 0;
    let totalVolume = 0;
    let volumeIncreasing = false;

    for (let i = 0; i < recentWorkouts.length; i++) {
      const workout = recentWorkouts[i];
      const analysis = analyzeWorkoutPerformance(workout, currentLevel);
      totalAdherence += analysis.adherence.overall;

      // Calculate volume for this workout
      let workoutVolume = 0;
      if (workout.exercises) {
        for (const exercise of workout.exercises) {
          if (exercise.sets) {
            for (const set of exercise.sets) {
              const weight = parseFloat(set.weight) || 0;
              const reps = parseInt(set.reps) || 0;
              workoutVolume += weight * reps;
            }
          }
        }
      }
      totalVolume += workoutVolume;

      // Check if volume is increasing (compare first 3 to last 3 workouts)
      if (i === 2 && recentWorkouts.length >= 6) {
        const recentAvgVolume = totalVolume / 3;
        let olderVolume = 0;

        for (let j = 3; j < 6; j++) {
          const oldWorkout = recentWorkouts[j];
          if (oldWorkout.exercises) {
            for (const exercise of oldWorkout.exercises) {
              if (exercise.sets) {
                for (const set of exercise.sets) {
                  const weight = parseFloat(set.weight) || 0;
                  const reps = parseInt(set.reps) || 0;
                  olderVolume += weight * reps;
                }
              }
            }
          }
        }

        const olderAvgVolume = olderVolume / 3;
        volumeIncreasing = recentAvgVolume > olderAvgVolume * 1.1; // 10% increase
      }
    }

    const avgAdherence = totalAdherence / recentWorkouts.length;

    // Progression criteria
    const criteriaScore = {
      adherence: avgAdherence >= 75, // 75%+ adherence
      consistency: recentWorkouts.length >= 6, // 6+ workouts
      volumeProgression: volumeIncreasing,
      formQuality: performanceAnalysis.formQuality >= 6 // Intensity/form score >= 6
    };

    const score = Object.values(criteriaScore).filter(Boolean).length;
    const ready = score >= 3; // Need 3 out of 4 criteria

    // Determine next level
    const levelOrder = ['stabilization', 'strengthEndurance', 'hypertrophy', 'maxStrength', 'power'];
    const currentIndex = levelOrder.indexOf(currentLevel);
    const nextLevel = currentIndex < levelOrder.length - 1 ? levelOrder[currentIndex + 1] : null;

    // Generate recommendations
    const recommendations = [];

    if (!criteriaScore.adherence) {
      recommendations.push(`Improve adherence to ${NASM_PHASES[currentLevel].name} guidelines (current: ${avgAdherence.toFixed(0)}%, need: 75%+)`);
    }
    if (!criteriaScore.consistency) {
      recommendations.push(`Complete ${6 - recentWorkouts.length} more consistent workouts`);
    }
    if (!criteriaScore.volumeProgression) {
      recommendations.push('Focus on progressive overload - gradually increase weight or reps');
    }
    if (!criteriaScore.formQuality) {
      recommendations.push('Improve form quality before progressing (target intensity/form score: 6+)');
    }

    if (ready && nextLevel) {
      recommendations.push(`Ready to progress to ${NASM_PHASES[nextLevel].name}!`);
      recommendations.push(`Next phase focus: ${NASM_PHASES[nextLevel].focus}`);
    }

    return {
      ready,
      score: (score / 4) * 100,
      nextLevel: ready ? nextLevel : null,
      criteriaScore,
      avgAdherence: parseFloat(avgAdherence.toFixed(1)),
      recommendations
    };

  } catch (error) {
    console.error('Error checking progression readiness:', error);
    throw error;
  }
}

/**
 * Get NASM phase recommendations for a user
 *
 * @param {string} level - NASM level
 * @returns {Object} Phase recommendations
 */
export function getPhaseRecommendations(level) {
  const phase = NASM_PHASES[level];

  if (!phase) {
    return NASM_PHASES.stabilization;
  }

  return {
    ...phase,
    sampleWorkout: getSampleWorkoutForPhase(level)
  };
}

/**
 * Get sample workout structure for NASM phase
 *
 * @param {string} level - NASM level
 * @returns {Object} Sample workout structure
 */
function getSampleWorkoutForPhase(level) {
  const samples = {
    stabilization: {
      warmUp: '5-10 minutes cardio + dynamic stretching',
      coreAndBalance: '1-2 exercises, 1-2 sets, 12-20 reps',
      resistance: '1 set of 12-20 reps per exercise, 4-6 exercises',
      coolDown: 'Static stretching, 5-10 minutes'
    },
    strengthEndurance: {
      warmUp: '5-10 minutes cardio + dynamic stretching',
      coreAndBalance: '2 exercises, 2 sets, 12-15 reps',
      resistance: 'Superset: 1 strength + 1 stabilization per body part, 2-4 sets, 8-12 reps',
      coolDown: 'Static stretching, 5-10 minutes'
    },
    hypertrophy: {
      warmUp: '5-10 minutes cardio + dynamic stretching',
      resistance: '3-5 sets of 6-12 reps per exercise, 6-8 exercises, focus on time under tension',
      coolDown: 'Static stretching, 5-10 minutes'
    },
    maxStrength: {
      warmUp: '5-10 minutes cardio + dynamic stretching + activation',
      resistance: '4-6 sets of 1-5 reps, heavy weight (85-100% 1RM), 2-4 exercises',
      coolDown: 'Static stretching, 5-10 minutes'
    },
    power: {
      warmUp: '10 minutes cardio + dynamic stretching + activation',
      resistance: 'Superset: 1 strength + 1 power exercise, 3-6 sets, explosive movement',
      coolDown: 'Static stretching, 5-10 minutes'
    }
  };

  return samples[level] || samples.stabilization;
}

/**
 * Calculate category level based on exercise history
 *
 * @param {Array} exercises - Exercise history
 * @param {string} currentLevel - Current NASM level
 * @returns {Object} Category-specific level recommendations
 */
export function calculateCategoryLevel(exercises, currentLevel) {
  // Analyze exercise distribution
  const categoryCount = {
    compound: 0,
    isolation: 0,
    core: 0,
    balance: 0,
    power: 0
  };

  for (const exercise of exercises) {
    const category = categorizeNASMExercise(exercise.exerciseName);
    if (category && categoryCount[category] !== undefined) {
      categoryCount[category]++;
    }
  }

  // Recommend focus areas based on phase
  const recommendations = {};

  switch (currentLevel) {
    case 'stabilization':
      recommendations.focus = ['core', 'balance', 'compound'];
      recommendations.minimize = ['isolation', 'power'];
      break;
    case 'strengthEndurance':
      recommendations.focus = ['compound', 'core'];
      recommendations.minimize = ['power'];
      break;
    case 'hypertrophy':
      recommendations.focus = ['compound', 'isolation'];
      recommendations.minimize = ['power', 'balance'];
      break;
    case 'maxStrength':
      recommendations.focus = ['compound'];
      recommendations.minimize = ['isolation', 'balance'];
      break;
    case 'power':
      recommendations.focus = ['power', 'compound'];
      recommendations.minimize = ['isolation'];
      break;
  }

  return {
    currentDistribution: categoryCount,
    recommendations
  };
}
