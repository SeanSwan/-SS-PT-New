import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const pagePath = resolve(process.cwd(), 'src/components/WorkoutBuilder/WorkoutBuilderPage.tsx');
const controlsPath = resolve(process.cwd(), 'src/components/WorkoutBuilder/WorkoutBuilderControlsPanel.tsx');
const stylesPath = resolve(process.cwd(), 'src/components/WorkoutBuilder/WorkoutBuilderPage.styles.ts');
const routePath = resolve(process.cwd(), 'src/routes/main-routes.tsx');

const pageSource = readFileSync(pagePath, 'utf8');
const controlsSource = readFileSync(controlsPath, 'utf8');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';
const routeSource = readFileSync(routePath, 'utf8');

describe('WorkoutBuilderPage style extraction contract', () => {
  it('stays mounted on the active /workout-builder route', () => {
    expect(routeSource).toContain("() => import('../components/WorkoutBuilder/WorkoutBuilderPage')");
    expect(routeSource).toContain("path: 'workout-builder'");
    expect(routeSource).toContain('<WorkoutBuilder />');
  });

  it('moves local styled-components out of the page logic', () => {
    expect(pageSource).toContain("from './WorkoutBuilderPage.styles'");
    expect(pageSource).not.toMatch(/import\s+styled/);
    expect(pageSource).not.toContain('styled.div');
    expect(existsSync(stylesPath)).toBe(true);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('uses shared Crystalline Swan tokens instead of raw local colors', () => {
    expect(stylesSource).toContain('../WorkoutLogger/WorkoutLoggerCS');
    expect(stylesSource).toContain('withAlpha');
    expect(`${pageSource}\n${controlsSource}\n${stylesSource}`).not.toMatch(/rgba\(/);
    expect(`${pageSource}\n${controlsSource}\n${stylesSource}`).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
  });

  it('labels standalone generation controls as Swan Coach Planning', () => {
    const combinedSource = `${pageSource}\n${controlsSource}`;
    expect(pageSource).toContain('Swan Coach Planning');
    expect(combinedSource).toContain('Swan Coach Plan');
    expect(combinedSource).not.toContain("'Generate Plan'");
    expect(combinedSource).not.toContain("'Generate Workout'");
  });
});
