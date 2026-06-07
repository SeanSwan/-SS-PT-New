import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './useWorkoutPlanBuilderController.ts'), 'utf8');

describe('WorkoutPlanBuilder save contract', () => {
  it('persists reviewed Program Architect plans through the Plan Vault API hook', () => {
    expect(source).toContain('saveWorkoutPlan(finalPlan, {');
    expect(source).toContain('activate: true');
    expect(source).toContain('attachPdf: true');
    expect(source).toContain('clientName');
    expect(source).not.toContain('if (onPlanCreated) onPlanCreated(finalPlan);\n    setPlan({');
  });
});
