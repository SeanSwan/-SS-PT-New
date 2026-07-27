import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it, vi } from 'vitest';

const charts = {
  workoutFrequency: [],
  attendanceReliability: {
    data: [],
    reliabilityPercent: 0,
    totals: { completed: 0, resolved: 0 },
  },
  weeklyVolume: [],
  setsRepsTrend: { sets: [], reps: [] },
  durationTrend: [],
  intensityRpeTrend: [],
  prTimeline: [
    { x: '2026-05-21', y: 225, exercise: 'Bench Press', reps: 5 },
  ],
  anchorLifts: { exercises: [], data: {} },
  exerciseFrequency: [
    { x: 'Push Up', y: 18, sets: 54 },
    { x: 'Pull Up', y: 4, sets: 12 },
    { x: 'Pallof Press', y: 2, sets: 6 },
  ],
  movementPatternBalance: [],
  muscleGroupBalance: [],
  recoverySignal: [
    { x: 'Low Back', y: 3, painFlags: 1, highRpeFlags: 2, totalSets: 10 },
  ],
  weightTrend: [],
  bodyFatTrend: [],
  estOneRm: { exercise: null, data: [] },
};

vi.mock('../../../../../hooks/analytics/useAdminClientProgressCharts', () => ({
  useAdminClientProgressCharts: () => ({
    charts,
    isLoading: false,
    error: null,
    nonEmptyChartCount: 3,
    unavailableChartCount: 0,
  }),
}));

import { getProgressProofStatusText } from '../../../../../utils/progressProofStatusText';
vi.mock('../../../progress/ExerciseCodexMatrix', () => ({
  default: () => null,
}));

vi.mock('./AdminBodyCompPanel', () => ({
  default: () => null,
}));

import AdminProgressChartsGrid from './AdminProgressChartsGrid';

describe('AdminProgressChartsGrid mega stats', () => {
  it('keeps the active admin progress grid component under the 300-line cap', () => {
    const source = readFileSync(resolve(__dirname, 'AdminProgressChartsGrid.tsx'), 'utf8');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('mounts the full exercise diary above the 15-chart grid', () => {
    render(<MemoryRouter><AdminProgressChartsGrid clientId={424242} clientName="Fixture Client" /></MemoryRouter>);

    const board = screen.getByRole('region', { name: /client exercise mega stats/i });
    const rows = within(board).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Push Up')).toBeInTheDocument();
    expect(screen.getByTestId('admin-progress-charts-grid')).toBeInTheDocument();
  });

  it('renders chart readouts with clean ASCII separators instead of mojibake', () => {
    render(<MemoryRouter><AdminProgressChartsGrid clientId={424242} clientName="Fixture Client" /></MemoryRouter>);

    const grid = screen.getByTestId('admin-progress-charts-grid');
    expect(grid).toHaveTextContent('Fixture Client - Progress proof building - 3 of 15 charts populated');
    expect(grid).toHaveTextContent('225lbs x 5');
    expect(grid).toHaveTextContent('1 pain / 2 redline');
    expect(grid.textContent).not.toMatch(/[ÂÃâ]/);
  });
  it('separates no-history proof copy from unavailable chart feeds', () => {
    expect(getProgressProofStatusText(0, 0)).toBe('No saved workout proof yet - log a workout to populate charts');
    expect(getProgressProofStatusText(0, 2)).toBe('0 of 15 charts populated - 2 feeds unavailable');
    expect(getProgressProofStatusText(15, 0)).toBe('Full progress proof ready - 15 charts populated');
  });
});
