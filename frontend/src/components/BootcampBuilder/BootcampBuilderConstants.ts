/**
 * ============================================================================
 * FILE: BootcampBuilderConstants.ts
 * PURPOSE: Constants, types, and helpers for the Bootcamp Builder
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */
import type { ClassFormat, DayType } from '../../hooks/useBootcampAPI';

export const CLASS_FORMATS: Array<{ value: string; label: string; description: string; category: string }> = [
  // Station-based
  { value: 'stations_4x', label: '4×N Stations', description: '4 exercises per station, 35s each', category: 'Station' },
  { value: 'stations_3x5', label: '3×5 Stations', description: '3 exercises × 5 stations, 40s each', category: 'Station' },
  { value: 'stations_2x7', label: '2×7 Stations', description: '2 exercises × 7 stations, 30s each', category: 'Station' },
  { value: 'stations_3x4', label: '3×4 Stations', description: '3 exercises × 4 stations, 35s each', category: 'Station' },
  { value: 'stations_5x3', label: '5×3 Stations', description: '5 exercises × 3 stations, 30s each', category: 'Station' },
  // Full group
  { value: 'full_group', label: 'Full Group Circuit', description: 'Everyone does same circuit, 40s each', category: 'Group' },
  { value: 'circuit', label: 'Timed Circuit', description: '40s work / 15s rest, 3 rounds', category: 'Group' },
  // Time protocols
  { value: 'emom', label: 'EMOM', description: 'Every Minute On The Minute — 60s cycles', category: 'Protocol' },
  { value: 'tabata', label: 'Tabata', description: '20s work / 10s rest × 8 rounds per exercise', category: 'Protocol' },
  { value: 'amrap', label: 'AMRAP', description: 'As Many Reps As Possible — 4 min blocks', category: 'Protocol' },
  // Specialty
  { value: 'partner', label: 'Partner', description: 'I-go-you-go format, paired stations', category: 'Specialty' },
  { value: 'hybrid', label: 'Hybrid', description: 'Warm-up stations → full group → finisher', category: 'Specialty' },
];

export const DAY_TYPES: Array<{ value: DayType; label: string }> = [
  { value: 'lower_body', label: 'Lower Body' },
  { value: 'upper_body', label: 'Upper Body' },
  { value: 'cardio', label: 'Cardio / Conditioning' },
  { value: 'full_body', label: 'Full Body' },
];

export const OPT_PHASES = [
  { value: 1, label: 'Phase 1 — Stabilization Endurance' },
  { value: 2, label: 'Phase 2 — Strength Endurance' },
  { value: 3, label: 'Phase 3 — Hypertrophy' },
  { value: 4, label: 'Phase 4 — Maximal Strength' },
  { value: 5, label: 'Phase 5 — Power' },
] as const;

export type ClassStyle = 'standard' | 'pyramid' | 'superset' | 'mixed';

export const CLASS_STYLES: Array<{ value: ClassStyle; label: string; description: string }> = [
  { value: 'standard', label: 'Standard', description: 'Equal-weight rounds' },
  { value: 'pyramid', label: 'Pyramid', description: 'Heavy → drop weight → lighter → failure' },
  { value: 'superset', label: 'Superset', description: 'Compound → bodyweight → banded (same muscle)' },
  { value: 'mixed', label: 'Mixed', description: 'Combination of styles per station' },
];

export type IntensityCategory = 'high_impact' | 'medium_impact' | 'calisthenics' | 'stability' | 'flexibility' | 'cardio';

export const INTENSITY_CATEGORIES: Array<{ value: IntensityCategory; label: string }> = [
  { value: 'high_impact', label: 'High Impact' },
  { value: 'medium_impact', label: 'Medium Impact' },
  { value: 'calisthenics', label: 'Calisthenics' },
  { value: 'stability', label: 'Stability' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'cardio', label: 'Cardio' },
];

export function formatMuscle(name: string): string {
  return name.trim().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Format Config (mirrors backend bootcampConstants.mjs) ──
export interface FormatConfig {
  exercisesPerStation: number | null;
  durationSec: number;
  fixedStations: number | null;
  restSec?: number;
  rounds?: number;
  isStationBased: boolean;
}

export const FORMAT_CONFIG: Record<string, FormatConfig> = {
  stations_4x:  { exercisesPerStation: 4, durationSec: 35, fixedStations: null, isStationBased: true },
  stations_3x5: { exercisesPerStation: 3, durationSec: 40, fixedStations: 5,    isStationBased: true },
  stations_2x7: { exercisesPerStation: 2, durationSec: 30, fixedStations: 7,    isStationBased: true },
  stations_3x4: { exercisesPerStation: 3, durationSec: 35, fixedStations: 4,    isStationBased: true },
  stations_5x3: { exercisesPerStation: 5, durationSec: 30, fixedStations: 3,    isStationBased: true },
  full_group:   { exercisesPerStation: null, durationSec: 40, fixedStations: null, isStationBased: false },
  circuit:      { exercisesPerStation: null, durationSec: 40, fixedStations: null, rounds: 3, isStationBased: false },
  emom:         { exercisesPerStation: null, durationSec: 60, fixedStations: null, isStationBased: false },
  tabata:       { exercisesPerStation: null, durationSec: 20, restSec: 10, fixedStations: null, rounds: 8, isStationBased: false },
  amrap:        { exercisesPerStation: null, durationSec: 40, fixedStations: null, isStationBased: false },
  partner:      { exercisesPerStation: 2, durationSec: 40, fixedStations: null, isStationBased: true },
  hybrid:       { exercisesPerStation: null, durationSec: 35, fixedStations: null, isStationBased: false },
};

/** Get station count for a format, defaulting to 4 for dynamic formats */
export function getStationCount(format: string, targetDuration: number): number {
  const cfg = FORMAT_CONFIG[format];
  if (!cfg || !cfg.isStationBased) return 0;
  if (cfg.fixedStations) return cfg.fixedStations;
  // Dynamic station count based on duration
  const exerciseTime = (cfg.exercisesPerStation || 4) * cfg.durationSec;
  const stationTime = exerciseTime + ((cfg.exercisesPerStation || 4) - 1) * 15 + 30;
  return Math.max(4, Math.min(10, Math.floor((targetDuration * 60) / stationTime)));
}

/** Get max exercises per station */
export function getExercisesPerStation(format: string): number {
  const cfg = FORMAT_CONFIG[format];
  return cfg?.exercisesPerStation || 4;
}

/** Get duration per exercise in seconds */
export function getDurationSec(format: string): number {
  const cfg = FORMAT_CONFIG[format];
  return cfg?.durationSec || 35;
}
