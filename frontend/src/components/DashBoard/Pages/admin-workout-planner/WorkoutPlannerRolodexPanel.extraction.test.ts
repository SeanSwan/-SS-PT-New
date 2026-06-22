import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('WorkoutPlannerPage.tsx');
const layoutSource = read('WorkoutPlannerPageLayout.tsx');
const panelPath = resolve(__dirname, 'WorkoutPlannerRolodexPanel.tsx');
const panelSource = existsSync(panelPath) ? readFileSync(panelPath, 'utf8') : '';

describe('WorkoutPlanner rolodex panel extraction', () => {
  it('keeps the exercise filter/list renderer outside the canonical planner page', () => {
    expect(pageSource).toContain("from './WorkoutPlannerPageLayout'");
    expect(layoutSource).toContain("from './WorkoutPlannerRolodexPanel'");
    expect(pageSource).not.toContain('<PanelTitle><Search size={16} /> Exercise Rolodex</PanelTitle>');
    expect(pageSource).not.toContain('React.createElement(List');
    expect(panelSource).toContain('Exercise Rolodex');
    expect(panelSource).toContain('React.createElement(List');
    expect(panelSource).toContain('const WORKOUT_PLANNER_ROW_HEIGHT = 156;');
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
