import { describe, expect, it } from 'vitest';
import { LENS_STYLE_ALLOWLIST } from '../../../../adapters/style-lens-swan/styles/lenses';
import { TEMPLATE_NAMES } from '../../../../adapters/style-lens-swan/worlds/variantVocabulary';
import { CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE } from '../../../../adapters/style-lens-swan/v2/labRecipes';
import { compileRecipe } from '../../../../core/style-lens-os/v2/compileRecipe';
import { validateSurfaceCapabilityManifest } from '../../../../core/style-lens-os/v2/capability-manifest.schema';
import { COACH_WORKSPACE_MANIFEST } from '../../../../adapters/style-lens-swan/v2/surfaceManifests';
import {
  COACH_WORKSPACE_LAYOUTS, LENS_WORKSPACE_LAYOUT, resolveCoachWorkspaceLayout, workspaceDocking,
} from './coachWorkspaceLayout';

describe('coach workspace ↔ Swan Style Lens layout', () => {
  it('every registered lens has a deliberate layout (a new lens fails until assigned)', () => {
    const lensIds = Object.keys(LENS_STYLE_ALLOWLIST).sort();
    expect(lensIds.length).toBeGreaterThanOrEqual(27);
    expect(Object.keys(LENS_WORKSPACE_LAYOUT).sort()).toEqual(lensIds);
  });

  it('the workspace speaks exactly the lens template vocabulary', () => {
    expect([...COACH_WORKSPACE_LAYOUTS].sort()).toEqual([...TEMPLATE_NAMES].sort());
  });

  it('uses all four layouts across the lens set (the picker really changes layout)', () => {
    expect(new Set(Object.values(LENS_WORKSPACE_LAYOUT))).toEqual(new Set(COACH_WORKSPACE_LAYOUTS));
  });

  it('no lens / unknown lens → default operator grid', () => {
    expect(resolveCoachWorkspaceLayout(null)).toBe('operator-grid');
    expect(resolveCoachWorkspaceLayout('not-a-lens')).toBe('operator-grid');
    expect(resolveCoachWorkspaceLayout('quiet-meridian')).toBe('editorial-column');
    expect(resolveCoachWorkspaceLayout('split-horizon')).toBe('atrium-split');
    expect(resolveCoachWorkspaceLayout('glass-rail')).toBe('playfield-stack');
  });

  it('a v2 recipe decides first, with the same template LensPlanFrame compiles', () => {
    expect(validateSurfaceCapabilityManifest(COACH_WORKSPACE_MANIFEST)).toEqual([]);
    for (const recipe of [CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE]) {
      const compiled = compileRecipe(recipe, COACH_WORKSPACE_MANIFEST);
      expect(compiled.ok).toBe(true);
      if (compiled.ok) expect(resolveCoachWorkspaceLayout(recipe.id)).toBe(compiled.plan.templates['desktop-enhanced']);
    }
  });

  it('docking truth table mirrors the CSS', () => {
    expect(workspaceDocking('operator-grid', 1440)).toEqual({ sidebarDocked: true, inspectorDocked: true });
    expect(workspaceDocking('operator-grid', 1024)).toEqual({ sidebarDocked: true, inspectorDocked: false });
    expect(workspaceDocking('operator-grid', 414)).toEqual({ sidebarDocked: false, inspectorDocked: false });
    expect(workspaceDocking('atrium-split', 1440)).toEqual({ sidebarDocked: false, inspectorDocked: true });
    expect(workspaceDocking('atrium-split', 1024)).toEqual({ sidebarDocked: false, inspectorDocked: false });
    expect(workspaceDocking('editorial-column', 2560)).toEqual({ sidebarDocked: false, inspectorDocked: false });
    expect(workspaceDocking('playfield-stack', 1440)).toEqual({ sidebarDocked: false, inspectorDocked: false });
    expect(workspaceDocking('operator-grid', 1200)).toEqual({ sidebarDocked: true, inspectorDocked: true });
    expect(workspaceDocking('operator-grid', 767)).toEqual({ sidebarDocked: false, inspectorDocked: false });
    expect(workspaceDocking('operator-grid', 768)).toEqual({ sidebarDocked: true, inspectorDocked: false });
  });
});
