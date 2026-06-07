import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

const pageSource = read('src/components/WorkoutBuilder/WorkoutBuilderPage.tsx');
const stylesSource = read('src/components/WorkoutBuilder/WorkoutBuilderPage.styles.ts');
const contextPath = 'src/components/WorkoutBuilder/WorkoutBuilderContextPanel.tsx';
const controlsPath = 'src/components/WorkoutBuilder/WorkoutBuilderControlsPanel.tsx';
const resultPath = 'src/components/WorkoutBuilder/WorkoutBuilderResults.tsx';
const insightsPath = 'src/components/WorkoutBuilder/WorkoutBuilderInsightsPanel.tsx';
const boundaryPath = 'src/components/WorkoutBuilder/WorkoutBuilderErrorBoundary.tsx';
const constantsPath = 'src/components/WorkoutBuilder/WorkoutBuilderPage.constants.ts';
const saveLogicPath = 'src/components/WorkoutBuilder/WorkoutBuilderSavePlan.logic.ts';

describe('WorkoutBuilderPage composition contract', () => {
  it('keeps the active page thin by extracting result, insight, and boundary sections', () => {
    const controlsSource = read(controlsPath);
    expect(pageSource).toContain("from './WorkoutBuilderContextPanel'");
    expect(pageSource).toContain("from './WorkoutBuilderControlsPanel'");
    expect(pageSource).toContain("from './WorkoutBuilderInsightsPanel'");
    expect(pageSource).toContain("from './WorkoutBuilderErrorBoundary'");
    expect(controlsSource).toContain("from './WorkoutBuilderResults'");
    expect(controlsSource).toContain("from './WorkoutBuilderPage.constants'");
    expect(pageSource).toContain("from './WorkoutBuilderSavePlan.logic'");
    expect(lineCount(pageSource)).toBeLessThanOrEqual(300);
  });

  it('keeps each extracted Workout Builder module under the file cap', () => {
    for (const path of [contextPath, controlsPath, resultPath, insightsPath, boundaryPath, constantsPath, saveLogicPath]) {
      expect(existsSync(resolve(process.cwd(), path))).toBe(true);
      expect(lineCount(read(path))).toBeLessThanOrEqual(300);
    }
    expect(lineCount(stylesSource)).toBeLessThanOrEqual(300);
  });

  it('keeps extracted modules on shared styles without reintroducing local colors', () => {
    const contextSource = existsSync(resolve(process.cwd(), contextPath)) ? read(contextPath) : '';
    const controlsSource = existsSync(resolve(process.cwd(), controlsPath)) ? read(controlsPath) : '';
    const resultSource = existsSync(resolve(process.cwd(), resultPath)) ? read(resultPath) : '';
    const insightsSource = existsSync(resolve(process.cwd(), insightsPath)) ? read(insightsPath) : '';
    const boundarySource = existsSync(resolve(process.cwd(), boundaryPath)) ? read(boundaryPath) : '';
    const saveLogicSource = existsSync(resolve(process.cwd(), saveLogicPath)) ? read(saveLogicPath) : '';
    const combined = [
      pageSource,
      stylesSource,
      contextSource,
      controlsSource,
      resultSource,
      insightsSource,
      boundarySource,
      saveLogicSource,
    ].join('\n');
    const runtimeModules = [
      pageSource,
      contextSource,
      controlsSource,
      resultSource,
      insightsSource,
      boundarySource,
    ].join('\n');
    expect(combined).not.toMatch(/rgba\(/);
    expect(combined).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    expect(runtimeModules).not.toMatch(/import\s+styled/);
  });

  it('wires generated plans to a visible save action instead of render-only output', () => {
    const resultSource = read(resultPath);
    const controlsSource = read(controlsPath);

    expect(pageSource).toContain('handleSaveDraft');
    expect(pageSource).toContain('handleSaveAndActivate');
    expect(pageSource).toContain('api.saveGeneratedPlan(buildWorkoutBuilderPlanSavePayload(plan))');
    expect(pageSource).toContain('api.activateWorkoutPlan(savedPlan.id)');
    expect(pageSource).toContain('planSave={{');
    expect(controlsSource).toContain('planSave: WorkoutBuilderPlanSaveState');
    expect(controlsSource).toContain('planSave={planSave}');
    expect(resultSource).toContain('Save & Make Current');
    expect(resultSource).toContain('Save Draft');
    expect(resultSource).toContain('<ConfigRow>');
    expect(resultSource).toContain('Plan Saved');
    expect(resultSource).toContain('disabled={actionInFlight || alreadySaved}');
    expect(resultSource).toContain('WorkoutBuilderPlanSaveAction');
  });

  it('does not key generated Workout Builder insight rows by array index', () => {
    const resultSource = read(resultPath);
    const insightsSource = read(insightsPath);
    const combined = [resultSource, insightsSource].join('\n');

    expect(combined).not.toMatch(/key=\{i\}/);
    expect(combined).not.toMatch(/key=\{j\}/);
    expect(combined).toContain('workoutBuilderInsightKey');
    expect(combined).toContain('workoutBuilderInsightDetailKey');
    expect(combined).toContain('workoutBuilderRecommendationKey');
  });
});
