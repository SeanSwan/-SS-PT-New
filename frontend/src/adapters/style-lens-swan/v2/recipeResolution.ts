/**
 * FILE: recipeResolution.ts (Swan adapter, Recipe v2)
 * PURPOSE: Maps the committed appearance profile's styleLensId onto a v2
 * recipe. This is the "ship behind the appearance profile" gate for rollout
 * surfaces: today no v1 lens id collides with a v2 recipe id, so production
 * resolves to null (host defaults, zero visual change) until the catalog
 * exposes v2 styles. Fail-closed by construction — unknown id → null.
 */
import type { RecipeV2 } from '../../../core/style-lens-os/v2/recipeV2';
import { CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE } from './labRecipes';

const V2_RECIPES_BY_STYLE_LENS_ID: Readonly<Record<string, RecipeV2>> = {
  [CANDY_GLASS_ARCADE_RECIPE.id]: CANDY_GLASS_ARCADE_RECIPE,
  [PRISM_TERMINAL_RECIPE.id]: PRISM_TERMINAL_RECIPE,
};

/** Resolve a committed styleLensId to a v2 recipe, or null for host defaults. */
export const resolveRecipeForStyleLens = (
  styleLensId: string | null | undefined,
): RecipeV2 | null => {
  if (!styleLensId) return null;
  return V2_RECIPES_BY_STYLE_LENS_ID[styleLensId] ?? null;
};
