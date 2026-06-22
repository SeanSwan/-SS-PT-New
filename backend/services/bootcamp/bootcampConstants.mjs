/**
 * ============================================================================
 * FILE: bootcampConstants.mjs
 * PURPOSE: Constants, exercise data, and helper functions for bootcamp generation
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */

// ── Class Format Configs ──────────────────────────────────────────────

export const FORMAT_CONFIG = {
  // ── 2 Exercises per Station ──
  '2x5_r4':  { exercisesPerStation: 2, durationSec: 30, fixedStations: 5, rounds: 4 },
  '2x5_r3':  { exercisesPerStation: 2, durationSec: 30, fixedStations: 5, rounds: 3 },
  '2x6_r3':  { exercisesPerStation: 2, durationSec: 35, fixedStations: 6, rounds: 3 },
  '2x6_r2':  { exercisesPerStation: 2, durationSec: 35, fixedStations: 6, rounds: 2 },
  '2x7_r3':  { exercisesPerStation: 2, durationSec: 30, fixedStations: 7, rounds: 3 },
  '2x7_r2':  { exercisesPerStation: 2, durationSec: 30, fixedStations: 7, rounds: 2 },
  '2x8_r3':  { exercisesPerStation: 2, durationSec: 30, fixedStations: 8, rounds: 3 },
  '2x8_r2':  { exercisesPerStation: 2, durationSec: 35, fixedStations: 8, rounds: 2 },
  '2x10_r2': { exercisesPerStation: 2, durationSec: 30, fixedStations: 10, rounds: 2 },

  // ── 3 Exercises per Station ──
  '3x4_r3':  { exercisesPerStation: 3, durationSec: 30, fixedStations: 4, rounds: 3 },
  '3x4_r2':  { exercisesPerStation: 3, durationSec: 35, fixedStations: 4, rounds: 2 },
  '3x5_r2':  { exercisesPerStation: 3, durationSec: 35, fixedStations: 5, rounds: 2 },
  '3x5_r3':  { exercisesPerStation: 3, durationSec: 30, fixedStations: 5, rounds: 3 },
  '3x6_r2':  { exercisesPerStation: 3, durationSec: 30, fixedStations: 6, rounds: 2 },
  '3x6_r1':  { exercisesPerStation: 3, durationSec: 35, fixedStations: 6, rounds: 1 },
  '3x8_r1':  { exercisesPerStation: 3, durationSec: 30, fixedStations: 8, rounds: 1 },

  // ── 4 Exercises per Station ──
  '4x4_r2':  { exercisesPerStation: 4, durationSec: 30, fixedStations: 4, rounds: 2 },
  '4x4_r1':  { exercisesPerStation: 4, durationSec: 35, fixedStations: 4, rounds: 1 },
  '4x5_r2':  { exercisesPerStation: 4, durationSec: 30, fixedStations: 5, rounds: 2 },
  '4x5_r1':  { exercisesPerStation: 4, durationSec: 35, fixedStations: 5, rounds: 1 },
  '4x6_r1':  { exercisesPerStation: 4, durationSec: 35, fixedStations: 6, rounds: 1 },

  // ── 5 Exercises per Station ──
  '5x3_r2':  { exercisesPerStation: 5, durationSec: 30, fixedStations: 3, rounds: 2 },
  '5x3_r1':  { exercisesPerStation: 5, durationSec: 30, fixedStations: 3, rounds: 1 },
  '5x4_r1':  { exercisesPerStation: 5, durationSec: 30, fixedStations: 4, rounds: 1 },

  // ── Legacy aliases (for existing saved templates) ──
  stations_4x:  { exercisesPerStation: 4, durationSec: 35, fixedStations: 5, rounds: 2 },
  stations_3x5: { exercisesPerStation: 3, durationSec: 40, fixedStations: 5, rounds: 2 },
  stations_2x7: { exercisesPerStation: 2, durationSec: 30, fixedStations: 7, rounds: 3 },
  stations_3x4: { exercisesPerStation: 3, durationSec: 35, fixedStations: 4, rounds: 2 },
  stations_5x3: { exercisesPerStation: 5, durationSec: 30, fixedStations: 3, rounds: 2 },

  // ── Group / Circuit / Protocol ──
  full_group: { exercisesPerStation: null, durationSec: 40, fixedStations: null, rounds: 2 },
  circuit:    { exercisesPerStation: null, durationSec: 40, fixedStations: null, rounds: 3 },
  emom:       { exercisesPerStation: null, durationSec: 60, fixedStations: null, rounds: 1 },
  tabata:     { exercisesPerStation: null, durationSec: 20, restSec: 10, fixedStations: null, rounds: 8 },
  amrap:      { exercisesPerStation: null, durationSec: null, fixedStations: null, blockMin: 4, rounds: 1 },
  partner:    { exercisesPerStation: 2, durationSec: 40, fixedStations: 6, rounds: 3 },
  hybrid:     { exercisesPerStation: null, durationSec: 35, fixedStations: null, rounds: 1 },
  custom:     { exercisesPerStation: 4, durationSec: 30, fixedStations: 4, rounds: 2 },
};

export const TRANSITION_TIME_SEC = 15;
export const STATION_TRANSITION_SEC = 30;
export const CUSTOM_STRUCTURE_LIMITS = Object.freeze({
  minStations: 1,
  maxStations: 6,
  minExercisesPerStation: 1,
  maxExercisesPerStation: 5,
});

// ── Muscle Group Distributions by Day Type ────────────────────────────

export const DAY_TYPE_MUSCLES = {
  lower_body: ['quads', 'hamstrings', 'glutes', 'calves', 'hip_flexors', 'core'],
  upper_body: ['chest', 'lats', 'anterior_deltoid', 'biceps', 'triceps', 'core'],
  cardio: ['core', 'quads', 'glutes', 'chest', 'anterior_deltoid', 'hamstrings'],
  full_body: ['quads', 'chest', 'lats', 'anterior_deltoid', 'glutes', 'core'],
};

// ── Cardio Finishers (bodyweight, no equipment) ───────────────────────

export const CARDIO_FINISHERS = [
  { name: 'Mountain Climbers', muscles: 'core,hip_flexors,shoulders', easy: 'Slow Mountain Climbers', hard: 'Cross-Body Mountain Climbers', kneeMod: 'Standing High Knees', backMod: 'Standing March' },
  { name: 'Jumping Jacks', muscles: 'full_body', easy: 'Step-Out Jacks', hard: 'Star Jumps', kneeMod: 'Seal Jacks (arms only)', ankleMod: 'Seal Jacks (arms only)' },
  { name: 'High Knees', muscles: 'core,hip_flexors,quadriceps', easy: 'Marching in Place', hard: 'High Knees Sprint', kneeMod: 'Standing March', ankleMod: 'Seated High Knees' },
  { name: 'Burpees', muscles: 'full_body', easy: 'Step-Back Burpees', hard: 'Burpee Tuck Jumps', kneeMod: 'Squat Thrusts (no jump)', wristMod: 'Squat Jumps', backMod: 'Squat Thrusts' },
  { name: 'Squat Jumps', muscles: 'quadriceps,gluteus_maximus', easy: 'Bodyweight Squats', hard: 'Tuck Jumps', kneeMod: 'Wall Sit Hold', ankleMod: 'Seated Leg Extensions' },
  { name: 'Lateral Shuffles', muscles: 'quadriceps,gluteus_medius', easy: 'Side Steps', hard: 'Lateral Bound Jumps', kneeMod: 'Side Steps', ankleMod: 'Side Steps' },
  { name: 'Skaters', muscles: 'gluteus_medius,quadriceps', easy: 'Step-Behind Lunges', hard: 'Power Skaters', kneeMod: 'Standing Hip Abduction', ankleMod: 'Seated Band Abduction' },
  { name: 'Bear Crawls', muscles: 'core,shoulders,quadriceps', easy: 'Bear Crawl Hold', hard: 'Bear Crawl Sprints', wristMod: 'Inchworms', kneeMod: 'Plank Hold' },
];

// ── Lap Rotation Exercises (outdoor, bodyweight only) ─────────────────

export const LAP_EXERCISES = [
  { name: 'Jogging', durationMin: 1 },
  { name: 'Walking Lunges', durationMin: 1 },
  { name: 'Bear Crawls', durationMin: 0.5 },
  { name: 'High Knees', durationMin: 0.5 },
  { name: 'Carioca', durationMin: 0.5 },
  { name: 'Butt Kicks', durationMin: 0.5 },
  { name: 'Backpedal', durationMin: 0.5 },
];

// ── Setup Time Categories (for flow optimization) ─────────────────────

export const SETUP_TIME_CATEGORIES = {
  instant: { min: 0, max: 5, label: 'Instant' },
  quick: { min: 5, max: 15, label: 'Quick' },
  medium: { min: 15, max: 30, label: 'Medium' },
  slow: { min: 30, max: 45, label: 'Slow' },
  complex: { min: 45, max: 120, label: 'Complex' },
};

// ── Helper Functions ──────────────────────────────────────────────────

export function formatExerciseName(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function distributeMuscleGroups(muscles, stationCount) {
  const result = [];
  for (let i = 0; i < stationCount; i++) {
    const primary = muscles[i % muscles.length];
    const secondary = muscles[(i + Math.ceil(muscles.length / 2)) % muscles.length];
    result.push(primary !== secondary ? [primary, secondary] : [primary]);
  }
  return result;
}
