/**
 * workoutAnalyticsData.ts
 *
 * Pure read-model helpers shared by workout analytics hooks. Keeps API
 * response mapping, null-safe intensity handling, and derived summaries out of
 * React hooks so client/admin surfaces cannot drift into different truths.
 */
import {
  calcBrzycki1RM,
  calcLongestStreak,
  derive1RMProgression,
  deriveMuscleGroupVolume,
  deriveRPETrend,
} from './workoutAnalyticsUtils';
import type {
  AnalyticsData,
  ExerciseFrequency,
  IntensityPoint,
  PersonalRecord,
  WeeklyVolume,
  WorkoutCalendarEntry,
  WorkoutLogEntry,
  WorkoutSession,
} from './useWorkoutAnalytics.types';

type SettledApiResponse = PromiseSettledResult<{ data?: Record<string, unknown> }>;

const BLANK_VALUES = new Set<unknown>([null, undefined, '']);

const toNumberOrZero = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const optionalNumber = (value: unknown): number | undefined => typeof value === 'number' ? value : undefined;
const optionalString = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;

const textOrFallback = (value: unknown, fallback: string): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : fallback;
};

const toLoggedIntensity = (value: unknown): number | null => {
  if (BLANK_VALUES.has(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const roundToTenths = (value: number): number => Math.round(value * 10) / 10;

const arrayForKeys = (data: Record<string, unknown>, keys: string[]): unknown[] => {
  for (const key of keys) {
    const candidate = data[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

const valueForKeys = (data: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const candidate = data[key];
    if (candidate !== null && candidate !== undefined) return candidate;
  }
  return undefined;
};

const readSuccessArray = (
  response: SettledApiResponse,
  keys: string[],
): unknown[] => {
  const data = response.status === 'fulfilled' ? response.value.data : null;
  return data?.success === true ? arrayForKeys(data, [...keys, 'data']) : [];
};

const mapWorkoutLog = (log: Record<string, unknown>): WorkoutLogEntry => ({
  id: toNumberOrZero(log.id),
  exerciseName: textOrFallback(log.exerciseName, 'Exercise'),
  setNumber: toNumberOrZero(log.setNumber),
  reps: toNumberOrZero(log.reps),
  weight: toNumberOrZero(log.weight),
  tempo: optionalString(log.tempo),
  rest: optionalNumber(log.rest),
  rpe: optionalNumber(log.rpe),
  notes: optionalString(log.notes),
  exerciseNote: optionalString(log.exerciseNote),
});

const readLogs = (workout: Record<string, unknown>): WorkoutLogEntry[] => (
  Array.isArray(workout.logs) ? workout.logs.map(mapWorkoutLog)
    : Array.isArray(workout.WorkoutLogs) ? workout.WorkoutLogs.map(mapWorkoutLog)
      : []
);

export const mapWorkoutSessions = (raw: unknown): WorkoutSession[] => {
  if (!Array.isArray(raw)) return [];

  return raw.map((row) => {
    const workout = row as Record<string, unknown>;
    return {
      id: String(workout.id ?? ''),
      title: textOrFallback(workout.title, 'Workout'),
      date: textOrFallback(workout.date, ''),
      duration: toNumberOrZero(workout.duration),
      intensity: toLoggedIntensity(workout.intensity),
      status: textOrFallback(workout.status, 'completed'),
      totalSets: toNumberOrZero(workout.totalSets),
      totalReps: toNumberOrZero(workout.totalReps),
      totalWeight: toNumberOrZero(workout.totalWeight),
      notes: optionalString(workout.notes),
      logs: readLogs(workout),
    };
  });
};

const mapWeeklyVolume = (row: unknown): WeeklyVolume => {
  const item = row as Record<string, unknown>;
  return {
    week: textOrFallback(valueForKeys(item, ['week', 'period', 'label']), ''),
    volume: toNumberOrZero(valueForKeys(item, ['volume', 'totalVolume'])),
    workoutCount: toNumberOrZero(valueForKeys(item, ['workoutCount', 'count'])),
  };
};

export const buildWeeklyVolumeFromApi = (response: SettledApiResponse): WeeklyVolume[] => (
  readSuccessArray(response, ['data', 'volumeProgression']).map(mapWeeklyVolume)
);

const toSessionWeek = (dateValue: string): string => {
  const date = new Date(dateValue);
  const dayOffset = date.getDate() + 6 - date.getDay();
  const week = Math.ceil(dayOffset / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const deriveWeeklyVolumeFromSessions = (sessions: WorkoutSession[]): WeeklyVolume[] => {
  const weekMap = new Map<string, { volume: number; count: number }>();

  for (const session of sessions) {
    const week = toSessionWeek(session.date);
    const existing = weekMap.get(week) ?? { volume: 0, count: 0 };
    weekMap.set(week, {
      volume: existing.volume + session.totalWeight,
      count: existing.count + 1,
    });
  }

  return Array.from(weekMap.entries())
    .map(([week, value]) => ({ week, volume: value.volume, workoutCount: value.count }))
    .sort((a, b) => a.week.localeCompare(b.week));
};

const mapPersonalRecord = (row: unknown): PersonalRecord => {
  const record = row as Record<string, unknown>;
  return {
    exercise: textOrFallback(valueForKeys(record, ['exerciseName', 'exercise', 'name']), 'Exercise'),
    weight: toNumberOrZero(valueForKeys(record, ['weight', 'maxWeight'])),
    reps: toNumberOrZero(valueForKeys(record, ['reps', 'bestReps'])),
    date: textOrFallback(valueForKeys(record, ['date', 'achievedAt']), ''),
    estimated1RM: optionalNumber(record.estimated1RM),
  };
};

export const buildPersonalRecordsFromApi = (response: SettledApiResponse): PersonalRecord[] => (
  readSuccessArray(response, ['data', 'personalRecords']).map(mapPersonalRecord)
);

export const derivePersonalRecordsFromSessions = (sessions: WorkoutSession[]): PersonalRecord[] => {
  const bestByExercise = new Map<string, { weight: number; reps: number; date: string }>();

  for (const session of sessions) {
    for (const log of session.logs) {
      const existing = bestByExercise.get(log.exerciseName);
      if (!existing || log.weight > existing.weight) {
        bestByExercise.set(log.exerciseName, {
          weight: log.weight,
          reps: log.reps,
          date: session.date,
        });
      }
    }
  }

  return Array.from(bestByExercise.entries())
    .filter(([, record]) => record.weight > 0)
    .map(([exercise, record]) => ({ exercise, ...record }));
};

export const withEstimatedOneRepMaxes = (records: PersonalRecord[]): PersonalRecord[] => (
  records.map((record) => {
    if (record.estimated1RM || record.weight <= 0 || record.reps <= 0) return record;
    return { ...record, estimated1RM: calcBrzycki1RM(record.weight, record.reps) };
  })
);

const buildExerciseFrequency = (
  sessions: WorkoutSession[],
  limit = 15,
): ExerciseFrequency[] => {
  const frequency = new Map<string, { count: number; totalVolume: number }>();

  for (const session of sessions) {
    const exerciseNames = new Set(session.logs.map((log) => log.exerciseName));
    for (const name of exerciseNames) {
      const exerciseLogs = session.logs.filter((log) => log.exerciseName === name);
      const existing = frequency.get(name) ?? { count: 0, totalVolume: 0 };
      const totalVolume = exerciseLogs.reduce((sum, log) => sum + (log.weight * log.reps), 0);
      frequency.set(name, {
        count: existing.count + 1,
        totalVolume: existing.totalVolume + totalVolume,
      });
    }
  }

  return Array.from(frequency.entries())
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

const hasLoggedIntensity = (
  session: WorkoutSession,
): session is WorkoutSession & { intensity: number } => (
  typeof session.intensity === 'number' && session.intensity > 0
);

const buildIntensityTrend = (sessions: WorkoutSession[]): IntensityPoint[] => (
  sessions
    .filter(hasLoggedIntensity)
    .map((session) => ({ date: session.date, intensity: session.intensity }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
);

const buildWorkoutCalendar = (sessions: WorkoutSession[]): WorkoutCalendarEntry[] => {
  const calendar = new Map<string, number>();

  for (const session of sessions) {
    const dateKey = new Date(session.date).toISOString().split('T')[0];
    calendar.set(dateKey, (calendar.get(dateKey) ?? 0) + 1);
  }

  return Array.from(calendar.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const average = (values: number[]): number | null => (
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length
);

const buildAnalyticsSummary = (
  sessions: WorkoutSession[],
  longestStreak: number,
): AnalyticsData['summary'] => {
  const totalVolume = sessions.reduce((sum, session) => sum + session.totalWeight, 0);
  const totalExercises = new Set(
    sessions.flatMap((session) => session.logs.map((log) => log.exerciseName)),
  ).size;
  const avgIntensity = average(buildIntensityTrend(sessions).map((point) => point.intensity));
  const rpeValues = sessions.flatMap((session) => (
    session.logs
      .filter((log) => typeof log.rpe === 'number' && log.rpe > 0)
      .map((log) => log.rpe as number)
  ));
  const avgRPE = average(rpeValues);

  return {
    totalWorkouts: sessions.length,
    totalExercises,
    totalVolume,
    avgIntensity: avgIntensity === null ? null : roundToTenths(avgIntensity),
    avgRPE: avgRPE === null ? 0 : roundToTenths(avgRPE),
    longestStreak,
  };
};

export const buildAnalyticsData = (
  sessions: WorkoutSession[],
  weeklyVolume: WeeklyVolume[],
  personalRecords: PersonalRecord[],
): AnalyticsData => {
  const longestStreak = calcLongestStreak(sessions);

  return {
    sessions: [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    weeklyVolume,
    exerciseFrequency: buildExerciseFrequency(sessions),
    intensityTrend: buildIntensityTrend(sessions),
    workoutCalendar: buildWorkoutCalendar(sessions),
    personalRecords,
    oneRMProgression: derive1RMProgression(sessions),
    muscleGroupVolume: deriveMuscleGroupVolume(sessions),
    rpeTrend: deriveRPETrend(sessions),
    summary: buildAnalyticsSummary(sessions, longestStreak),
  };
};
