/**
 * ClientProgressCharts/index.ts
 * =============================
 * 
 * Main export for the ClientProgressCharts component system
 * Provides clean import syntax and type exports
 */

export { default } from './ClientProgressCharts';
export { default as ClientProgressCharts } from './ClientProgressCharts';

// Re-export chart components for granular use
export {
  VolumeOverTimeChart,
  OneRepMaxChart,
  FormQualityChart,
  NASMCategoryRadar
} from './charts';

// Re-export types for external use
export type {
  WorkoutLogData,
  SetLogData,
  ChartDataPoint,
  VolumeDataPoint,
  OneRepMaxDataPoint,
  FormQualityDataPoint,
  NASMCategoryDataPoint,
  ProgressMetrics,
  ChartTimeRange,
  ChartVisibility,
  VolumeChartProps,
  OneRepMaxChartProps,
  FormQualityChartProps,
  NASMRadarChartProps
} from './types/ClientProgressTypes';