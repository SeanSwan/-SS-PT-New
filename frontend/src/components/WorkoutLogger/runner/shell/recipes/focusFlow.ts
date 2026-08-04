/**
 * Focus Flow — the DEFAULT full-page recipe (Sean's daily view).
 * Stage tabs · coach in the action bar · stats collapsed to the
 * context bar's 2 numbers. CONFIG ONLY (M4) — arrangement, no logic.
 */
import type { RecipeConfig } from './types';
import { SHARED_RECIPE_TOKENS } from './sharedTokens';

export const focusFlow: RecipeConfig = {
  id: 'focus-flow',
  stageRail: 'tabs',
  coachEntry: 'bar',
  statsStrip: 'collapsed',
  tokens: SHARED_RECIPE_TOKENS,
};
