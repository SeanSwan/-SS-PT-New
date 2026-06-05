import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('WorkoutPlannerPage.tsx');
const layoutSource = read('WorkoutPlannerPageLayout.tsx');
const panelPath = resolve(__dirname, 'WorkoutPlannerCommandPanel.tsx');
const panelSource = existsSync(panelPath) ? readFileSync(panelPath, 'utf8') : '';

describe('WorkoutPlanner command panel extraction', () => {
  it('keeps header and top planner controls outside the page shell', () => {
    expect(pageSource).toContain("from './WorkoutPlannerPageLayout'");
    expect(layoutSource).toContain("from './WorkoutPlannerCommandPanel'");
    expect(pageSource).not.toContain('<Header>');
    expect(pageSource).not.toContain('<ControlRow>');
    expect(pageSource).not.toContain('<ClientSelfGenPill');
    expect(pageSource).not.toContain('<PlanModeBar>');
    expect(panelSource).toContain('<Header>');
    expect(panelSource).toContain('<ControlRow>');
    expect(panelSource).toContain('<ClientSelfGenPill');
    expect(panelSource).toContain('<PlanModeBar>');
    expect(panelSource).toContain('aria-label="Select equipment profile"');
    expect(panelSource).toContain('onEquipmentProfileChange');
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
