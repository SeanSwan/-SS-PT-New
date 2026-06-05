/**
 * ============================================================================
 * FILE: MeasurementEntry.config.ts
 * PURPOSE: Static measurement field and Victory chart config.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Keeps static measurement metadata and chart styling outside the active
 * MeasurementEntry state/render component.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry consumes these constants for form generation, change
 * direction semantics, and body-progress chart rendering.
 */

import { createElement, type ElementType } from 'react';
import type { BodyMeasurement, RadarMeasurementKey } from './MeasurementEntry.types';

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export const measurementFields: { key: keyof BodyMeasurement; label: string }[] = [
  { key: 'weight', label: 'Weight' },
  { key: 'bodyFatPercentage', label: 'Body Fat %' },
  { key: 'muscleMassPercentage', label: 'Muscle Mass %' },
  { key: 'neck', label: 'Neck' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'chest', label: 'Chest' },
  { key: 'rightBicep', label: 'Right Bicep' },
  { key: 'leftBicep', label: 'Left Bicep' },
  { key: 'rightForearm', label: 'Right Forearm' },
  { key: 'leftForearm', label: 'Left Forearm' },
  { key: 'naturalWaist', label: 'Natural Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'rightThigh', label: 'Right Thigh' },
  { key: 'leftThigh', label: 'Left Thigh' },
  { key: 'rightCalf', label: 'Right Calf' },
  { key: 'leftCalf', label: 'Left Calf' },
];

export const negativeIsBetter: Array<keyof BodyMeasurement> = [
  'weight',
  'bodyFatPercentage',
  'naturalWaist',
  'hips',
  'neck',
];

export const RADAR_LABEL_MAP: Record<RadarMeasurementKey, string> = {
  neck: 'Neck',
  shoulders: 'Shoulders',
  chest: 'Chest',
  rightBicep: 'Bicep',
  naturalWaist: 'Waist',
  hips: 'Hips',
  rightThigh: 'Thigh',
  rightCalf: 'Calf',
};

export const TREND_CHART_PADDING = { top: 10, bottom: 50, left: 55, right: 55 };
export const CHART_ANIMATION = { duration: 800, easing: 'cubicInOut' as const };

export const CHART_AXIS_STYLE = {
  axis: { stroke: 'rgba(96, 192, 240, 0.08)' },
  tickLabels: { fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11, fontFamily: "'Fira Code', monospace" },
  grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
};

export const DEPENDENT_AXIS_STYLE = {
  ...CHART_AXIS_STYLE,
  axisLabel: { fill: 'rgba(255,255,255,0.3)', fontSize: 10, padding: 40 },
};

export const RADAR_AXIS_STYLE = {
  axis: { stroke: 'rgba(255, 255, 255, 0.1)' },
  tickLabels: { fill: 'rgba(255, 255, 255, 0.6)', fontSize: 11, fontFamily: "'Sora', sans-serif" },
  grid: { stroke: 'rgba(255, 255, 255, 0.1)' },
};

export const RADAR_DEPENDENT_AXIS_STYLE = {
  axis: { stroke: 'none' },
  tickLabels: { fill: 'rgba(255, 255, 255, 0.3)', fontSize: 9 },
  grid: { stroke: 'rgba(255, 255, 255, 0.1)' },
};

export const VICTORY_TOOLTIP_STYLE = {
  fill: 'var(--text-primary, #E0ECF4)',
  fontFamily: "'Fira Code', monospace",
  fontSize: 9,
};

export const VICTORY_TOOLTIP_FLYOUT_STYLE = {
  fill: 'var(--bg-card, #141419)',
  stroke: 'rgba(139, 92, 246, 0.3)',
};

export const WEIGHT_AREA_STYLE = {
  data: {
    fill: 'rgba(139, 92, 246, 0.15)',
    stroke: '#8B5CF6',
    strokeWidth: 2.5,
  },
};

export const BODY_FAT_LINE_STYLE = {
  data: { stroke: '#8B5CF6', strokeWidth: 2, strokeDasharray: '6,3' },
};

export const WAIST_LINE_STYLE = {
  data: { stroke: '#4ECDC4', strokeWidth: 2 },
};

export const LEGEND_STYLE = {
  labels: { fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12, fontFamily: "'Sora', sans-serif" },
};

export const RADAR_FIRST_AREA_STYLE = {
  data: {
    fill: 'rgba(139, 92, 246, 0.1)',
    stroke: '#8B5CF6',
    strokeWidth: 2,
  },
};

export const RADAR_CURRENT_AREA_STYLE = {
  data: {
    fill: 'rgba(139, 92, 246, 0.25)',
    stroke: '#50A0F0',
    strokeWidth: 2,
  },
};

export const victoryElement = (
  component: ElementType,
  props: Record<string, unknown>,
) => createElement(component, props);
