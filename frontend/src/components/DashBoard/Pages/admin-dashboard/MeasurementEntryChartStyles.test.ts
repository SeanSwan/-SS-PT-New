import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'MeasurementEntry.tsx'), 'utf8');
const progressChartsSource = readFileSync(resolve(__dirname, 'MeasurementEntryProgressCharts.tsx'), 'utf8');
const stylesPath = resolve(__dirname, 'MeasurementEntry.chartStyles.ts');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';

describe('MeasurementEntry chart style extraction', () => {
  it('keeps reusable progress chart styles outside the biometrics shell', () => {
    expect(componentSource).not.toContain("from './MeasurementEntry.chartStyles'");
    expect(progressChartsSource).toContain("from './MeasurementEntry.chartStyles'");
    expect(componentSource).not.toContain('const ProgressGraphSection = styled.');
    expect(componentSource).not.toContain('const HeroMetricCard = styled.');
    expect(componentSource).not.toContain('const ChartWrapper3D = styled.');
    expect(stylesSource).toContain('export const ProgressGraphSection');
    expect(stylesSource).toContain('export const HeroMetricCard');
    expect(stylesSource).toContain('export const ChartWrapper3D');
  });
});
