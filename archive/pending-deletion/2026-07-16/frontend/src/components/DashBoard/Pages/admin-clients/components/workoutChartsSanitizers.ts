/**
 * Workout chart data sanitizers.
 * Keeps admin client workout analytics from passing sparse API values into
 * Victory, which otherwise emits SVG NaN errors for path/text coordinates.
 */
import type { AnalyticsData } from '../../../../../hooks/analytics/useWorkoutAnalytics';

export type WorkoutChartData = Pick<
  AnalyticsData,
  'weeklyVolume' | 'exerciseFrequency' | 'intensityTrend' | 'workoutCalendar'
>;

export type NASMChartData = Pick<
  AnalyticsData,
  'oneRMProgression' | 'muscleGroupVolume' | 'rpeTrend'
>;

const arrayOf = <T>(value: T[] | undefined | null): T[] => (
  Array.isArray(value) ? value : []
);

const text = (value: unknown): string => (
  typeof value === 'string' ? value.trim() : String(value ?? '').trim()
);

const finiteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const validDateText = (value: unknown): string | null => {
  const label = text(value);
  if (!label) return null;
  return Number.isFinite(new Date(label).getTime()) ? label : null;
};

const clamp = (value: number, min: number, max: number): number => (
  Math.max(min, Math.min(max, value))
);

export function sanitizeWorkoutChartsData(data: AnalyticsData): WorkoutChartData {
  return {
    weeklyVolume: arrayOf(data.weeklyVolume)
      .map((row) => ({
        ...row,
        week: text(row.week),
        volume: Math.max(0, finiteNumber(row.volume)),
        workoutCount: Math.max(0, Math.round(finiteNumber(row.workoutCount))),
      }))
      .filter((row) => row.week.length > 0),

    exerciseFrequency: arrayOf(data.exerciseFrequency)
      .map((row) => ({
        ...row,
        name: text(row.name),
        count: Math.max(0, Math.round(finiteNumber(row.count))),
        totalVolume: Math.max(0, finiteNumber(row.totalVolume)),
      }))
      .filter((row) => row.name.length > 0 && row.count > 0),

    intensityTrend: arrayOf(data.intensityTrend)
      .map((row) => {
        const date = validDateText(row.date);
        return date
          ? { ...row, date, intensity: clamp(finiteNumber(row.intensity), 0, 10) }
          : null;
      })
      .filter((row): row is AnalyticsData['intensityTrend'][number] => row !== null),

    workoutCalendar: arrayOf(data.workoutCalendar)
      .map((row) => {
        const date = validDateText(row.date);
        return date
          ? { ...row, date, count: Math.max(0, Math.round(finiteNumber(row.count))) }
          : null;
      })
      .filter((row): row is AnalyticsData['workoutCalendar'][number] => row !== null),
  };
}

export function sanitizeNASMChartsData(data: AnalyticsData): NASMChartData {
  return {
    oneRMProgression: arrayOf(data.oneRMProgression)
      .map((row) => {
        const date = validDateText(row.date);
        const exercise = text(row.exercise);
        const estimated1RM = finiteNumber(row.estimated1RM, NaN);
        return date && exercise && Number.isFinite(estimated1RM) && estimated1RM > 0
          ? { ...row, date, exercise, estimated1RM }
          : null;
      })
      .filter((row): row is AnalyticsData['oneRMProgression'][number] => row !== null),

    muscleGroupVolume: arrayOf(data.muscleGroupVolume)
      .map((row) => ({
        ...row,
        group: text(row.group),
        volume: Math.max(0, finiteNumber(row.volume)),
      }))
      .filter((row) => row.group.length > 0 && row.volume > 0),

    rpeTrend: arrayOf(data.rpeTrend)
      .map((row) => {
        const date = validDateText(row.date);
        const avgRPE = finiteNumber(row.avgRPE, NaN);
        return date && Number.isFinite(avgRPE) && avgRPE > 0
          ? { ...row, date, avgRPE: clamp(avgRPE, 0, 10) }
          : null;
      })
      .filter((row): row is AnalyticsData['rpeTrend'][number] => row !== null),
  };
}
