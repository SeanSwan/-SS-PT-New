/**
 * oneRepMax.mjs
 * ─────────────────────────────────────────────────────────────
 * NASM-aligned 1RM estimation and intensity recommendation utility.
 *
 * Provides:
 *   - estimate1RM(weight, reps)     → Epley formula 1RM estimate
 *   - recommendLoad(oneRM, phase)   → OPT-model phase-specific load recommendation
 *   - rpeToIntensityPct(rpe)        → RPE (1-10) → %1RM mapping
 *   - intensityPctToReps(pct)       → %1RM → estimated rep range
 *
 * Phase 5A — Smart Workout Logger MVP Coach Copilot
 */

// ─── OPT Model Phase Definitions (NASM) ──────────────────────
const OPT_PHASES = {
  1: {
    name: 'Stabilization Endurance',
    minPct: 50,
    maxPct: 70,
    targetReps: '12-20',
    explanation: 'Stabilization endurance phase: light-to-moderate load with high reps to build muscular endurance and joint stability.',
  },
  2: {
    name: 'Strength Endurance',
    minPct: 70,
    maxPct: 80,
    targetReps: '8-12',
    explanation: 'Strength endurance phase: moderate load with moderate reps to bridge endurance and strength.',
  },
  3: {
    name: 'Hypertrophy',
    minPct: 75,
    maxPct: 85,
    targetReps: '6-12',
    explanation: 'Hypertrophy phase: moderate-to-heavy load focused on maximal muscle growth.',
  },
  4: {
    name: 'Maximal Strength',
    minPct: 85,
    maxPct: 100,
    targetReps: '1-5',
    explanation: 'Maximal strength phase: heavy load with low reps to build peak strength.',
  },
  5: {
    name: 'Power',
    minPct: 30,
    maxPct: 45,
    targetReps: '1-5',
    explanation: 'Power phase: explosive movements — use 30-45% 1RM for speed/power work, or 85-100% for heavy power sets.',
  },
};

// ─── RPE → %1RM Lookup (NASM / Helms-based) ─────────────────
// Approximate mapping: RPE 10 = 100%, each RPE point ≈ 2.5-5%
const RPE_TO_PCT = {
  1: 50,
  2: 55,
  3: 60,
  4: 65,
  5: 70,
  6: 75,
  7: 80,
  8: 85,
  9: 92,
  10: 100,
};

/**
 * Estimate 1-rep max using the Epley formula.
 *   1RM = weight × (1 + reps / 30)
 *
 * @param {number} weight — Weight lifted
 * @param {number} reps   — Reps completed
 * @returns {number|null}  — Estimated 1RM, or null for invalid input
 */
export function estimate1RM(weight, reps) {
  if (
    typeof weight !== 'number' ||
    typeof reps !== 'number' ||
    weight <= 0 ||
    reps <= 0 ||
    !isFinite(weight) ||
    !isFinite(reps)
  ) {
    return null;
  }

  // For 1 rep, the weight IS the 1RM
  if (reps === 1) return weight;

  return weight * (1 + reps / 30);
}

/**
 * Recommend load range for a given OPT phase based on estimated 1RM.
 *
 * @param {number} oneRM  — Estimated 1-rep max
 * @param {number} phase  — OPT phase (1-5)
 * @returns {{ minLoad: number, maxLoad: number, targetReps: string, explanation: string } | null}
 */
export function recommendLoad(oneRM, phase) {
  if (oneRM == null || typeof oneRM !== 'number' || oneRM <= 0) return null;

  const phaseConfig = OPT_PHASES[phase];
  if (!phaseConfig) return null;

  return {
    minLoad: round2(oneRM * (phaseConfig.minPct / 100)),
    maxLoad: round2(oneRM * (phaseConfig.maxPct / 100)),
    targetReps: phaseConfig.targetReps,
    explanation: phaseConfig.explanation,
  };
}

/**
 * Convert RPE (1-10) to approximate %1RM intensity.
 *
 * @param {number} rpe — Rate of perceived exertion (1-10)
 * @returns {number|null} — Approximate %1RM, or null for invalid input
 */
export function rpeToIntensityPct(rpe) {
  if (rpe == null || typeof rpe !== 'number' || rpe < 1 || rpe > 10) {
    return null;
  }

  // Handle half-step RPEs by interpolation
  const floor = Math.floor(rpe);
  const ceil = Math.ceil(rpe);

  if (floor === ceil) return RPE_TO_PCT[floor];

  const low = RPE_TO_PCT[floor];
  const high = RPE_TO_PCT[ceil];
  const frac = rpe - floor;

  return round2(low + (high - low) * frac);
}

/**
 * Convert %1RM intensity to estimated rep count.
 * Uses inverse Epley: reps = 30 × (1RM/weight - 1) = 30 × (100/pct - 1)
 *
 * @param {number} pct — Intensity as %1RM (1-100)
 * @returns {number|null} — Estimated reps, or null for invalid input
 */
export function intensityPctToReps(pct) {
  if (pct == null || typeof pct !== 'number' || pct <= 0 || pct > 100) {
    return null;
  }

  // At 100%, you can do 1 rep
  if (pct === 100) return 1;

  // Inverse Epley: reps = 30 × (100/pct - 1)
  const reps = 30 * (100 / pct - 1);
  return Math.max(1, Math.round(reps));
}

// ─── Internal ────────────────────────────────────────────────

function round2(n) {
  return Math.round(n * 100) / 100;
}
