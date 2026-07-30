/**
 * coachDispatchEligibilityService.mjs
 * ===================================
 * Cortex P0 §5.4 (directive 2026-07-12): server-side eligibility for coach
 * frontend dispatches — closes the chat bypass.
 *
 * Before this service, AI_ADD_EXERCISE carried free-text exerciseName straight
 * from the LLM into the client's logger form; the only downstream check was an
 * event/field allowlist (coachFrontendDispatchClassifier). No registry
 * membership, no pain exclusions, no quality gate — the chat surface could
 * stage an exercise the workout builder would have excluded for pain.
 *
 * Contract:
 *  1. AI_ADD_EXERCISE.exerciseName must RESOLVE against the exercise registry
 *     (exact key → exact name → unique substring). The LLM cannot invent moves.
 *  2. The resolved exercise must clear the target client's pain exclusions —
 *     same semantics as the workout builder, including the untagged-muscle
 *     fail-safe (§5.6).
 *  3. Safety-data failure REFUSES the add (fail-closed), never passes it.
 *  4. Refusals return machine-readable reasons + eligible same-category
 *     alternatives so the coach can explain and re-propose.
 *
 * Scope (disclosed): gates AI_ADD_EXERCISE (introduces a NEW exercise).
 * AI_UPDATE_SET / AI_TOGGLE_NASM_ITEM / AI_LOAD_TEMPLATE act on content a
 * human already placed in the form and pass through unchanged this slice.
 */

import logger from '../../utils/logger.mjs';
import { buildSwanCoachPlanningSafetyGateFromContext } from '../swanCoachPlanningFingerprintService.mjs';

const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

/**
 * Resolve a free-text exercise name against the registry.
 * Deterministic: exact key → exact normalized name → unique substring match.
 */
export function resolveExerciseFromRegistry(exerciseName, registry = []) {
  const target = normalize(exerciseName);
  if (!target) return null;

  let exact = null;
  const partial = [];
  for (const entry of registry) {
    const keyNorm = normalize(entry.key);
    const nameNorm = normalize(entry.name || entry.key);
    if (keyNorm === target || nameNorm === target) { exact = entry; break; }
    if (nameNorm.includes(target) || target.includes(nameNorm)) partial.push(entry);
  }
  if (exact) return exact;
  // A substring match is only trusted when it is UNAMBIGUOUS.
  return partial.length === 1 ? partial[0] : null;
}

/**
 * Shared pain-safety verdict for one exercise against a client's excluded
 * muscles — includes the untagged-muscle fail-safe (§5.6): under active
 * exclusions, an exercise with no muscle tags never passes as safe.
 * Consumers: this chat gate + the guided-candidates surface.
 */
export function painVerdictForExercise(exercise, excludedMuscles) {
  const excludedSet = new Set(excludedMuscles || []);
  if (excludedSet.size === 0) return { eligible: true };
  const muscles = Array.isArray(exercise.muscles) ? exercise.muscles : [];
  if (muscles.length === 0) {
    return { eligible: false, reason: 'untagged muscles under active pain exclusions (fail-safe)' };
  }
  if (muscles.some(m => excludedSet.has(m))) {
    return { eligible: false, reason: 'targets pain-excluded muscles' };
  }
  return { eligible: true };
}

/**
 * ONE fail-closed resolver for a client's pain exclusions (Workout-OS C6).
 * Allowlist, not an 'unavailable' blocklist: any UNRECOGNIZED pain source
 * state (unavailable, future 'stale', missing) or a critical-data failure
 * returns null — and null NEVER passes as "no pain". Previously copy-pasted
 * in this gate and the candidates service (Rule-58 drift risk with a third
 * consumer); now shared by chat gate + candidates + suggested-workouts.
 */
const KNOWN_PAIN_STATES = ['loaded_active_issue', 'loaded_no_active_issue', 'never_collected'];

export function resolveClientPainExclusions(clientContext = {}) {
  if (!KNOWN_PAIN_STATES.includes(clientContext?.pain?.status) || clientContext?.criticalDataUnavailable) {
    return null;
  }
  const excluded = clientContext?.pain?.excludedMuscles
    || clientContext?.constraints?.excludedMuscles
    || [];
  return Array.isArray(excluded) ? excluded : [];
}

function suggestAlternatives(exercise, registry, excludedMuscles, limit = 3) {
  return registry
    .filter(entry => entry.key !== exercise?.key
      && (!exercise || entry.category === exercise.category)
      && painVerdictForExercise(entry, excludedMuscles).eligible)
    .slice(0, limit)
    .map(entry => entry.name || entry.key);
}

/**
 * Filter frontend dispatch actions for eligibility against the target client.
 *
 * @param {object} params
 * @param {Array} params.actions - [{ event, payload }] from parseSafeFrontendDispatch
 * @param {number} params.targetUserId - the client the dispatch would affect
 * @param {number} params.requestingUserId - the trainer/admin driving the chat
 * @param {Function} params.loadRegistry - async () => registry (injectable for tests)
 * @param {Function} params.loadClientContext - async (clientId, requesterId) => context (injectable)
 * @returns {Promise<{ allowed: Array, refusals: Array }>}
 */
export async function filterEligibleFrontendActions({
  actions = [],
  targetUserId,
  requestingUserId,
  loadRegistry,
  loadClientContext,
}) {
  const gated = actions.filter(a => a.event === 'AI_ADD_EXERCISE');
  if (gated.length === 0) return { allowed: actions, refusals: [] };

  let registry = [];
  let excludedMuscles = null; // null = unknown (fail-closed), [] = known-clear
  let blockingGateSignals = null; // non-null = the deterministic gate BLOCKS this client
  try {
    registry = await loadRegistry();
  } catch (err) {
    logger.warn('[CoachDispatchEligibility] Registry unavailable:', err?.message);
    registry = [];
  }
  try {
    const context = await loadClientContext(targetUserId, requestingUserId);
    excludedMuscles = resolveClientPainExclusions(context);
    // Blocking-tier PARITY with the workout builder (review-queue REVISE item,
    // 2026-07-12): a client whose deterministic gate is review_required 409s
    // in the builder — chat must not be a side door around that review, even
    // when no muscles are excluded yet (e.g. a severe entry outside the 72h
    // auto-exclusion window). Same gate function the builder uses.
    const safetyGate = buildSwanCoachPlanningSafetyGateFromContext(context ?? {});
    if (safetyGate?.status === 'review_required') {
      blockingGateSignals = Array.isArray(safetyGate.reviewRequiredSignals)
        ? safetyGate.reviewRequiredSignals
        : [];
    }
  } catch (err) {
    logger.warn('[CoachDispatchEligibility] Client safety context unavailable:', err?.message);
    excludedMuscles = null;
  }

  const allowed = [];
  const refusals = [];
  for (const action of actions) {
    if (action.event !== 'AI_ADD_EXERCISE') { allowed.push(action); continue; }

    const exerciseName = action.payload?.exerciseName;
    const resolved = registry.length > 0 ? resolveExerciseFromRegistry(exerciseName, registry) : null;
    if (!resolved) {
      refusals.push({
        event: action.event,
        exerciseName,
        code: 'EXERCISE_NOT_IN_REGISTRY',
        reason: registry.length === 0
          ? 'exercise registry unavailable — additions are held until it can be checked'
          : 'exercise could not be matched to the approved exercise registry',
        alternatives: [],
      });
      continue;
    }

    if (excludedMuscles === null) {
      // Fail-closed (§5.4/§5.2): unknown pain state never passes as "no pain".
      refusals.push({
        event: action.event,
        exerciseName,
        code: 'SAFETY_DATA_UNAVAILABLE',
        reason: 'client pain/safety data could not be loaded — addition held for manual review',
        alternatives: [],
      });
      continue;
    }

    const verdict = painVerdictForExercise(resolved, excludedMuscles);
    if (!verdict.eligible) {
      refusals.push({
        event: action.event,
        exerciseName,
        code: 'PAIN_EXCLUDED',
        reason: verdict.reason,
        // No alternative chips while the gate blocks — re-proposing one would
        // just be refused with SAFETY_REVIEW_REQUIRED (confusing loop).
        alternatives: blockingGateSignals !== null
          ? []
          : suggestAlternatives(resolved, registry, excludedMuscles),
      });
      continue;
    }

    if (blockingGateSignals !== null) {
      // Passed the specific pain filter, but the client's gate is blocking —
      // the trainer must complete the safety review in the workout builder
      // before chat can stage new exercises.
      refusals.push({
        event: action.event,
        exerciseName,
        code: 'SAFETY_REVIEW_REQUIRED',
        reason: 'this client’s safety review is pending — complete the review in the workout builder before adding exercises from chat',
        reviewRequiredSignals: blockingGateSignals,
        alternatives: [],
      });
      continue;
    }

    // Canonicalize the name so the form receives the registry's exercise, not
    // the LLM's free-text spelling.
    allowed.push({
      ...action,
      payload: { ...action.payload, exerciseName: resolved.name || resolved.key },
    });
  }

  if (refusals.length > 0) {
    logger.info('[CoachDispatchEligibility] Dispatch refusals', {
      targetUserId,
      requestingUserId,
      refusals: refusals.map(r => ({ code: r.code, event: r.event })),
    });
  }

  return { allowed, refusals };
}
