import {
  CUSTOM_STRUCTURE_LIMITS,
  FORMAT_CONFIG,
  STATION_TRANSITION_SEC,
  TRANSITION_TIME_SEC,
} from './bootcampConstants.mjs';

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(Math.max(safe, min), max);
}

export function getRequiredEquipmentExerciseSlots({ classFormat, stationCount, format } = {}) {
  if (classFormat === 'full_group') return 15;
  const stations = Math.max(0, Number(stationCount) || 0);
  const perStation = Math.max(1, Number(format?.exercisesPerStation) || 1);
  return stations * Math.max(1, perStation - 1);
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
      const transitionCount = baseFormat.exercisesPerStation - 1;
      const stationTimeSec = exerciseTimeSec + transitionCount * TRANSITION_TIME_SEC + STATION_TRANSITION_SEC;
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
