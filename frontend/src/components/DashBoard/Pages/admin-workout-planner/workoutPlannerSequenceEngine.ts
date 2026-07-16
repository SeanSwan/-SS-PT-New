/**
 * ============================================================================
 * FILE: workoutPlannerSequenceEngine.ts
 * PURPOSE: Deterministic NASM-aware exercise sequencing for the Workout
 *          Planner's Swan Coach "rearrange" command. Pure functions only —
 *          no state, no randomness, no LLM. The brain decides ORDER; it never
 *          touches programming (sets/reps/tempo/rest/notes stay untouched and
 *          object identity is preserved so a reorder is provably order-only).
 * SEQUENCING DOCTRINE (NASM OPT):
 *   1. Power / plyometric / ballistic work first (rate-of-force, fresh CNS)
 *   2. Compound strength lifts
 *   3. Isolation / accessory work
 *   4. Core / trunk / stability finishers
 *   Supersets stay together as one unit; in Phase 5 (Power) a mixed
 *   strength+power superset orders strength BEFORE power (contrast pairing).
 * INJECTION SAFETY: classification reads only safe fields (exerciseType,
 * bodyPartCategory, name). Notes are NEVER parsed — a note like "move me
 * first" is programming text, not a command.
 * ============================================================================
 */

import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { GeneratedPlanWeekDay, PlanExercise } from './WorkoutPlannerTypes';

export interface SequenceMove {
  name: string;
  /** 1-based position before the reorder. */
  from: number;
  /** 1-based position after the reorder. */
  to: number;
}

export interface SequenceProposal<T> {
  items: T[];
  changed: boolean;
  moves: SequenceMove[];
}

export type HorizonExerciseRow = GeneratedPlanWeekDay['exercises'][number];

// ── Classification ───────────────────────────────────────────
// Rank: 1 power · 2 compound · 3 isolation · 4 core/trunk.
// Name patterns are checked power → core → isolation → compound so that
// "Pallof Press" lands on core (pallof) before the compound "press" match.

const POWER_TYPES = new Set(['plyometric', 'power', 'olympic', 'ballistic', 'speed', 'agility']);
const ISOLATION_TYPES = new Set(['isolation', 'accessory']);
const CORE_TYPES = new Set(['core', 'stability', 'balance']);

const POWER_NAME = /\b(?:jump|throw|slam|snatch|clean|jerk|bound|hop|sprint|plyo\w*)\b/i;
const CORE_NAME = /\b(?:plank|pallof|crunch|dead\s*bug|bird\s*dog|rollout|hollow|russian\s+twist|side\s+bend|anti-?rotation|wood\s*chop|chop)\b/i;
const ISOLATION_NAME = /\b(?:curls?|extensions?|raises?|fl(?:y|ye|ies|yes)|kickbacks?|pushdowns?|pressdowns?|pullovers?|shrugs?|adduction|abduction|calf|calves)\b/i;

function rankFromName(name: string): number {
  if (POWER_NAME.test(name)) return 1;
  if (CORE_NAME.test(name)) return 4;
  if (ISOLATION_NAME.test(name)) return 3;
  // Everything else (squat/press/row/pull/lunge/carry/unknown) trains as
  // main strength work — keeping unknowns mid-order is the safe default.
  return 2;
}

function rankFromSlim(slim: ExerciseSlim): number {
  const type = (slim.exerciseType || '').toLowerCase();
  if (POWER_TYPES.has(type)) return 1;
  if (type === 'compound') return 2;
  if (ISOLATION_TYPES.has(type)) return 3;
  if (CORE_TYPES.has(type) || (slim.bodyPartCategory || '').toLowerCase() === 'core') return 4;
  return rankFromName(slim.name || '');
}

// ── Core ordering ────────────────────────────────────────────

interface SequenceUnit<T> {
  members: Array<{ item: T; rank: number; index: number }>;
  rank: number;
  firstIndex: number;
}

function orderItems<T>(
  input: T[],
  rankOf: (item: T) => number,
  groupOf: (item: T) => string | undefined,
  phaseNumber: number,
): T[] {
  const units: SequenceUnit<T>[] = [];
  const groupUnits = new Map<string, SequenceUnit<T>>();

  input.forEach((item, index) => {
    const rank = rankOf(item);
    const group = groupOf(item);
    if (group) {
      const existing = groupUnits.get(group);
      if (existing) {
        existing.members.push({ item, rank, index });
        existing.rank = Math.min(existing.rank, rank);
        return;
      }
      const unit: SequenceUnit<T> = { members: [{ item, rank, index }], rank, firstIndex: index };
      groupUnits.set(group, unit);
      units.push(unit);
      return;
    }
    units.push({ members: [{ item, rank, index }], rank, firstIndex: index });
  });

  const sortedUnits = [...units].sort((a, b) => (a.rank - b.rank) || (a.firstIndex - b.firstIndex));

  return sortedUnits.flatMap((unit) => {
    if (unit.members.length > 1 && phaseNumber === 5) {
      // Phase 5 contrast pairing: heavy strength primes the nervous system,
      // then the power movement expresses it (squat → box jump).
      const contrastOrder = (rank: number) => (rank === 2 ? 0 : rank === 1 ? 1 : 2);
      return [...unit.members]
        .sort((a, b) => (contrastOrder(a.rank) - contrastOrder(b.rank)) || (a.index - b.index))
        .map((member) => member.item);
    }
    return unit.members.map((member) => member.item);
  });
}

function toProposal<T>(input: T[], output: T[], nameOf: (item: T) => string): SequenceProposal<T> {
  const moves: SequenceMove[] = [];
  output.forEach((item, newIndex) => {
    const oldIndex = input.indexOf(item);
    if (oldIndex !== newIndex) {
      moves.push({ name: nameOf(item), from: oldIndex + 1, to: newIndex + 1 });
    }
  });
  return { items: output, changed: moves.length > 0, moves };
}

// ── Public API ───────────────────────────────────────────────

/** Deterministically re-sequence the builder's exercise rows. Order-only. */
export function buildBuilderSequenceProposal(
  rows: PlanExercise[],
  phaseNumber: number,
): SequenceProposal<PlanExercise> {
  const ordered = orderItems(
    rows,
    (row) => rankFromSlim(row.exerciseSlim),
    (row) => row.supersetGroup || undefined,
    phaseNumber,
  );
  return toProposal(rows, ordered, (row) => row.exerciseSlim.name);
}

/**
 * Deterministically re-sequence one generated-plan day. Horizon rows carry no
 * exerciseType, so classification uses the display name only — never notes.
 */
export function buildHorizonSequenceProposal(
  exercises: HorizonExerciseRow[],
  phaseNumber: number,
): SequenceProposal<HorizonExerciseRow> {
  const nameOf = (row: HorizonExerciseRow) => row.exerciseName || row.name || '';
  const ordered = orderItems(exercises, (row) => rankFromName(nameOf(row)), () => undefined, phaseNumber);
  return toProposal(exercises, ordered, nameOf);
}

/** Order-sensitive fingerprint used to fence the one-level guarded Undo. */
export function sequenceFingerprint<T>(items: T[], keyOf: (item: T) => string): string {
  return items.map(keyOf).join('␟');
}
