import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const exerciseFrequency = [
  { x: 'Push Up', y: 18, sets: 54 },
  { x: 'Goblet Squat', y: 11, sets: 33 },
  { x: 'Bench Press', y: 10, sets: 30 },
  { x: 'Pull Up', y: 9, sets: 27 },
  { x: 'TRX Row', y: 8, sets: 24 },
  { x: 'Dead Bug', y: 7, sets: 21 },
  { x: 'Pallof Press', y: 6, sets: 18 },
  { x: 'Farmer Carry', y: 5, sets: 15 },
  { x: 'Step Up', y: 4, sets: 12 },
  { x: 'Glute Bridge', y: 3, sets: 9 },
  { x: 'Band Pull Apart', y: 2, sets: 6 },
];

vi.mock('../../../../hooks/analytics/useClientProgressCharts', () => ({
  useClientProgressCharts: () => ({
    charts: {
      workoutFrequency: [],
      attendanceReliability: {
        data: [],
        reliabilityPercent: 0,
        totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 },
      },
      weeklyVolume: [],
      setsRepsTrend: { sets: [], reps: [] },
      durationTrend: [],
      intensityRpeTrend: [],
      prTimeline: [],
      anchorLifts: { exercises: [], data: {} },
      exerciseFrequency,
      movementPatternBalance: [],
      muscleGroupBalance: [],
      recoverySignal: [],
    },
    isLoading: false,
    error: null,
    nonEmptyChartCount: 1,
  }),
}));

import CanonicalProgressChartsGrid from './CanonicalProgressChartsGrid';

describe('CanonicalProgressChartsGrid exercise diary', () => {
  it('imports the diary from the shared progress module, not the clients/team workspace', () => {
    const source = readFileSync(resolve(__dirname, 'CanonicalProgressChartsGrid.tsx'), 'utf8');

    expect(source).toContain("from '../../progress/ClientExerciseMegaStats'");
    expect(source).not.toContain("from '../../workspaces/clients-team/tabs/ClientExerciseMegaStats'");
  });

  it('mounts a full ranked exercise diary for the client progress route', () => {
    render(<CanonicalProgressChartsGrid userId={424242} />);

    const diary = screen.getByRole('region', { name: /client exercise mega stats/i });
    const rows = within(diary).getAllByRole('listitem');

    expect(rows).toHaveLength(exerciseFrequency.length);
    expect(within(rows[0]).getByText('Push Up')).toBeInTheDocument();
    expect(within(rows[rows.length - 1]).getByText('Band Pull Apart')).toBeInTheDocument();
    expect(within(diary).getByText(/11 exercises tracked/i)).toBeInTheDocument();
    expect(screen.getByTestId('canonical-progress-charts-grid')).toBeInTheDocument();
    expect(screen.getByText(/top 8 - all time/i)).toBeInTheDocument();
  });

});
