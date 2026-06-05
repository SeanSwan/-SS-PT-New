import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('WorkoutPlannerPage.tsx');
const panelPath = resolve(__dirname, 'WorkoutPlannerBuilderPanel.tsx');
const panelSource = existsSync(panelPath) ? readFileSync(panelPath, 'utf8') : '';

describe('WorkoutPlanner builder panel extraction', () => {
  it('keeps manual workout builder rendering outside the page shell', () => {
    expect(pageSource).toContain("from './WorkoutPlannerBuilderPanel'");
    expect(pageSource).not.toContain('<DegradedPanel');
    expect(pageSource).not.toContain('<BuilderRow');
    expect(pageSource).not.toContain('<ExplanationsPanel');
    expect(panelSource).toContain('<DegradedPanel');
    expect(panelSource).toContain('<BuilderRow');
    expect(panelSource).toContain('<ExplanationsPanel');
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
