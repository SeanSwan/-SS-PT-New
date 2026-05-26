import { render, screen, within } from '@testing-library/react';
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
  prTimeline: [],
  anchorLifts: { exercises: [], data: {} },
  exerciseFrequency: [
    { x: 'Push Up', y: 18, sets: 54 },
    { x: 'Pull Up', y: 4, sets: 12 },
    { x: 'Pallof Press', y: 2, sets: 6 },
  ],
  movementPatternBalance: [],
  muscleGroupBalance: [],
  recoverySignal: [],
};

vi.mock('../../../../../hooks/analytics/useAdminClientProgressCharts', () => ({
  useAdminClientProgressCharts: () => ({
    charts,
    isLoading: false,
    error: null,
    nonEmptyChartCount: 1,
  }),
}));

import AdminProgressChartsGrid from './AdminProgressChartsGrid';

describe('AdminProgressChartsGrid mega stats', () => {
  it('mounts the full exercise diary above the 12-chart grid', () => {
    render(<AdminProgressChartsGrid clientId={424242} clientName="Fixture Client" />);

    const board = screen.getByRole('region', { name: /client exercise mega stats/i });
    const rows = within(board).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Push Up')).toBeInTheDocument();
    expect(screen.getByTestId('admin-progress-charts-grid')).toBeInTheDocument();
  });
});
