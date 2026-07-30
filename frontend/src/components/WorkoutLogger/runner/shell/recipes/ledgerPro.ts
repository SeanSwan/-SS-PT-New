/**
 * Ledger Pro — the power view. Stage rail collapses to a segmented
 * control; coach becomes a right-edge tab at ≥768px; the dense stats
 * strip is expanded by default. CONFIG ONLY (M4).
 */
import type { RecipeConfig } from './types';
import { SHARED_RECIPE_TOKENS } from './sharedTokens';

export const ledgerPro: RecipeConfig = {
  id: 'ledger-pro',
  stageRail: 'segmented',
  coachEntry: 'edge-tab',
  statsStrip: 'expanded',
  tokens: SHARED_RECIPE_TOKENS,
};
