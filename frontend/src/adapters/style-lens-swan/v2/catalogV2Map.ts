// adapters/style-lens-swan/v2/catalogV2Map.ts
import { builtWorlds } from '../worlds/registry';
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
 * Non-world catalog styles (#27+) that get a v2 recipe without being part of the
 * 25-world roster. Empty today; a v2-only style added here with
 * dashboardChrome: false picks up the allowlist exemption below.
 */
const EXTRA_ENTRIES: Record<string, CatalogV2Entry> = {};

export const V2_RECIPE_BY_CATALOG_ID: Readonly<Record<string, CatalogV2Entry>> = Object.freeze({
  ...WORLD_ENTRIES,
  ...EXTRA_ENTRIES,
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
