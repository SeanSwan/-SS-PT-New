import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('plannerContexts/useWorkoutPlannerOrchestration.ts');
const hookPath = resolve(__dirname, 'useWorkoutPlannerGenerationActions.ts');
const hookSource = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';
const helpersPath = resolve(__dirname, 'workoutPlannerGenerationActions.helpers.ts');
const helpersSource = existsSync(helpersPath) ? readFileSync(helpersPath, 'utf8') : '';

describe('WorkoutPlanner generation action extraction', () => {
  it('keeps Swan Coach workout and horizon generation outside the page shell', () => {
    expect(pageSource).toContain("from '../useWorkoutPlannerGenerationActions'");
    expect(pageSource).not.toContain('const [generating, setGenerating]');
    expect(pageSource).not.toContain('const [generatingPlan, setGeneratingPlan]');
    expect(pageSource).not.toContain('const [degradedIntelligence, setDegradedIntelligence]');
    expect(pageSource).not.toContain('const [explanations, setExplanations]');
    expect(pageSource).not.toContain('handleAIGenerate');
    expect(pageSource).not.toContain('const handleGeneratePlan = useCallback');
    expect(hookSource).toContain("endpointFor('single')"); // S16: endpoints route through plannerLogic/endpointFor
    expect(hookSource).toContain("endpointFor('multi_week')");
    expect(hookSource).toContain('resetLoadedPlanState');
    expect(hookSource).toContain('setGeneratedPlan(plan)');
    expect(hookSource).toContain('handleSwanCoachWorkoutGenerate');
    expect(hookSource).not.toContain('handleAIGenerate');
    expect(hookSource).not.toContain('AI generation failed');
    expect(hookSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps generation payload mapping and errors in helpers', () => {
    expect(helpersSource).toContain('mapGeneratedWorkoutToPlanExercises');
    expect(helpersSource).toContain('workoutGenerationErrorMessage');
    expect(helpersSource).toContain('planGenerationErrorMessage');
    expect(helpersSource).toContain('isSwanCoachPlanningPayload');
    expect(hookSource).toContain("from './workoutPlannerGenerationActions.helpers'");
  });
});
