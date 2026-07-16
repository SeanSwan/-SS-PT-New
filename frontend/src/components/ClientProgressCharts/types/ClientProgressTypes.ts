/**
 * ClientProgressTypes.ts
 * ======================
 * 
 * TypeScript interfaces and types for the ClientProgressCharts system
 * Comprehensive type definitions for workout progress analytics
 */

// ==================== CHART DATA TYPES ====================

export interface ChartDataPoint {
  date: string;
  value: number;
  label: string;
  color?: string;
}

export interface VolumeDataPoint extends ChartDataPoint {
  totalSets?: number;
  avgWeight?: number;
  exercises?: string[];
}

export interface OneRepMaxDataPoint {
  exercise: string;
  max: number;
  label: string;
  date?: string;
  improvement?: number;
  category?: string;
}

export interface FormQualityDataPoint extends ChartDataPoint {
  averageForm: number;
  totalSets: number;
  sessionCount: number;
}

export interface NASMCategoryDataPoint {
  category: string;
  value: number;
  fullMark: number;
  color?: string;
  percentage?: number;
  level?: number;
  maxLevel?: number;
  percentComplete?: number;
}

// ==================== CHART CONFIGURATION ====================

export type ChartTimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface ChartVisibility {
  volume: boolean;
  oneRepMax: boolean;
  formQuality: boolean;
  nasmCategory: boolean;
  bodyComposition: boolean;
  strengthProgression: boolean;
  consistency: boolean;
  muscleGroup: boolean;
  trainingLoad: boolean;
  rpeDistribution: boolean;
  personalRecords: boolean;
  restCompliance: boolean;
  exerciseFrequency: boolean;
  sessionIntensity: boolean;
}

export interface ChartTheme {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
  grid: string;
  tooltip: string;
}

// ==================== SANITIZED API ROWS ====================

// Backend API response structure (from dailyWorkoutFormRoutes.mjs)
export type ProgressPayloadRow = Record<string, unknown>;

export interface SanitizedWorkoutHistoryRow extends ProgressPayloadRow {
  date: string;
  duration: number;
  intensity: number;
  totalVolume: number;
  exerciseCount: number;
  pointsEarned: number;
}

export interface SanitizedVolumeProgressionRow {
  date: string;
  totalWeight: number;
  totalReps: number;
  totalSets: number;
  intensity: number;
}

export interface SanitizedFormTrendRow {
  date: string;
  averageFormRating: number | null;
  exerciseCount: number;
  totalSets: number;
}

// ==================== CHART COMPONENT PROPS ====================

export interface BaseChartProps {
  height?: number;
  showTooltip?: boolean;
  showLegend?: boolean;
  animate?: boolean;
  theme?: Partial<ChartTheme>;
  className?: string;
}

export interface VolumeChartProps extends BaseChartProps {
  data: VolumeDataPoint[];
  timeRange?: ChartTimeRange;
  showTrendLine?: boolean;
}

export interface OneRepMaxChartProps extends BaseChartProps {
  data: OneRepMaxDataPoint[];
  maxExercises?: number;
  sortBy?: 'weight' | 'improvement' | 'alphabetical';
}

export interface FormQualityChartProps extends BaseChartProps {
  data: FormQualityDataPoint[];
  showAverage?: boolean;
  targetFormRating?: number;
}

export interface NASMRadarChartProps extends BaseChartProps {
  data: NASMCategoryDataPoint[];
  showPercentages?: boolean;
  maxValue?: number;
}

// ==================== NEW CHART DATA TYPES (v4.0) ====================

export interface BodyCompositionDataPoint {
  date: string;
  weight: number;
  bodyFat: number;
  muscleMass?: number;
  progressScore?: number;
}

export interface StrengthProgressionDataPoint {
  date: string;
  exercises: Record<string, number>; // exerciseName → estimated1RM
}

export interface ConsistencyDataPoint {
  date: string;   // YYYY-MM-DD
  count: number;   // workouts that day
  volume?: number; // total volume
}

export interface MuscleGroupDataPoint {
  muscleGroup: string;
  volume: number;
  previousVolume?: number;
}

export interface BodyCompositionChartProps {
  data: BodyCompositionDataPoint[];
}

export interface StrengthProgressionChartProps {
  data: StrengthProgressionDataPoint[];
  exerciseNames: string[];
}

export interface ConsistencyHeatmapProps {
  data: ConsistencyDataPoint[];
}

export interface MuscleGroupRadarProps {
  data: MuscleGroupDataPoint[];
}

// ==================== NEW CHART DATA TYPES (v5.0 — 6 additional charts) ====================

export interface TrainingLoadDataPoint {
  week: string;       // "Mar 3" or "W12"
  tonnage: number;    // total weight × reps
  sessions: number;   // sessions that week
  avgIntensity: number | null; // avg session intensity 1-10, null when unrated
}

export interface RPEDistributionDataPoint {
  zone: string;       // "Easy (1-3)", "Moderate (4-6)", etc.
  count: number;      // number of sets/sessions in this zone
  percentage: number;
  color: string;
}

export interface PersonalRecordDataPoint {
  date: string;
  exercise: string;
  weight: number;
  reps: number;
  estimated1RM: number;
}

export interface RestComplianceDataPoint {
  phase: string;       // "Phase 1", "Phase 2", etc. or exercise name
  prescribed: number;  // target rest in seconds
  actual: number;      // actual rest in seconds
}

export interface ExerciseFrequencyDataPoint {
  exercise: string;
  count: number;
  lastPerformed: string;
  muscleGroup?: string;
}

export interface SessionIntensityDataPoint {
  date: string;
  duration: number;    // minutes
  intensity: number;   // 1-10
  totalVolume: number;
  sessionTitle?: string;
}

export interface TrainingLoadChartProps extends BaseChartProps {
  data: TrainingLoadDataPoint[];
}

export interface RPEDistributionChartProps extends BaseChartProps {
  data: RPEDistributionDataPoint[];
}

export interface PersonalRecordsChartProps extends BaseChartProps {
  data: PersonalRecordDataPoint[];
}

export interface RestComplianceChartProps extends BaseChartProps {
  data: RestComplianceDataPoint[];
}

export interface ExerciseFrequencyChartProps extends BaseChartProps {
  data: ExerciseFrequencyDataPoint[];
  maxItems?: number;
}

export interface SessionIntensityChartProps extends BaseChartProps {
  data: SessionIntensityDataPoint[];
}
