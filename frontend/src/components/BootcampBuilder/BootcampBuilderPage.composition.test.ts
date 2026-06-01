import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

const pageSource = read('./BootcampBuilderPage.tsx');
const routeSource = read('../../routes/main-routes.tsx');
const chromePath = './BootcampBuilderChrome.tsx';
const panelsPath = './BootcampBuilderSidePanels.tsx';
const boundaryPath = './BootcampBuilderErrorBoundary.tsx';
const constantsPath = './BootcampBuilderPage.constants.ts';
const detailPanelPath = './ExerciseDetailPanel.tsx';

describe('BootcampBuilderPage composition contract', () => {
  it('keeps the active bootcamp route mounted to the extracted page shell', () => {
    expect(routeSource).toContain("() => import('../components/BootcampBuilder/BootcampBuilderPage')");
    expect(routeSource).toContain("path: 'bootcamp-builder'");
  });

  it('keeps page-level orchestration thin and delegates chrome, panels, constants, and boundary', () => {
    expect(pageSource).toContain("from './BootcampBuilderChrome'");
    expect(pageSource).toContain("from './BootcampBuilderSidePanels'");
    expect(pageSource).toContain("from './BootcampBuilderErrorBoundary'");
    expect(pageSource).toContain("from './BootcampBuilderPage.constants'");
    expect(lineCount(pageSource)).toBeLessThanOrEqual(300);
  });

  it('keeps extracted bootcamp builder modules under the file cap', () => {
    for (const path of [chromePath, panelsPath, boundaryPath, constantsPath]) {
      expect(existsSync(resolve(__dirname, path))).toBe(true);
      expect(lineCount(read(path))).toBeLessThanOrEqual(300);
    }
  });

  it('does not key generated Bootcamp Builder detail rows by array index', () => {
    const detailPanelSource = read(detailPanelPath);

    expect(detailPanelSource).not.toMatch(/key=\{i\}/);
    expect(detailPanelSource).toContain('bootcampMuscleTargetKey');
    expect(detailPanelSource).toContain('bootcampExplanationKey');
  });
});
