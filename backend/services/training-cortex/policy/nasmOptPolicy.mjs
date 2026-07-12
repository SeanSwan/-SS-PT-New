/**
 * ============================================================================
 * FILE: nasmOptPolicy.mjs — THE single NASM OPT acute-variable table
 * PURPOSE: Cortex Phase 2A (directive §6 policy/, §15 Phase 2; eval test 10)
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-12
 * ============================================================================
 *
 * WHY THIS FILE EXISTS: the 2026-07-12 Cortex audit found ≥5 independently
 * maintained copies of the OPT phase acute variables (workoutBuilderService
 * ×2, workoutBuilderCandidateService, nasmProgressionService,
 * nasmTemplateRegistry, + 3 frontend files) — a Rule 58 drift machine (the
 * progression copy already disagrees on Phase 5 reps). This module is the ONE
 * numeric source; consumers derive their legacy presentation shapes from it
 * so consolidation lands with ZERO behavior change (locked by
 * nasmOptPolicySingleSource.test.mjs byte-identity snapshots).
 *
 * DO NOT add a new phase table anywhere. Import from here and format locally.
 */

/** Canonical numeric acute variables per NASM OPT phase (1-5). */
export const NASM_OPT_PHASES = Object.freeze({
  1: Object.freeze({
    key: 'stabilization',
    name: 'Stabilization Endurance',
    sets: Object.freeze([1, 3]),
    reps: Object.freeze([12, 20]),
    intensityPct: Object.freeze([0.50, 0.70]),
    intensityLabel: '50-70%',
    tempo: '4-2-1',
    restSeconds: Object.freeze([0, 90]),
    exerciseTypes: Object.freeze(['stability', 'core', 'balance', 'corrective']),
    focus: 'Muscular endurance, proprioception, core stability',
  }),
  2: Object.freeze({
    key: 'strengthEndurance',
    name: 'Strength Endurance',
    sets: Object.freeze([2, 4]),
    reps: Object.freeze([8, 12]),
    intensityPct: Object.freeze([0.70, 0.80]),
    intensityLabel: '70-80%',
    tempo: '2-0-2',
    restSeconds: Object.freeze([0, 60]),
    exerciseTypes: Object.freeze(['compound', 'isolation', 'stability']),
    focus: 'Superset stabilization + strength exercises',
  }),
  3: Object.freeze({
    key: 'hypertrophy',
    name: 'Muscular Development (Hypertrophy)',
    sets: Object.freeze([3, 5]),
    reps: Object.freeze([6, 12]),
    intensityPct: Object.freeze([0.75, 0.85]),
    intensityLabel: '75-85%',
    tempo: '2-0-2',
    restSeconds: Object.freeze([0, 60]),
    exerciseTypes: Object.freeze(['compound', 'isolation']),
    focus: 'Maximal muscle growth, progressive overload',
  }),
  4: Object.freeze({
    key: 'maxStrength',
    name: 'Maximal Strength',
    sets: Object.freeze([4, 6]),
    reps: Object.freeze([1, 5]),
    intensityPct: Object.freeze([0.85, 1.00]),
    intensityLabel: '85-100%',
    tempo: 'Explosive/controlled',
    restSeconds: Object.freeze([120, 300]),
    exerciseTypes: Object.freeze(['compound']),
    focus: 'Maximal force production, neural adaptations',
  }),
  5: Object.freeze({
    key: 'power',
    name: 'Power',
    sets: Object.freeze([3, 5]),
    reps: Object.freeze([1, 5]),
    // Power is dual-intensity by doctrine: speed work 30-45%, strength 85-100%.
    // The numeric range below is the SPEED side (what weight recommendation
    // uses); the label carries the full doctrine string.
    intensityPct: Object.freeze([0.30, 0.45]),
    intensityLabel: '30-45% (speed) / 85-100% (strength)',
    tempo: 'Explosive',
    restSeconds: Object.freeze([120, 300]),
    exerciseTypes: Object.freeze(['compound', 'plyometric']),
    focus: 'Rate of force development, superset strength + power',
  }),
});

export const DEFAULT_OPT_PHASE = 2;

/** Resolve a phase entry, falling back to the Phase-2 default like all legacy tables did. */
export function resolveOptPhase(phase) {
  return NASM_OPT_PHASES[phase] || NASM_OPT_PHASES[DEFAULT_OPT_PHASE];
}

/** [minPct, maxPct] decimals for 1RM-based weight recommendation. */
export function phaseIntensityRange(phase) {
  return resolveOptPhase(phase).intensityPct;
}

/**
 * Legacy OPT_PHASE_PARAMS shape (workoutBuilderService) — byte-identical to
 * the table this replaces (test-locked).
 */
export function buildLegacyOptPhaseParams() {
  return Object.fromEntries(Object.entries(NASM_OPT_PHASES).map(([phase, p]) => [phase, {
    name: p.name,
    sets: [...p.sets],
    reps: [...p.reps],
    intensity: p.intensityLabel,
    tempo: p.tempo,
    rest: [...p.restSeconds],
    exerciseTypes: [...p.exerciseTypes],
    focus: p.focus,
  }]));
}

/**
 * Candidate-card defaults (workoutBuilderCandidateService) — these are
 * OPINIONATED single-value picks inside the canonical ranges, not midpoints.
 * They live here so the numbers sit next to the table that bounds them
 * (consistency test asserts containment).
 */
export function phaseCandidateDefaults(phase) {
  if (phase <= 1) return { sets: 2, reps: 15, tempo: '4/2/1', restSeconds: 45, intensityPercent: 60 };
  if (phase === 3) return { sets: 4, reps: 10, tempo: '2/0/2', restSeconds: 60, intensityPercent: 75 };
  if (phase >= 4) return { sets: 4, reps: 5, tempo: 'X/0/X', restSeconds: 120, intensityPercent: 85 };
  return { sets: 3, reps: 10, tempo: '2/0/2', restSeconds: 60, intensityPercent: 70 };
}
