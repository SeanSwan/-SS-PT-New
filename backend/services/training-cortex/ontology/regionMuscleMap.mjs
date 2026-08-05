/**
 * ============================================================================
 * FILE: regionMuscleMap.mjs — THE single body-region → muscle mapping home
 * PURPOSE: Cortex Phase 2C (directive §6 ontology/) + Pain-Chart Slice 1
 *          (PAIN-CHART-UPGRADE-BLUEPRINT-2026-08-04 §7, C1/C11 fixes)
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-12 | REWRITTEN: 2026-08-04
 * ============================================================================
 *
 * Slice 1 rewrite — two verified failures fixed here:
 *
 * 1. COVERAGE (C1): 34 of the 50 pain-intake regions mapped to ZERO muscles,
 *    so a 9/10 rotator-cuff entry excluded nothing from generated plans.
 *    Every intake region now maps to >=1 muscle tag (test-locked).
 *
 * 2. VOCABULARY (Slice 1 probe, 2026-08-04): the old map spoke anatomical
 *    names ('quadriceps', 'gastrocnemius', 'gluteus_maximus') that do NOT
 *    exist in the exercise registry's tag vocabulary ('quads', 'calves',
 *    'glutes', ...). Live-DB probe: the exercises table has 0 active rows
 *    with primaryMuscles, so getExerciseRegistryFromDB() falls back to the
 *    hardcoded registry in variationEngine.mjs — its 28-tag vocabulary is
 *    what filterExercises() actually matches. Every tag below is drawn from
 *    that live vocabulary and test-locked against it
 *    (painOntologyCoverage.test.mjs). If the DB registry is ever seeded,
 *    that test must be extended to the DB vocabulary in the same slice.
 *
 * The two maps still speak different vocabularies ON PURPOSE: registry tags
 * exact-match Exercise.muscles; bootcamp strings substring-match Rolodex
 * muscleTargets prose (painAwareGating).
 *
 * Vocabulary limits (honest approximations, better than silent zero):
 *  - neck/traps regions → 'traps' (no cervical tags exist in the registry)
 *  - shin/ankle/achilles/foot → 'calves' (no tibialis tag in the registry)
 *  - forearm/wrist → 'brachioradialis' (no wrist flexor/extensor tags)
 */

/**
 * THE single pain-intake region allowlist (C11 fix — painEntryController and
 * painWriteService previously carried hand-duplicated copies whose headers
 * both mis-documented the count). 28 front + 22 back = 50.
 */
export const PAIN_INTAKE_REGIONS = Object.freeze([
  // Front view (28)
  'neck_front', 'chest_left', 'chest_right', 'chest',
  'left_shoulder', 'right_shoulder',
  'left_bicep', 'right_bicep',
  'left_forearm', 'right_forearm',
  'left_elbow', 'right_elbow',
  'upper_abs', 'lower_abs', 'left_oblique', 'right_oblique',
  'left_hip_flexor', 'right_hip_flexor',
  'left_quad', 'right_quad',
  'left_inner_thigh', 'right_inner_thigh',
  'left_shin', 'right_shin',
  'left_knee', 'right_knee',
  'left_ankle_front', 'right_ankle_front',
  // Back view (22)
  'neck_back', 'upper_traps_left', 'upper_traps_right',
  'mid_back_left', 'mid_back_right',
  'left_rear_delt', 'right_rear_delt',
  'lower_back_left', 'lower_back_right', 'lower_back',
  'left_tricep', 'right_tricep',
  'left_glute', 'right_glute',
  'left_hamstring', 'right_hamstring',
  'left_calf', 'right_calf',
  'left_achilles', 'right_achilles',
  'left_rotator_cuff', 'right_rotator_cuff',
]);

export const PAIN_INTAKE_REGION_SET = Object.freeze(new Set(PAIN_INTAKE_REGIONS));

// Shared tag groups (registry vocabulary — see header)
const SHOULDER_TAGS = Object.freeze(['anterior_deltoid', 'lateral_deltoid', 'rear_deltoid', 'rotator_cuff']);
const CHEST_TAGS = Object.freeze(['chest', 'upper_chest', 'lower_chest']);
const CORE_TAGS = Object.freeze(['core', 'tva']);
const LOWER_BACK_TAGS = Object.freeze(['erector_spinae', 'core']);
const MID_BACK_TAGS = Object.freeze(['lats', 'rhomboids', 'erector_spinae']);
const HIP_TAGS = Object.freeze(['hip_flexors', 'glutes', 'glute_medius', 'adductors', 'hip_abductors']);
const LOWER_LEG_TAGS = Object.freeze(['calves']);

/** Regions → registry muscle tags (pain exclusions; matches Exercise.muscles). */
export const REGION_TO_REGISTRY_MUSCLES = Object.freeze({
  // ── Intake regions — front ──
  neck_front: Object.freeze(['traps']),
  chest_left: CHEST_TAGS,
  chest_right: CHEST_TAGS,
  chest: CHEST_TAGS,
  left_shoulder: SHOULDER_TAGS,
  right_shoulder: SHOULDER_TAGS,
  left_bicep: Object.freeze(['biceps']),
  right_bicep: Object.freeze(['biceps']),
  left_forearm: Object.freeze(['brachioradialis']),
  right_forearm: Object.freeze(['brachioradialis']),
  left_elbow: Object.freeze(['biceps', 'triceps', 'brachioradialis']),
  right_elbow: Object.freeze(['biceps', 'triceps', 'brachioradialis']),
  upper_abs: CORE_TAGS,
  lower_abs: CORE_TAGS,
  left_oblique: Object.freeze(['obliques', 'core']),
  right_oblique: Object.freeze(['obliques', 'core']),
  left_hip_flexor: Object.freeze(['hip_flexors']),
  right_hip_flexor: Object.freeze(['hip_flexors']),
  left_quad: Object.freeze(['quads']),
  right_quad: Object.freeze(['quads']),
  left_inner_thigh: Object.freeze(['adductors']),
  right_inner_thigh: Object.freeze(['adductors']),
  left_shin: LOWER_LEG_TAGS,
  right_shin: LOWER_LEG_TAGS,
  left_knee: Object.freeze(['quads', 'hamstrings', 'calves']),
  right_knee: Object.freeze(['quads', 'hamstrings', 'calves']),
  left_ankle_front: LOWER_LEG_TAGS,
  right_ankle_front: LOWER_LEG_TAGS,

  // ── Intake regions — back ──
  neck_back: Object.freeze(['traps']),
  upper_traps_left: Object.freeze(['traps']),
  upper_traps_right: Object.freeze(['traps']),
  mid_back_left: MID_BACK_TAGS,
  mid_back_right: MID_BACK_TAGS,
  left_rear_delt: Object.freeze(['rear_deltoid']),
  right_rear_delt: Object.freeze(['rear_deltoid']),
  lower_back_left: LOWER_BACK_TAGS,
  lower_back_right: LOWER_BACK_TAGS,
  lower_back: LOWER_BACK_TAGS,
  left_tricep: Object.freeze(['triceps']),
  right_tricep: Object.freeze(['triceps']),
  left_glute: Object.freeze(['glutes', 'glute_medius']),
  right_glute: Object.freeze(['glutes', 'glute_medius']),
  left_hamstring: Object.freeze(['hamstrings']),
  right_hamstring: Object.freeze(['hamstrings']),
  left_calf: LOWER_LEG_TAGS,
  right_calf: LOWER_LEG_TAGS,
  left_achilles: LOWER_LEG_TAGS,
  right_achilles: LOWER_LEG_TAGS,
  left_rotator_cuff: Object.freeze(['rotator_cuff', 'rear_deltoid']),
  right_rotator_cuff: Object.freeze(['rotator_cuff', 'rear_deltoid']),

  // ── Legacy keys (not producible by intake, but present in old DB rows) ──
  neck: Object.freeze(['traps']),
  head: Object.freeze(['traps']),
  shoulder: SHOULDER_TAGS,
  left_wrist: Object.freeze(['brachioradialis']),
  right_wrist: Object.freeze(['brachioradialis']),
  upper_back: Object.freeze(['traps', 'rhomboids', 'lats']),
  mid_back: MID_BACK_TAGS,
  thoracic_spine: Object.freeze(['thoracic_spine', 'erector_spinae']),
  abdominals: Object.freeze(['core', 'tva', 'obliques']),
  core: Object.freeze(['core', 'tva', 'obliques']),
  left_hip: HIP_TAGS,
  right_hip: HIP_TAGS,
  hip: HIP_TAGS,
  glutes: Object.freeze(['glutes', 'glute_medius']),
  left_ankle: LOWER_LEG_TAGS,
  right_ankle: LOWER_LEG_TAGS,
  left_foot: LOWER_LEG_TAGS,
  right_foot: LOWER_LEG_TAGS,
});

/**
 * Regions → bootcamp Rolodex muscle-target substrings (class gating; these
 * lower-case strings substring-match Exercise.muscleTargets prose).
 */
export const REGION_TO_BOOTCAMP_TARGETS = Object.freeze({
  // Intake — front
  neck_front: Object.freeze(['trapezius', 'neck']),
  chest_left: Object.freeze(['chest']),
  chest_right: Object.freeze(['chest']),
  chest: Object.freeze(['chest']),
  left_shoulder: Object.freeze(['shoulders', 'chest']),
  right_shoulder: Object.freeze(['shoulders', 'chest']),
  left_bicep: Object.freeze(['biceps']),
  right_bicep: Object.freeze(['biceps']),
  left_forearm: Object.freeze(['forearm', 'grip']),
  right_forearm: Object.freeze(['forearm', 'grip']),
  left_elbow: Object.freeze(['biceps', 'triceps']),
  right_elbow: Object.freeze(['biceps', 'triceps']),
  upper_abs: Object.freeze(['core', 'abs']),
  lower_abs: Object.freeze(['core', 'abs']),
  left_oblique: Object.freeze(['oblique', 'core']),
  right_oblique: Object.freeze(['oblique', 'core']),
  left_hip_flexor: Object.freeze(['hip_flexors']),
  right_hip_flexor: Object.freeze(['hip_flexors']),
  left_quad: Object.freeze(['quadriceps']),
  right_quad: Object.freeze(['quadriceps']),
  left_inner_thigh: Object.freeze(['adductors']),
  right_inner_thigh: Object.freeze(['adductors']),
  left_shin: Object.freeze(['tibialis', 'calves']),
  right_shin: Object.freeze(['tibialis', 'calves']),
  left_knee: Object.freeze(['quadriceps', 'hamstrings']),
  right_knee: Object.freeze(['quadriceps', 'hamstrings']),
  left_ankle_front: Object.freeze(['calves', 'tibialis']),
  right_ankle_front: Object.freeze(['calves', 'tibialis']),
  // Intake — back
  neck_back: Object.freeze(['trapezius', 'neck']),
  upper_traps_left: Object.freeze(['trapezius']),
  upper_traps_right: Object.freeze(['trapezius']),
  mid_back_left: Object.freeze(['lats', 'rhomboids']),
  mid_back_right: Object.freeze(['lats', 'rhomboids']),
  left_rear_delt: Object.freeze(['shoulders', 'rear delt']),
  right_rear_delt: Object.freeze(['shoulders', 'rear delt']),
  lower_back_left: Object.freeze(['erector_spinae', 'core', 'glutes']),
  lower_back_right: Object.freeze(['erector_spinae', 'core', 'glutes']),
  lower_back: Object.freeze(['erector_spinae', 'core', 'glutes']),
  left_tricep: Object.freeze(['triceps']),
  right_tricep: Object.freeze(['triceps']),
  left_glute: Object.freeze(['glutes']),
  right_glute: Object.freeze(['glutes']),
  left_hamstring: Object.freeze(['hamstrings']),
  right_hamstring: Object.freeze(['hamstrings']),
  left_calf: Object.freeze(['calves']),
  right_calf: Object.freeze(['calves']),
  left_achilles: Object.freeze(['calves']),
  right_achilles: Object.freeze(['calves']),
  left_rotator_cuff: Object.freeze(['shoulders', 'rotator']),
  right_rotator_cuff: Object.freeze(['shoulders', 'rotator']),
  // Legacy keys
  neck: Object.freeze(['trapezius', 'neck']),
  head: Object.freeze(['neck']),
  shoulder: Object.freeze(['shoulders', 'chest']),
  left_wrist: Object.freeze(['forearm', 'grip']),
  right_wrist: Object.freeze(['forearm', 'grip']),
  upper_back: Object.freeze(['trapezius', 'rhomboids', 'lats']),
  mid_back: Object.freeze(['lats', 'rhomboids']),
  thoracic_spine: Object.freeze(['erector_spinae', 'lats']),
  abdominals: Object.freeze(['core', 'abs']),
  core: Object.freeze(['core', 'abs']),
  left_hip: Object.freeze(['glutes', 'hip_flexors', 'adductors']),
  right_hip: Object.freeze(['glutes', 'hip_flexors', 'adductors']),
  hip: Object.freeze(['glutes', 'hip_flexors', 'adductors']),
  glutes: Object.freeze(['glutes']),
  left_ankle: Object.freeze(['calves', 'tibialis']),
  right_ankle: Object.freeze(['calves', 'tibialis']),
  left_foot: Object.freeze(['calves']),
  right_foot: Object.freeze(['calves']),
});

/**
 * F10 (Slice 1): intake regions whose exclusions become EFFECTIVE with this
 * rewrite — before it, their mapping was empty OR spoke tags outside the live
 * registry vocabulary (both excluded nothing). Workout generation surfaces a
 * one-line 'ontology_update' explanation when an exclusion fires from one of
 * these, so trainers see WHY plans changed instead of reading it as a bug.
 * (Previously-effective: shoulders via rotator_cuff, elbows via biceps/
 * triceps, lower_back via erector_spinae, hamstrings, knees via hamstrings.)
 */
export const ONTOLOGY_EXPANSION_2026_08 = Object.freeze(new Set(
  PAIN_INTAKE_REGIONS.filter(r => ![
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'lower_back',
    'left_hamstring', 'right_hamstring',
    'left_knee', 'right_knee',
  ].includes(r))
));

/** Registry-tag muscles for a pain region ([] for unmapped regions). */
export function registryMusclesForRegion(region) {
  return REGION_TO_REGISTRY_MUSCLES[region] || [];
}

/** Bootcamp muscle-target substrings for a pain region ([] for unmapped regions). */
export function bootcampTargetsForRegion(region) {
  return REGION_TO_BOOTCAMP_TARGETS[region] || [];
}

/** True when the region is accepted by pain intake (single-source allowlist). */
export function isPainIntakeRegion(region) {
  return PAIN_INTAKE_REGION_SET.has(region);
}
