/**
 * The REAL Golden Pair gate: both production recipes compile against the
 * Lab manifest and differ on >= 5 axes — attribute-level truth that the
 * two lenses are genuinely different design systems, not palette swaps.
 */
import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../../core/style-lens-os/v2/compileRecipe';
import { changedAxisCount, whatChanged } from '../../../core/style-lens-os/v2/whatChanged';
import {
  CANDY_GLASS_ARCADE_RECIPE,
  LAB_HOST_MANIFEST,
  PRISM_TERMINAL_RECIPE,
} from './labRecipes';

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
