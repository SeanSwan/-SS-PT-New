/**
 * Blueprint: suggestedWorkoutService (Workout-OS C6)
 * Purpose: ZERO-LLM deterministic composer for "suggested next session" —
 * a Cortex COMPOSER on the shared safety spine, never its own pain logic.
 * Pipeline (mirrors the guided-candidates ordering, the proven analogue):
 *   client context → shared fail-closed pain resolve → blocking safety gate
 *   → readiness → registry pool → painVerdictForExercise filter → compose.
 * Hard rules: an ACTIVE PLAN wins (suggestions stand down entirely — no
 * gap-day guessing in v1); UNKNOWN safety state = hold, never "no pain";
 * cold-start composes conservatively (nasmLevel ≤ 2, stability bias) and is
 * labeled for coach refinement. Every suggestion carries whyRationale[]
 * template strings from the rules that fired — no free text, no PII.
 */
import { getClientContext } from './clientIntelligenceService.mjs';
import {
  painVerdictForExercise,
  resolveClientPainExclusions,
} from './ai/coachDispatchEligibilityService.mjs';
import { buildSwanCoachPlanningSafetyGateFromContext } from './swanCoachPlanningFingerprintService.mjs';
import {
  buildSwanCoachReadinessContext,
  scoreExerciseForSwanCoachReadiness,
  applySwanCoachReadinessToExercises,
} from './swanCoachCortexService.mjs';
import { getExerciseRegistryFromDB } from './variationEngine.mjs';
import logger from '../utils/logger.mjs';

const hold = (reason, extra = {}) => ({ suggestions: [], hold: reason, ...extra });

const SESSION_ARCHETYPES = [
  {
    key: 'balanced_full_body',
    title: 'Balanced Full-Body Session',
    focus: 'full_body',
    categories: ['squat', 'push', 'pull', 'core'],
    perCategory: 2,
    maxExercises: 7,
  },
  {
    key: 'push_focus',
    title: 'Push Focus',
    focus: 'push',
    categories: ['push', 'core'],
    perCategory: 3,
    maxExercises: 6,
  },
  {
    key: 'pull_focus',
    title: 'Pull Focus',
    focus: 'pull',
    categories: ['pull', 'core'],
    perCategory: 3,
    maxExercises: 6,
  },
  {
    key: 'lower_body_focus',
    title: 'Lower-Body Focus',
    focus: 'squat',
    categories: ['squat', 'core'],
    perCategory: 3,
    maxExercises: 6,
  },
  {
    key: 'stability_core',
    title: 'Core & Stability Session',
    focus: 'core',
    categories: ['core'],
    perCategory: 5,
    maxExercises: 5,
  },
];

/** Deterministic exercise score inside one archetype pick. */
function scoreForSuggestion(exercise, { readiness, coldStart, recentNames }) {
  let score = scoreExerciseForSwanCoachReadiness(exercise, readiness) || 0;
  const level = Number(exercise.nasmLevel) || 3;
  if (coldStart) {
    score += level <= 2 ? 3 : -2;
  } else if (level <= 3) {
    score += 1;
  }
  // Gentle variety pressure: something trained recently scores slightly lower.
  if (recentNames.has(String(exercise.name || '').toLowerCase())) score -= 1;
  return score;
}

function pickExercises(pool, archetype, scoringContext) {
  const picked = [];
  for (const category of archetype.categories) {
    const bucket = pool
      .filter((exercise) => exercise.category === category)
      .map((exercise) => ({ exercise, score: scoreForSuggestion(exercise, scoringContext) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, archetype.perCategory)
      .map((entry) => entry.exercise);
    picked.push(...bucket);
  }
  return picked
    .filter((exercise, index, all) => all.findIndex((e) => e.key === exercise.key) === index)
    .slice(0, archetype.maxExercises);
}

/** Least-recently-trained focus first — the "underworked" ordering rule. */
function orderArchetypes(recentNames, pool) {
  const categoryTrained = { push: 0, pull: 0, squat: 0, core: 0 };
  for (const exercise of pool) {
    if (recentNames.has(String(exercise.name || '').toLowerCase()) && categoryTrained[exercise.category] !== undefined) {
      categoryTrained[exercise.category] += 1;
    }
  }
  const focusOrder = Object.entries(categoryTrained).sort((a, b) => a[1] - b[1]).map(([cat]) => cat);
  return [...SESSION_ARCHETYPES].sort((a, b) => {
    if (a.key === 'balanced_full_body') return -1;
    if (b.key === 'balanced_full_body') return 1;
    return focusOrder.indexOf(a.focus) - focusOrder.indexOf(b.focus);
  });
}

const slimExercise = (exercise) => ({
  key: exercise.key,
  name: exercise.name,
  category: exercise.category,
  muscles: exercise.muscles || [],
  nasmLevel: exercise.nasmLevel ?? null,
  ...(exercise.readinessIntensityGuardrail ? { readinessIntensityGuardrail: true } : {}),
  ...(exercise.readinessNote ? { readinessNote: exercise.readinessNote } : {}),
});

/**
 * Compose ranked suggested sessions for one client.
 * @returns {{suggestions: Array, hold?: string, coldStart?: boolean, readinessLevel?: string, safetyFlags?: string[]}}
 */
export async function buildSuggestedWorkouts({ clientId, trainerId }) {
  const context = await getClientContext(clientId, trainerId);

  // 1. Plan wins — full stop. Suggestions are the NO-PLAN engine in v1.
  if (context?.activeProgram) {
    return hold('plan_active', {
      planPointer: { title: context.activeProgram.title ?? 'Active training plan' },
    });
  }

  // 2. Shared fail-closed pain resolve — UNKNOWN never passes as "no pain".
  const painExclusions = resolveClientPainExclusions(context);
  if (painExclusions === null) return hold('pain_data_unavailable');

  // 3. Blocking safety gate — same tier the builder 409s on.
  const safetyGate = buildSwanCoachPlanningSafetyGateFromContext(context ?? {});
  if (safetyGate?.status === 'review_required') {
    return hold('safety_review_required', {
      safetyFlags: Array.isArray(safetyGate.reviewRequiredSignals) ? safetyGate.reviewRequiredSignals : [],
    });
  }

  // 4. Readiness — a missing Cortex policy vault is a HOLD, not a green default.
  let readiness;
  try {
    readiness = await buildSwanCoachReadinessContext({ clientContext: context });
  } catch (err) {
    logger.warn('[SuggestedWorkouts] readiness context unavailable — holding', { clientId, error: err?.message });
    return hold('safety_context_unavailable');
  }

  // 5. Eligible pool through the ONE shared verdict.
  let registry;
  try {
    registry = await getExerciseRegistryFromDB();
  } catch (err) {
    logger.warn('[SuggestedWorkouts] registry unavailable — holding', { clientId, error: err?.message });
    return hold('registry_unavailable');
  }
  if (!Array.isArray(registry) || registry.length === 0) return hold('registry_unavailable');
  const pool = registry.filter((exercise) => painVerdictForExercise(exercise, painExclusions).eligible);
  if (pool.length === 0) return hold('no_eligible_exercises');

  // 6. Compose.
  const coldStart = (context?.workouts?.sessionsLast2Weeks ?? 0) === 0;
  const recentNames = new Set(
    (context?.workouts?.recentExercises ?? []).map((name) => String(name).toLowerCase()),
  );
  const excludedCount = registry.length - pool.length;

  const suggestions = [];
  for (const archetype of orderArchetypes(recentNames, pool)) {
    if (suggestions.length >= 3) break;
    const picks = pickExercises(pool, archetype, { readiness, coldStart, recentNames });
    if (picks.length < 3) continue;
    const guarded = applySwanCoachReadinessToExercises(picks, readiness);

    const whyRationale = [];
    if (coldStart) whyRationale.push('Starting point — your coach will refine this as you log sessions.');
    else whyRationale.push(`Built from your last two weeks of logged training (${archetype.focus.replace('_', ' ')} was due).`);
    if (excludedCount > 0) whyRationale.push(`Your pain chart is respected — ${excludedCount} movements were filtered out.`);
    if (readiness?.level && readiness.level !== 'green') {
      whyRationale.push(`Readiness is ${readiness.level} — intensity is kept controlled today.`);
    }

    suggestions.push({
      key: archetype.key,
      title: archetype.title,
      focus: archetype.focus,
      exercises: guarded.map(slimExercise),
      whyRationale,
      safetyFlags: (context?.pain?.warnings ?? []).map((warning) => warning?.code || 'pain_warning'),
      coldStart,
    });
  }

  if (suggestions.length === 0) return hold('no_eligible_exercises');
  return { suggestions, coldStart, readinessLevel: readiness?.level ?? 'green' };
}

export default { buildSuggestedWorkouts };
