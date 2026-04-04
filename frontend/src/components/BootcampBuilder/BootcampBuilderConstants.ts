/**
 * ============================================================================
 * FILE: BootcampBuilderConstants.ts
 * PURPOSE: Constants, types, and helpers for the Bootcamp Builder
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-04
 * AI VILLAGE VALIDATED: 2026-04-04 (14/17, 43 web sources)
 * ============================================================================
 */
import type { ClassFormat, DayType } from '../../hooks/useBootcampAPI';

// ── Timing Constants ────────────────────────────────────────
const TRANSITION_SEC = 15;   // between exercises at same station
const ROTATION_SEC = 30;     // between stations
const DEMO_MIN = 5;          // walk-through before class
const CLEAR_MIN = 5;         // equipment cleanup after class
const STRETCH_MIN = 3;       // optional warm-up stretch
const OVERHEAD_MIN = DEMO_MIN + CLEAR_MIN + STRETCH_MIN; // 13 min total

// ── Format Config ───────────────────────────────────────────
export interface FormatConfig {
  exercisesPerStation: number;
  stations: number;
  rounds: number;
  durationSec: number;
  restSec: number;
  isStationBased: boolean;
  /** Estimated workout time in minutes (auto-calculated) */
  workoutMin?: number;
  /** Estimated total class time including overhead */
  totalMin?: number;
  /** Does this fit in a 55-minute class? */
  fits55?: boolean;
}

function calcTiming(cfg: Pick<FormatConfig, 'exercisesPerStation' | 'stations' | 'rounds' | 'durationSec' | 'restSec'>): { workoutMin: number; totalMin: number; fits55: boolean } {
  const stationWorkSec = cfg.exercisesPerStation * cfg.durationSec + (cfg.exercisesPerStation - 1) * cfg.restSec;
  const stationTotalSec = (stationWorkSec * cfg.rounds) + ROTATION_SEC;
  const totalWorkSec = stationTotalSec * cfg.stations;
  const workoutMin = Math.ceil(totalWorkSec / 60);
  const totalMin = workoutMin + OVERHEAD_MIN;
  return { workoutMin, totalMin, fits55: totalMin <= 55 };
}

function makeFormat(stations: number, exPerStation: number, rounds: number, durationSec: number, restSec: number = TRANSITION_SEC): FormatConfig {
  const base = { exercisesPerStation: exPerStation, stations, rounds, durationSec, restSec, isStationBased: true };
  return { ...base, ...calcTiming(base) };
}

export const FORMAT_CONFIG: Record<string, FormatConfig> = {
  // ── 2 Exercises per Station (quick rotations) ──
  '2x5_r4':  makeFormat(5, 2, 4, 30),    // 5 stations × 2 ex × 4 rounds
  '2x5_r3':  makeFormat(5, 2, 3, 30),
  '2x6_r3':  makeFormat(6, 2, 3, 35),
  '2x6_r2':  makeFormat(6, 2, 2, 35),
  '2x7_r3':  makeFormat(7, 2, 3, 30),
  '2x7_r2':  makeFormat(7, 2, 2, 30),
  '2x8_r3':  makeFormat(8, 2, 3, 30),    // Sean's most common format
  '2x8_r2':  makeFormat(8, 2, 2, 35),
  '2x10_r2': makeFormat(10, 2, 2, 30),

  // ── 3 Exercises per Station (moderate depth) ──
  '3x4_r3':  makeFormat(4, 3, 3, 30),
  '3x4_r2':  makeFormat(4, 3, 2, 35),
  '3x5_r2':  makeFormat(5, 3, 2, 35),
  '3x5_r3':  makeFormat(5, 3, 3, 30),
  '3x6_r2':  makeFormat(6, 3, 2, 30),
  '3x6_r1':  makeFormat(6, 3, 1, 35),
  '3x8_r1':  makeFormat(8, 3, 1, 30),    // Many stations, 1 pass

  // ── 4 Exercises per Station (deep work) ──
  '4x4_r2':  makeFormat(4, 4, 2, 30),
  '4x4_r1':  makeFormat(4, 4, 1, 35),
  '4x5_r2':  makeFormat(5, 4, 2, 30, 10),
  '4x5_r1':  makeFormat(5, 4, 1, 35),
  '4x6_r1':  makeFormat(6, 4, 1, 35),

  // ── 5 Exercises per Station (intense) ──
  '5x3_r2':  makeFormat(3, 5, 2, 30),
  '5x3_r1':  makeFormat(3, 5, 1, 30),
  '5x4_r1':  makeFormat(4, 5, 1, 30),

  // ── Group / Circuit (no stations) ──
  'full_group': { exercisesPerStation: 0, stations: 0, rounds: 2, durationSec: 40, restSec: 15, isStationBased: false, workoutMin: 30, totalMin: 43, fits55: true },
  'circuit':    { exercisesPerStation: 0, stations: 0, rounds: 3, durationSec: 40, restSec: 15, isStationBased: false, workoutMin: 35, totalMin: 48, fits55: true },

  // ── Time Protocols ──
  'emom':   { exercisesPerStation: 0, stations: 0, rounds: 1, durationSec: 60, restSec: 0, isStationBased: false, workoutMin: 25, totalMin: 38, fits55: true },
  'tabata': { exercisesPerStation: 0, stations: 0, rounds: 8, durationSec: 20, restSec: 10, isStationBased: false, workoutMin: 20, totalMin: 33, fits55: true },
  'amrap':  { exercisesPerStation: 0, stations: 0, rounds: 1, durationSec: 40, restSec: 0, isStationBased: false, workoutMin: 30, totalMin: 43, fits55: true },

  // ── Specialty ──
  'partner': { exercisesPerStation: 2, stations: 6, rounds: 3, durationSec: 40, restSec: 0, isStationBased: true, workoutMin: 30, totalMin: 43, fits55: true },
  'hybrid':  { exercisesPerStation: 0, stations: 0, rounds: 1, durationSec: 35, restSec: 15, isStationBased: false, workoutMin: 35, totalMin: 48, fits55: true },
};

// Human-readable format list for dropdown
function formatLabel(key: string, cfg: FormatConfig): string {
  if (!cfg.isStationBased) {
    const labels: Record<string, string> = {
      full_group: 'Full Group Circuit', circuit: 'Timed Circuit',
      emom: 'EMOM', tabata: 'Tabata', amrap: 'AMRAP',
      partner: 'Partner', hybrid: 'Hybrid',
    };
    return labels[key] || key;
  }
  return `${cfg.stations} Stations × ${cfg.exercisesPerStation} Ex × ${cfg.rounds} Rounds`;
}

function formatDescription(key: string, cfg: FormatConfig): string {
  if (!cfg.isStationBased) {
    const descs: Record<string, string> = {
      full_group: 'Everyone does same exercises together, 40s each',
      circuit: '40s work / 15s rest, 3 rounds',
      emom: 'Every Minute On The Minute — 60s cycles',
      tabata: '20s max effort / 10s rest × 8 rounds',
      amrap: 'As Many Reps As Possible — timed blocks',
      partner: 'I-go-you-go format, paired stations',
      hybrid: 'Warm-up stations → full group → finisher',
    };
    return descs[key] || '';
  }
  return `${cfg.durationSec}s work, ${cfg.restSec}s rest — ~${cfg.workoutMin}min workout`;
}

function formatCategory(key: string, cfg: FormatConfig): string {
  if (!cfg.isStationBased) {
    if (['emom', 'tabata', 'amrap'].includes(key)) return 'Protocol';
    if (['partner', 'hybrid'].includes(key)) return 'Specialty';
    return 'Group';
  }
  return 'Station';
}

function formatFitBadge(cfg: FormatConfig): string {
  if (!cfg.totalMin) return '';
  if (cfg.totalMin <= 50) return '✅';
  if (cfg.totalMin <= 55) return '⚠️';
  return '🔴';
}

export const CLASS_FORMATS: Array<{ value: string; label: string; description: string; category: string; totalMin: number; fitBadge: string }> = Object.entries(FORMAT_CONFIG)
  .map(([key, cfg]) => ({
    value: key,
    label: formatLabel(key, cfg),
    description: formatDescription(key, cfg),
    category: formatCategory(key, cfg),
    totalMin: cfg.totalMin || 0,
    fitBadge: formatFitBadge(cfg),
  }))
  .sort((a, b) => {
    // Sort: Station formats by total time, then Group, Protocol, Specialty
    const catOrder: Record<string, number> = { Station: 0, Group: 1, Protocol: 2, Specialty: 3 };
    const ca = catOrder[a.category] ?? 4;
    const cb = catOrder[b.category] ?? 4;
    if (ca !== cb) return ca - cb;
    return a.totalMin - b.totalMin;
  });

// ── Day Types ───────────────────────────────────────────────
export const DAY_TYPES: Array<{ value: DayType; label: string }> = [
  { value: 'lower_body', label: 'Lower Body' },
  { value: 'upper_body', label: 'Upper Body' },
  { value: 'cardio', label: 'Cardio / Conditioning' },
  { value: 'full_body', label: 'Full Body' },
];

// ── OPT Phases ──────────────────────────────────────────────
export const OPT_PHASES = [
  { value: 1, label: 'Phase 1 — Stabilization Endurance' },
  { value: 2, label: 'Phase 2 — Strength Endurance' },
  { value: 3, label: 'Phase 3 — Hypertrophy' },
  { value: 4, label: 'Phase 4 — Maximal Strength' },
  { value: 5, label: 'Phase 5 — Power' },
] as const;

// ── Class Styles (expanded) ─────────────────────────────────
export type ClassStyle = 'standard' | 'pyramid' | 'superset' | 'mixed' | 'ladder' | 'descending' | 'chipper' | 'countdown' | 'death_by' | 'ygig' | 'contrast' | 'density';

export const CLASS_STYLES: Array<{ value: ClassStyle; label: string; description: string }> = [
  { value: 'standard', label: 'Standard', description: 'Equal-weight rounds — same effort throughout' },
  { value: 'pyramid', label: 'Pyramid', description: 'Heavy → drop weight → lighter → failure' },
  { value: 'superset', label: 'Superset', description: 'Compound → bodyweight → banded (same muscle)' },
  { value: 'mixed', label: 'Mixed', description: 'Different styles per station — maximum variety' },
  { value: 'ladder', label: 'Ladder', description: 'Ascending reps: 2-4-6-8-10 per round' },
  { value: 'descending', label: 'Descending', description: 'Descending reps: 15-12-10-8-6 — build intensity' },
  { value: 'chipper', label: 'Chipper', description: 'High-rep single pass: 50-40-30-20-10 — chip away' },
  { value: 'countdown', label: 'Countdown', description: 'Decreasing time: 60s-45s-30s-15s — intensity builds' },
  { value: 'death_by', label: 'Death By...', description: 'EMOM add 1 rep/min until failure' },
  { value: 'ygig', label: 'You Go I Go', description: 'Partner swap — one works, one rests. 1:1 ratio' },
  { value: 'contrast', label: 'Contrast', description: 'Heavy strength + explosive plyometric superset' },
  { value: 'density', label: 'Density', description: 'Max work in fixed time blocks (5 min each)' },
];

// ── Intensity Categories ────────────────────────────────────
export type IntensityCategory = 'high_impact' | 'medium_impact' | 'calisthenics' | 'stability' | 'flexibility' | 'cardio';

export const INTENSITY_CATEGORIES: Array<{ value: IntensityCategory; label: string }> = [
  { value: 'high_impact', label: 'High Impact' },
  { value: 'medium_impact', label: 'Medium Impact' },
  { value: 'calisthenics', label: 'Calisthenics' },
  { value: 'stability', label: 'Stability' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'cardio', label: 'Cardio' },
];

// ── Helper Functions ────────────────────────────────────────
export function formatMuscle(name: string): string {
  return name.trim().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Get station count for a format */
export function getStationCount(format: string): number {
  return FORMAT_CONFIG[format]?.stations || 0;
}

/** Get max exercises per station */
export function getExercisesPerStation(format: string): number {
  return FORMAT_CONFIG[format]?.exercisesPerStation || 4;
}

/** Get rounds per station */
export function getRounds(format: string): number {
  return FORMAT_CONFIG[format]?.rounds || 1;
}

/** Get duration per exercise in seconds */
export function getDurationSec(format: string): number {
  return FORMAT_CONFIG[format]?.durationSec || 35;
}

/** Get total workout minutes */
export function getWorkoutMin(format: string): number {
  return FORMAT_CONFIG[format]?.workoutMin || 30;
}

/** Get total class minutes (with overhead) */
export function getTotalMin(format: string): number {
  return FORMAT_CONFIG[format]?.totalMin || 43;
}
