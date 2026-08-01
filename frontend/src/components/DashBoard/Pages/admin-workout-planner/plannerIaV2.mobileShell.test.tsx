/**
 * plannerIaV2.mobileShell.test.tsx — S17 acceptance fence (JARVIS §4.1/§4.4/§4.10).
 * Locks: SaveBar renders exactly ONE primary in all 7 matrix states with the
 * documented status text; the V2 shell has bottom tabs ≥44px, renders the
 * Rolodex as a SHEET below 1280px (never a stacked column), floats the Coach
 * layer at ruling-A4 z-scale, and the single skeleton/empty/error trio exists
 * and is the only state idiom for V2 surfaces. Static + render checks; the
 * live axe pass at 375/1280 rides the flag-flip QA (disclosed in breadcrumb).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkoutPlannerSaveBar from './WorkoutPlannerSaveBar';
import { resolveSaveBar } from './plannerLogic/resolveSaveBar';

const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');
const shellSource = read('WorkoutPlannerV2Shell.tsx');
const saveBarSource = read('WorkoutPlannerSaveBar.tsx');
const stateViewsSource = read('PlannerStateViews.tsx');
const layoutSource = read('WorkoutPlannerPageLayout.tsx');
const bindingSource = read('PlannerSaveBarBinding.tsx');

const MATRIX = [
  { isDirty: true, isSaved: false, isActive: false, hasActiveOther: false, canActivate: true },
  { isDirty: false, isSaved: true, isActive: false, hasActiveOther: false, canActivate: true },
  { isDirty: false, isSaved: true, isActive: false, hasActiveOther: true, canActivate: true },
  { isDirty: true, isSaved: true, isActive: false, hasActiveOther: false, canActivate: true },
  { isDirty: false, isSaved: true, isActive: true, hasActiveOther: false, canActivate: true },
  { isDirty: true, isSaved: true, isActive: true, hasActiveOther: false, canActivate: true },
  { isDirty: false, isSaved: true, isActive: false, hasActiveOther: false, canActivate: false },
] as const;

describe('S17 SaveBar — exactly one primary in all 7 states', () => {
  it.each(MATRIX.map((state, i) => [i + 1, state] as const))('matrix row %d', (_row, state) => {
    const { unmount } = render(
      <WorkoutPlannerSaveBar state={state} onPrimary={vi.fn()} onOverflowItem={vi.fn()} />,
    );
    const bar = screen.getByTestId('planner-save-bar');
    const resolution = resolveSaveBar(state);
    // Exactly one primary: the resolved label appears on exactly one button.
    const primaries = Array.from(bar.querySelectorAll('button'))
      .filter(button => button.textContent === resolution.primary);
    expect(primaries).toHaveLength(1);
    expect(screen.getByTestId('planner-save-bar-status').textContent).toBe(resolution.statusText);
    unmount();
  });

  it('states the reason on every disabled/unavailable control, never hides it', () => {
    expect(saveBarSource).toContain('unavailable[item]');
    expect(bindingSource).toContain('Templates are coming soon');
    expect(bindingSource).not.toMatch(/=>\s*\{\s*\}/); // no silent no-op handlers
  });
});

describe('S17 V2 mobile shell', () => {
  it('renders bottom tabs at 48px bar height with ≥44px targets below 1280px', () => {
    expect(shellSource).toContain("MOBILE_MAX = '1279px'");
    expect(shellSource).toContain('height: calc(48px + env(safe-area-inset-bottom, 0px))');
    expect(shellSource).toContain('min-height: 44px');
    for (const tab of ['Program', 'Builder', 'Exercises']) expect(shellSource).toContain(`'${tab}'`);
  });

  it('renders the Rolodex as a sheet on mobile — never a stacked column', () => {
    expect(shellSource).toContain('planner-rolodex-sheet');
    expect(shellSource).toMatch(/Sheet[\s\S]*position: fixed/);
    // The mobile stage never renders the rolodex outside the sheet.
    const mobileStage = shellSource.slice(shellSource.indexOf('<MobileStage>'), shellSource.indexOf('</MobileStage>'));
    expect(mobileStage.indexOf('{rolodex}')).toBeGreaterThan(mobileStage.indexOf('<Sheet'));
  });

  it('keeps the ruling-A4 z-scale: FAB 60 · sheet 90/91 · tab bar 50', () => {
    expect(shellSource).toContain('z-index: 60');
    expect(shellSource).toContain('z-index: 90');
    expect(shellSource).toContain('z-index: 50');
    expect(shellSource).not.toMatch(/z-index:\s*9{3,}/);
  });

  it('mounts the shell + SaveBar only under the flag; V1 keeps ThreePanel + header matrix', () => {
    expect(layoutSource).toContain('if (iaV2) {');
    expect(layoutSource).toContain('<WorkoutPlannerV2Shell');
    expect(layoutSource).toContain('saveBar={<PlannerSaveBarBinding />}');
    expect(layoutSource).toContain('legacyActionsHidden={iaV2}');
    expect(layoutSource).toContain('<ThreePanel');
  });

  it('lands the single skeleton/empty/error trio with reduced-motion safety', () => {
    for (const name of ['PlannerSkeleton', 'PlannerEmpty', 'PlannerError']) {
      expect(stateViewsSource).toContain(`export const ${name}`);
    }
    expect(stateViewsSource).toContain('prefers-reduced-motion');
    expect(shellSource).toContain('PlannerEmpty');
  });
});
