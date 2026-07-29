// adapters/style-lens-swan/v2/catalogV2Map.ts
import { CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE } from './labRecipes';
import { AURORA_INDEX_RECIPE } from '../worlds/recipes/aurora-index';
import { CRYSTALLINE_CATHEDRAL_RECIPE } from '../worlds/recipes/crystalline-cathedral';
import { COACH_LEDGER_RECIPE } from '../worlds/recipes/coach-ledger';
import { QUIET_MERIDIAN_RECIPE } from '../worlds/recipes/quiet-meridian';
import type { RecipeV2 } from '../../../core/style-lens-os/v2/recipeV2';

/** Catalog chips carry v1 ids; this map declares which chips have a v2
 * full-restyle recipe. Presence in the map = `v2 · full restyle` badge.
 * Absence = `v1 · chrome system` badge. Style #27+ adds one entry here.
 * dashboardChrome: does this style ALSO have a v1 chrome block in
 * SwanStyleLensGlobalStyles.ts (i.e., committing it visibly changes the
 * dashboard today)? The two originals do; v2-only new styles do NOT —
 * their Apply receipt + footer copy derive from this flag (§4.3). */
export interface CatalogV2Entry { recipe: RecipeV2; dashboardChrome: boolean }
export const V2_RECIPE_BY_CATALOG_ID: Readonly<Record<string, CatalogV2Entry>> = Object.freeze({
  'candy-glass-arcade': { recipe: CANDY_GLASS_ARCADE_RECIPE, dashboardChrome: true },
  'prism-terminal': { recipe: PRISM_TERMINAL_RECIPE, dashboardChrome: true },
  // Wave 1 — all 25 ids ship a v1 chrome lens (LENS_STYLE_ALLOWLIST), so
  // dashboardChrome is TRUE; the v2 full-restyle still renders only in the Lab
  // (recipeResolution rollout gate stays closed) until Slice 15's Sean-gated flip.
  'aurora-index': { recipe: AURORA_INDEX_RECIPE, dashboardChrome: true },
  'crystalline-cathedral': { recipe: CRYSTALLINE_CATHEDRAL_RECIPE, dashboardChrome: true },
  'coach-ledger': { recipe: COACH_LEDGER_RECIPE, dashboardChrome: true },
  'quiet-meridian': { recipe: QUIET_MERIDIAN_RECIPE, dashboardChrome: true },
});

/** F16 carve-out: v2-only styles (dashboardChrome: false) deliberately ship NO
 * v1 chrome/allowlist entry — they render through the recipe path and say so
 * in the Lab ("dashboard rollout pending"). The adapter barrel merges these
 * into the registry-integrity allowlist arg so the LENS-ADD-A-STYLE five-entry
 * pipeline never crashes adapter init for style #27+. Chrome styles get NO
 * exemption — the Wave-1 gate still bites them. */
export const buildV2OnlyAllowlistExemptions = (
  map: Readonly<Record<string, CatalogV2Entry>>,
): Readonly<Record<string, string>> =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(map)
        .filter(([, entry]) => entry.dashboardChrome === false)
        .map(([id]) => [id, 'v2-only — renders via recipe path, no v1 chrome']),
    ),
  );
