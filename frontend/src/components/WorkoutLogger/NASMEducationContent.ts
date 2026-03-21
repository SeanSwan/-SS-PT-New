/**
 * ============================================================================
 * FILE: NASMEducationContent.ts
 * PURPOSE: Pure data — NASM education tooltip content for Learning Mode
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-21
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exports typed education content strings keyed by
 * concept. Used by NASMTooltip components when Learning Mode is ON.
 */

// ─── Phase Education ─────────────────────────────────────────

export const PHASE_EDUCATION: Record<number, { title: string; tip: string }> = {
  1: {
    title: 'Phase 1 — Stabilization Endurance',
    tip: 'Uses unstable surfaces and slow tempos (4/2/1) to build proprioceptive awareness and muscular endurance. Low weight, high reps — form over load. This is the foundation all other phases build on.',
  },
  2: {
    title: 'Phase 2 — Strength Endurance',
    tip: 'Superset format: pair a strength exercise with a stabilization exercise. This builds endurance under progressively higher loads while maintaining the stability gains from Phase 1.',
  },
  3: {
    title: 'Phase 3 — Hypertrophy',
    tip: 'Moderate weight, moderate reps (6-12) with controlled tempo. Time under tension drives muscle growth. Progressive overload each session — add weight, reps, or sets.',
  },
  4: {
    title: 'Phase 4 — Maximal Strength',
    tip: 'Heavy loads (85-100% 1RM) with low reps (1-5) and full recovery (3-5 min). Neural adaptations are primary — your nervous system learns to recruit more motor units simultaneously.',
  },
  5: {
    title: 'Phase 5 — Power',
    tip: 'Supersets: heavy strength exercise (85-100% 1RM) + explosive power exercise (30-45% 1RM). Power = Force × Velocity. This phase teaches the body to apply maximal force at high speed.',
  },
};

// ─── Tempo Education ─────────────────────────────────────────

export const TEMPO_EDUCATION: Record<string, string> = {
  '4/2/1': '4s eccentric (lowering), 2s isometric (hold), 1s concentric (lifting). Slow tempo builds proprioceptive awareness and increases time under tension for stabilization.',
  '2/0/2': '2s eccentric, no hold, 2s concentric. Moderate tempo for strength endurance and hypertrophy — balanced control without excessive time under tension.',
  'X/0/X': 'Explosive in both directions with no hold. Used in Phases 4-5 for maximal force production and power development. "X" means as fast as possible with control.',
  '3/1/2': '3s eccentric, 1s hold, 2s concentric. Common for stability and corrective exercises — emphasis on the eccentric phase builds control.',
};

// ─── Rest Period Education ───────────────────────────────────

export const REST_EDUCATION: Record<string, string> = {
  '0-90s': 'Short rest maintains elevated heart rate for endurance adaptations. Incomplete recovery is the goal — muscles must perform under fatigue.',
  '0-60s': 'Minimal rest between supersets builds work capacity. Strength exercise → stabilization exercise with almost no break.',
  '3-5min': 'Full recovery between heavy sets. The nervous system needs 3-5 minutes to fully replenish ATP-CP stores for maximal effort.',
};

// ─── 1RM Education ───────────────────────────────────────────

export const ONE_RM_EDUCATION = {
  title: 'Estimated 1RM (Brzycki)',
  tip: 'Formula: weight ÷ (1.0278 - 0.0278 × reps). Valid for 2-10 reps per NASM standard. Used to calculate training loads: Phase 1 uses 50-70% of 1RM, Phase 4 uses 85-100%.',
};

// ─── RPE Education ───────────────────────────────────────────

export const RPE_EDUCATION = {
  title: 'Rate of Perceived Exertion',
  tip: 'Scale of 1-10 measuring subjective effort. 6-7 = moderate (can talk), 8 = hard (short phrases only), 9 = very hard (nearly max), 10 = absolute max effort. Helps autoregulate training intensity.',
};

// ─── Movement Pattern Education ──────────────────────────────

export const MOVEMENT_PATTERN_EDUCATION: Record<string, string> = {
  squat: 'Squat pattern — knee-dominant lower body movement. Primary: quadriceps, glutes. NASM uses squat assessment to identify movement compensations (knees caving, heels rising).',
  hinge: 'Hinge pattern — hip-dominant posterior chain movement. Primary: glutes, hamstrings. Fundamental for deadlifts, kettlebell swings, and athletic power production.',
  push: 'Push pattern — pressing movement away from the body. Horizontal (bench press) or vertical (overhead press). Primary: pectorals, deltoids, triceps.',
  pull: 'Pull pattern — pulling movement toward the body. Horizontal (row) or vertical (pulldown). Primary: latissimus dorsi, rhomboids, biceps.',
  rotation: 'Rotation pattern — transverse plane movement. Critical for athletic performance and daily function. NASM emphasizes anti-rotation training before rotational power.',
  gait: 'Gait pattern — locomotion (walking, running, carrying). Carries and sled work develop this pattern. NASM assesses gait for compensations in ankle, knee, and hip.',
  press: 'Vertical press pattern — overhead pressing. Tests shoulder mobility and core stability. NASM notes overhead squat compensations often relate to pressing limitations.',
};
