/**
 * FILE: ProgressChartRecoveryObservatory.logic.ts
 * PURPOSE: Build dense recovery/readiness signals from canonical chart data.
 */
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';

export interface RecoveryObservatoryModel {
  totalFlags: number;
  painFlags: number;
  highRpeFlags: number;
  totalSets: number;
  averageIntensity: number;
  reliabilityPercent: number;
  readinessScore: number;
  status: 'empty' | 'clear' | 'watch' | 'intervene';
  statusCopy: string;
  bars: Array<{ label: string; value: number; pct: number }>;
}

const finite = (value: unknown): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : 0
);

const pct = (value: number, max: number): number => (
  max > 0 ? Math.round((value / max) * 100) : 0
);

export const buildRecoveryObservatoryModel = (
  charts: CanonicalProgressCharts,
): RecoveryObservatoryModel => {
  const painFlags = charts.recoverySignal.reduce((total, point) => total + finite(point.painFlags), 0);
  const highRpeFlags = charts.recoverySignal.reduce((total, point) => total + finite(point.highRpeFlags), 0);
  const totalSets = charts.recoverySignal.reduce((total, point) => total + finite(point.totalSets), 0);
  const totalFlags = painFlags + highRpeFlags;
  const averageIntensity = charts.intensityRpeTrend.length > 0
    ? Math.round(charts.intensityRpeTrend.reduce((total, point) => total + finite(point.y), 0) / charts.intensityRpeTrend.length)
    : 0;
  const reliabilityPercent = Math.round(finite(charts.attendanceReliability.reliabilityPercent));
  const resolvedAttendance = finite(charts.attendanceReliability.totals.resolved);
  const hasSignal = totalSets > 0 || totalFlags > 0 || averageIntensity > 0 || reliabilityPercent > 0 || resolvedAttendance > 0;

  if (!hasSignal) {
    return {
      totalFlags,
      painFlags,
      highRpeFlags,
      totalSets,
      averageIntensity,
      reliabilityPercent,
      readinessScore: 0,
      status: 'empty',
      statusCopy: 'Log workouts to build recovery signal',
      bars: [
        { label: 'Pain flags', value: 0, pct: 0 },
        { label: 'High RPE', value: 0, pct: 0 },
        { label: 'Readiness', value: 0, pct: 0 },
        { label: 'Attendance', value: 0, pct: 0 },
      ],
    };
  }

  const flagLoad = totalSets > 0 ? Math.round((totalFlags / totalSets) * 100) : totalFlags * 10;
  const readinessScore = Math.max(0, Math.min(100, reliabilityPercent - flagLoad - Math.max(0, averageIntensity - 7) * 4));
  const status = readinessScore < 55 || painFlags > 0 ? 'intervene' : readinessScore < 75 || highRpeFlags > 0 ? 'watch' : 'clear';

  return {
    totalFlags,
    painFlags,
    highRpeFlags,
    totalSets,
    averageIntensity,
    reliabilityPercent,
    readinessScore,
    status,
    statusCopy: status === 'clear'
      ? 'Recovery signal is clear'
      : status === 'watch'
        ? 'Watch load and RPE trend'
        : 'Coach attention recommended',
    bars: [
      { label: 'Pain flags', value: painFlags, pct: pct(painFlags, Math.max(totalFlags, 1)) },
      { label: 'High RPE', value: highRpeFlags, pct: pct(highRpeFlags, Math.max(totalFlags, 1)) },
      { label: 'Readiness', value: readinessScore, pct: readinessScore },
      { label: 'Attendance', value: reliabilityPercent, pct: Math.max(0, Math.min(100, reliabilityPercent)) },
    ],
  };
};