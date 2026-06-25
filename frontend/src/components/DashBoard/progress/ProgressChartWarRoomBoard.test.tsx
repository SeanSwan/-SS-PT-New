import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';
import ProgressChartWarRoomBoard from './ProgressChartWarRoomBoard';

const charts: CanonicalProgressCharts = {
  workoutFrequency: [{ x: 'Mon', y: 1 }],
  attendanceReliability: {
    data: [],
    reliabilityPercent: 75,
    totals: { completed: 6, skipped: 1, cancelled: 1, resolved: 8 },
  },
  weeklyVolume: [{ x: 'W1', y: 1200, workouts: 3 }],
  setsRepsTrend: { sets: [{ x: 'W1', y: 20 }], reps: [{ x: 'W1', y: 150 }] },
  durationTrend: [{ x: 'W1', y: 55 }],
  intensityRpeTrend: [{ x: 'W1', y: 8, source: 'rpe' }],
  prTimeline: [{ x: '2026-06-01', y: 225, exercise: 'Bench Press', reps: 3 }],
  anchorLifts: { data: {}, exercises: [] },
  exerciseFrequency: [{ x: 'Push Up', y: 12, sets: 36 }],
  movementPatternBalance: [{ x: 'push', y: 12, sets: 36 }],
  muscleGroupBalance: [{ x: 'Chest', y: 12, sets: 36 }],
  recoverySignal: [{ x: 'W1', y: 2, painFlags: 1, highRpeFlags: 1, totalSets: 20 }],
};

describe('ProgressChartWarRoomBoard', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adds, reorders, and persists selected chart tiles', () => {
    render(<ProgressChartWarRoomBoard charts={charts} storageKey="war-room-test" />);

    const board = screen.getByRole('region', { name: /progress chart war room board/i });
    expect(within(board).getByText(/4 pinned/i)).toBeInTheDocument();
    expect(within(board).queryByText('75%')).not.toBeInTheDocument();

    fireEvent.click(within(board).getByRole('button', { name: 'Attendance' }));
    expect(within(board).getByText(/5 pinned/i)).toBeInTheDocument();
    expect(within(board).getByText('75%')).toBeInTheDocument();

    fireEvent.click(within(board).getByRole('button', { name: /move attendance left/i }));
    const stored = JSON.parse(window.localStorage.getItem('war-room-test') || '[]');
    expect(stored).toContain('attendance');
    expect(stored.indexOf('attendance')).toBeLessThan(stored.length - 1);
  });
});
