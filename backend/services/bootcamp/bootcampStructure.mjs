/**
 * ============================================================================
 * FILE: backend/services/bootcamp/bootcampStructure.mjs
 *
 * PURPOSE: how a requested class format becomes a concrete, legal structure — the class format
 * actually used, the station count, and the per-exercise work interval for a custom build.
 *
 * WHY IT IS ITS OWN MODULE. `bootcampGenerator.mjs` has been over the rule-4 line cap since
 * before this repair (966 lines at the baseline commit, 1029 now) and an external review
 * pointed out that the cap is enforced everywhere except the file the H20 work kept editing.
 * This is the one cohesive, PURE unit in it: no I/O, no clock, no ORM, one caller plus a few
 * tests — so extracting it is mechanical rather than a rewrite.
 *
 * `bootcampGenerator.mjs` re-exports it, so every existing import path and test is unchanged.
 * ============================================================================
 */

import {
  FORMAT_CONFIG, TRANSITION_TIME_SEC, STATION_TRANSITION_SEC, CUSTOM_STRUCTURE_LIMITS,
} from './bootcampConstants.mjs';

/** A bounded integer, or the fallback when the value is not a number at all. */
export function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(Math.max(safe, min), max);
}

export function resolveBootcampStructure({
  classFormat = '4x4_r2',
  stationCount,
  exercisesPerStation,
  targetDuration = 50,
} = {}) {
  // Hostile-review (writer sweep): the LABEL must match the config actually
  // used. `baseFormat` already falls back to 4x4_r2 for an unknown format, but
  // the returned `classFormat` used to be the RAW requested value — so an
  // unknown format produced a class built as 4x4_r2 while claiming to be
  // something else. That label then propagated to the client and back into a
  // save, where the enum-backed contract correctly rejects it (400): the trainer
  // saw a class that generated fine and could never be saved.
  const resolvedClassFormat = FORMAT_CONFIG[classFormat] ? classFormat : '4x4_r2';
  const baseFormat = FORMAT_CONFIG[resolvedClassFormat];
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
    return { classFormat: resolvedClassFormat, format: baseFormat, stationCount: resolvedStationCount };
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

export default resolveBootcampStructure;
