import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MeasurementEntryProgressCharts from './MeasurementEntryProgressCharts';
import { buildRadarData, buildTrendData } from './MeasurementEntry.dataUtils';
import type { MeasurementStats, RecentMeasurement } from './MeasurementEntry.types';

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

  it('does not render malformed total-change values as NaN metric copy', () => {
    const stats = {
      totalMeasurements: 'NaN',
      daysSinceStart: 'Infinity',
      totalChange: {
        weight: 'NaN',
        bodyFat: 'Infinity',
        waist: null,
      },
    } as unknown as MeasurementStats;

    const { container } = render(createElement(MeasurementEntryProgressCharts, {
      stats,
      trendData: [
        { date: 'Jan 1', weight: 200, bodyFat: 20, waist: 36 },
        { date: 'Feb 1', weight: 190, bodyFat: 18, waist: 34 },
      ],
      radarData: [],
    }));

    expect(container.textContent).toContain('Progress at a Glance');
    expect(container.textContent).toContain('\u2014');
    expect(container.textContent).not.toContain('NaN');
    expect(container.textContent).not.toContain('Infinity');
  });

  it('renders sanitized measurement datasets without SVG NaN coordinates', () => {
    const measurements = [
      { id: 'first', userId: '1', measurementDate: '2026-01-02T12:00:00', weight: '200', bodyFatPercentage: '20', naturalWaist: '36', neck: 'NaN', shoulders: '44', chest: '40', rightBicep: 'bad', hips: '40', rightThigh: '22', rightCalf: '16' },
      { id: 'latest', userId: '1', measurementDate: '2026-02-10T12:00:00', weight: 'Infinity', bodyFatPercentage: '18', naturalWaist: '34', neck: '16', shoulders: 'Infinity', chest: '41', rightBicep: '15', hips: 'bad', rightThigh: '23', rightCalf: '17' },
    ] as unknown as RecentMeasurement[];

    const trendData = buildTrendData(measurements);
    const radarData = buildRadarData(measurements);
    const { container } = render(createElement(MeasurementEntryProgressCharts, {
      stats: null,
      trendData,
      radarData,
    }));

    expect(trendData).toHaveLength(2);
    expect(radarData.length).toBeGreaterThanOrEqual(3);
    expect(container.innerHTML).not.toContain('NaN');
    expect(container.innerHTML).not.toContain('Infinity');
  });
});
