/**
 * plannerIaV2.contract.test.ts — S16 acceptance fence (JARVIS blueprint §4.2).
 * Locks: the PLANNER_IA_V2 flag defaults OFF; endpointFor(scope) is the ONLY
 * endpoint selector in the planner dir; the V2 panel has no Guided/Power view
 * toggle and never writes generation mode as a view side-effect; the
 * multi-week category force-lock is visible with its reason; the 409 gate
 * path is untouched; scope↔duration derivation is pure and total.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scopeForDuration, durationForScope } from './WorkoutPlannerCommandPanelV2';
import { endpointFor, plannerScopes } from './plannerLogic/endpointFor';
import { PLAN_DURATIONS } from './WorkoutPlannerTypes';

const DIR = resolve(__dirname);
const read = (rel: string) => readFileSync(resolve(DIR, rel), 'utf8');
const v2Source = read('WorkoutPlannerCommandPanelV2.tsx');
const flagSource = read('plannerIaV2Flag.ts');
const layoutSource = read('WorkoutPlannerPageLayout.tsx');

const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

describe('S16 Planner IA V2 contract', () => {
  it('ships DARK: the flag defaults OFF and gates the V2 mount in the layout', () => {
    expect(flagSource).toContain('VITE_ENABLE_PLANNER_IA_V2');
    expect(flagSource).toContain('return false');
    expect(layoutSource).toContain('isPlannerIaV2Enabled() ? <WorkoutPlannerCommandPanelV2 />');
  });

  it('endpointFor(scope) is the ONLY endpoint selector in the planner directory', () => {
    const offenders = walk(DIR).filter(f =>
      /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) && !f.endsWith(join('plannerLogic', 'endpointFor.ts')));
    for (const file of offenders) {
      const src = readFileSync(file, 'utf8');
      // Comments may mention the routes; code may not carry the literals.
      const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      expect(codeOnly, `${file} must route through endpointFor`).not.toMatch(/['"`]\/api\/workout-builder\/(generate|plan)['"`]/);
    }
    expect(read('useWorkoutPlannerGenerationActions.ts')).toContain("endpointFor('single')");
    expect(read('useWorkoutPlannerGenerationActions.ts')).toContain("endpointFor('multi_week')");
  });

  it('endpointFor is a pure, total function of scope alone (property)', () => {
    for (const scope of plannerScopes) {
      const first = endpointFor(scope);
      for (let i = 0; i < 25; i += 1) expect(endpointFor(scope)).toBe(first);
    }
  });

  it('V2 has no Guided/Power toggle and the view can never write generation mode', () => {
    expect(v2Source).not.toContain('PlannerViewToggle');
    expect(v2Source).not.toContain('Power Mode');
    expect(v2Source).not.toContain('generationModeForPlannerView');
    expect(v2Source).not.toContain('writePlannerViewMode');
    expect(v2Source).not.toContain('readPlannerViewMode');
  });

  it('scope ↔ duration derivation is total, and scope drives the endpoint', () => {
    for (const { value } of PLAN_DURATIONS) {
      const scope = scopeForDuration(value);
      expect(plannerScopes).toContain(scope);
      expect(endpointFor(scope)).toBe(value === 'single' ? '/api/workout-builder/generate' : '/api/workout-builder/plan');
    }
    expect(durationForScope('single')).toBe('single');
    expect(scopeForDuration(durationForScope('multi_week'))).toBe('multi_week');
  });

  it('makes the multi-week category force-lock visible with its reason', () => {
    expect(v2Source).toContain('planner-category-force-lock');
    expect(v2Source).toContain('Multi-week programs are full-body — change duration to pick a split.');
  });

  it('leaves the 409 SWAN_COACH_REVIEW_REQUIRED gate untouched', () => {
    const gen = read('useWorkoutPlannerGenerationActions.ts');
    expect(gen).toContain('SWAN_COACH_REVIEW_REQUIRED');
    expect(v2Source).not.toContain('SWAN_COACH_REVIEW_REQUIRED');
    // V2 generates only through the same context actions V1 used.
    expect(v2Source).toContain('act.requestSwanCoachWorkoutForSelectedClient');
    expect(v2Source).toContain('act.requestPlanGenerateForSelectedClient');
  });
});
