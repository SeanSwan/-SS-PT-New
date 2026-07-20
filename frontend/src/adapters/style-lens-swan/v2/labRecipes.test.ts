/**
 * The REAL Golden Pair gate: both production recipes compile against the
 * Lab manifest and differ on >= 5 axes — attribute-level truth that the
 * two lenses are genuinely different design systems, not palette swaps.
 */
import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../../core/style-lens-os/v2/compileRecipe';
import { changedAxisCount, whatChanged } from '../../../core/style-lens-os/v2/whatChanged';
import { validateRecipeV2 } from '../../../core/style-lens-os/v2/recipeV2';
import {
  CANDY_GLASS_ARCADE_RECIPE,
  LAB_HOST_MANIFEST,
  PRISM_TERMINAL_RECIPE,
} from './labRecipes';
import {
  buildV2OnlyAllowlistExemptions,
  V2_RECIPE_BY_CATALOG_ID,
  type CatalogV2Entry,
} from './catalogV2Map';
import { assertLensRegistryIntegrity } from '../contract/registryIntegrity';
import { buildWorldValuesRegistry } from '../contract/values';
import {
  BOOTCAMP_BUILDER_MANIFEST,
  CLIENTS_WORKSPACE_MANIFEST,
  CLIENT_PROGRESS_MANIFEST,
  MASTER_SCHEDULE_MANIFEST,
  WORKOUT_LOGGER_MANIFEST,
  WORKOUT_PLANNER_MANIFEST,
} from './surfaceManifests';

describe('Golden Pair production recipes', () => {
  it('both compile clean against the Lab host manifest', () => {
    const a = compileRecipe(CANDY_GLASS_ARCADE_RECIPE, LAB_HOST_MANIFEST);
    const b = compileRecipe(PRISM_TERMINAL_RECIPE, LAB_HOST_MANIFEST);
    expect(a.ok, JSON.stringify(!a.ok && a.issues)).toBe(true);
    expect(b.ok, JSON.stringify(!b.ok && b.issues)).toBe(true);
  });

  it('differ on >= 5 axes with divergent world tokens', () => {
    const a = compileRecipe(CANDY_GLASS_ARCADE_RECIPE, LAB_HOST_MANIFEST);
    const b = compileRecipe(PRISM_TERMINAL_RECIPE, LAB_HOST_MANIFEST);
    if (!a.ok || !b.ok) throw new Error('must compile');
    expect(changedAxisCount(whatChanged(a.plan, b.plan))).toBeGreaterThanOrEqual(5);
    // token-level divergence the frame will paint as --world-*
    expect(a.plan.cssVariables['lens2-world-panel-radius']).toBe('26px');
    expect(b.plan.cssVariables['lens2-world-panel-radius']).toBe('4px');
    expect(a.plan.cssVariables['lens2-world-title-font']).toContain('Sora');
    expect(b.plan.cssVariables['lens2-world-title-font']).toContain('Fira Code');
    // template topology diverges on desktop
    expect(a.plan.templates['desktop-enhanced']).toBe('playfield-stack');
    expect(b.plan.templates['desktop-enhanced']).toBe('operator-grid');
  });
});

/**
 * ADD-A-STYLE gates (A-PACK §5 A4) — every entry of V2_RECIPE_BY_CATALOG_ID
 * passes ALL FIVE gates. Style #N joins by adding its five entries; these
 * tests pick it up automatically.
 */
const MAP_ENTRIES = Object.entries(V2_RECIPE_BY_CATALOG_ID);
const ALL_MANIFESTS = [
  ['lab-host', LAB_HOST_MANIFEST],
  ['logger', WORKOUT_LOGGER_MANIFEST],
  ['planner', WORKOUT_PLANNER_MANIFEST],
  ['schedule', MASTER_SCHEDULE_MANIFEST],
  ['clients', CLIENTS_WORKSPACE_MANIFEST],
  ['bootcamp', BOOTCAMP_BUILDER_MANIFEST],
  ['progress', CLIENT_PROGRESS_MANIFEST],
] as const;

describe('ADD-A-STYLE pipeline gates (every catalog v2 entry)', () => {
  it.each(MAP_ENTRIES)(
    '%s compiles against the Lab host AND all 6 surface manifests with only declared-optional degradations',
    (_catalogId, entry) => {
      const optional = new Set(entry.recipe.compatibility.optional ?? []);
      for (const [label, manifest] of ALL_MANIFESTS) {
        const result = compileRecipe(entry.recipe, manifest);
        expect(result.ok, `${label}: ${JSON.stringify(!result.ok && result.issues)}`).toBe(true);
        if (result.ok) {
          for (const degradation of result.degradations) {
            expect(
              [...optional].some((slot) => degradation.includes(slot)),
              `${label} undeclared degradation: ${degradation}`,
            ).toBe(true);
          }
        }
      }
    },
  );

  it('distinctness gate: EVERY pair differs on >= 3 axes; the flagship golden pair keeps its >= 5', () => {
    const plans = MAP_ENTRIES.map(([catalogId, entry]) => {
      const result = compileRecipe(entry.recipe, LAB_HOST_MANIFEST);
      if (!result.ok) throw new Error(`${catalogId} must compile`);
      return { catalogId, plan: result.plan };
    });
    plans.forEach((a, index) =>
      plans.slice(index + 1).forEach((b) => {
        expect(
          changedAxisCount(whatChanged(a.plan, b.plan)),
          `${a.catalogId} vs ${b.catalogId}`,
        ).toBeGreaterThanOrEqual(3);
      }),
    );
    // Threshold law: the golden pair gates HIGHER (>= 5), stated here too.
    const candy = plans.find(({ catalogId }) => catalogId === 'candy-glass-arcade')!;
    const prism = plans.find(({ catalogId }) => catalogId === 'prism-terminal')!;
    expect(changedAxisCount(whatChanged(candy.plan, prism.plan))).toBeGreaterThanOrEqual(5);
  });

  it.each(MAP_ENTRIES)(
    '%s carries valid constraints, allowlisted tokens, and the swan.<name>.v2 id convention',
    (_catalogId, entry) => {
      expect(entry.recipe.constraints.minimumTouchTargetPx).toBeGreaterThanOrEqual(44);
      expect(entry.recipe.constraints.reducedMotionFallback).toBe('required');
      expect(validateRecipeV2(entry.recipe)).toEqual([]);
      expect(entry.recipe.id).toMatch(/^swan\.[a-z][a-z0-9-]{1,64}\.v2$/);
      expect(typeof entry.dashboardChrome).toBe('boolean');
    },
  );
});

/**
 * F16 carve-out (post-Wave-1 reconciliation): the dev/CI registry-integrity
 * gate requires a style-allowlist entry per promoted manifest — but v2-only
 * styles (dashboardChrome: false) deliberately ship NO v1 chrome. Without
 * this exemption, the LENS-ADD-A-STYLE five-entry pipeline crashes every
 * dashboard surface at adapter init for style #27+.
 */
describe('F16 registry-integrity carve-out for v2-only styles', () => {
  const FAKE_V2_ONLY: Record<string, CatalogV2Entry> = {
    'pipeline-proof': {
      recipe: { ...CANDY_GLASS_ARCADE_RECIPE, id: 'swan.pipeline-proof.v2' },
      dashboardChrome: false,
    },
  };

  it('exempts ONLY dashboardChrome:false entries (current shipped map yields zero exemptions)', () => {
    expect(buildV2OnlyAllowlistExemptions(V2_RECIPE_BY_CATALOG_ID)).toEqual({});
    expect(Object.keys(buildV2OnlyAllowlistExemptions(FAKE_V2_ONLY))).toEqual(['pipeline-proof']);
  });

  it('a v2-only promoted id passes the REAL integrity gate via the exemptions; without them it throws', () => {
    const ids = ['pipeline-proof'];
    const values = buildWorldValuesRegistry(ids);
    // Without the carve-out: the gate throws exactly the style-#27 crash.
    expect(() =>
      assertLensRegistryIntegrity(ids, values, {}),
    ).toThrow(/has no style-allowlist entry/);
    // With the carve-out merged (the index.ts composition): passes.
    expect(() =>
      assertLensRegistryIntegrity(ids, values, {
        ...buildV2OnlyAllowlistExemptions(FAKE_V2_ONLY),
      }),
    ).not.toThrow();
  });

  it('the carve-out does NOT weaken the gate for chrome styles (no allowlist entry still throws)', () => {
    const ids = ['some-chrome-style'];
    const values = buildWorldValuesRegistry(ids);
    // A chrome style (dashboardChrome:true → no exemption) with a missing
    // allowlist entry must still fail — Wave-1's invariant keeps its teeth.
    const exemptions = buildV2OnlyAllowlistExemptions({
      'some-chrome-style': { recipe: CANDY_GLASS_ARCADE_RECIPE, dashboardChrome: true },
    });
    expect(exemptions).toEqual({});
    expect(() =>
      assertLensRegistryIntegrity(ids, values, { ...exemptions }),
    ).toThrow(/has no style-allowlist entry/);
  });
});
