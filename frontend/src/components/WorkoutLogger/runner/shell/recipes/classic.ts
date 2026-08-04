/**
 * Classic Ledger — the fallback full-page recipe. Same zone chrome
 * as Focus Flow (tabs, coach in bar, stats collapsed); the canvas
 * renders the host's proven full card stack. CONFIG ONLY (M4).
 */
import type { RecipeConfig } from './types';
import { SHARED_RECIPE_TOKENS } from './sharedTokens';

export const classic: RecipeConfig = {
  id: 'classic-ledger',
  stageRail: 'tabs',
  coachEntry: 'bar',
  statsStrip: 'collapsed',
  tokens: SHARED_RECIPE_TOKENS,
};
