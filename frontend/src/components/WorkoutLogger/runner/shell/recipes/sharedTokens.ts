/**
 * Shared recipe token refs — single-level `var(--token, #fallback)` ONLY
 * (the contrast audit computes the fallbacks; nested var() is not
 * computable there). Fallbacks are the Crystalline Swan palette:
 * Ice Wing accent · Carbon surface · Frost White text · lightened
 * Wing Purple coach pair (Kimi H6 — never raw brand purple as text).
 */
import type { RecipeTokens } from './types';

export const SHARED_RECIPE_TOKENS: RecipeTokens = Object.freeze({
  accent: 'var(--world-accent, #60C0F0)',
  surface: 'var(--card-dark, #141419)',
  text: 'var(--frost-white, #E0ECF4)',
  coachFg: 'var(--swan-coach-fg, #C4B5FD)',
  coachBg: 'var(--swan-coach-bg, #1A1A24)',
});
