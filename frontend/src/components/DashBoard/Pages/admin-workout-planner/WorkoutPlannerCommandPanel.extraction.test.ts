import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('WorkoutPlannerPage.tsx');
const layoutSource = read('WorkoutPlannerPageLayout.tsx');
const panelPath = resolve(__dirname, 'WorkoutPlannerCommandPanel.tsx');
const panelSource = existsSync(panelPath) ? readFileSync(panelPath, 'utf8') : '';
const sectionsPath = resolve(__dirname, 'WorkoutPlannerCommandPanel.sections.tsx');
const sectionsSource = existsSync(sectionsPath) ? readFileSync(sectionsPath, 'utf8') : '';
const optionsPath = resolve(__dirname, 'WorkoutPlannerCommandPanel.options.tsx');
const optionsSource = existsSync(optionsPath) ? readFileSync(optionsPath, 'utf8') : '';

describe('WorkoutPlanner command panel extraction', () => {
  it('keeps header and top planner controls outside the page shell', () => {
    expect(pageSource).toContain("from './WorkoutPlannerPageLayout'");
    expect(layoutSource).toContain("from './WorkoutPlannerCommandPanel'");
    expect(pageSource).not.toContain('<Header>');
    expect(pageSource).not.toContain('<ControlRow>');
    expect(pageSource).not.toContain('<ClientSelfGenPill');
    expect(pageSource).not.toContain('<PlanModeBar>');
    expect(sectionsSource).toContain('<Header>');
    expect(sectionsSource).toContain('<ControlRow>');
    expect(sectionsSource).toContain('<ClientSelfGenPill');
    expect(sectionsSource).toContain('<PlanModeBar>');
    expect(sectionsSource).toContain('aria-label="Select equipment profile"');
    expect(sectionsSource).toContain('onEquipmentProfileChange');
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('labels every planner generation CTA as Swan Coach planning', () => {
    expect(optionsSource).toContain('Swan Coach Generate');
    expect(optionsSource).toContain('Swan Coach Plan');
    expect(optionsSource).not.toContain("'Generate Plan'");
    expect(optionsSource).not.toContain("? 'Generate Plan'");
  });

  it('keeps command panel subviews in section helpers', () => {
    expect(sectionsSource).toContain('WorkoutPlannerHeaderSection');
    expect(sectionsSource).toContain('WorkoutPlannerControlsSection');
    expect(sectionsSource).toContain('WorkoutPlannerSelfGenerationSection');
    expect(sectionsSource).toContain('WorkoutPlannerPlanModeSection');
    expect(panelSource).toContain("from './WorkoutPlannerCommandPanel.sections'");
  });
});
