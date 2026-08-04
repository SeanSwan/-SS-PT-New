import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('plannerContexts/useWorkoutPlannerOrchestration.ts');
const stripPath = resolve(__dirname, 'WorkoutPlannerStatusAssistantStrip.tsx');
const stripSource = existsSync(stripPath) ? readFileSync(stripPath, 'utf8') : '';

describe('WorkoutPlanner status assistant strip extraction', () => {
  it('keeps status, degraded warning, and assistant shell outside the page', () => {
    expect(pageSource).toContain("from '../WorkoutPlannerStatusAssistantStrip'");
    expect(pageSource).not.toContain('<StatusBanner');
    expect(pageSource).not.toContain('<DegradedBanner');
    expect(pageSource).not.toContain('<PanelErrorBoundary');
    expect(pageSource).not.toContain('AITerminalPanel');
    expect(stripSource).toContain('<StatusBanner');
    expect(stripSource).toContain('<DegradedBanner');
    expect(stripSource).toContain('<PanelErrorBoundary');
    expect(stripSource).toContain('AITerminalPanel');
    expect(stripSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('treats generated horizon plans as content for degraded safety banners', () => {
    const layoutSource = read('WorkoutPlannerPageLayout.tsx');
    expect(layoutSource).toContain('hasPlanExercises = planExercises.length > 0 || hasGeneratedHorizonPlan');
  });
});
