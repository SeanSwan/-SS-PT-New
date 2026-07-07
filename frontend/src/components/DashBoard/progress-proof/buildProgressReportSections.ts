/**
 * buildProgressReportSections
 * ===========================
 * Maps the canonical progress charts bundle into branded PDF report sections
 * (Phase P6), reusing the exact drill-down row builders the chart expand
 * modal renders - so the PDF always tells the same truth as the screen.
 * Shared by the client grid and the staff grid (same canonical chart types).
 */
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts';
import type { ProgressReportSection } from '../../../services/pdf/progressReportPdf';
import {
  buildAnchorLiftRows,
  buildAttendanceRows,
  buildExerciseFrequencyRows,
  buildNamedValueRows,
  buildRecoverySignalRows,
  buildUnitSeriesRows,
  buildWeeklyVolumeDrilldownRows,
  buildWorkoutFrequencyRows,
} from '../Pages/client-dashboard/CanonicalProgressChartsGrid.expandRows';
import { buildPrDrilldownRows } from '../Pages/client-dashboard/CanonicalProgressChartsGrid.prBars';

const buildSetsRepsRows = (bundle: CanonicalProgressCharts['setsRepsTrend']) => {
  const byPeriod = new Map<string, { sets?: number; reps?: number }>();
  bundle.sets.forEach((point) => {
    byPeriod.set(String(point.x), { ...byPeriod.get(String(point.x)), sets: point.y });
  });
  bundle.reps.forEach((point) => {
    byPeriod.set(String(point.x), { ...byPeriod.get(String(point.x)), reps: point.y });
  });
  return Array.from(byPeriod.entries()).map(([period, totals]) => ({
    label: period,
    value: `${totals.sets ?? 0} sets / ${totals.reps ?? 0} reps`,
  }));
};

export const buildProgressReportSections = (charts: CanonicalProgressCharts): ProgressReportSection[] => [
  {
    title: 'Workout Frequency',
    subtitle: 'Distinct training days per week, last 12 weeks',
    rows: buildWorkoutFrequencyRows(charts.workoutFrequency),
  },
  {
    title: 'Attendance Reliability',
    subtitle: 'Booked-session outcomes, last 90 days',
    rows: charts.attendanceReliability.data.length > 0
      ? buildAttendanceRows(charts.attendanceReliability)
      : [],
  },
  {
    title: 'Weekly Training Volume',
    subtitle: 'Total lbs moved per week',
    rows: buildWeeklyVolumeDrilldownRows(charts.weeklyVolume),
  },
  {
    title: 'Sets & Reps Trend',
    subtitle: 'Weekly totals',
    rows: buildSetsRepsRows(charts.setsRepsTrend),
  },
  {
    title: 'Session Duration',
    subtitle: 'Minutes per session, last 90 days',
    rows: buildUnitSeriesRows(charts.durationTrend, 'min'),
  },
  {
    title: 'Effort Trend',
    subtitle: 'Weekly effort on the 0-10 scale',
    rows: buildUnitSeriesRows(charts.intensityRpeTrend, '', 1),
  },
  {
    title: 'PR Highlights',
    subtitle: 'Best verified lift per exercise',
    rows: buildPrDrilldownRows(charts.prTimeline),
  },
  {
    title: 'Anchor Lift Progression',
    subtitle: 'Heaviest set per day - most-repeated lifts, 90 days',
    rows: buildAnchorLiftRows(
      charts.anchorLifts.exercises.map((name) => ({
        exerciseName: name,
        points: charts.anchorLifts.data[name] || [],
      })),
    ),
  },
  {
    title: 'Exercise Frequency',
    subtitle: 'Most-logged exercises (top 12, all time)',
    rows: buildExerciseFrequencyRows(charts.exerciseFrequency.slice(0, 12)),
  },
  {
    title: 'Movement Pattern Balance',
    subtitle: 'Training volume by movement pattern, 90 days',
    rows: buildNamedValueRows(charts.movementPatternBalance, 'lbs'),
  },
  {
    title: 'Muscle Group Volume',
    subtitle: 'Training volume by muscle group, 90 days',
    rows: buildNamedValueRows(charts.muscleGroupBalance, 'lbs'),
  },
  {
    title: 'Recovery Signals',
    subtitle: 'Exercises flagged by pain notes or redline sets, 90 days',
    rows: buildRecoverySignalRows(charts.recoverySignal),
  },
  {
    title: 'Weight Trend',
    subtitle: 'Body weight from logged measurements',
    rows: buildUnitSeriesRows(charts.weightTrend, 'lbs', 1),
  },
  {
    title: 'Body Fat Trend',
    subtitle: 'Body-fat percentage from logged measurements',
    rows: buildUnitSeriesRows(charts.bodyFatTrend, '%', 1),
  },
  {
    title: 'Est. 1RM Trend',
    subtitle: charts.estOneRm.exercise
      ? `Weekly best Brzycki estimate - ${charts.estOneRm.exercise}`
      : 'Weekly best Brzycki estimate for the top lift',
    rows: buildUnitSeriesRows(charts.estOneRm.data, 'lbs'),
  },
];
