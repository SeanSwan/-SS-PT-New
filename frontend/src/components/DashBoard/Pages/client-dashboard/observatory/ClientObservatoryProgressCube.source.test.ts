import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string): string => readFileSync(resolve(__dirname, path), 'utf8');

const homeSource = readSource('./ClientObservatoryHome.tsx');
const cubeSource = readSource('./ClientObservatoryProgressCube.tsx');

describe('ClientObservatoryProgressCube mounted source contract', () => {
  it('mounts the reusable 3D progress cube on the canonical client overview', () => {
    expect(homeSource).toContain("import ClientObservatoryProgressCube from './ClientObservatoryProgressCube'");
    expect(homeSource).toContain('<ClientObservatoryProgressCube />');
    expect(cubeSource).toContain('useClientProgressCharts()');
    expect(cubeSource).toContain("from '../../../progress/ProgressChartCube'");
  });

  it('keeps the overview adapter small and data-truth scoped', () => {
    expect(homeSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(cubeSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(120);
    expect(cubeSource).toContain('nonEmptyChartCount');
    expect(cubeSource).toContain('unavailableChartCount');
  });
});
