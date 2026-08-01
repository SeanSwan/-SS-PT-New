import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('plannerContexts/useWorkoutPlannerOrchestration.ts');
const hookPath = resolve(__dirname, 'useWorkoutPlannerSaveActions.ts');
const hookSource = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';

describe('WorkoutPlanner save action extraction', () => {
  it('keeps save and update network actions outside the page shell', () => {
    expect(pageSource).toContain("from '../useWorkoutPlannerSaveActions'");
    expect(pageSource).not.toContain('const [saving, setSaving]');
    expect(pageSource).not.toContain('const handleSaveDraft = useCallback');
    expect(pageSource).not.toContain('const handleSaveAndActivate = useCallback');
    expect(pageSource).not.toContain('const handleUpdateLoaded = useCallback');
    expect(pageSource).not.toContain('const handleUpdateAndActivate = useCallback');
    expect(hookSource).toContain('/api/workout-plans');
    expect(hookSource).toContain("'/api/workout-plans/' + planId + '/status'");
    expect(hookSource).toContain('setSavedSnapshot');
    expect(hookSource).toContain('fetchSavedPlans');
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
