import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('WorkoutPlannerPage.tsx');
const hookPath = resolve(__dirname, 'useWorkoutPlannerLoadPlanActions.ts');
const hookSource = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';

describe('WorkoutPlanner load plan action extraction', () => {
  it('keeps saved-plan hydration outside the page shell', () => {
    expect(pageSource).toContain("from './useWorkoutPlannerLoadPlanActions'");
    expect(pageSource).not.toContain('const loadPlanIntoBuilder = useCallback');
    expect(hookSource).toContain('/api/workout-plans/${planId}');
    expect(hookSource).toContain('resolveWorkoutPlannerPlanClientId');
    expect(hookSource).toContain('setGeneratedPlan(restored)');
    expect(hookSource).toContain('buildGeneratedSnapshot');
    expect(hookSource).toContain('buildManualSnapshot');
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
