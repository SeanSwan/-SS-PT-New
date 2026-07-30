/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — recipe contrast audit (Slice 0).            │
 * │ Kimi H6: "contrast is asserted, not engineered." Fixed:     │
 * │ every recipe's token pairs are COMPUTED here (colorScience  │
 * │ WCAG math, not eyeballs) against the 4.5:1 floor. Coach     │
 * │ purple must be a lightened verified pair — never raw Wing   │
 * │ Purple as text. Atmosphere recipes must declare the scrim   │
 * │ token or they do not ship (World Immersion gate).           │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 knobs + §5.     │
 * └─────────────────────────────────────────────────────────────┘
 */
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../../../context/ThemeContext/colorScience';
import { CORE_RECIPES, getRecipe } from './recipes';
import type { RecipeConfig } from './recipes/types';

/** Extract the literal fallback from a `var(--token, #fallback)` ref. */
const fallbackOf = (tokenRef: string): string => {
  const match = /var\(--[\w-]+,\s*([^)]+)\)/.exec(tokenRef);
  if (!match) throw new Error(`token ref has no computable fallback: ${tokenRef}`);
  return match[1].trim();
};

const FLOOR = 4.5;

describe('recipe registry shape', () => {
  it('the four core recipes exist and match the shipped runner styles', () => {
    expect(CORE_RECIPES.map((recipe) => recipe.id)).toEqual([
      'focus-flow', 'classic-ledger', 'ledger-pro', 'sheet-stack',
    ]);
  });

  it('getRecipe falls back to Focus Flow for unknown ids (crash-safe switch)', () => {
    expect(getRecipe('focus-flow').id).toBe('focus-flow');
    expect(getRecipe('nonsense' as never).id).toBe('focus-flow');
  });

  it('every token is a var() ref with a fallback — no raw colors as config values', () => {
    for (const recipe of CORE_RECIPES) {
      for (const [name, ref] of Object.entries(recipe.tokens)) {
        expect(ref, `${recipe.id}.tokens.${name} must be var(--…, fallback)`)
          .toMatch(/^var\(--[\w-]+,\s*[^)]+\)$/);
      }
    }
  });
});

describe.each(CORE_RECIPES.map((recipe) => [recipe.id, recipe] as [string, RecipeConfig]))(
  'computed contrast ≥ 4.5:1 — %s',
  (_id, recipe) => {
    it('body text on the recipe surface', () => {
      const ratio = contrastRatio(fallbackOf(recipe.tokens.text), fallbackOf(recipe.tokens.surface));
      expect(ratio).toBeGreaterThanOrEqual(FLOOR);
    });

    it('accent (chips/status text) on the recipe surface', () => {
      const ratio = contrastRatio(fallbackOf(recipe.tokens.accent), fallbackOf(recipe.tokens.surface));
      expect(ratio).toBeGreaterThanOrEqual(FLOOR);
    });

    it('Coach foreground on Coach background (the H6 purple-on-dark trap)', () => {
      const ratio = contrastRatio(fallbackOf(recipe.tokens.coachFg), fallbackOf(recipe.tokens.coachBg));
      expect(ratio).toBeGreaterThanOrEqual(FLOOR);
    });

    it('atmosphere recipes MUST carry the zone scrim token (World Immersion gate)', () => {
      if (recipe.atmosphere) {
        expect(recipe.atmosphere.scrimToken).toBe('--swan-zone-scrim');
      }
    });
  },
);
