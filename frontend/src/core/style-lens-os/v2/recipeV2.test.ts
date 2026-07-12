/**
 * Recipe v2 core contracts: fail-closed validation, deterministic
 * compilation, graceful optional degradation, and the golden-pair
 * axis-delta gate on the Candy Glass Arcade vs Prism Terminal fixtures.
 */
import { describe, expect, it } from 'vitest';
import { compileRecipe } from './compileRecipe';
import type { HostCapabilityManifest } from './hostCapabilityManifest';
import { validateRecipeV2, type RecipeV2 } from './recipeV2';
import { changedAxisCount, whatChanged } from './whatChanged';

const manifest: HostCapabilityManifest = {
  hostId: 'workout-design-lab',
  version: '1.0.0',
  profiles: ['mobile-minimal', 'tablet', 'desktop-enhanced'],
  slots: {
    'text.display': { required: true, supportedVariants: ['rounded-athletic', 'compact-technical-mono'] },
    'text.body': { required: true, supportedVariants: ['soft-sans', 'terminal-mono'] },
    'surface.card': { required: true, supportedVariants: ['floating-candy', 'faceted-console'] },
    'collection.exercise': { required: true, supportedVariants: ['arcade-cards', 'command-rows'] },
    'action.primary': { required: true, supportedVariants: ['glass-dock', 'command-rail'] },
    'chart.progress': { required: false, supportedVariants: ['arcade-meter', 'telemetry-columns'] },
  },
  templates: {
    'playfield-stack': { supportedProfiles: ['mobile-minimal', 'tablet', 'desktop-enhanced'] },
    'operator-grid': { supportedProfiles: ['tablet', 'desktop-enhanced'] },
  },
};

const baseRecipe = (over: Partial<RecipeV2>): RecipeV2 => ({
  schema: 'smart-lens/recipe-v2',
  id: 'fixture.lens',
  version: '1.0.0',
  compatibility: { engine: '^2.0.0', requires: ['text.display', 'surface.card'], optional: ['chart.progress'] },
  tokens: { 'display-weight': '800', 'surface-radius': '26px' },
  composition: { 'desktop-enhanced': { template: 'playfield-stack' } },
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'surface.card': { variant: 'floating-candy' },
  },
  constraints: { minimumTouchTargetPx: 44, reducedMotionFallback: 'required' },
  ...over,
});

const candyGlassArcade = baseRecipe({
  id: 'fixture.candy-glass-arcade',
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'floating-candy' },
    'collection.exercise': { variant: 'arcade-cards' },
    'action.primary': { variant: 'glass-dock' },
    'chart.progress': { variant: 'arcade-meter', familiarity: 'expressive' },
  },
  composition: { 'desktop-enhanced': { template: 'playfield-stack' } },
});

const prismTerminal = baseRecipe({
  id: 'fixture.prism-terminal',
  components: {
    'text.display': { variant: 'compact-technical-mono' },
    'text.body': { variant: 'terminal-mono' },
    'surface.card': { variant: 'faceted-console' },
    'collection.exercise': { variant: 'command-rows' },
    'action.primary': { variant: 'command-rail' },
    'chart.progress': { variant: 'telemetry-columns' },
  },
  composition: { 'desktop-enhanced': { template: 'operator-grid' } },
});

describe('validateRecipeV2 (fail-closed)', () => {
  it('accepts a sound recipe', () => {
    expect(validateRecipeV2(candyGlassArcade)).toEqual([]);
  });

  it('rejects executable/url token values, bad ids, sub-44 targets', () => {
    const bad = baseRecipe({
      id: 'Bad Id!',
      tokens: { 'surface-bg': 'url(https://evil.example/x.png)' },
      constraints: { minimumTouchTargetPx: 32, reducedMotionFallback: 'required' },
    });
    const paths = validateRecipeV2(bad).map(({ path }) => path);
    expect(paths).toContain('id');
    expect(paths).toContain('tokens.surface-bg');
    expect(paths).toContain('constraints.minimumTouchTargetPx');
  });
});

describe('compileRecipe', () => {
  it('is deterministic: identical inputs -> deep-equal plans', () => {
    const one = compileRecipe(candyGlassArcade, manifest);
    const two = compileRecipe(candyGlassArcade, manifest);
    expect(one).toEqual(two);
  });

  it('prefixes tokens as lens2-* css variables and resolves variants', () => {
    const result = compileRecipe(candyGlassArcade, manifest);
    if (!result.ok) throw new Error('expected ok');
    expect(result.plan.cssVariables['lens2-surface-radius']).toBe('26px');
    expect(result.plan.variants['action.primary']).toBe('glass-dock');
    expect(result.plan.chartFamiliarity).toBe('expressive');
    expect(result.plan.templates['mobile-minimal']).toBe('default');
  });

  it('rejects non-allowlisted variants and unsupported templates', () => {
    const rogue = baseRecipe({
      components: { 'text.display': { variant: 'totally-made-up' } },
      composition: { 'mobile-minimal': { template: 'operator-grid' } },
    });
    const result = compileRecipe(rogue, manifest);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.issues.map(({ path }) => path);
    expect(paths).toContain('components.text.display.variant');
    expect(paths).toContain('composition.mobile-minimal.template');
  });

  it('drops unsupported OPTIONAL slots as recorded degradations', () => {
    const slim: HostCapabilityManifest = {
      ...manifest,
      slots: { ...manifest.slots, 'chart.progress': undefined },
    };
    const result = compileRecipe(candyGlassArcade, slim);
    if (!result.ok) throw new Error('expected ok');
    expect(result.plan.variants['chart.progress']).toBeUndefined();
    expect(result.degradations[0]).toMatch(/chart\.progress.*dropped/);
  });

  it('fails when a REQUIRED slot is missing from the host', () => {
    const slim: HostCapabilityManifest = {
      ...manifest,
      slots: { ...manifest.slots, 'surface.card': undefined },
    };
    const result = compileRecipe(candyGlassArcade, slim);
    expect(result.ok).toBe(false);
  });
});

describe('golden pair gate', () => {
  it('Candy Glass Arcade vs Prism Terminal differ on >= 5 axes', () => {
    const a = compileRecipe(candyGlassArcade, manifest);
    const b = compileRecipe(prismTerminal, manifest);
    if (!a.ok || !b.ok) throw new Error('fixtures must compile');
    const changes = whatChanged(a.plan, b.plan);
    expect(changedAxisCount(changes)).toBeGreaterThanOrEqual(5);
    // and the diff names the movement in human terms
    expect(changes.find(({ axis }) => axis === 'action')).toMatchObject({
      from: 'glass-dock',
      to: 'command-rail',
    });
  });

  it('an identical pair reports zero changed axes (no-op lenses are visible)', () => {
    const a = compileRecipe(candyGlassArcade, manifest);
    const b = compileRecipe(candyGlassArcade, manifest);
    if (!a.ok || !b.ok) throw new Error('fixtures must compile');
    expect(changedAxisCount(whatChanged(a.plan, b.plan))).toBe(0);
  });
});
