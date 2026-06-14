import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CanonicalProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';
import { AdminProgressPrimaryCards } from './AdminProgressChartsGrid.primaryCards';

const emptyCharts: CanonicalProgressCharts = {
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
  anchorLifts: { data: {}, exercises: [] },
  exerciseFrequency: [],
  movementPatternBalance: [],
  muscleGroupBalance: [],
  recoverySignal: [],
};

describe('AdminProgressPrimaryCards pulse summaries', () => {
  it('surfaces trainer-readable momentum before chart inspection clicks', () => {
    render(<AdminProgressPrimaryCards
      activeLensId="all"
      charts={{
        ...emptyCharts,
        workoutFrequency: [{ x: 'W1', y: 1 }, { x: 'W2', y: 3 }],
        weeklyVolume: [
          { x: 'W1', y: 1000, workouts: 1 },
          { x: 'W2', y: 1500, workouts: 2 },
        ],
        setsRepsTrend: {
          sets: [{ x: 'W1', y: 10 }, { x: 'W2', y: 12 }],
          reps: [{ x: 'W1', y: 80 }, { x: 'W2', y: 96 }],
        },
      }}
    />);

    expect(screen.getByText('Frequency Pulse')).toBeTruthy();
    expect(screen.getByText('+200% vs prior')).toBeTruthy();
    expect(screen.getByText('Volume Pulse')).toBeTruthy();
    expect(screen.getByText('+50% vs prior')).toBeTruthy();
    expect(screen.getByText('Rep Pulse')).toBeTruthy();
    expect(screen.getByText('+20% vs prior')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /share proof/i })[0]);
    expect(screen.getByRole('dialog', { name: /workout frequency share card/i })).toBeTruthy();
    expect((screen.getByLabelText('Progress proof caption') as HTMLTextAreaElement).value)
      .toContain('Frequency Pulse: +200% vs prior');
  });

  it('keeps empty admin cards honest instead of fabricating pulse momentum', () => {
    render(<AdminProgressPrimaryCards charts={emptyCharts} activeLensId="all" />);

    expect(screen.getByText('No completed workouts yet')).toBeTruthy();
    expect(screen.getByText('No sets or reps logged yet')).toBeTruthy();
    expect(screen.queryByText(/Pulse/)).toBeNull();
    expect(screen.queryByRole('button', { name: /share proof/i })).toBeNull();
  });
});
