import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('plannerContexts/useWorkoutPlannerOrchestration.ts');
const hookPath = resolve(__dirname, 'useWorkoutPlannerSavedPlansState.ts');
const hookSource = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';
// S05 moved the saved-plan LIST READ one level down into its own hook so the
// state hook stays inside the 300-line cap. Read-related assertions are now
// checked against the list module specifically (strictly stronger than before)
// and against the module family for anti-patterns; the page-shell assertions
// below are unchanged.
const listPath = resolve(__dirname, 'useWorkoutPlannerSavedPlansList.ts');
const listSource = existsSync(listPath) ? readFileSync(listPath, 'utf8') : '';
const stateModuleFamily = `${hookSource}\n${listSource}`;

describe('WorkoutPlanner saved plans state extraction', () => {
  it('keeps saved-plan list state and card actions outside the page shell', () => {
    expect(pageSource).toContain("from '../useWorkoutPlannerSavedPlansState'");
    expect(pageSource).not.toContain('const [savedPlans, setSavedPlans]');
    expect(pageSource).not.toContain('const fetchSavedPlans = useCallback');
    expect(pageSource).not.toContain('const handleCardActivate = useCallback');
    expect(pageSource).not.toContain('const handleCardRename = useCallback');
    expect(pageSource).not.toContain('const handleCardDuplicate = useCallback');
    expect(pageSource).not.toContain('const handleCardArchive = useCallback');
    expect(pageSource).not.toContain('const archiveBlockedFor = useCallback');
    expect(listSource).toContain('/api/workout-plans?clientId=');
    expect(hookSource).toContain('/api/workout-plans/${planId}/status');
    expect(hookSource).toContain('/api/workout-plans/${planId}/pdf/upload');
    expect(hookSource).toContain('createProtectedPlanPdfObjectUrl');
    expect(stateModuleFamily).not.toContain("responseType: 'blob'");
    expect(hookSource).toContain('FormData');
    expect(hookSource).toContain('setConfirmRequest');
    expect(hookSource).toContain('archiveBlockedFor');
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(listSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
