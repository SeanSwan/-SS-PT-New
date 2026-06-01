import type {
  BodyCompositionDataPoint,
  ConsistencyDataPoint,
  ExerciseFrequencyDataPoint,
  MuscleGroupDataPoint,
  NASMCategoryDataPoint,
  OneRepMaxDataPoint,
  PersonalRecordDataPoint,
  RestComplianceDataPoint,
  RPEDistributionDataPoint,
  SessionIntensityDataPoint,
  StrengthProgressionDataPoint,
} from './types/ClientProgressTypes';

type RawRow = Record<string, unknown>;

interface SanitizedProgressPayload {
  workoutHistory: RawRow[];
  volumeProgression: RawRow[];
  oneRepMaxes: OneRepMaxDataPoint[];
  formTrends: RawRow[];
  nasmCategories: NASMCategoryDataPoint[];
  categories: NASMCategoryDataPoint[];
  bodyComposition: BodyCompositionDataPoint[];
  strengthProgression: StrengthProgressionDataPoint[];
  consistencyData: ConsistencyDataPoint[];
  muscleGroupVolume: MuscleGroupDataPoint[];
  rpeDistribution: RPEDistributionDataPoint[];
  personalRecords: PersonalRecordDataPoint[];
  restCompliance: RestComplianceDataPoint[];
  exerciseFrequency: ExerciseFrequencyDataPoint[];
  sessionIntensity: SessionIntensityDataPoint[];
}

const arrayOf = (value: unknown): RawRow[] => (Array.isArray(value) ? value.filter(isRow) : []);

const isRow = (value: unknown): value is RawRow =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const finite = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const label = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const dateOrEmpty = (value: unknown): string => {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw && Number.isFinite(Date.parse(raw)) ? raw : '';
};

const dateRows = <T>(value: unknown, map: (row: RawRow) => T & { date: string }): T[] =>
  arrayOf(value).map(map).filter((row) => row.date);

const categoryRows = (value: unknown): NASMCategoryDataPoint[] =>
  arrayOf(value).map((row) => {
    const level = finite(row.value ?? row.level);
    const maxLevel = finite(row.fullMark ?? row.maxLevel, 1000) || 1000;
    const percentComplete = finite(row.percentage ?? row.percentComplete);
    return {
      category: label(row.category, 'General Fitness'),
      value: level,
      level,
      fullMark: maxLevel,
      maxLevel,
      percentage: percentComplete,
      percentComplete,
    } as NASMCategoryDataPoint;
  });

export function sanitizeProgressPayload(raw: RawRow = {}): SanitizedProgressPayload {
  return {
    workoutHistory: dateRows(raw.workoutHistory, (row) => ({
      ...row,
      date: dateOrEmpty(row.date ?? row.completedAt),
      duration: finite(row.duration),
      intensity: finite(row.intensity ?? row.overallRPE),
      totalVolume: finite(row.totalVolume),
      exerciseCount: finite(row.exerciseCount),
      pointsEarned: finite(row.pointsEarned),
    })),
    volumeProgression: dateRows(raw.volumeProgression, (row) => ({
      date: dateOrEmpty(row.date),
      totalWeight: finite(row.totalWeight),
      totalReps: finite(row.totalReps),
      totalSets: finite(row.totalSets),
      intensity: finite(row.intensity),
    })),
    oneRepMaxes: arrayOf(raw.oneRepMaxes).map((row) => {
      const max = finite(row.max, finite(row.estimated1RM));
      return {
        exercise: label(row.exercise ?? row.exerciseName, 'Unknown'),
        max,
        label: label(row.label, `${max} lbs`),
        improvement: finite(row.improvement),
        category: typeof row.category === 'string' ? row.category : undefined,
        date: dateOrEmpty(row.date) || undefined,
      };
    }),
    formTrends: dateRows(raw.formTrends, (row) => ({
      date: dateOrEmpty(row.date),
      averageFormRating: finite(row.averageFormRating, 3),
      exerciseCount: finite(row.exerciseCount),
    })),
    nasmCategories: categoryRows(raw.nasmCategories),
    categories: categoryRows(raw.categories),
    bodyComposition: dateRows(raw.bodyComposition, (row) => ({
      date: dateOrEmpty(row.date),
      weight: finite(row.weight),
      bodyFat: finite(row.bodyFat),
      muscleMass: finite(row.muscleMass),
      progressScore: finite(row.progressScore),
    })),
    strengthProgression: dateRows(raw.strengthProgression, (row) => ({
      date: dateOrEmpty(row.date),
      exercises: isRow(row.exercises)
        ? Object.fromEntries(Object.entries(row.exercises).map(([name, value]) => [name, finite(value)]))
        : {},
    })),
    consistencyData: dateRows(raw.consistencyData, (row) => ({
      date: dateOrEmpty(row.date),
      count: finite(row.count),
      volume: finite(row.volume),
    })),
    muscleGroupVolume: arrayOf(raw.muscleGroupVolume).map((row) => ({
      muscleGroup: label(row.muscleGroup, 'Unclassified'),
      volume: finite(row.volume),
      previousVolume: finite(row.previousVolume),
    })),
    rpeDistribution: arrayOf(raw.rpeDistribution).map((row) => ({
      zone: label(row.zone, 'Unrated'),
      count: finite(row.count),
      percentage: finite(row.percentage),
      color: label(row.color, '#60C0F0'),
    })),
    personalRecords: dateRows(raw.personalRecords, (row) => ({
      date: dateOrEmpty(row.date),
      exercise: label(row.exercise, 'Unknown'),
      weight: finite(row.weight),
      reps: finite(row.reps),
      estimated1RM: finite(row.estimated1RM),
    })),
    restCompliance: arrayOf(raw.restCompliance).map((row) => ({
      phase: label(row.phase, 'Unknown'),
      prescribed: finite(row.prescribed),
      actual: finite(row.actual),
    })),
    exerciseFrequency: arrayOf(raw.exerciseFrequency).map((row) => ({
      exercise: label(row.exercise, 'Unknown'),
      count: finite(row.count),
      lastPerformed: dateOrEmpty(row.lastPerformed),
      muscleGroup: typeof row.muscleGroup === 'string' ? row.muscleGroup : undefined,
    })),
    sessionIntensity: dateRows(raw.sessionIntensity, (row) => ({
      date: dateOrEmpty(row.date),
      duration: finite(row.duration),
      intensity: finite(row.intensity),
      totalVolume: finite(row.totalVolume),
      sessionTitle: typeof row.sessionTitle === 'string' ? row.sessionTitle : undefined,
    })),
  };
}
