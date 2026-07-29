// adapters/style-lens-swan/v2/catalogV2Map.ts
import { builtWorlds } from '../worlds/registry';
import { EXTRA_ENTRY_META } from './catalogV2Exemptions';
import type { RecipeV2 } from '../../../core/style-lens-os/v2/recipeV2';

/** Catalog chips carry v1 ids; this map declares which chips have a v2
 * full-restyle recipe. Presence in the map = `v2 · full restyle` badge.
 * Absence = `v1 · chrome system` badge. Style #27+ adds one entry here.
 * dashboardChrome: does this style ALSO have a v1 chrome block in
 * SwanStyleLensGlobalStyles.ts (i.e., committing it visibly changes the
 * dashboard today)? The two originals do; v2-only new styles do NOT —
 * their Apply receipt + footer copy derive from this flag (§4.3). */
export interface CatalogV2Entry { recipe: RecipeV2; dashboardChrome: boolean }

/**
 * World entries are DERIVED from the registry, not hand-listed. A hand-listed
 * map is a drift surface: a world could be `built` in the registry (and pass
 * every world-engine gate) while being invisible in the Lab because someone
 * forgot a line here. Deriving makes "built" and "offered in the Lab" the same
 * fact. All 25 roster ids ship a v1 chrome lens (LENS_STYLE_ALLOWLIST), so every
 * world carries dashboardChrome: true; the v2 full-restyle still renders only in
 * the Lab (the recipeResolution rollout gate stays closed) until Slice 15's
 * Sean-gated flip.
 */
const WORLD_ENTRIES: Record<string, CatalogV2Entry> = Object.fromEntries(
  builtWorlds().map((world) => [world.id, { recipe: world.recipe, dashboardChrome: true }]),
);

/**
 * Non-world catalog styles (#27+): recipes live here, their metadata lives in
 * `catalogV2Exemptions.ts`. Empty today. The split is deliberate — see that
 * file's header: the app-wide adapter barrel needs ONLY the metadata, and
 * importing this module to get it dragged all 23 world recipes into the main
 * entry chunk every visitor downloads.
 */
const EXTRA_RECIPES: Record<string, RecipeV2> = {};

const EXTRA_ENTRIES: Record<string, CatalogV2Entry> = Object.fromEntries(
  Object.entries(EXTRA_RECIPES).map(([id, recipe]) => [
    id,
    { recipe, dashboardChrome: EXTRA_ENTRY_META[id]?.dashboardChrome ?? false },
  ]),
);

export const V2_RECIPE_BY_CATALOG_ID: Readonly<Record<string, CatalogV2Entry>> = Object.freeze({
  ...WORLD_ENTRIES,
  ...EXTRA_ENTRIES,
});

/** Re-exported so existing importers keep working; the implementation and the
 *  metadata it reads now live in the recipe-free `catalogV2Exemptions.ts`. */
export { buildV2OnlyAllowlistExemptions } from './catalogV2Exemptions';
