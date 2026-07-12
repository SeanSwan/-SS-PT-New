/**
 * ============================================================================
 * FILE: regionMuscleMap.mjs — THE single body-region → muscle mapping home
 * PURPOSE: Cortex Phase 2C (directive §6 ontology/, §15 Phase 2)
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-12
 * ============================================================================
 *
 * WHY: the audit found three divergent region maps — clientIntelligenceService
 * (regions → NASM-taxonomy registry muscle tags, drives pain exclusions),
 * bootcamp painAwareGating (regions → Rolodex muscleTargets prose, drives
 * class gating), and the pain-intake allowlist (painEntryController). The two
 * MAPPINGS speak different muscle vocabularies on purpose (registry tags match
 * Exercise.muscles; bootcamp strings substring-match muscleTargets prose), so
 * this slice gives them ONE HOME with the difference explicit — true
 * vocabulary unification rides the §7 exercise-ontology fields (Phase 2E+).
 *
 * Rules: byte-identity with both replaced maps is test-locked
 * (regionMuscleMapSingleSource.test.mjs); every region key here must be a
 * valid pain-intake region (alignment tripwire in the same test). Add regions
 * in BOTH vocabularies or document why one side has no mapping.
 */

/** Regions → NASM-taxonomy registry muscle tags (pain exclusions; matches Exercise.muscles). */
export const REGION_TO_REGISTRY_MUSCLES = Object.freeze({
  // Head / Neck
  neck: Object.freeze(['sternocleidomastoid', 'upper_trapezius', 'levator_scapulae']),
  head: Object.freeze(['sternocleidomastoid']),

  // Shoulders
  left_shoulder: Object.freeze(['anterior_deltoid', 'medial_deltoid', 'posterior_deltoid', 'rotator_cuff']),
  right_shoulder: Object.freeze(['anterior_deltoid', 'medial_deltoid', 'posterior_deltoid', 'rotator_cuff']),
  shoulder: Object.freeze(['anterior_deltoid', 'medial_deltoid', 'posterior_deltoid', 'rotator_cuff']),

  // Arms
  left_elbow: Object.freeze(['biceps', 'triceps', 'brachialis']),
  right_elbow: Object.freeze(['biceps', 'triceps', 'brachialis']),
  left_wrist: Object.freeze(['wrist_flexors', 'wrist_extensors']),
  right_wrist: Object.freeze(['wrist_flexors', 'wrist_extensors']),

  // Chest / Upper Back
  chest: Object.freeze(['pectoralis_major', 'pectoralis_minor']),
  upper_back: Object.freeze(['rhomboids', 'middle_trapezius', 'lower_trapezius']),

  // Spine
  lower_back: Object.freeze(['erector_spinae', 'multifidus', 'quadratus_lumborum']),
  mid_back: Object.freeze(['latissimus_dorsi', 'erector_spinae']),
  thoracic_spine: Object.freeze(['erector_spinae', 'rhomboids']),

  // Core
  abdominals: Object.freeze(['rectus_abdominis', 'transverse_abdominis', 'internal_oblique', 'external_oblique']),
  core: Object.freeze(['rectus_abdominis', 'transverse_abdominis', 'internal_oblique', 'external_oblique']),

  // Hip / Pelvis
  left_hip: Object.freeze(['hip_flexors', 'gluteus_medius', 'gluteus_maximus', 'piriformis', 'adductors']),
  right_hip: Object.freeze(['hip_flexors', 'gluteus_medius', 'gluteus_maximus', 'piriformis', 'adductors']),
  hip: Object.freeze(['hip_flexors', 'gluteus_medius', 'gluteus_maximus', 'piriformis', 'adductors']),
  glutes: Object.freeze(['gluteus_maximus', 'gluteus_medius', 'gluteus_minimus']),

  // Legs
  left_quad: Object.freeze(['quadriceps', 'vastus_medialis', 'vastus_lateralis', 'rectus_femoris']),
  right_quad: Object.freeze(['quadriceps', 'vastus_medialis', 'vastus_lateralis', 'rectus_femoris']),
  left_hamstring: Object.freeze(['hamstrings', 'biceps_femoris', 'semitendinosus']),
  right_hamstring: Object.freeze(['hamstrings', 'biceps_femoris', 'semitendinosus']),
  left_knee: Object.freeze(['quadriceps', 'hamstrings', 'popliteus']),
  right_knee: Object.freeze(['quadriceps', 'hamstrings', 'popliteus']),
  left_calf: Object.freeze(['gastrocnemius', 'soleus', 'tibialis_anterior']),
  right_calf: Object.freeze(['gastrocnemius', 'soleus', 'tibialis_anterior']),
  left_shin: Object.freeze(['tibialis_anterior', 'tibialis_posterior']),
  right_shin: Object.freeze(['tibialis_anterior', 'tibialis_posterior']),

  // Ankles / Feet
  left_ankle: Object.freeze(['gastrocnemius', 'soleus', 'peroneals', 'tibialis_anterior']),
  right_ankle: Object.freeze(['gastrocnemius', 'soleus', 'peroneals', 'tibialis_anterior']),
  left_foot: Object.freeze(['peroneals', 'tibialis_posterior', 'intrinsic_foot']),
  right_foot: Object.freeze(['peroneals', 'tibialis_posterior', 'intrinsic_foot']),
});

/**
 * Regions → bootcamp Rolodex muscle-target substrings (class gating; these
 * lower-case strings substring-match Exercise.muscleTargets prose).
 */
export const REGION_TO_BOOTCAMP_TARGETS = Object.freeze({
  left_knee: Object.freeze(['quadriceps', 'hamstrings']),
  right_knee: Object.freeze(['quadriceps', 'hamstrings']),
  lower_back: Object.freeze(['erector_spinae', 'core', 'glutes']),
  upper_back: Object.freeze(['trapezius', 'rhomboids', 'lats']),
  left_shoulder: Object.freeze(['shoulders', 'chest']),
  right_shoulder: Object.freeze(['shoulders', 'chest']),
  left_hip: Object.freeze(['glutes', 'hip_flexors', 'adductors']),
  right_hip: Object.freeze(['glutes', 'hip_flexors', 'adductors']),
  left_ankle: Object.freeze(['calves', 'tibialis']),
  right_ankle: Object.freeze(['calves', 'tibialis']),
});

/** Registry-tag muscles for a pain region ([] for unmapped regions). */
export function registryMusclesForRegion(region) {
  return REGION_TO_REGISTRY_MUSCLES[region] || [];
}

/** Bootcamp muscle-target substrings for a pain region ([] for unmapped regions). */
export function bootcampTargetsForRegion(region) {
  return REGION_TO_BOOTCAMP_TARGETS[region] || [];
}
