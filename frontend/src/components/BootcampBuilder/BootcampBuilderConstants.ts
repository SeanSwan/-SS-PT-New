/**
 * ============================================================================
 * FILE: BootcampBuilderConstants.ts
 * PURPOSE: Constants, types, and helpers for the Bootcamp Builder
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-04
 * ============================================================================
 *
 * IMPORTANT: Formats define STRUCTURE only (stations × exercises × rounds).
 * The actual workout duration comes from the Workout Duration field.
 * Work/rest intervals auto-calculate to fill the target duration.
 */
import type { ClassFormat, DayType } from '../../hooks/useBootcampAPI';

// ── Timing Constants ────────────────────────────────────────
export const OVERHEAD_MIN = 13; // 5 demo + 5 clear + 3 stretch
export const DEFAULT_REST_SEC = 15; // between exercises at same station
export const ROTATION_SEC = 30;     // between stations
export const DEFAULT_BOOTCAMP_FORMAT = '4x4_r2' as const;
export const CUSTOM_BOOTCAMP_FORMAT = 'custom' as const;
export const DEFAULT_BOOTCAMP_STATION_COUNT = 4;
export const DEFAULT_BOOTCAMP_EXERCISES_PER_STATION = 4;
export const DEFAULT_BOOTCAMP_ROUNDS = 2;
export const DEFAULT_BOOTCAMP_WORKOUT_MIN = '40';
export const COMMON_CLASS_FORMAT_KEYS = ['4x4_r2', '4x5_r1', '3x4_r2', '3x5_r2'] as const;
export const BOOTCAMP_STATION_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
export const BOOTCAMP_EXERCISES_PER_STATION_OPTIONS = [1, 2, 3, 4, 5] as const;

// ── Format Config ───────────────────────────────────────────
export interface FormatConfig {
  /** Exercises per station (0 for non-station formats) */
  exercisesPerStation: number;
  /** Number of stations (0 for circuit/protocol formats) */
  stations: number;
  /** How many times participants repeat the circuit at each station */
  rounds: number;
  /** Is this a station-based format? */
  isStationBased: boolean;
}

function makeStation(stations: number, exPerStation: number, rounds: number): FormatConfig {
  return { exercisesPerStation: exPerStation, stations, rounds, isStationBased: true };
}

export const FORMAT_CONFIG: Record<string, FormatConfig> = {
  // ── 2 Exercises per Station (quick rotations) ──
  '2x5_r4':  makeStation(5, 2, 4),
  '2x5_r3':  makeStation(5, 2, 3),
  '2x6_r3':  makeStation(6, 2, 3),
  '2x6_r2':  makeStation(6, 2, 2),
  '2x7_r3':  makeStation(7, 2, 3),
  '2x7_r2':  makeStation(7, 2, 2),
  '2x8_r3':  makeStation(8, 2, 3),
  '2x8_r2':  makeStation(8, 2, 2),
  '2x10_r2': makeStation(10, 2, 2),

  // ── 3 Exercises per Station (moderate depth) ──
  '3x4_r3':  makeStation(4, 3, 3),
  '3x4_r2':  makeStation(4, 3, 2),
  '3x5_r2':  makeStation(5, 3, 2),
  '3x5_r3':  makeStation(5, 3, 3),
  '3x6_r2':  makeStation(6, 3, 2),
  '3x6_r1':  makeStation(6, 3, 1),
  '3x8_r1':  makeStation(8, 3, 1),

  // ── 4 Exercises per Station (deep work) ──
  '4x4_r2':  makeStation(4, 4, 2),
  '4x4_r1':  makeStation(4, 4, 1),
  '4x5_r2':  makeStation(5, 4, 2),
  '4x5_r1':  makeStation(5, 4, 1),
  '4x6_r1':  makeStation(6, 4, 1),

  // ── 5 Exercises per Station (intense) ──
  '5x3_r2':  makeStation(3, 5, 2),
  '5x3_r1':  makeStation(3, 5, 1),
  '5x4_r1':  makeStation(4, 5, 1),

  // ── Group / Circuit (no stations) ──
  'full_group': { exercisesPerStation: 0, stations: 0, rounds: 2, isStationBased: false },
  'circuit':    { exercisesPerStation: 0, stations: 0, rounds: 3, isStationBased: false },

  // ── Time Protocols ──
  'emom':   { exercisesPerStation: 0, stations: 0, rounds: 1, isStationBased: false },
  'tabata': { exercisesPerStation: 0, stations: 0, rounds: 8, isStationBased: false },
  'amrap':  { exercisesPerStation: 0, stations: 0, rounds: 1, isStationBased: false },

  // ── Specialty ──
  'partner': makeStation(6, 2, 3),
  'hybrid':  { exercisesPerStation: 0, stations: 0, rounds: 1, isStationBased: false },
  custom: makeStation(DEFAULT_BOOTCAMP_STATION_COUNT, DEFAULT_BOOTCAMP_EXERCISES_PER_STATION, DEFAULT_BOOTCAMP_ROUNDS),

  // ── Legacy aliases (existing saved templates) ──
  'stations_4x':  makeStation(5, 4, 2),
  'stations_3x5': makeStation(5, 3, 2),
  'stations_2x7': makeStation(7, 2, 3),
  'stations_3x4': makeStation(4, 3, 2),
  'stations_5x3': makeStation(3, 5, 2),
};

/**
 * Calculate work interval (seconds per exercise) to fill the target duration.
 * This is the KEY function — the duration field drives everything.
 */
export function calcWorkInterval(format: string, targetDurationMin: number): { workSec: number; restSec: number; totalSlots: number } {
  const cfg = FORMAT_CONFIG[format];
  if (!cfg || !cfg.isStationBased) {
    // Non-station: use defaults
    if (format === 'tabata') return { workSec: 20, restSec: 10, totalSlots: 0 };
    if (format === 'emom') return { workSec: 60, restSec: 0, totalSlots: 0 };
    return { workSec: 40, restSec: 15, totalSlots: 0 };
  }

  const totalSlots = cfg.stations * cfg.exercisesPerStation * cfg.rounds;
  const rotationOverhead = cfg.stations * ROTATION_SEC; // time spent walking between stations
  const restOverhead = cfg.stations * (cfg.exercisesPerStation - 1) * cfg.rounds * DEFAULT_REST_SEC; // rest between exercises
  const availableWorkSec = (targetDurationMin * 60) - rotationOverhead - restOverhead;
  const workSec = Math.max(20, Math.min(60, Math.round(availableWorkSec / totalSlots)));

  return { workSec, restSec: DEFAULT_REST_SEC, totalSlots };
}

export function getCustomBootcampFormatConfig(stations: number, exercisesPerStation: number, rounds = DEFAULT_BOOTCAMP_ROUNDS): FormatConfig {
  return makeStation(stations, exercisesPerStation, rounds);
}

export function calcWorkIntervalForStructure(stations: number, exercisesPerStation: number, rounds: number, targetDurationMin: number) {
  const totalSlots = stations * exercisesPerStation * rounds;
  const rotationOverhead = stations * ROTATION_SEC;
  const restOverhead = stations * Math.max(0, exercisesPerStation - 1) * rounds * DEFAULT_REST_SEC;
  const availableWorkSec = (targetDurationMin * 60) - rotationOverhead - restOverhead;
  const workSec = Math.max(20, Math.min(60, Math.round(availableWorkSec / Math.max(1, totalSlots))));
  return { workSec, restSec: DEFAULT_REST_SEC, totalSlots };
}

// ── Human-readable format list for dropdown ─────────────────

function formatLabel(key: string, cfg: FormatConfig): string {
  if (!cfg.isStationBased) {
    const labels: Record<string, string> = {
      full_group: 'Full Group Circuit', circuit: 'Timed Circuit',
      emom: 'EMOM', tabata: 'Tabata', amrap: 'AMRAP',
      partner: 'Partner (I-Go-You-Go)', hybrid: 'Hybrid',
    };
    return labels[key] || key;
  }
  return `${cfg.stations} Stations × ${cfg.exercisesPerStation} Ex × ${cfg.rounds} Rounds`;
}

function formatCategory(key: string, cfg: FormatConfig): string {
  if (!cfg.isStationBased) {
    if (['emom', 'tabata', 'amrap'].includes(key)) return 'Protocol';
    if (['partner', 'hybrid'].includes(key)) return 'Specialty';
    return 'Group';
  }
  return `${cfg.exercisesPerStation} Ex/Station`;
}

// Exclude legacy aliases from the dropdown (they're for saved template backwards compat)
const LEGACY_KEYS = new Set(['stations_4x', 'stations_3x5', 'stations_2x7', 'stations_3x4', 'stations_5x3']);

export const CLASS_FORMATS: Array<{ value: string; label: string; description: string; category: string }> = Object.entries(FORMAT_CONFIG)
  .filter(([key]) => !LEGACY_KEYS.has(key))
  .map(([key, cfg]) => ({
    value: key,
    label: formatLabel(key, cfg),
    description: cfg.isStationBased
      ? `${cfg.stations * cfg.exercisesPerStation * cfg.rounds} total exercise slots`
      : '',
    category: formatCategory(key, cfg),
  }))
  .sort((a, b) => {
    const commonA = COMMON_CLASS_FORMAT_KEYS.indexOf(a.value as typeof COMMON_CLASS_FORMAT_KEYS[number]);
    const commonB = COMMON_CLASS_FORMAT_KEYS.indexOf(b.value as typeof COMMON_CLASS_FORMAT_KEYS[number]);
    if (commonA !== -1 || commonB !== -1) {
      if (commonA === -1) return 1;
      if (commonB === -1) return -1;
      return commonA - commonB;
    }
    // Sort by category, then by label
    const catOrder: Record<string, number> = {};
    let idx = 0;
    // 2 ex/station first, then 3, 4, 5, then Group, Protocol, Specialty
    for (const c of ['2 Ex/Station', '3 Ex/Station', '4 Ex/Station', '5 Ex/Station', 'Group', 'Protocol', 'Specialty']) {
      catOrder[c] = idx++;
    }
    const ca = catOrder[a.category] ?? 99;
    const cb = catOrder[b.category] ?? 99;
    if (ca !== cb) return ca - cb;
    return a.label.localeCompare(b.label);
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

// ── Class Styles (12 total) ─────────────────────────────────
export type ClassStyle = 'standard' | 'pyramid' | 'superset' | 'mixed' | 'ladder' | 'descending' | 'chipper' | 'countdown' | 'death_by' | 'ygig' | 'contrast' | 'density';

export const CLASS_STYLES: Array<{ value: ClassStyle; label: string; description: string }> = [
  { value: 'standard', label: 'Standard', description: 'Equal-weight rounds — same effort throughout' },
  { value: 'pyramid', label: 'Pyramid', description: 'Heavy → drop weight → lighter → failure' },
  { value: 'superset', label: 'Superset', description: 'Compound → bodyweight → banded (same muscle)' },
  { value: 'mixed', label: 'Mixed', description: 'Different styles per station — maximum variety' },
  { value: 'ladder', label: 'Metcon Ladder', description: 'Two-group ladder: 9-15-20-25 reps with clean form caps' },
  { value: 'descending', label: 'Rep Breakdown', description: 'Paired body parts: 25-20-15-9 reps as fatigue climbs' },
  { value: 'chipper', label: 'Chipper', description: 'High-rep single pass: 50-40-30-20-10 with steady pacing' },
  { value: 'countdown', label: 'Countdown', description: 'Decreasing time: 60s-45s-30s-15s as pressure rises' },
  { value: 'death_by', label: 'Death By...', description: 'EMOM add 1 rep/min until failure' },
  { value: 'ygig', label: 'You Go I Go', description: 'Partner swap — one works, one rests. 1:1 ratio' },
  { value: 'contrast', label: 'Two-Group Contrast', description: 'Strength plus explosive work across two body groups' },
  { value: 'density', label: 'Density Block', description: 'Max clean rounds in fixed 5-minute windows' },
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

export function getStationCount(format: string): number {
  return FORMAT_CONFIG[format]?.stations || 0;
}

export function getExercisesPerStation(format: string): number {
  return FORMAT_CONFIG[format]?.exercisesPerStation || 4;
}

export function getRounds(format: string): number {
  return FORMAT_CONFIG[format]?.rounds || 1;
}

export function getDurationSec(format: string): number {
  // Default 35s — but this should be overridden by calcWorkInterval in most cases
  return 35;
}

export function getWorkoutMin(format: string): number {
  // This is now meaningless without targetDuration — use calcWorkInterval instead
  return 0;
}

export function getTotalMin(format: string): number {
  return 0;
}
