import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('plannerContexts/useWorkoutPlannerOrchestration.ts');
const hookPath = resolve(__dirname, 'useWorkoutPlannerPageActions.ts');
const hookSource = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';

describe('WorkoutPlanner page action extraction', () => {
  it('keeps page-level event handlers outside the mounted page shell', () => {
    expect(pageSource).toContain("from '../useWorkoutPlannerPageActions'");
    expect(pageSource).not.toContain('const removeExercise = useCallback');
    expect(pageSource).not.toContain('const updateExercise = useCallback');
    expect(pageSource).not.toContain('const handleLoadPlan = useCallback');
    expect(pageSource).not.toContain('const handleReturnToClientHub = useCallback');
    expect(pageSource).not.toContain('const handleTeachModeToggle = useCallback');
    expect(pageSource).not.toContain('const handlePlanDurationChange = useCallback');
    expect(pageSource).not.toContain('const handleDuplicateLoadedPlan = useCallback');
    expect(pageSource).not.toContain('const handleBrowseAddExercise = useCallback');
    expect(hookSource).toContain('Discard unsaved builder changes?');
    expect(hookSource).toContain('clearSearchForBrowse');
    expect(hookSource).toContain('handleCardDuplicate');
    expect(hookSource).toContain('setTeachModeOpen');
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
