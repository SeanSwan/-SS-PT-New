/**
 * TEST: Lane-1 surface capability manifests — schema soundness, Golden Pair
 * compatibility as second/third hosts (chart slot degrades, never fails),
 * measurable ≥5-axis divergence, and the fail-closed appearance-profile
 * recipe resolution (v1 lens ids → host defaults).
 */
import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../../core/style-lens-os/v2/compileRecipe';
import { validateSurfaceCapabilityManifest } from '../../../core/style-lens-os/v2/capability-manifest.schema';
import { changedAxisCount, whatChanged } from '../../../core/style-lens-os/v2/whatChanged';
import { CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE } from './labRecipes';
import { resolveRecipeForStyleLens } from './recipeResolution';
import { WORKOUT_LOGGER_MANIFEST, WORKOUT_PLANNER_MANIFEST } from './surfaceManifests';

describe('Lane-1 surface capability manifests', () => {
  it('both rollout manifests validate clean', () => {
    expect(validateSurfaceCapabilityManifest(WORKOUT_LOGGER_MANIFEST)).toEqual([]);
    expect(validateSurfaceCapabilityManifest(WORKOUT_PLANNER_MANIFEST)).toEqual([]);
  });

  it('compiles the Golden Pair against the Workout Logger as a second host, degrading the chart slot', () => {
    for (const recipe of [CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE]) {
      const result = compileRecipe(recipe, WORKOUT_LOGGER_MANIFEST);
      expect(result.ok, `${recipe.id} must compile against the logger manifest`).toBe(true);
      if (result.ok) {
        expect(result.degradations.some(d => d.includes('chart.progress'))).toBe(true);
      }
    }
  });

  it('keeps the Golden Pair measurably different on the logger host (>= 5 axes)', () => {
    const candy = compileRecipe(CANDY_GLASS_ARCADE_RECIPE, WORKOUT_LOGGER_MANIFEST);
    const prism = compileRecipe(PRISM_TERMINAL_RECIPE, WORKOUT_LOGGER_MANIFEST);
    expect(candy.ok && prism.ok).toBe(true);
    if (candy.ok && prism.ok) {
      expect(changedAxisCount(whatChanged(candy.plan, prism.plan))).toBeGreaterThanOrEqual(5);
    }
  });

  it('resolves recipes ONLY for exact v2 ids (production v1 lens ids fall back to host defaults)', () => {
    expect(resolveRecipeForStyleLens(CANDY_GLASS_ARCADE_RECIPE.id)).toBe(CANDY_GLASS_ARCADE_RECIPE);
    expect(resolveRecipeForStyleLens(PRISM_TERMINAL_RECIPE.id)).toBe(PRISM_TERMINAL_RECIPE);
    expect(resolveRecipeForStyleLens('lens.crystalline-default')).toBeNull();
    expect(resolveRecipeForStyleLens(null)).toBeNull();
    expect(resolveRecipeForStyleLens(undefined)).toBeNull();
  });
});
