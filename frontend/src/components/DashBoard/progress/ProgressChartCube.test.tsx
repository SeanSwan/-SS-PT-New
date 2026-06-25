import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';
import ProgressChartCube from './ProgressChartCube';

const charts: CanonicalProgressCharts = {
  workoutFrequency: [{ x: 'Mon', y: 1 }],
  attendanceReliability: {
    data: [],
    reliabilityPercent: 88,
    totals: { completed: 7, skipped: 0, cancelled: 1, resolved: 8 },
  },
  weeklyVolume: [{ x: 'W1', y: 2400, workouts: 3 }],
  setsRepsTrend: { sets: [{ x: 'W1', y: 24 }], reps: [{ x: 'W1', y: 180 }] },
  durationTrend: [{ x: 'W1', y: 55 }],
  intensityRpeTrend: [{ x: 'W1', y: 8, source: 'rpe' }],
  prTimeline: [{ x: '2026-06-01', y: 225, exercise: 'Bench Press', reps: 3 }],
  anchorLifts: { data: {}, exercises: [] },
  exerciseFrequency: [{ x: 'Push Up', y: 12, sets: 36 }],
  movementPatternBalance: [{ x: 'push', y: 12, sets: 36 }],
  muscleGroupBalance: [{ x: 'Chest', y: 12, sets: 36 }],
  recoverySignal: [{ x: 'W1', y: 2, painFlags: 1, highRpeFlags: 1, totalSets: 20 }],
};

describe('ProgressChartCube', () => {
  it('opens and closes the chart detail dialog from the 3D cube launcher', () => {
    render(<ProgressChartCube charts={charts} nonEmptyChartCount={8} unavailableChartCount={4} />);

    expect(screen.getByRole('region', { name: /3d progress chart carousel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /open progress command cube details/i }));

    const dialog = screen.getByRole('dialog', { name: /progress command cube details/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Exercise Codex/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Pain and RPE Radar/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close progress command cube details/i }));
    expect(screen.queryByRole('dialog', { name: /progress command cube details/i })).not.toBeInTheDocument();
  });
});
