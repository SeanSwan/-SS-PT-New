/**
 * ============================================================================
 * FILE: nasmCesPolicy.mjs — THE single NASM CES compensation catalog
 * PURPOSE: Cortex Phase 2B (directive §6 policy/, §15 Phase 2; eval test 11)
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-12
 * ============================================================================
 *
 * WHY: the audit found two divergent CES datasets — CES_MAP (8 patterns,
 * Inhibit→Lengthen→Activate→Integrate muscle strategies, in
 * clientIntelligenceService) and COMPENSATION_TO_V3B3_TAGS (10 patterns → the
 * V3b.3 registry tags, in correctiveExerciseService) — plus the LLM-layer
 * CES_CORRECTIVE_SCHEMA in nasmTemplateRegistry. This catalog is the ONE
 * per-compensation home for the deterministic data; the LLM schema layer is
 * consistency-locked, not relocated. Closed-set discipline per
 * docs/ai-workflow/references/NASM-CES-TAXONOMY.md — do NOT invent
 * compensations or correctives here; new entries need a taxonomy citation.
 *
 * Byte-identity with both replaced tables is locked by
 * nasmCesPolicySingleSource.test.mjs.
 */

/**
 * Canonical compensation catalog.
 * - `ila`: the CES continuum muscle/exercise strategy (null where the legacy
 *   CES_MAP carried no strategy — preserved, not invented).
 * - `v3b3Tags`: nasmCorrectiveCategory tags for the DB-backed registry
 *   selector (the REAL corrective source; ila is the synthetic fallback).
 */
export const NASM_CES_COMPENSATIONS = Object.freeze({
  knee_valgus: Object.freeze({
    v3b3Tags: Object.freeze(['knees_cave', 'pronation_distortion_syndrome']),
    ila: Object.freeze({
      inhibit: Object.freeze(['adductors', 'tfl', 'vastus_lateralis']),
      lengthen: Object.freeze(['adductors', 'tfl', 'biceps_femoris_short_head']),
      activate: Object.freeze(['gluteus_medius', 'vastus_medialis', 'gluteus_maximus']),
      integrate: Object.freeze(['single_leg_squat', 'lateral_band_walk', 'step_up']),
    }),
  }),
  knee_varus: Object.freeze({
    v3b3Tags: Object.freeze(['knees_bow']),
    ila: null,
  }),
  excessive_forward_lean: Object.freeze({
    v3b3Tags: Object.freeze(['excessive_forward_lean', 'lower_crossed_syndrome']),
    ila: Object.freeze({
      inhibit: Object.freeze(['hip_flexors', 'gastrocnemius', 'soleus']),
      lengthen: Object.freeze(['hip_flexors', 'gastrocnemius', 'soleus']),
      activate: Object.freeze(['gluteus_maximus', 'erector_spinae', 'anterior_tibialis']),
      integrate: Object.freeze(['ball_squat', 'squat_to_row', 'step_up_to_balance']),
    }),
  }),
  arms_fall_forward: Object.freeze({
    v3b3Tags: Object.freeze(['arms_fall_forward', 'upper_crossed_syndrome']),
    ila: Object.freeze({
      inhibit: Object.freeze(['latissimus_dorsi', 'pectoralis_major', 'pectoralis_minor']),
      lengthen: Object.freeze(['latissimus_dorsi', 'pectoralis_major', 'pectoralis_minor']),
      activate: Object.freeze(['middle_trapezius', 'lower_trapezius', 'rotator_cuff']),
      integrate: Object.freeze(['ball_combo_1', 'squat_to_row', 'overhead_squat']),
    }),
  }),
  low_back_arch: Object.freeze({
    v3b3Tags: Object.freeze(['low_back_arch', 'lower_crossed_syndrome']),
    ila: Object.freeze({
      inhibit: Object.freeze(['hip_flexors', 'erector_spinae']),
      lengthen: Object.freeze(['hip_flexors', 'erector_spinae', 'latissimus_dorsi']),
      activate: Object.freeze(['gluteus_maximus', 'transverse_abdominis', 'internal_oblique']),
      integrate: Object.freeze(['ball_squat', 'squat_to_row', 'plank_variations']),
    }),
  }),
  head_protrusion: Object.freeze({
    v3b3Tags: Object.freeze(['forward_head', 'upper_crossed_syndrome']),
    ila: Object.freeze({
      inhibit: Object.freeze(['upper_trapezius', 'levator_scapulae', 'sternocleidomastoid']),
      lengthen: Object.freeze(['upper_trapezius', 'levator_scapulae', 'sternocleidomastoid']),
      activate: Object.freeze(['deep_cervical_flexors', 'lower_trapezius']),
      integrate: Object.freeze(['chin_tucks', 'prone_cobra', 'wall_angels']),
    }),
  }),
  shoulder_elevation: Object.freeze({
    v3b3Tags: Object.freeze(['upper_crossed_syndrome']),
    ila: Object.freeze({
      inhibit: Object.freeze(['upper_trapezius', 'levator_scapulae']),
      lengthen: Object.freeze(['upper_trapezius', 'levator_scapulae', 'sternocleidomastoid']),
      activate: Object.freeze(['lower_trapezius', 'serratus_anterior']),
      integrate: Object.freeze(['wall_slides', 'prone_y_raises', 'band_pull_aparts']),
    }),
  }),
  hip_drop: Object.freeze({
    v3b3Tags: Object.freeze(['asymmetric_shift']),
    ila: Object.freeze({
      inhibit: Object.freeze(['tfl', 'adductors']),
      lengthen: Object.freeze(['tfl', 'adductors', 'piriformis']),
      activate: Object.freeze(['gluteus_medius', 'gluteus_minimus', 'quadratus_lumborum']),
      integrate: Object.freeze(['single_leg_deadlift', 'lateral_band_walk', 'clamshells']),
    }),
  }),
  foot_pronation: Object.freeze({
    v3b3Tags: Object.freeze(['pronation_distortion_syndrome']),
    ila: Object.freeze({
      inhibit: Object.freeze(['peroneals', 'lateral_gastrocnemius', 'biceps_femoris']),
      lengthen: Object.freeze(['peroneals', 'lateral_gastrocnemius', 'soleus']),
      activate: Object.freeze(['tibialis_posterior', 'tibialis_anterior', 'gluteus_medius']),
      integrate: Object.freeze(['single_leg_balance', 'calf_raises_inverted', 'step_up']),
    }),
  }),
  heels_rise: Object.freeze({
    v3b3Tags: Object.freeze(['heels_rise']),
    ila: null,
  }),
});

/** ILA strategy for a compensation — null when the catalog carries none (legacy CES_MAP behavior). */
export function getCesStrategy(compensationType) {
  return NASM_CES_COMPENSATIONS[compensationType]?.ila ?? null;
}

/** V3b.3 nasmCorrectiveCategory tags for a compensation — [] for unknowns (never throws). */
export function getCesTags(compensationType) {
  if (typeof compensationType !== 'string') return [];
  const entry = NASM_CES_COMPENSATIONS[compensationType];
  return entry ? [...entry.v3b3Tags] : [];
}

/**
 * Legacy COMPENSATION_TO_V3B3_TAGS shape (correctiveExerciseService) — derived
 * so its test-only export and lookup semantics survive unchanged.
 */
export function buildCompensationTagBridge() {
  return Object.fromEntries(
    Object.entries(NASM_CES_COMPENSATIONS).map(([key, entry]) => [key, [...entry.v3b3Tags]]),
  );
}
