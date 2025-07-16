/**
 * charts/index.ts
 * ===============
 * 
 * Barrel export for all ClientProgressCharts chart components
 * Provides clean import syntax for chart components
 */

export { default as VolumeOverTimeChart } from './VolumeOverTimeChart';
export { default as OneRepMaxChart } from './OneRepMaxChart';
export { default as FormQualityChart } from './FormQualityChart';
export { default as NASMCategoryRadar } from './NASMCategoryRadar';

// Export props interfaces for external use
export type {
  VolumeChartProps,
  OneRepMaxChartProps,
  FormQualityChartProps,
  NASMRadarChartProps
} from '../types/ClientProgressTypes';