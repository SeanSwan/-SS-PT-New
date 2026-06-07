import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './WorkoutPlanBuilder.tsx'), 'utf8');

describe('WorkoutPlanBuilder save contract', () => {
  it('persists reviewed Program Architect plans through the Plan Vault API hook', () => {
    expect(source).toContain('saveWorkoutPlan(finalPlan, { activate: true })');
    expect(source).not.toContain('if (onPlanCreated) onPlanCreated(finalPlan);\n    setPlan({');
  });
});
