import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('WorkoutPlannerPage confirmation contract', () => {
  it('uses the in-app confirmation dialog instead of native browser confirms', () => {
    const pageSource = read('plannerContexts/useWorkoutPlannerOrchestration.ts');
    const layoutSource = read('WorkoutPlannerPageLayout.tsx');
    const dialogSource = read('WorkoutPlannerConfirmDialog.tsx');

    expect(pageSource).not.toContain('window.confirm');
    expect(layoutSource).toContain('request={confirmRequest}');
    expect(layoutSource).toContain("import WorkoutPlannerConfirmDialog");
    expect(layoutSource).toContain('<WorkoutPlannerConfirmDialog');
    expect(dialogSource).toContain('role="dialog"');
    expect(dialogSource).toContain('aria-modal="true"');
    expect(dialogSource).toContain('min-height: 44px');
  });
});
