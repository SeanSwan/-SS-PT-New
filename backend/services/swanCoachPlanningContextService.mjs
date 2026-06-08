/**
 * Swan Coach planning context facade.
 *
 * Keeps the historical import path stable while delegating active-plan
 * formatting, fingerprints, and prompt guidance to focused services.
 */

import { SWAN_COACH_PLANNING_GUIDANCE } from './swanCoachPlanningIdentityService.mjs';

export {
  formatActiveWorkoutPlanContext,
  safePlanId,
} from './swanCoachPlanningActivePlanContextService.mjs';
export {
  buildSwanCoachPlanningFingerprint,
} from './swanCoachPlanningFingerprintService.mjs';

export function appendSwanCoachPlanningGuidance(prompt, { placement = 'append' } = {}) {
  if (!prompt || prompt.includes('SWAN COACH PLANNING OPERATING MODEL')) return prompt;
  return placement === 'prepend'
    ? `${SWAN_COACH_PLANNING_GUIDANCE}\n\n${prompt}`
    : `${prompt}\n\n${SWAN_COACH_PLANNING_GUIDANCE}`;
}
