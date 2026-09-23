/**
 * bootcampGenerator.pure — the PURE half of the generator: structure" resolution,
 * intensity ranking, pool sizing, and the week-prescription volume math.
 * No DB, no models, no I/O — fully unit-testable in isolation.
 * Fable D-10 lineage: the <=300-line contract requires the I/O half and the
 * math half to live apart.
 */

import { canonicalizeMuscle, normalizeMuscleList } from './bootcampTaxonomy.mjs';


function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(Math.max(safe, min), max);
}


function hasAny(text, words) {
  return words.some(word => text.includes(word));
}

function exerciseSearchText(exercise) {
  return [
    exercise.name,
    exercise.key,
    exercise.exerciseType,
    exercise.bodyPartCategory,
    ...(Array.isArray(exercise.muscles) ? exercise.muscles : [exercise.muscles]),
    ...(Array.isArray(exercise.equipment) ? exercise.equipment : [exercise.equipment]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}


function scoreExerciseForIntensity(exercise, intensityCategory) {
  if (!intensityCategory) return 0;

  const text = exerciseSearchText(exercise);
  const difficulty = Number(exercise.difficulty ?? 500);
  const hasEquipment = !hasAny(text, ['bodyweight', 'none']) && hasAny(text, [
    'barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'bench',
  ]);

  switch (intensityCategory) {
    case 'high_impact':
      return (hasAny(text, ['jump', 'burpee', 'sprint', 'plyo', 'hop', 'bound']) ? 70 : 0)
        + (hasAny(text, ['mobility', 'stretch', 'recovery']) ? -35 : 0)
        + Math.min(20, difficulty / 50);
    case 'medium_impact':
      return (hasAny(text, ['compound', 'squat', 'row', 'press', 'lunge', 'hinge']) ? 45 : 0)
        + (hasAny(text, ['jump', 'burpee', 'sprint', 'plyo']) ? -40 : 0)
        + (difficulty >= 250 && difficulty <= 700 ? 15 : 0);
    case 'calisthenics':
      return (hasAny(text, ['bodyweight', 'push up', 'pull up', 'plank', 'squat', 'lunge']) ? 70 : 0)
        + (hasEquipment ? -35 : 0);
    case 'stability':
      return (hasAny(text, ['core', 'balance', 'stability', 'bosu', 'single', 'unilateral', 'plank']) ? 70 : 0)
        + (hasAny(text, ['jump', 'sprint']) ? -30 : 0);
    case 'flexibility':
      return (hasAny(text, ['stretch', 'mobility', 'flexibility', 'recovery', 'flow']) ? 80 : 0)
        + Math.max(0, 500 - difficulty) / 20;
    case 'cardio':
      return (hasAny(text, ['cardio', 'conditioning', 'jump', 'jack', 'sprint', 'burpee', 'climber']) ? 70 : 0)
        + (hasAny(text, ['mobility', 'stretch']) ? -35 : 0);
    default:
      return 0;
  }
}


export function rankExercisesForBootcamp(exercises, { intensityCategory } = {}) {
  if (!intensityCategory || !Array.isArray(exercises)) return exercises;

  return [...exercises]
    .map((exercise, index) => ({
      exercise,
      index,
      score: scoreExerciseForIntensity(exercise, intensityCategory),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.exercise);
}


export function resolveBootcampStructure({
  classFormat = '4x4_r2',
  stationCount,
  exercisesPerStation,
  targetDuration = 50,
} = {}) {
  const baseFormat = FORMAT_CONFIG[classFormat] ?? FORMAT_CONFIG['4x4_r2'];
  const hasCustomStructure = classFormat === 'custom' || stationCount != null || exercisesPerStation != null;

  if (!hasCustomStructure) {
    let resolvedStationCount;
    if (classFormat === 'full_group') {
      resolvedStationCount = 0;
    } else if (baseFormat.fixedStations) {
      resolvedStationCount = baseFormat.fixedStations;
    } else {
      const exerciseTimeSec = baseFormat.exercisesPerStation * baseFormat.durationSec;
      const stationTimeSec = exerciseTimeSec + (baseFormat.exercisesPerStation - 1) * TRANSITION_TIME_SEC + STATION_TRANSITION_SEC;
      resolvedStationCount = Math.max(4, Math.min(10, Math.floor((targetDuration * 60) / stationTimeSec)));
    }
    return { classFormat, format: baseFormat, stationCount: resolvedStationCount };
  }

  const resolvedStationCount = clampInt(
    stationCount,
    baseFormat.fixedStations || 4,
    CUSTOM_STRUCTURE_LIMITS.minStations,
    CUSTOM_STRUCTURE_LIMITS.maxStations,
  );
  const resolvedExercisesPerStation = clampInt(
    exercisesPerStation,
    baseFormat.exercisesPerStation || 4,
    CUSTOM_STRUCTURE_LIMITS.minExercisesPerStation,
    CUSTOM_STRUCTURE_LIMITS.maxExercisesPerStation,
  );
  const rounds = baseFormat.rounds || 2;
  const totalSlots = resolvedStationCount * resolvedExercisesPerStation * rounds;
  const transitionSec = resolvedStationCount * Math.max(0, resolvedExercisesPerStation - 1) * rounds * TRANSITION_TIME_SEC;
  const stationTransitionSec = Math.max(0, resolvedStationCount - 1) * STATION_TRANSITION_SEC;
  const availableWorkSec = (targetDuration * 60) - transitionSec - stationTransitionSec;
  const durationSec = Math.max(20, Math.min(60, Math.round(availableWorkSec / Math.max(1, totalSlots))));

  return {
    classFormat: 'custom',
    stationCount: resolvedStationCount,
    format: {
      ...baseFormat,
      exercisesPerStation: resolvedExercisesPerStation,
      durationSec,
      fixedStations: resolvedStationCount,
      rounds,
    },
  };
}


export function poolSlotsForClass(classFormat, stationCount, exercisesPerStation, finishersAppended) {
  if (classFormat === 'full_group') return 10;
  const perStation = Math.max(1, (exercisesPerStation ?? 4) - (finishersAppended ? 1 : 0));
  return Math.max(1, (stationCount ?? 0) * perStation);
}


export function estimateClassWorkoutSeconds(exerciseRows, rounds = 1, stationCount = 0, stationTransitionSec = 0) {
  const listTotal = (Array.isArray(exerciseRows) ? exerciseRows : [])
    .reduce((sum, ex) => sum + (Number(ex?.durationSec) || 0) + (Number(ex?.restSec) || 0), 0);
  const roundFactor = Math.max(1, Number(rounds) || 1);
  const transitions = Math.max(0, (Number(stationCount) || 0) - 1) * (Number(stationTransitionSec) || 0);
  return (listTotal * roundFactor) + transitions;
}


export function prescribedWorkSec(durationSec, prescriptionIntensity) {
  const base = Number(durationSec);
  if (!Number.isFinite(base) || base <= 0) return base;
  // P1.1 unit lock (Fable D-4): callers pass SECONDS. A base below 10 is a
  // rep-count-magnitude caller bug — throw instead of clamping it into a
  // plausible-looking interval.
  if (base < 10) {
    throw new TypeError(
      `prescribedWorkSec: durationSec must be SECONDS (got ${base}) — a rep count was likely passed`,
    );
  }
  const intensity = Number(prescriptionIntensity);
  if (!Number.isFinite(intensity) || intensity <= 0) return base;
  const scaled = Math.min(Math.max(intensity, 0.5), 2);
  if (scaled === 1) return base;
  return Math.max(10, Math.min(120, Math.round(base * scaled)));
}


export { scoreExerciseForIntensity, exerciseSearchText };
