/**
 * WORLD ENGINE — Slice 1 CI (layers 1–2) + hash-identical migration proof.
 * ======================================================================
 * Layer 1 (completeness): the roster is exactly the 25 real catalog ids in the
 * right family partition; the registry + ledger are exhaustive; the built
 * invariant holds. Layer 2 (static-deterministic): every BUILT recipe validates,
 * compiles clean against the Lab host, and is distinct; phenomena are unique.
 * Migration proof: the 2 recipes are the SAME object references through the new
 * `worlds/*` home and the legacy `v2/labRecipes` re-export and the production
 * resolver — identity ⇒ the compiled plan is byte-identical (zero drift).
 */
import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../../core/style-lens-os/v2/compileRecipe';
import { validateRecipeV2 } from '../../../core/style-lens-os/v2/recipeV2';
import { changedAxisCount, whatChanged } from '../../../core/style-lens-os/v2/whatChanged';
import {
  WORLD_COUNT,
  WORLD_FAMILY,
  WORLD_IDS,
  isWorldId,
  worldRecipeId,
  type WorldFamily,
} from './worldId';
import { WORLD_REGISTRY, builtWorlds, plannedWorlds } from './registry';
import { WORLD_LEDGER } from './ledger';
import { RECIPE_SHARED } from './recipeShared';
import {
  CANDY_GLASS_ARCADE_RECIPE,
  GOLDEN_PAIR,
  LAB_HOST_MANIFEST,
  PRISM_TERMINAL_RECIPE,
} from '../v2/labRecipes';
import { resolveRecipeForStyleLens } from '../v2/recipeResolution';
import * as surfaceManifests from '../v2/surfaceManifests';
import { WORKOUT_LOGGER_MANIFEST } from '../v2/surfaceManifests';
import type { SurfaceCapabilityManifest } from '../../../core/style-lens-os/v2/capability-manifest.schema';

// ── Layer 1: completeness ────────────────────────────────────────────────────
describe('World Engine · layer 1 completeness', () => {
  it('the roster is exactly 25 ids', () => {
    expect(WORLD_COUNT).toBe(25);
    expect(WORLD_IDS.length).toBe(25);
    expect(new Set(WORLD_IDS).size).toBe(25); // no duplicates
  });

  it('family partition matches WORKOUT_DESIGN_STYLE_ROW_ORDER (7/4/6/4/4)', () => {
    const counts = WORLD_IDS.reduce<Record<WorldFamily, number>>(
      (acc, id) => {
        acc[WORLD_FAMILY[id]] += 1;
        return acc;
      },
      { playful: 0, calm: 0, technical: 0, luxe: 0, atmospheric: 0 },
    );
    expect(counts).toEqual({ playful: 7, calm: 4, technical: 6, luxe: 4, atmospheric: 4 });
  });

  it('registry + ledger are exhaustive over WorldId and agree on family', () => {
    expect(Object.keys(WORLD_REGISTRY).sort()).toEqual([...WORLD_IDS].sort());
    expect(Object.keys(WORLD_LEDGER).sort()).toEqual([...WORLD_IDS].sort());
    for (const id of WORLD_IDS) {
      expect(WORLD_REGISTRY[id].family).toBe(WORLD_FAMILY[id]);
      expect(WORLD_LEDGER[id].family).toBe(WORLD_FAMILY[id]);
      expect(WORLD_LEDGER[id].status).toBe(WORLD_REGISTRY[id].status);
    }
  });

  it('the built invariant holds: status "built" ⟺ recipe non-null', () => {
    for (const id of WORLD_IDS) {
      const e = WORLD_REGISTRY[id];
      expect(e.recipe !== null).toBe(e.status === 'built');
    }
  });

  it('the built set is the Golden Pair + Wave 1 (6 built, 19 planned)', () => {
    expect(builtWorlds().map((e) => e.id).sort()).toEqual([
      'aurora-index',
      'candy-glass-arcade',
      'coach-ledger',
      'crystalline-cathedral',
      'prism-terminal',
      'quiet-meridian',
    ]);
    expect(plannedWorlds().length).toBe(19);
    expect(builtWorlds().length + plannedWorlds().length).toBe(25);
  });

  it('isWorldId guards the closed set', () => {
    expect(isWorldId('aurora-index')).toBe(true);
    expect(isWorldId('not-a-world')).toBe(false);
    expect(isWorldId(42)).toBe(false);
  });
});

// ── Layer 2: static-deterministic ────────────────────────────────────────────
describe('World Engine · layer 2 static-deterministic', () => {
  it('every built recipe validates clean, compiles clean, and uses the id convention', () => {
    for (const e of builtWorlds()) {
      expect(e.recipe).not.toBeNull();
      const recipe = e.recipe!;
      expect(recipe.id).toBe(worldRecipeId(e.id));
      expect(recipe.id).toMatch(/^swan\.[a-z][a-z0-9-]{1,64}\.v2$/);
      expect(validateRecipeV2(recipe)).toEqual([]);
      expect(recipe.constraints.minimumTouchTargetPx).toBeGreaterThanOrEqual(44);
      expect(recipe.constraints.reducedMotionFallback).toBe('required');
      const result = compileRecipe(recipe, LAB_HOST_MANIFEST);
      expect(result.ok, JSON.stringify(!result.ok && result.issues)).toBe(true);
    }
  });

  it('built worlds are distinct: every pair differs on >= 3 axes', () => {
    const plans = builtWorlds().map((e) => {
      const r = compileRecipe(e.recipe!, LAB_HOST_MANIFEST);
      if (!r.ok) throw new Error(`${e.id} must compile`);
      return { id: e.id, plan: r.plan };
    });
    plans.forEach((a, i) =>
      plans.slice(i + 1).forEach((b) => {
        expect(changedAxisCount(whatChanged(a.plan, b.plan)), `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(3);
      }),
    );
  });

  it('every world owns a UNIQUE phenomenon (no 25 greys)', () => {
    const phenomena = WORLD_IDS.map((id) => WORLD_LEDGER[id].phenomenon);
    expect(phenomena.every((p) => p.trim().length > 0)).toBe(true);
    expect(new Set(phenomena).size).toBe(25);
  });

  it('every ledger entry carries the Swan budget floors (WCAG 4.5, 44px, LCP<=2.5s)', () => {
    for (const id of WORLD_IDS) {
      const b = WORLD_LEDGER[id].budgets;
      expect(b.contrastMin).toBeGreaterThanOrEqual(4.5);
      expect(b.minTouchPx).toBeGreaterThanOrEqual(44);
      expect(b.lcpMs).toBeLessThanOrEqual(2500);
      expect(b.inpMs).toBeLessThanOrEqual(200);
      expect(b.cls).toBeLessThanOrEqual(0.1);
    }
  });
});

// ── Layer 2b: EVERY built world against EVERY rollout surface ────────────────
/**
 * Hostile round 5. Before this, built worlds were only ever compiled against
 * LAB_HOST_MANIFEST, and only the Golden Pair was ever compiled against a
 * production surface (surfaceManifests.test.ts). Two gaps followed:
 *  1. A Wave world could be Lab-valid and fail on a rollout surface — invisible
 *     until Slice 15 flips the gate, i.e. in front of users.
 *  2. Distinctness was measured ONLY on the chart-bearing Lab host. Five of the
 *     six surfaces publish NO chart slot, so the chart axis degrades on both
 *     sides of a pair and the axis count drops by one. A pair sitting at exactly
 *     3 axes on the Lab host with chart as one of them is INDISTINCT on the
 *     surfaces users actually see.
 */
describe('World Engine · layer 2b every built world compiles on every rollout surface', () => {
  const SURFACES = Object.entries(surfaceManifests).filter(([name]) => name.endsWith('_MANIFEST'));

  it('has all 6 surface manifests in scope (anti-vacuous guard)', () => {
    expect(SURFACES.length).toBeGreaterThanOrEqual(6);
  });

  it('compiles clean, degrading ONLY slots the recipe declares optional', () => {
    for (const world of builtWorlds()) {
      const optional = new Set(world.recipe!.compatibility.optional ?? []);
      for (const [surfaceName, manifest] of SURFACES) {
        const result = compileRecipe(world.recipe!, manifest as SurfaceCapabilityManifest);
        expect(result.ok, `${world.id} on ${surfaceName}: ${JSON.stringify(!result.ok && result.issues)}`)
          .toBe(true);
        if (!result.ok) continue;
        for (const degradation of result.degradations) {
          const slot = [...optional].find((s) => degradation.includes(s));
          expect(
            slot,
            `${world.id} on ${surfaceName} degraded a NON-optional slot: ${degradation}`,
          ).toBeTruthy();
        }
      }
    }
  });

  it('stays pairwise >= 3 axes distinct on a surface with NO chart slot', () => {
    // The logger publishes no chart.progress slot, so the chart axis collapses
    // for every recipe — the strictest real distinctness test we can run today.
    const plans = builtWorlds().map((e) => {
      const r = compileRecipe(e.recipe!, WORKOUT_LOGGER_MANIFEST);
      if (!r.ok) throw new Error(`${e.id} must compile on the logger surface`);
      return { id: e.id, plan: r.plan };
    });
    plans.forEach((a, i) =>
      plans.slice(i + 1).forEach((b) => {
        expect(
          changedAxisCount(whatChanged(a.plan, b.plan)),
          `${a.id} vs ${b.id} on the chart-less logger surface`,
        ).toBeGreaterThanOrEqual(3);
      }),
    );
  });
});

// ── Hash-identical migration proof ───────────────────────────────────────────
describe('World Engine · migration is hash-identical (identity + determinism)', () => {
  it('the 2 recipes are the SAME object through worlds/, legacy re-export, and resolver', () => {
    // registry recipe === legacy labRecipes export === GOLDEN_PAIR === resolver hit
    expect(WORLD_REGISTRY['candy-glass-arcade'].recipe).toBe(CANDY_GLASS_ARCADE_RECIPE);
    expect(WORLD_REGISTRY['prism-terminal'].recipe).toBe(PRISM_TERMINAL_RECIPE);
    expect(GOLDEN_PAIR[0]).toBe(CANDY_GLASS_ARCADE_RECIPE);
    expect(GOLDEN_PAIR[1]).toBe(PRISM_TERMINAL_RECIPE);
    expect(resolveRecipeForStyleLens(CANDY_GLASS_ARCADE_RECIPE.id)).toBe(CANDY_GLASS_ARCADE_RECIPE);
    expect(resolveRecipeForStyleLens(PRISM_TERMINAL_RECIPE.id)).toBe(PRISM_TERMINAL_RECIPE);
  });

  it('compilation is deterministic (same recipe → deep-equal plan)', () => {
    for (const recipe of [CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE]) {
      const a = compileRecipe(recipe, LAB_HOST_MANIFEST);
      const b = compileRecipe(recipe, LAB_HOST_MANIFEST);
      expect(a).toEqual(b);
    }
  });

  it('the resolver stays fail-closed for v1 lens ids (rollout gate intact)', () => {
    // A1-class guard: production v1 ids (no swan.*.v2) still resolve to null.
    expect(resolveRecipeForStyleLens('candy-glass-arcade')).toBeNull();
    expect(resolveRecipeForStyleLens('prism-terminal')).toBeNull();
    expect(resolveRecipeForStyleLens(null)).toBeNull();
  });
});

// ── Generator: dummy-world scaffold compiles (E2E, no fs) ─────────────────────
describe('World Engine · generator scaffold is valid', () => {
  // Mirrors the exact defaults `scripts/lens-add-world.mjs renderWorldRecipeStub`
  // emits; proving they compile is the "scaffold a dummy world end-to-end" gate.
  const DUMMY = {
    ...RECIPE_SHARED,
    id: 'swan.dummy-proof.v2',
    tokens: {
      'world-title-font': "700 clamp(28px, 3.4vw, 52px)/1.06 'Plus Jakarta Sans', sans-serif",
      'world-letter-spacing': '-0.01em',
      'world-panel-radius': '16px',
      'world-row-radius': '12px',
      'world-dial-radius': '12px',
      'world-accent': 'var(--ice-wing, #60c0f0)',
      'world-action': 'var(--midnight-sapphire, #002060)',
      'world-panel': 'color-mix(in srgb, #12203c 88%, transparent)',
      'world-row-columns': 'repeat(auto-fit, minmax(160px, 1fr))',
    },
    composition: {
      'desktop-enhanced': { template: 'playfield-stack' as const },
      tablet: { template: 'playfield-stack' as const },
      'mobile-minimal': { template: 'playfield-stack' as const },
    },
    components: {
      'text.display': { variant: 'vaulted-editorial' },
      'text.body': { variant: 'soft-sans' },
      'surface.card': { variant: 'floating-candy' },
      'collection.exercise': { variant: 'arcade-cards' },
      'action.primary': { variant: 'glass-dock' },
      'chart.progress': { variant: 'arcade-meter', familiarity: 'expressive' as const },
    },
  };

  it('the generator default stub validates and compiles clean against the Lab host', () => {
    expect(validateRecipeV2(DUMMY)).toEqual([]);
    const result = compileRecipe(DUMMY, LAB_HOST_MANIFEST);
    expect(result.ok, JSON.stringify(!result.ok && result.issues)).toBe(true);
  });
});