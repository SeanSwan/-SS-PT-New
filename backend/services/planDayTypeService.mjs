/**
 * planDayTypeService.mjs
 * =======================
 *
 * V3a (2026-05-03) — NASM-correct weekly day-type assignment.
 *
 * REPLACES the prior fixed-rotation pool in workoutBuilderService.mjs:
 *   const rotationPool = ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'full_body'];
 * which produced 6×/wk = push/pull/legs/push/pull/legs (no core, no balance,
 * no stability, no recovery — the bug Sean observed on the live UI 2026-05-03).
 *
 * RULES IMPLEMENTED (per V3 spec L1-L3 + AI Village 2026-05-03 NASM track):
 *
 * Phase 1 (Stabilization Endurance) — every session is full-body stabilization.
 *   NASM mandate: Phase 1 prioritizes proprioception over load. Push/Pull/Legs
 *   is a Phase 3+ split; using it in Phase 1 violates the OPT model.
 *
 * Phase 2-4 (Strength Endurance / Hypertrophy / Maximal Strength) — hybrid:
 *   1×/wk: full-body
 *   2×/wk: full-body × 2
 *   3×/wk: full-body, upper, lower (core integrated into each)
 *   4×/wk: push, pull, legs, core+stability+balance      ← Sean L2 ab day
 *   5×/wk: push, pull, legs, upper, full-core            ← Sean L2 5-day
 *   6×/wk: push, pull, legs, upper, lower, active-recovery ← Sean L1 6-day
 *   7×/wk: push, pull, legs, upper, lower, core+balance, active-recovery
 *
 * Phase 5 (Power) — same shape as hybrid; populator biases toward plyometrics.
 *
 * The function is PURE and SIDE-EFFECT-FREE so the workoutBuilder populator
 * can call it once per week and index into the result.
 */

export const NASM_PHASE = Object.freeze({
  STABILIZATION_ENDURANCE: 1,
  STRENGTH_ENDURANCE: 2,
  HYPERTROPHY: 3,
  MAXIMAL_STRENGTH: 4,
  POWER: 5,
});

/**
 * Day-type taxonomy. Each value maps (via the workoutBuilder's
 * schedule→movement-category expansion) to a list of registry categories
 * the populator filters against.
 *
 * NEW TYPES introduced in V3a:
 *   - full_body_stabilization — Phase 1 sessions (every day)
 *   - core_stability_balance  — dedicated 4-day or 7-day slot
 *   - active_recovery         — 6/7-day mobility/SMR/breathwork day
 *   - full_core               — 5-day abs/lower-back/obliques day
 */
export const DAY_TYPE = Object.freeze({
  full_body: 'full_body',
  full_body_stabilization: 'full_body_stabilization',
  upper: 'upper',
  lower: 'lower',
  push: 'push',
  pull: 'pull',
  legs: 'legs',
  core_stability_balance: 'core_stability_balance',
  active_recovery: 'active_recovery',
  full_core: 'full_core',
});

/**
 * Display focus string for a given day type. Used by both the populator
 * (saves into day.focus for UI rendering) and front-end consumers.
 */
export function focusForDayType(dayType) {
  switch (dayType) {
    case DAY_TYPE.push:                    return 'chest + shoulders + triceps';
    case DAY_TYPE.pull:                    return 'back + biceps';
    case DAY_TYPE.legs:                    return 'quads + hamstrings + glutes';
    case DAY_TYPE.upper:                   return 'chest + back + shoulders + arms';
    case DAY_TYPE.lower:                   return 'quads + hamstrings + glutes + core';
    case DAY_TYPE.full_body:               return 'full body';
    case DAY_TYPE.full_body_stabilization: return 'full body stabilization (proprioception priority)';
    case DAY_TYPE.core_stability_balance:  return 'core + stability + balance';
    case DAY_TYPE.active_recovery:         return 'active recovery + mobility + stretch + breathwork';
    case DAY_TYPE.full_core:               return 'full core (abs + lower back + obliques)';
    default:                               return 'training';
  }
}

// ─── Phase-specific layouts ───────────────────────────────────────────

/**
 * Phase 1 (Stabilization Endurance) — every training day is full-body
 * stabilization with explicit balance + core + corrective integration.
 * NASM CPT 7th ed. requires this phase precede all others for new clients.
 */
function buildPhase1DayTypes(sessionsPerWeek) {
  return Array.from({ length: sessionsPerWeek }, () => DAY_TYPE.full_body_stabilization);
}

/**
 * Phase 2-4 (hybrid: strength-endurance, hypertrophy, maximal strength).
 * Push/Pull/Legs split is acceptable here. Sean's L1-L3 day rules apply.
 */
function buildHybridDayTypes(sessionsPerWeek) {
  switch (sessionsPerWeek) {
    case 1: return [DAY_TYPE.full_body];
    case 2: return [DAY_TYPE.full_body, DAY_TYPE.full_body];
    case 3: return [DAY_TYPE.full_body, DAY_TYPE.upper, DAY_TYPE.lower];
    case 4: return [DAY_TYPE.push, DAY_TYPE.pull, DAY_TYPE.legs, DAY_TYPE.core_stability_balance];
    case 5: return [DAY_TYPE.push, DAY_TYPE.pull, DAY_TYPE.legs, DAY_TYPE.upper, DAY_TYPE.full_core];
    case 6: return [DAY_TYPE.push, DAY_TYPE.pull, DAY_TYPE.legs, DAY_TYPE.upper, DAY_TYPE.lower, DAY_TYPE.active_recovery];
    case 7:
    default:
      return [
        DAY_TYPE.push, DAY_TYPE.pull, DAY_TYPE.legs,
        DAY_TYPE.upper, DAY_TYPE.lower,
        DAY_TYPE.core_stability_balance, DAY_TYPE.active_recovery,
      ];
  }
}

/**
 * Phase 5 (Power) — same structural shape as hybrid; the populator biases
 * toward plyometric / explosive exercises by adjusting goalBias scoring.
 * Day-type assignment alone does not encode the power emphasis.
 */
function buildPhase5DayTypes(sessionsPerWeek) {
  return buildHybridDayTypes(sessionsPerWeek);
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Compute the weekly day-type schedule.
 *
 * @param {object} args
 * @param {number} args.sessionsPerWeek - integer 1-7
 * @param {number} args.phase           - NASM OPT phase 1-5
 * @param {string} [args.goal]          - reserved for future goal-specific overrides
 * @returns {string[]} array of DAY_TYPE values, one per session
 */
export function buildWeeklyDayTypes({ sessionsPerWeek, phase, goal }) {
  const safeSessions = clampSessions(sessionsPerWeek);
  const safePhase = clampPhase(phase);

  if (safePhase === NASM_PHASE.STABILIZATION_ENDURANCE) return buildPhase1DayTypes(safeSessions);
  if (safePhase === NASM_PHASE.POWER) return buildPhase5DayTypes(safeSessions);
  return buildHybridDayTypes(safeSessions);
}

function clampSessions(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 7) return 7;
  return n;
}

function clampPhase(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1 || n > 5) return NASM_PHASE.STRENGTH_ENDURANCE;
  return n;
}

/**
 * V3a category-mapping extension: maps the new day types to movement
 * categories the registry filter understands. Existing day types
 * (push, pull, legs, full_body, upper, lower) are NOT remapped here —
 * the workoutBuilder's existing expandScheduleCategoryToMovementCategories
 * already handles them. This service ONLY contributes the V3a-new types.
 */
export function expandV3aDayTypeToMovementCategories(dayType) {
  switch (dayType) {
    case DAY_TYPE.full_body_stabilization:
      // Phase 1: balance + stability + core + corrective + light compound
      return ['balance', 'stability', 'stabilizers', 'core', 'compound', 'corrective', 'flexibility'];
    case DAY_TYPE.core_stability_balance:
      return ['core', 'balance', 'stability', 'stabilizers'];
    case DAY_TYPE.active_recovery:
      // Mobility, foam-roll/SMR, stretch, breathwork
      return ['flexibility', 'corrective', 'injury_recovery', 'recovery', 'cardio'];
    case DAY_TYPE.full_core:
      // Abs + lower-back + obliques
      return ['core'];
    default:
      return null; // not a V3a-new type; caller falls through to legacy expansion
  }
}
