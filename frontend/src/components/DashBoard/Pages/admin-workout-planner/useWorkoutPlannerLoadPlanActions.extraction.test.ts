import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('plannerContexts/useWorkoutPlannerOrchestration.ts');
const hookPath = resolve(__dirname, 'useWorkoutPlannerLoadPlanActions.ts');
const hookSource = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';
const hydrationPath = resolve(__dirname, 'workoutPlannerLoadPlanHydration.ts');
const hydrationSource = existsSync(hydrationPath) ? readFileSync(hydrationPath, 'utf8') : '';

describe('WorkoutPlanner load plan action extraction', () => {
  it('keeps saved-plan hydration outside the page shell', () => {
    expect(pageSource).toContain("from '../useWorkoutPlannerLoadPlanActions'");
    expect(pageSource).not.toContain('const loadPlanIntoBuilder = useCallback');
    expect(hookSource).toContain('/api/workout-plans/${planId}');
    expect(hydrationSource).toContain('resolveWorkoutPlannerPlanClientId');
    expect(hookSource).toContain('setGeneratedPlan(restored)');
    expect(hookSource).toContain('buildGeneratedSnapshot');
    expect(hookSource).toContain('buildManualSnapshot');
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps saved-plan load hydration in pure helpers', () => {
    expect(hydrationSource).toContain('buildLoadedPlanHydration');
    expect(hydrationSource).toContain('buildLoadedGeneratedPlan');
    expect(hydrationSource).toContain('hydrateLoadedPlanExercises');
    expect(hookSource).toContain("from './workoutPlannerLoadPlanHydration'");
    expect(hookSource).not.toContain('const hydratePlanExercises');
  });
});
