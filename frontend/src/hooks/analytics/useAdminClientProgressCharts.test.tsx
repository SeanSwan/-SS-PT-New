import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminClientProgressCharts } from './useAdminClientProgressCharts';

const mockGet = vi.fn();
const mockAuthAxios = { get: mockGet };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mockAuthAxios,
  }),
}));

const responsesBySuffix: Record<string, unknown> = {
  'chart-workout-frequency': { success: true, data: [{ x: null, y: '4' }, { x: 'Week 2', y: 'NaN' }] },
  'chart-attendance-reliability': {
    success: true,
    data: [{ x: 'completed', y: undefined }],
    reliabilityPercent: Number.POSITIVE_INFINITY,
    totals: { completed: '3', skipped: Number.NaN, cancelled: undefined, resolved: '4' },
  },
  'chart-weekly-volume': { success: true, data: [{ x: '05/08', y: Number.NEGATIVE_INFINITY, workouts: '2' }] },
  'chart-sets-reps-trend': { success: true, data: { sets: [{ x: '05/08', y: '6' }], reps: [{ x: '05/08', y: 'bad' }] } },
  'chart-duration-trend': { success: true, data: [{ x: '05/10', y: null }] },
  'chart-intensity-rpe-trend': { success: true, data: [{ x: '05/10', y: '9.5', source: 'voice' }] },
  'chart-pr-timeline': { success: true, data: [{ x: '2026-05-10', y: '225', exercise: null, reps: '5' }] },
  'chart-anchor-lifts': {
    success: true,
    data: {
      Squat: [{ x: '2026-05-10', y: '315', reps: '3' }],
      Broken: [{ x: '2026-05-11', y: 'NaN', reps: 'bad' }],
    },
    exercises: ['Squat', 99, 'Broken'],
  },
  'chart-exercise-frequency': { success: true, data: [{ x: 'Curl', y: '2', sets: '6' }] },
  'chart-movement-pattern-balance': { success: true, data: [{ x: 'push', y: 'NaN', sets: '8' }] },
  'chart-muscle-group-balance': { success: true, data: [{ x: undefined, y: '1250', sets: '9' }] },
  'chart-recovery-signal': {
    success: true,
    data: [{ x: 'knee', y: 'NaN', painFlags: '1', highRpeFlags: 'bad', totalSets: '4' }],
  },
};

describe('useAdminClientProgressCharts', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockImplementation((url: string) => {
      const suffix = url.split('/').pop() || '';
      return Promise.resolve({ data: responsesBySuffix[suffix] || { success: true, data: [] } });
    });
  });

  it('uses the admin analytics namespace and sanitizes malformed coordinates before Victory receives them', async () => {
    const { result } = renderHook(() => useAdminClientProgressCharts(424242));

    await waitFor(() => {
      expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(12);
    });
    await waitFor(() => {
      expect(result.current.charts.workoutFrequency).toHaveLength(2);
    });

    const calledUrls = mockGet.mock.calls.map(([url]) => url);
    expect(calledUrls).toContain('/api/analytics/424242/chart-workout-frequency');
    expect(calledUrls).toContain('/api/analytics/424242/chart-recovery-signal');
    expect(result.current.charts.workoutFrequency).toEqual([
      { x: 'Point 1', y: 4 },
      { x: 'Week 2', y: 0 },
    ]);
    expect(result.current.charts.attendanceReliability.reliabilityPercent).toBe(0);
    expect(result.current.charts.attendanceReliability.totals).toEqual({
      completed: 3,
      skipped: 0,
      cancelled: 0,
      resolved: 4,
    });
    expect(result.current.charts.weeklyVolume[0]).toMatchObject({ x: '05/08', y: 0, workouts: 2 });
    expect(result.current.charts.setsRepsTrend.reps[0]).toEqual({ x: '05/08', y: 0 });
    expect(result.current.charts.intensityRpeTrend[0]).toMatchObject({ y: 9.5, source: 'intensity' });
    expect(result.current.charts.prTimeline[0]).toMatchObject({ y: 225, exercise: 'Unknown exercise', reps: 5 });
    expect(result.current.charts.anchorLifts.exercises).toEqual(['Squat', 'Broken']);
    expect(result.current.charts.anchorLifts.data.Broken[0]).toMatchObject({ y: 0, reps: 0 });
    expect(result.current.charts.movementPatternBalance[0]).toMatchObject({ y: 0, sets: 8 });
    expect(result.current.charts.muscleGroupBalance[0]).toMatchObject({ x: 'Point 1', y: 1250, sets: 9 });
    expect(result.current.charts.recoverySignal[0]).toMatchObject({
      y: 0,
      painFlags: 1,
      highRpeFlags: 0,
      totalSets: 4,
    });
  });

  it('reports unavailable chart feeds separately from honest empty progress data', async () => {
    mockGet.mockImplementation((url: string) => {
      const suffix = url.split('/').pop() || '';
      if (suffix === 'chart-recovery-signal') {
        return Promise.reject(new Error('recovery feed unavailable'));
      }
      return Promise.resolve({ data: responsesBySuffix[suffix] || { success: true, data: [] } });
    });

    const { result } = renderHook(() => useAdminClientProgressCharts(424242));

    await waitFor(() => {
      expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(12);
    });
    await waitFor(() => {
      expect(result.current.unavailableChartCount).toBe(1);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.charts.recoverySignal).toEqual([]);
  });
});
