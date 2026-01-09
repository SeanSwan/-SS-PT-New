/**
 * AI Exercise Alternatives Service
 * Provides exercise substitutions and modifications
 */

import { CircuitBreaker } from '../circuitBreaker.mjs';
import { logger } from '../../utils/logger.mjs';

const alternativesBreaker = new CircuitBreaker({
  name: 'exercise-alternatives',
  failureThreshold: 5,
  recoveryTimeout: 60000,
  halfOpenMaxRequests: 3
});

/**
 * Get exercise alternatives based on equipment, limitations, or preferences
 */
export async function getExerciseAlternatives(originalExercise, userConstraints) {
  return alternativesBreaker.execute(async () => {
    logger.info('Getting exercise alternatives', { originalExercise, userConstraints });
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const alternatives = {
      original: originalExercise,
      alternatives: [],
      modifications: []
    };
    
    const exerciseMap = {
      'squat': {
        alternatives: ['goblet squat', 'bulgarian split squat', 'leg press', 'pistol squat progression'],
        equipment: ['dumbbell', 'kettlebell', 'bodyweight', 'machine'],
        difficulty: ['beginner', 'intermediate', 'advanced']
      },
      'deadlift': {
        alternatives: ['romanian deadlift', 'sumo deadlift', 'kettlebell swing', 'hip thrust'],
        equipment: ['barbell', 'dumbbell', 'kettlebell', 'bodyweight'],
        difficulty: ['beginner', 'intermediate', 'advanced']
      },
      'bench press': {
        alternatives: ['dumbbell press', 'push-ups', 'machine press', 'floor press'],
        equipment: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
        difficulty: ['beginner', 'intermediate', 'advanced']
      },
      'overhead press': {
        alternatives: ['dumbbell shoulder press', 'landmine press', 'pike push-ups', 'Arnold press'],
        equipment: ['barbell', 'dumbbell', 'bodyweight'],
        difficulty: ['beginner', 'intermediate', 'advanced']
      }
    };
    
    const key = originalExercise.toLowerCase();
    const mapping = exerciseMap[key];
    
    if (mapping) {
      alternatives.alternatives = mapping.alternatives.map(alt => ({
        name: alt,
        equipment: mapping.equipment[Math.floor(Math.random() * mapping.equipment.length)],
        difficulty: mapping.difficulty[Math.floor(Math.random() * mapping.difficulty.length)],
        similarity: Math.floor(Math.random() * 20) + 80 // 80-100% similarity
      }));
      
      // Add modifications
      alternatives.modifications = [
        'Tempo variation (slow eccentric)',
        'Range of motion reduction',
        'Stability challenge',
        'Unilateral version'
      ];
    } else {
      alternatives.alternatives = [
        { name: 'General alternative', equipment: 'bodyweight', difficulty: 'intermediate', similarity: 75 }
      ];
      alternatives.modifications = ['Reduce weight', 'Increase rest', 'Modify range'];
    }
    
    return alternatives;
  });
}

/**
 * Get equipment-free alternatives
 */
export async function getBodyweightAlternatives(weightedExercise) {
  return alternativesBreaker.execute(async () => {
    logger.info('Getting bodyweight alternatives', { weightedExercise });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const bodyweightMap = {
      'barbell squat': ['pistol squat', 'sissy squat', 'wall sit', 'jump squat'],
      'dumbbell press': ['push-ups', 'diamond push-ups', 'decline push-ups', 'handstand push-up progression'],
      'cable row': ['inverted rows', 'towel rows', 'doorframe rows'],
      'machine leg press': ['sissy squat', 'wall sit', 'step-ups'],
      'lat pulldown': ['pull-ups', 'chin-ups', 'Australian pull-ups']
    };
    
    const key = weightedExercise.toLowerCase();
    const alternatives = bodyweightMap[key] || ['Push-ups', 'Squats', 'Lunges', 'Plank'];
    
    return {
      original: weightedExercise,
      bodyweightAlternatives: alternatives,
      progression: 'Start with easier variations, progress to harder ones'
    };
  });
}

/**
 * Get modifications for injuries or limitations
 */
export async function getInjuryModifications(exercise, limitation) {
  return alternativesBreaker.execute(async () => {
    logger.info('Getting injury modifications', { exercise, limitation });
    
    await new Promise(resolve => setTimeout(resolve, 120));
    
    const modifications = {
      exercise,
      limitation,
      modifications: [],
      warnings: []
    };
    
    const limitationMap = {
      'knee pain': {
        modifications: ['Reduce depth', 'Use box squat', 'Focus on hip hinge', 'Avoid jumping'],
        warnings: ['Monitor pain levels', 'Consider medical evaluation']
      },
      'shoulder pain': {
        modifications: ['Neutral grip', 'Reduce range', 'Avoid overhead', 'Use machines'],
        warnings: ['Stop if sharp pain', 'Warm up thoroughly']
      },
      'lower back pain': {
        modifications: ['Avoid spinal loading', 'Use belt', 'Focus on core bracing', 'Reduce weight'],
        warnings: ['Consult professional', 'Avoid flexion under load']
      },
      'wrist pain': {
        modifications: ['Neutral wrist', 'Use straps', 'Avoid pressing', 'Use dumbbells'],
        warnings: ['Check grip technique', 'Consider wrist wraps']
      }
    };
    
    const key = limitation.toLowerCase();
    const mapping = limitationMap[key];
    
    if (mapping) {
      modifications.modifications = mapping.modifications;
      modifications.warnings = mapping.warnings;
    } else {
      modifications.modifications = ['Reduce intensity', 'Increase rest', 'Modify range'];
      modifications.warnings = ['Monitor symptoms', 'Consult professional if needed'];
    }
    
    return modifications;
  });
}

/**
 * Get exercise progressions/regressions
 */
export async function getExerciseProgression(exercise, currentLevel) {
  return alternativesBreaker.execute(async () => {
    logger.info('Getting exercise progression', { exercise, currentLevel });
    
    await new Promise(resolve => setTimeout(resolve, 90));
    
    const progressions = {
      exercise,
      currentLevel,
      regression: [],
      progression: []
    };
    
    const progressionMap = {
      'push-up': {
        regression: ['wall push-up', 'incline push-up', 'knee push-up'],
        progression: ['standard push-up', 'decline push-up', 'diamond push-up', 'handstand push-up']
      },
      'squat': {
        regression: ['box squat', 'goblet squat', 'bodyweight squat'],
        progression: ['back squat', 'front squat', 'overhead squat', 'pistol squat']
      },
      'pull-up': {
        regression: ['Australian pull-up', 'band-assisted', 'negative reps'],
        progression: ['standard pull-up', 'weighted pull-up', 'one-arm progression']
      },
      'plank': {
        regression: ['knee plank', 'incline plank'],
        progression: ['standard plank', 'weighted plank', 'one-arm plank', 'ring plank']
      }
    };
    
    const key = exercise.toLowerCase();
    const mapping = progressionMap[key];
    
    if (mapping) {
      progressions.regression = mapping.regression;
      progressions.progression = mapping.progression;
    } else {
      progressions.regression = ['Reduce weight', 'Reduce range', 'Use assistance'];
      progressions.progression = ['Increase weight', 'Increase range', 'Reduce assistance'];
    }
    
    return progressions;
  });
}

/**
 * Get exercise pairings (supersets, circuits)
 */
export async function getExercisePairings(exercise, goal) {
  return alternativesBreaker.execute(async () => {
    logger.info('Getting exercise pairings', { exercise, goal });
    
    await new Promise(resolve => setTimeout(resolve, 80));
    
    const pairings = {
      exercise,
      goal,
      supersets: [],
      circuits: []
    };
    
    const pairingMap = {
      'squat': {
        supersets: ['Romanian deadlift', 'Leg curl', 'Calf raise', 'Core work'],
        circuits: ['Squat + Push-up + Row', 'Squat + Plank + Lunges']
      },
      'bench press': {
        supersets: ['Row', 'Face pulls', 'Tricep extension', 'Bicep curl'],
        circuits: ['Bench + Pull-up + Dip', 'Bench + Row + Core']
      },
      'deadlift': {
        supersets: ['Pull-up', 'Row', 'Shoulder press', 'Core'],
        circuits: ['Deadlift + Push-up + Row', 'Deadlift + Plank + Lunges']
      },
      'overhead press': {
        supersets: ['Pull-up', 'Row', 'Lateral raise', 'Front raise'],
        circuits: ['Press + Pull-up + Squat', 'Press + Row + Core']
      }
    };
    
    const key = exercise.toLowerCase();
    const mapping = pairingMap[key];
    
    if (mapping) {
      pairings.supersets = mapping.supersets;
      pairings.circuits = mapping.circuits;
    } else {
      pairings.supersets = ['Core work', 'Cardio burst', 'Mobility'];
      pairings.circuits = ['Full body circuit'];
    }
    
    return pairings;
  });
}