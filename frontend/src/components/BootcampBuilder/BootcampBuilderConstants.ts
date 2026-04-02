/**
 * ============================================================================
 * FILE: BootcampBuilderConstants.ts
 * PURPOSE: Constants, types, and helpers for the Bootcamp Builder
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */
import type { ClassFormat, DayType } from '../../hooks/useBootcampAPI';

export const CLASS_FORMATS: Array<{ value: ClassFormat; label: string }> = [
  { value: 'stations_4x', label: '4 Exercises × N Stations (35s)' },
  { value: 'stations_3x5', label: '3 Exercises × 5 Stations (40s)' },
  { value: 'stations_2x7', label: '2 Exercises × 7 Stations (30s)' },
  { value: 'full_group', label: 'Full Group (15 exercises × 2 rounds)' },
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
