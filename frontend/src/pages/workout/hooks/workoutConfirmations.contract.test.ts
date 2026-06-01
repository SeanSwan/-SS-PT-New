import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('workout page confirmation contract', () => {
  it('does not use browser-native confirm prompts for workout planner/session destructive actions', () => {
    expect(readSource('src/pages/workout/hooks/useWorkoutPlannerState.ts')).not.toContain('window.confirm');
    expect(readSource('src/pages/workout/hooks/useWorkoutSessionsState.ts')).not.toContain('window.confirm');
  });

  it('routes workout planner confirmations through the shared in-app dialog', () => {
    const plannerHook = readSource('src/pages/workout/hooks/useWorkoutPlannerState.ts');
    const plannerComponent = readSource('src/pages/workout/components/WorkoutPlanner/WorkoutPlanner.tsx');

    expect(plannerHook).toContain('Discard workout plan?');
    expect(plannerHook).toContain('Delete workout plan?');
    expect(plannerComponent).toContain('ConfirmActionDialog');
  });
});
