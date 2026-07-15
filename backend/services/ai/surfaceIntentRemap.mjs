/**
 * Surface Intent Remap — deterministic planner/logger command-family routing
 * ==========================================================================
 * The intent classifier is an LLM; a prompt hint alone cannot GUARANTEE that
 * "add goblet squats" said inside the Workout Planner resolves to the
 * planner_* family instead of the logger AI_* family. This post-classification
 * remap makes the guarantee deterministic (blueprint 03-contracts §1):
 *
 *   routeContext.surface === 'workout-planner'  → logger twins remap to planner_*
 *   routeContext.surface === 'workout-logger'   → planner twins remap to logger family
 *
 * Only command pairs that exist in BOTH families are remapped. Params carry
 * over verbatim; the target command's Zod schema strips fields the twin does
 * not accept. Planner-only intents (swap/remove/generate) stay untouched on a
 * logger surface — dispatching them simply yields the honest "No Workout
 * Planner is open" receipt client-side. Any other surface token is ignored.
 */
import logger from '../../utils/logger.mjs';

export const PLANNER_SURFACE = 'workout-planner';
export const LOGGER_SURFACE = 'workout-logger';

const LOGGER_TO_PLANNER = {
  add_exercise_to_form: 'planner_add_exercise',
  update_set_data: 'planner_update_exercise',
};

const PLANNER_TO_LOGGER = {
  planner_add_exercise: 'add_exercise_to_form',
  planner_update_exercise: 'update_set_data',
};

/**
 * Remap a classified intent to the command family of the active surface.
 *
 * @param {{ intent: string, clientRef: string|null, params: Object, confidence: number }} intent
 * @param {Object|null|undefined} routeContext - normalized route context ({ surface? })
 * @returns {typeof intent} the same intent object, or a copy with the twin command type
 */
export function applySurfaceIntentRemap(intent, routeContext) {
  const surface = typeof routeContext?.surface === 'string' ? routeContext.surface : null;
  if (!intent?.intent || !surface) return intent;

  const table = surface === PLANNER_SURFACE
    ? LOGGER_TO_PLANNER
    : surface === LOGGER_SURFACE
      ? PLANNER_TO_LOGGER
      : null;
  const remapped = table?.[intent.intent];
  if (!remapped) return intent;

  logger.info('[SurfaceIntentRemap] Remapped intent to active-surface family', {
    from: intent.intent,
    to: remapped,
    surface,
  });
  return { ...intent, intent: remapped };
}

export default applySurfaceIntentRemap;
