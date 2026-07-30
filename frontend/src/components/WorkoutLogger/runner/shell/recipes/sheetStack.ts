/**
 * Sheet Stack — iOS-native ergonomics. Stages ride as sheet detents
 * (reduced-motion: falls back to the tab layout — the primitive
 * decides, config only names the intent). CONFIG ONLY (M4).
 */
import type { RecipeConfig } from './types';
import { SHARED_RECIPE_TOKENS } from './sharedTokens';

export const sheetStack: RecipeConfig = {
  id: 'sheet-stack',
  stageRail: 'detents',
  coachEntry: 'bar',
  statsStrip: 'collapsed',
  tokens: SHARED_RECIPE_TOKENS,
};
