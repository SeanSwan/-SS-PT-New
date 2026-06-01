import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(process.cwd(), 'src/components/WorkoutLogger/CorrectiveRecommendationsPanel.tsx');
const stylesPath = resolve(process.cwd(), 'src/components/WorkoutLogger/CorrectiveRecommendationsPanel.styles.ts');
const routePath = resolve(process.cwd(), 'src/routes/main-routes.tsx');
const builderPath = resolve(process.cwd(), 'src/components/WorkoutBuilder/WorkoutBuilderPage.tsx');

const componentSource = readFileSync(componentPath, 'utf8');
const routeSource = readFileSync(routePath, 'utf8');
const builderSource = readFileSync(builderPath, 'utf8');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';

const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('CorrectiveRecommendationsPanel style extraction contract', () => {
  it('stays mounted on the active Workout Builder surface', () => {
    expect(routeSource).toContain("() => import('../components/WorkoutBuilder/WorkoutBuilderPage')");
    expect(routeSource).toContain("path: 'workout-builder'");
    expect(routeSource).toContain('<WorkoutBuilder />');
    expect(builderSource).toContain('../WorkoutLogger/CorrectiveRecommendationsPanel');
    expect(builderSource).toContain('<CorrectiveRecommendationsPanel');
  });

  it('keeps the component logic under the file cap by extracting styles', () => {
    expect(componentSource).toContain("from './CorrectiveRecommendationsPanel.styles'");
    expect(componentSource).not.toMatch(/import\s+styled/);
    expect(componentSource).not.toContain('keyframes');
    expect(componentSource).not.toContain('styled.section');
    expect(existsSync(stylesPath)).toBe(true);
    expect(lineCount(componentSource)).toBeLessThanOrEqual(300);
    expect(lineCount(stylesSource)).toBeLessThanOrEqual(300);
  });

  it('keeps corrective recommendation visuals on shared Crystalline Swan tokens', () => {
    expect(stylesSource).toContain("from './WorkoutLoggerCS'");
    expect(stylesSource).toContain('withAlpha');
    expect(stylesSource).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    expect(stylesSource).not.toMatch(/rgba\(/);
    expect(componentSource).not.toMatch(/withAlpha\('#/);
  });
});
