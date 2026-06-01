import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

const pageSource = read('src/components/WorkoutBuilder/WorkoutBuilderPage.tsx');
const stylesSource = read('src/components/WorkoutBuilder/WorkoutBuilderPage.styles.ts');
const resultPath = 'src/components/WorkoutBuilder/WorkoutBuilderResults.tsx';
const insightsPath = 'src/components/WorkoutBuilder/WorkoutBuilderInsightsPanel.tsx';
const boundaryPath = 'src/components/WorkoutBuilder/WorkoutBuilderErrorBoundary.tsx';
const constantsPath = 'src/components/WorkoutBuilder/WorkoutBuilderPage.constants.ts';

describe('WorkoutBuilderPage composition contract', () => {
  it('keeps the active page thin by extracting result, insight, and boundary sections', () => {
    expect(pageSource).toContain("from './WorkoutBuilderResults'");
    expect(pageSource).toContain("from './WorkoutBuilderInsightsPanel'");
    expect(pageSource).toContain("from './WorkoutBuilderErrorBoundary'");
    expect(pageSource).toContain("from './WorkoutBuilderPage.constants'");
    expect(lineCount(pageSource)).toBeLessThanOrEqual(300);
  });

  it('keeps each extracted Workout Builder module under the file cap', () => {
    for (const path of [resultPath, insightsPath, boundaryPath, constantsPath]) {
      expect(existsSync(resolve(process.cwd(), path))).toBe(true);
      expect(lineCount(read(path))).toBeLessThanOrEqual(300);
    }
    expect(lineCount(stylesSource)).toBeLessThanOrEqual(300);
  });

  it('keeps extracted modules on shared styles without reintroducing local colors', () => {
    const resultSource = existsSync(resolve(process.cwd(), resultPath)) ? read(resultPath) : '';
    const insightsSource = existsSync(resolve(process.cwd(), insightsPath)) ? read(insightsPath) : '';
    const boundarySource = existsSync(resolve(process.cwd(), boundaryPath)) ? read(boundaryPath) : '';
    const combined = [pageSource, stylesSource, resultSource, insightsSource, boundarySource].join('\n');
    const runtimeModules = [pageSource, resultSource, insightsSource, boundarySource].join('\n');
    expect(combined).not.toMatch(/rgba\(/);
    expect(combined).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    expect(runtimeModules).not.toMatch(/import\s+styled/);
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
