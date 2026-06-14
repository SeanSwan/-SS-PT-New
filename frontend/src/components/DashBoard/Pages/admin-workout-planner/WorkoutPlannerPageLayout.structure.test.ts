import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('WorkoutPlannerPageLayout structure', () => {
  it('keeps generated horizon plans inside the Workout Builder panel', () => {
    const layoutSource = read('WorkoutPlannerPageLayout.tsx');
    const builderSource = read('WorkoutPlannerBuilderPanel.tsx');

    expect(layoutSource).toContain('generatedPlan={generatedPlan}');
    expect(layoutSource).toContain('selectedMesoDay={selectedMesoDay}');
    expect(layoutSource).not.toMatch(/<\/ThreePanel>[\s\S]*<WorkoutPlannerGeneratedPlanSection/);
    expect(builderSource).toContain('WorkoutPlannerGeneratedPlanSection');
    expect(builderSource).toContain('generatedPlan={generatedPlan}');
  });
});
