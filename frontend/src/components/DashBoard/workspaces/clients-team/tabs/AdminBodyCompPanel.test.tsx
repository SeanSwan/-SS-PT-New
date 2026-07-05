import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildBodyCompChartsFromResponses } from '../../../../../hooks/analytics/useAdminBodyCompCharts';

const hookState = vi.hoisted(() => ({
  current: {
    charts: {
      weightProgression: [] as { x: string; y: number }[],
      bodyFatTrend: [] as { x: string; y: number }[],
      macroSplit: [] as { x: string; y: number }[],
      macroTotalGrams: 0,
    },
    isLoading: false,
    nonEmptyCount: 0,
  },
}));

vi.mock('../../../../../hooks/analytics/useAdminBodyCompCharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../../hooks/analytics/useAdminBodyCompCharts')>();
  return {
    ...original,
    useAdminBodyCompCharts: () => hookState.current,
  };
});

import AdminBodyCompPanel, { buildDeltaFacts } from './AdminBodyCompPanel';

describe('AdminBodyCompPanel', () => {
  it('shows one honest empty guidance block when nothing is logged', () => {
    hookState.current = {
      charts: { weightProgression: [], bodyFatTrend: [], macroSplit: [], macroTotalGrams: 0 },
      isLoading: false,
      nonEmptyCount: 0,
    };
    render(<AdminBodyCompPanel clientId={424242} />);
    expect(screen.getByText('No body measurements or macro logs yet')).toBeTruthy();
    expect(screen.queryByTestId('admin-chart-weightProgression')).toBeNull();
  });

  it('renders weight, body fat, and macro environments from verified rows', () => {
    hookState.current = {
      charts: {
        weightProgression: [{ x: '06/01', y: 210 }, { x: '06/22', y: 204 }],
        bodyFatTrend: [{ x: '06/01', y: 22.4 }, { x: '06/22', y: 21.1 }],
        macroSplit: [{ x: 'Protein', y: 900 }, { x: 'Carbs', y: 1200 }, { x: 'Fat', y: 400 }],
        macroTotalGrams: 2500,
      },
      isLoading: false,
      nonEmptyCount: 3,
    };
    render(<AdminBodyCompPanel clientId={424242} />);
    expect(screen.getByTestId('admin-chart-weightProgression')).toBeTruthy();
    expect(screen.getByTestId('admin-chart-bodyFatTrend')).toBeTruthy();
    expect(screen.getByTestId('admin-chart-macroSplit')).toBeTruthy();
    expect(screen.getByText('-6 lbs')).toBeTruthy();
    expect(screen.getAllByText('Carbs').length).toBeGreaterThan(0);
  });
});

describe('buildDeltaFacts', () => {
  it('reports latest, first, signed change, and entry count', () => {
    const facts = buildDeltaFacts(
      [{ x: '06/01', y: 210 }, { x: '06/22', y: 204 }],
      'lbs',
    );
    const byId = Object.fromEntries(facts.map((fact) => [fact.id, fact.value]));
    expect(byId.latest).toBe('204 lbs');
    expect(byId.first).toBe('210 lbs');
    expect(byId.change).toBe('-6 lbs');
    expect(byId.count).toBe('2');
  });

  it('marks a single reading as baseline instead of faking a change', () => {
    const facts = buildDeltaFacts([{ x: '06/01', y: 22.4 }], '%', 1);
    expect(facts.find((fact) => fact.id === 'change')?.value).toBe('baseline set');
  });

  it('returns no facts for an empty series', () => {
    expect(buildDeltaFacts([], 'lbs')).toEqual([]);
  });
});

describe('buildBodyCompChartsFromResponses', () => {
  it('drops failed responses and non-positive points, keeps totals honest', () => {
    const result = buildBodyCompChartsFromResponses([
      { success: true, data: [{ x: '06/01', y: 210 }, { x: '06/08', y: 0 }, { x: '06/15', y: Number.NaN }] },
      null,
      { success: true, data: [{ x: 'Protein', y: 900 }], totalGrams: 900 },
    ]);
    expect(result.weightProgression).toEqual([{ x: '06/01', y: 210 }]);
    expect(result.bodyFatTrend).toEqual([]);
    expect(result.macroSplit).toEqual([{ x: 'Protein', y: 900 }]);
    expect(result.macroTotalGrams).toBe(900);
  });
});
