import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('plannerContexts/useWorkoutPlannerOrchestration.ts');
const hookPath = resolve(__dirname, 'useWorkoutPlannerRolodexState.tsx');
const hookSource = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';

describe('WorkoutPlanner rolodex state extraction', () => {
  it('keeps exercise search, filters, and row renderer outside the page shell', () => {
    expect(pageSource).toContain("from '../useWorkoutPlannerRolodexState'");
    expect(pageSource).not.toContain('useExerciseSearch');
    expect(pageSource).not.toContain('const filteredExercises = useMemo');
    expect(pageSource).not.toContain('const ExerciseRowRenderer = useCallback');
    expect(hookSource).toContain('useExerciseSearch');
    expect(hookSource).toContain('WorkoutPlannerExerciseRow');
    expect(hookSource).toContain('getJointImpact');
    expect(hookSource).toContain('parseEquipment');
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
