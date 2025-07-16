/**
 * ClientProgressTypes.ts
 * ======================
 * 
 * TypeScript interfaces and types for the ClientProgressCharts system
 * Comprehensive type definitions for workout progress analytics
 */

// ==================== CORE DATA TYPES ====================

export interface WorkoutLogData {
  id: number;
  userId: number;
  trainerId?: number;
  completedAt: string;
  duration: number;
  totalVolume: number;
  sessionNotes?: string;
  overallRPE?: number;
  setLogs?: SetLogData[];
  createdAt: string;
  updatedAt: string;
}

export interface SetLogData {
  id: number;
  workoutLogId: number;
  exerciseId: number;
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  tempo?: string;
  rpe?: number;
  formRating: number;
  restTime?: number;
  notes?: string;
  nasmCategory?: string;
  createdAt: string;
  updatedAt: string;
}

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
}

// ==================== NASM CATEGORIES ====================

export enum NASMCategory {
  CORE = 'Core Stability',
  BALANCE = 'Balance Training',
  POWER = 'Power Development', 
  STRENGTH = 'Strength Training',
  ENDURANCE = 'Muscular Endurance',
  FLEXIBILITY = 'Flexibility',
  CARDIO = 'Cardiovascular',
  FUNCTIONAL = 'Functional Movement',
  CORRECTIVE = 'Corrective Exercise',
  GENERAL = 'General Fitness'
}

// ==================== CHART CONFIGURATION ====================

export type ChartTimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface ChartVisibility {
  volume: boolean;
  oneRepMax: boolean;
  formQuality: boolean;
  nasmCategory: boolean;
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

// ==================== PROGRESS METRICS ====================

export interface ProgressMetrics {
  totalWorkouts: number;
  totalVolume: number;
  averageFormRating: number;
  totalSets: number;
  totalReps: number;
  strongestLift: OneRepMaxDataPoint;
  mostImprovedLift: OneRepMaxDataPoint;
  dominantCategory: NASMCategoryDataPoint;
  consistencyScore: number;
  progressTrend: 'improving' | 'declining' | 'stable';
}

// ==================== API RESPONSE TYPES (FIXED) ====================

// Backend API response structure (from dailyWorkoutFormRoutes.mjs)
export interface ProgressDataApiResponse {
  success: boolean;
  progressData: {
    categories: BackendNASMCategory[];
    workoutHistory: BackendWorkoutHistory[];
    formTrends: BackendFormTrend[];
    volumeProgression: BackendVolumeProgression[];
  };
  totalWorkouts: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  message?: string;
}

// Backend data structures
export interface BackendNASMCategory {
  category: string;
  level: number;
  maxLevel: number;
  percentComplete: number;
}

export interface BackendWorkoutHistory {
  date: string;
  duration: number;
  intensity: number;
  totalVolume: number;
  exerciseCount: number;
  pointsEarned: number;
}

export interface BackendFormTrend {
  date: string;
  averageFormRating: number;
  exerciseCount: number;
}

export interface BackendVolumeProgression {
  date: string;
  totalWeight: number;
  totalReps: number;
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

// ==================== UTILITY TYPES ====================

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  timeRange: ChartTimeRange;
  exercises?: string[];
  categories?: NASMCategory[];
  minFormRating?: number;
  minWeight?: number;
}

// ==================== ERROR TYPES ====================

export interface ChartError {
  type: 'data' | 'api' | 'render';
  message: string;
  details?: any;
}

// ==================== EXPORT DEFAULT ====================

export type {
  WorkoutLogData as WorkoutLog,
  SetLogData as SetLog,
  ChartDataPoint as DataPoint
};

export default {
  NASMCategory,
  ChartTimeRange: ['7d', '30d', '90d', '1y', 'all'] as ChartTimeRange[]
};