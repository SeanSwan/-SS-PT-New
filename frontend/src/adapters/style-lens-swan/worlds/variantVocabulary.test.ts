/**
 * SLICE W0 — variant vocabulary: consistency + the 25-distinct-worlds PROOF.
 * ========================================================================
 * The load-bearing Slice-1 finding: distinctness counts only the 6 variant/
 * template axes (tokens = 0), so ~2 variants/axis caps you at ~8 distinct
 * worlds. This test PROVES the expanded vocabulary clears the bar: it builds
 * ≥25 recipes drawing distinct variant/template codewords and asserts — through
 * the REAL gate (`compileRecipe` + `whatChanged`) — that every pair differs on
 * ≥3 axes. It also enforces the single-source-of-truth invariant: the Lab host
 * and every surface manifest draw the SAME variant lists (no drift).
 */
import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../../core/style-lens-os/v2/compileRecipe';
import { changedAxisCount, whatChanged } from '../../../core/style-lens-os/v2/whatChanged';
import { validateRecipeV2, type RecipeV2 } from '../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from './recipeShared';
import { LAB_HOST_MANIFEST } from '../v2/labRecipes';
import {
  ACTION_VARIANTS,
  BODY_VARIANTS,
  CHART_VARIANTS,
  COLLECTION_VARIANTS,
  DISPLAY_VARIANTS,
  SURFACE_VARIANTS,
  TEMPLATE_NAMES,
} from './variantVocabulary';
import {
  CLIENT_PROGRESS_MANIFEST,
  WORKOUT_LOGGER_MANIFEST,
  WORKOUT_PLANNER_MANIFEST,
} from '../v2/surfaceManifests';

const KEBAB = /^[a-z][a-z0-9-]{1,64}$/;

describe('variant vocabulary · shape + consistency', () => {
  it('has expanded past the ~8-world ceiling (≥4 variants on most axes, ≥4 templates)', () => {
    expect(DISPLAY_VARIANTS.length).toBeGreaterThanOrEqual(5);
    expect(BODY_VARIANTS.length).toBeGreaterThanOrEqual(4);
    expect(SURFACE_VARIANTS.length).toBeGreaterThanOrEqual(5);
    expect(COLLECTION_VARIANTS.length).toBeGreaterThanOrEqual(5);
    expect(ACTION_VARIANTS.length).toBeGreaterThanOrEqual(4);
    expect(CHART_VARIANTS.length).toBeGreaterThanOrEqual(4);
    expect(TEMPLATE_NAMES.length).toBeGreaterThanOrEqual(4);
  });

  it('all variant names are kebab-case + unique per axis', () => {
    for (const list of [DISPLAY_VARIANTS, BODY_VARIANTS, SURFACE_VARIANTS, COLLECTION_VARIANTS, ACTION_VARIANTS, CHART_VARIANTS]) {
      expect(new Set(list).size).toBe(list.length);
      for (const v of list) expect(v, v).toMatch(KEBAB);
    }
  });

  it('single source of truth: the Lab host + surface manifests draw the SAME variant lists (no drift)', () => {
    const host = LAB_HOST_MANIFEST.slots;
    expect(host['text.display']!.supportedVariants).toEqual([...DISPLAY_VARIANTS]);
    expect(host['surface.card']!.supportedVariants).toEqual([...SURFACE_VARIANTS]);
    expect(host['collection.exercise']!.supportedVariants).toEqual([...COLLECTION_VARIANTS]);
    // surfaces (no chart slot) must match the shared vocabulary exactly
    for (const m of [WORKOUT_LOGGER_MANIFEST, WORKOUT_PLANNER_MANIFEST]) {
      expect(m.slots['surface.card']!.supportedVariants).toEqual([...SURFACE_VARIANTS]);
      expect(m.slots['action.primary']!.supportedVariants).toEqual([...ACTION_VARIANTS]);
    }
    // the one chart-bearing surface matches the chart vocabulary
    expect(CLIENT_PROGRESS_MANIFEST.slots['chart.progress']!.supportedVariants).toEqual([...CHART_VARIANTS]);
  });
});

/** Build a valid recipe from a 6-axis codeword (mobile always uses the
 *  all-profile playfield-stack; the tablet/desktop template carries the axis). */
const recipeFromCodeword = (
  id: number,
  c: { display: string; template: string; surface: string; collection: string; action: string; chart: string },
): RecipeV2 => ({
  ...RECIPE_SHARED,
  id: `swan.proof-${id}.v2`,
  tokens: { 'world-accent': 'var(--ice-wing, #60c0f0)' },
  composition: {
    'desktop-enhanced': { template: c.template },
    tablet: { template: c.template },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: c.display },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: c.surface },
    'collection.exercise': { variant: c.collection },
    'action.primary': { variant: c.action },
    'chart.progress': { variant: c.chart, familiarity: 'expressive' },
  },
});

describe('variant vocabulary · PROOF the expansion supports 25 distinct worlds', () => {
  it('greedily builds ≥25 codewords pairwise-≥3-axis-distinct through the REAL gate', () => {
    // Deterministic enumeration (fixed order; no clocks/randomness).
    const tuples: { display: string; template: string; surface: string; collection: string; action: string; chart: string }[] = [];
    const hamming = (a: typeof tuples[number], b: typeof tuples[number]) =>
      (a.display !== b.display ? 1 : 0) + // typography axis (display drives it; body fixed)
      (a.template !== b.template ? 1 : 0) + // composition axis
      (a.surface !== b.surface ? 1 : 0) +
      (a.collection !== b.collection ? 1 : 0) +
      (a.action !== b.action ? 1 : 0) +
      (a.chart !== b.chart ? 1 : 0);

    const selected: typeof tuples = [];
    for (const display of DISPLAY_VARIANTS)
      for (const template of TEMPLATE_NAMES)
        for (const surface of SURFACE_VARIANTS)
          for (const collection of COLLECTION_VARIANTS)
            for (const action of ACTION_VARIANTS)
              for (const chart of CHART_VARIANTS) {
                if (selected.length >= 25) break;
                const cand = { display, template, surface, collection, action, chart };
                if (selected.every((s) => hamming(s, cand) >= 3)) selected.push(cand);
              }

    expect(selected.length).toBe(25);

    // Verify through the REAL gate: compile each, assert every pair ≥3 axes.
    const plans = selected.map((c, i) => {
      const result = compileRecipe(recipeFromCodeword(i, c), LAB_HOST_MANIFEST);
      expect(result.ok, JSON.stringify(!result.ok && result.issues)).toBe(true);
      if (!result.ok) throw new Error('proof recipe must compile');
      expect(validateRecipeV2(recipeFromCodeword(i, c))).toEqual([]);
      return result.plan;
    });
    plans.forEach((a, i) =>
      plans.slice(i + 1).forEach((b, j) => {
        expect(changedAxisCount(whatChanged(a, b)), `proof-${i} vs proof-${i + 1 + j}`).toBeGreaterThanOrEqual(3);
      }),
    );
  });
});