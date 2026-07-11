import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const refetchCharts = vi.hoisted(() => vi.fn());

// The grid reads the logged-in user's clientSource (to white-label the PDF).
// This diary test doesn't exercise branding, so a source-less user is enough.
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

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
      // 4c body-lens cards (deck 12 → 15).
      weightTrend: [],
      bodyFatTrend: [],
      estOneRm: { exercise: null, data: [] },
    },
    isLoading: false,
    error: null,
    refetch: refetchCharts,
    nonEmptyChartCount: 1,
    unavailableChartCount: 0,
    // 4c tier gating: the grid renders LockedChartCard for ids listed here.
    lockedChartIds: [],
  }),
}));

import CanonicalProgressChartsGrid from './CanonicalProgressChartsGrid';

describe('CanonicalProgressChartsGrid exercise diary', () => {
  beforeEach(() => {
    refetchCharts.mockClear();
  });

  it('imports the diary from the shared progress module, not the clients/team workspace', () => {
    const source = readFileSync(resolve(__dirname, 'CanonicalProgressChartsGrid.tsx'), 'utf8');

    expect(source).toContain("from '../../progress/ClientExerciseMegaStats'");
    expect(source).not.toContain("from '../../workspaces/clients-team/tabs/ClientExerciseMegaStats'");
  });

  it('mounts a full ranked exercise diary for the client progress route', () => {
    render(<MemoryRouter><CanonicalProgressChartsGrid /></MemoryRouter>);

    const diary = screen.getByRole('region', { name: /client exercise mega stats/i });
    const rows = within(diary).getAllByRole('listitem');

    expect(rows).toHaveLength(exerciseFrequency.length);
    expect(within(rows[0]).getByText('Push Up')).toBeInTheDocument();
    expect(within(rows[rows.length - 1]).getByText('Band Pull Apart')).toBeInTheDocument();
    expect(within(diary).getByText(/11 exercises tracked/i)).toBeInTheDocument();
    expect(screen.getByTestId('canonical-progress-charts-grid')).toBeInTheDocument();
    // The frequency card renders beside the diary; its visible subtitle became
    // "top 8 - tap for history" when the Rolodex drill-down landed (4d).
    expect(screen.getByText(/top 8 - tap for history/i)).toBeInTheDocument();
  });

  it('refetches canonical charts when a workout log succeeds', () => {
    render(<MemoryRouter><CanonicalProgressChartsGrid /></MemoryRouter>);

    act(() => {
      window.dispatchEvent(new Event('swan:workout-logged'));
    });

    expect(refetchCharts).toHaveBeenCalledTimes(1);
  });
});
