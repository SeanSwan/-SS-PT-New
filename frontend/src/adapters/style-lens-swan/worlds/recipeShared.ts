/**
 * BLUEPRINT — recipeShared (Swan adapter · World Engine spine, Slice 1)
 * ====================================================================
 * The SHARED recipe base every Swan world spreads (`...RECIPE_SHARED`). Moved
 * verbatim out of `v2/labRecipes.ts` in Slice 1 so per-world recipes live under
 * `worlds/recipes/` while `labRecipes.ts` re-exports them for zero importer
 * breakage. Values are byte-identical to the pre-migration `SHARED` const —
 * the compiled `ResolvedLensPlan` is therefore unchanged (hash-identical
 * migration, proven by `registry.test.ts` identity checks + the existing
 * labRecipes/surfaceManifests suites).
 */
import type { RecipeV2 } from '../../../core/style-lens-os/v2/recipeV2';

export const RECIPE_SHARED = {
  schema: 'smart-lens/recipe-v2' as const,
  version: '1.0.0',
  compatibility: {
    engine: '^2.0.0',
    requires: [
      'text.display',
      'text.body',
      'surface.card',
      'collection.exercise',
      'action.primary',
    ],
    optional: ['chart.progress'],
  } as RecipeV2['compatibility'],
  constraints: {
    minimumTouchTargetPx: 44,
    reducedMotionFallback: 'required',
  } as RecipeV2['constraints'],
};