import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { parsePositiveClientId, runWorkoutBuilderGeneration } from './WorkoutBuilderPage.logic';

const pageSource = readFileSync(resolve(process.cwd(), 'src/components/WorkoutBuilder/WorkoutBuilderPage.tsx'), 'utf8');
const logicSource = readFileSync(resolve(process.cwd(), 'src/components/WorkoutBuilder/WorkoutBuilderPage.logic.ts'), 'utf8');
const controlsSource = readFileSync(
  resolve(process.cwd(), 'src/components/WorkoutBuilder/WorkoutBuilderControlsPanel.tsx'),
  'utf8',
);

describe('WorkoutBuilderPage client deep-link contract', () => {
  it('adopts a valid clientId query param and blocks invalid generation attempts', () => {
    expect(pageSource).toContain("import { useSearchParams } from 'react-router-dom'");
    expect(pageSource).toContain("searchParams.get('clientId')");
    expect(pageSource).toContain('parsePositiveClientId,');
    expect(pageSource).toContain('runWorkoutBuilderGeneration,');
    expect(pageSource).toContain('buildWorkoutBuilderPlanSavePayload');
    expect(pageSource).toContain('parsePositiveClientId(searchParams.get');
    expect(pageSource).toContain('runWorkoutBuilderGeneration({');
    expect(pageSource).toContain('api.saveGeneratedPlan');
    expect(pageSource).toContain('api.activateWorkoutPlan');
    expect(logicSource).toContain('export const parsePositiveClientId');
    expect(logicSource).toContain('export const runWorkoutBuilderGeneration');
    expect(logicSource).toContain("/^[1-9]\\d*$/.test(rawClientId)");
    expect(logicSource).toContain('Number.isSafeInteger(parsedClientId)');
    expect(pageSource).toContain("return queryClientId ? String(queryClientId) : ''");
    expect(pageSource).toContain("setError('Select a valid client before generating.')");
    expect(controlsSource).toContain('disabled={loading || !parsedClientId}');
    expect(pageSource).not.toContain('parseInt(clientId, 10)');
  });

  it('parses only exact positive integer client IDs', () => {
    expect(parsePositiveClientId('42')).toBe(42);
    expect(parsePositiveClientId(' 42 ')).toBe(42);
    expect(parsePositiveClientId('42junk')).toBeNull();
    expect(parsePositiveClientId('0')).toBeNull();
    expect(parsePositiveClientId('')).toBeNull();
    expect(parsePositiveClientId(null)).toBeNull();
  });

  it('normalizes single-workout generation payloads before calling the API', async () => {
    const workout = { planningSystem: 'swan_coach_planning' } as any;
    const plan = { planningSystem: 'swan_coach_planning' } as any;
    const api = {
      generateWorkout: vi.fn(async () => workout),
      generatePlan: vi.fn(async () => plan),
    };

    const result = await runWorkoutBuilderGeneration({
      api,
      mode: 'workout',
      clientId: 42,
      category: 'full_body',
      exerciseCount: '0',
      rotationPattern: 'standard',
      equipmentProfileId: 'not-a-profile',
      planWeeks: '12',
      sessionsPerWeek: '3',
      primaryGoal: 'general_fitness',
    });

    expect(api.generateWorkout).toHaveBeenCalledWith({
      clientId: 42,
      category: 'full_body',
      exerciseCount: 6,
      rotationPattern: 'standard',
      equipmentProfileId: undefined,
    });
    expect(api.generatePlan).not.toHaveBeenCalled();
    expect(result).toEqual({ workout, plan: null });
  });

  it('normalizes training-plan generation payloads before calling the API', async () => {
    const workout = { planningSystem: 'swan_coach_planning' } as any;
    const plan = { planningSystem: 'swan_coach_planning' } as any;
    const api = {
      generateWorkout: vi.fn(async () => workout),
      generatePlan: vi.fn(async () => plan),
    };

    const result = await runWorkoutBuilderGeneration({
      api,
      mode: 'plan',
      clientId: 42,
      category: 'full_body',
      exerciseCount: '6',
      rotationPattern: 'standard',
      equipmentProfileId: '9',
      planWeeks: 'bad-weeks',
      sessionsPerWeek: '-2',
      primaryGoal: 'strength',
    });

    expect(api.generateWorkout).not.toHaveBeenCalled();
    expect(api.generatePlan).toHaveBeenCalledWith({
      clientId: 42,
      durationWeeks: 12,
      sessionsPerWeek: 3,
      primaryGoal: 'strength',
      equipmentProfileId: 9,
    });
    expect(result).toEqual({ workout: null, plan });
  });
});
