import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('WorkoutPlannerPage.tsx');
const layoutSource = read('WorkoutPlannerPageLayout.tsx');
const panelPath = resolve(__dirname, 'WorkoutPlannerBuilderPanel.tsx');
const panelSource = existsSync(panelPath) ? readFileSync(panelPath, 'utf8') : '';
const sectionsPath = resolve(__dirname, 'WorkoutPlannerBuilderPanel.sections.tsx');
const sectionsSource = existsSync(sectionsPath) ? readFileSync(sectionsPath, 'utf8') : '';
const exerciseRowsPath = resolve(__dirname, 'WorkoutPlannerBuilderPanel.exerciseRows.tsx');
const exerciseRowsSource = existsSync(exerciseRowsPath) ? readFileSync(exerciseRowsPath, 'utf8') : '';

describe('WorkoutPlanner builder panel extraction', () => {
  it('keeps manual workout builder rendering outside the page shell', () => {
    expect(pageSource).toContain("from './WorkoutPlannerPageLayout'");
    expect(layoutSource).toContain("from './WorkoutPlannerBuilderPanel'");
    expect(pageSource).not.toContain('<DegradedPanel');
    expect(pageSource).not.toContain('<BuilderRow');
    expect(pageSource).not.toContain('<ExplanationsPanel');
    expect(panelSource).toContain("from './WorkoutPlannerBuilderPanel.sections'");
    expect(panelSource).not.toContain('<BuilderRow');
    expect(panelSource).not.toContain('<ExplanationsPanel');
    expect(sectionsSource).toContain("from './WorkoutPlannerBuilderPanel.exerciseRows'");
    expect(exerciseRowsSource).toContain('<BuilderRow');
    expect(sectionsSource).toContain('<ExplanationsPanel');
    expect(panelSource).toContain('<DegradedPanel');
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(220);
    expect(sectionsSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(exerciseRowsSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
