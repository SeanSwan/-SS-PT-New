import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'MeasurementEntry.tsx'), 'utf8');
const chartsPath = resolve(__dirname, 'MeasurementEntryProgressCharts.tsx');
const chartsSource = existsSync(chartsPath) ? readFileSync(chartsPath, 'utf8') : '';

describe('MeasurementEntry progress chart extraction', () => {
  it('keeps Victory chart rendering outside the main biometrics shell', () => {
    expect(componentSource).toContain("from './MeasurementEntryProgressCharts'");
    expect(componentSource).not.toContain('VictoryChart');
    expect(componentSource).not.toContain('HeroMetricGrid');
    expect(componentSource).not.toContain('VictoryVoronoiContainer');
    expect(chartsSource).toContain('VictoryChart');
    expect(chartsSource).toContain('ProgressGraphSection');
  });
});
