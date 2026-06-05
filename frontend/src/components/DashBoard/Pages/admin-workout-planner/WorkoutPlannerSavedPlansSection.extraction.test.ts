import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('WorkoutPlannerPage.tsx');
const layoutSource = read('WorkoutPlannerPageLayout.tsx');
const sectionPath = resolve(__dirname, 'WorkoutPlannerSavedPlansSection.tsx');
const sectionSource = existsSync(sectionPath) ? readFileSync(sectionPath, 'utf8') : '';

describe('WorkoutPlanner saved plans section extraction', () => {
  it('keeps saved-plan library rendering outside the planner page shell', () => {
    expect(pageSource).toContain("from './WorkoutPlannerPageLayout'");
    expect(layoutSource).toContain("from './WorkoutPlannerSavedPlansSection'");
    expect(pageSource).not.toContain('<SavedPlanCard');
    expect(pageSource).not.toContain('<SavedPlansCount');
    expect(pageSource).not.toContain('<ClipboardList');
    expect(sectionSource).toContain('<SavedPlanCard');
    expect(sectionSource).toContain('<SavedPlansCount');
    expect(sectionSource).toContain('<ClipboardList');
    expect(sectionSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
