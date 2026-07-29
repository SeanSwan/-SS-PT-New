/**
 * FILE: catalogV2Exemptions.ts (Swan adapter, Recipe v2)
 * ======================================================
 * The allowlist-exemption metadata, deliberately SPLIT from `catalogV2Map.ts`.
 *
 * WHY THE SPLIT (hostile round 9): the app-wide adapter barrel
 * (`adapters/style-lens-swan/index.ts`) calls `buildV2OnlyAllowlistExemptions`
 * during registry init. It imported `V2_RECIPE_BY_CATALOG_ID` to do it, which
 * imports the world registry, which eagerly imports EVERY world recipe module —
 * so all 23 Lab-only recipes were bundled into `dist/v3/index.*.js`, the main
 * entry chunk every visitor downloads on first paint. Verified by grepping the
 * built output for `swan.<world>.v2`.
 *
 * The exemption set only ever contains entries with `dashboardChrome: false`.
 * Every one of the 25 roster worlds ships a v1 chrome lens, so worlds are
 * `dashboardChrome: true` and can NEVER contribute to it — the barrel was paying
 * for data it structurally cannot use. Only non-world catalog styles (#27+) can.
 *
 * So: this module holds the extras + the builder and imports NO recipes; the
 * barrel imports only this. `catalogV2Map.ts` re-uses `EXTRA_ENTRIES` from here
 * so there is still exactly one source of truth, and the Lab keeps paying for
 * the recipes because the Lab is what renders them.
 */

/** Metadata a catalog style carries independently of its (heavy) recipe. */
export interface CatalogV2Meta {
  /** Does this style ALSO have a v1 chrome block in SwanStyleLensGlobalStyles.ts
   *  (i.e. committing it visibly changes the dashboard today)? */
  dashboardChrome: boolean;
}

/**
 * The MINIMAL shape the exemption builder needs. Declared structurally (and
 * without an index signature, which interfaces do not satisfy) so a full
 * `CatalogV2Entry` — which also carries the heavy recipe — is accepted too.
 */
type DashboardChromeBearing = {
  readonly dashboardChrome: boolean;
  /** Present on full `CatalogV2Entry` values and on inline literals in tests.
   *  Declared (as unknown) purely so excess-property checking accepts those
   *  literals; this module never reads it — that is the whole point of the split. */
  readonly recipe?: unknown;
};

/**
 * Non-world catalog styles (#27+) that get a v2 recipe without being part of the
 * 25-world roster. Empty today. A v2-only style added here with
 * `dashboardChrome: false` picks up the allowlist exemption below; its recipe is
 * registered alongside it in `catalogV2Map.ts`.
 */
export const EXTRA_ENTRY_META: Readonly<Record<string, CatalogV2Meta>> = Object.freeze({});

/**
 * F16 carve-out: v2-only styles (dashboardChrome: false) deliberately ship NO v1
 * chrome/allowlist entry — they render through the recipe path and say so in the
 * Lab ("dashboard rollout pending"). The adapter barrel merges these into the
 * registry-integrity allowlist arg so the LENS-ADD-A-STYLE five-entry pipeline
 * never crashes adapter init for style #27+. Chrome styles get NO exemption —
 * the Wave-1 gate still bites them.
 */
export const buildV2OnlyAllowlistExemptions = (
  // Structural, not nominal: this only ever READS `dashboardChrome`, so a full
  // `CatalogV2Entry` (which also carries the heavy recipe) is accepted too —
  // existing callers and tests pass those.
  meta: Readonly<Record<string, DashboardChromeBearing>> = EXTRA_ENTRY_META,
): Readonly<Record<string, string>> =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(meta)
        .filter(([, entry]) => entry.dashboardChrome === false)
        .map(([id]) => [id, 'v2-only — renders via recipe path, no v1 chrome']),
    ),
  );
