import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('plannerContexts/useWorkoutPlannerOrchestration.ts');
const hookPath = resolve(__dirname, 'useWorkoutPlannerPlanContentState.ts');
const hookSource = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';

describe('WorkoutPlanner plan content state extraction', () => {
  it('keeps plan payload, loaded identity, and dirty tracking outside the page shell', () => {
    expect(pageSource).toContain("from '../useWorkoutPlannerPlanContentState'");
    expect(pageSource).not.toContain('const hasGeneratedHorizonPlan = !!');
    expect(pageSource).not.toContain('const buildPlanData = useCallback');
    expect(pageSource).not.toContain('const currentExercisesSig = useMemo');
    expect(pageSource).not.toContain('const [savedSnapshot, setSavedSnapshot]');
    expect(hookSource).toContain('composePlanData');
    expect(hookSource).toContain('buildContentSignature');
    expect(hookSource).toContain('WORKOUT_CATEGORIES');
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
