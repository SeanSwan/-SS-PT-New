import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('useWorkoutBuilderAPI type boundary', () => {
  it('keeps the workout builder hook capped while re-exporting its public contracts', () => {
    const source = readFileSync(resolve(__dirname, 'useWorkoutBuilderAPI.ts'), 'utf8');

    expect(source).toContain("from './useWorkoutBuilderAPI.types'");
    expect(source).toContain('export type {');
    expect(source).toContain('ClientContext');
    expect(source).toContain('GeneratedWorkout');
    expect(source).toContain('GeneratedPlan');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('types workout-builder generation as Swan Coach planning output', () => {
    const source = readFileSync(resolve(__dirname, 'useWorkoutBuilderAPI.types.ts'), 'utf8');

    expect(source).toContain("import type { SwanCoachPlanningFingerprint }");
    expect(source).toMatch(/planningSystem:\s*'swan_coach_planning'/);
    expect(source).toContain('swanCoachPlanning: SwanCoachPlanningFingerprint');
  });
});
