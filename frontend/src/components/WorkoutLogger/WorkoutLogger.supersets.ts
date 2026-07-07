/**
 * WorkoutLogger.supersets.ts
 * ============================
 * Phase 3c.2 (launch charter P1-6): pure grouping algebra that makes
 * supersets LOGGABLE (they were display-only — the card rendered SS badges
 * from plan data but nothing recorded a group on the logged entry).
 *
 * INVARIANTS (enforced by renumberSupersetGroups after every mutation):
 * - A superset group is a CONTIGUOUS run of ≥2 adjacent exercises.
 * - Group ids are compact 1..N in order of first appearance.
 * - Singletons (runs of 1) dissolve to null — no orphan badges.
 * NASM phase templates teach paired supersets (Phase 2: strength+stability,
 * Phase 4: strength+power); adjacent-pair linking mirrors that methodology.
 */
import type { ExerciseEntry } from '../../services/nasmApiService';

/** Compact ids, enforce contiguity, dissolve singleton runs. */
export function renumberSupersetGroups(exercises: ExerciseEntry[]): ExerciseEntry[] {
  const next = exercises.map((exercise) => ({ ...exercise }));
  let cursor = 0;
  let nextId = 1;
  while (cursor < next.length) {
    const id = next[cursor].supersetGroup;
    if (id == null || id <= 0) {
      next[cursor].supersetGroup = null;
      cursor += 1;
      continue;
    }
    let runEnd = cursor + 1;
    while (runEnd < next.length && next[runEnd].supersetGroup === id) runEnd += 1;
    const runLength = runEnd - cursor;
    const assigned = runLength >= 2 ? nextId : null;
    for (let i = cursor; i < runEnd; i += 1) next[i].supersetGroup = assigned;
    if (assigned !== null) nextId += 1;
    cursor = runEnd;
  }
  return next;
}

/** True when exercises[index] and its predecessor share a live group. */
export function isLinkedToPrevious(exercises: ExerciseEntry[], index: number): boolean {
  if (index <= 0 || index >= exercises.length) return false;
  const group = exercises[index].supersetGroup;
  return group != null && group > 0 && exercises[index - 1].supersetGroup === group;
}

/**
 * Link/unlink exercises[index] with its predecessor.
 * Linking joins the predecessor's existing group or mints a new one;
 * unlinking removes only this member (renumber handles the fallout).
 */
export function toggleSupersetLink(exercises: ExerciseEntry[], index: number): ExerciseEntry[] {
  if (index <= 0 || index >= exercises.length) return exercises;
  const next = exercises.map((exercise) => ({ ...exercise }));
  if (isLinkedToPrevious(exercises, index)) {
    next[index].supersetGroup = null;
  } else {
    const prevGroup = next[index - 1].supersetGroup;
    const groupId =
      prevGroup != null && prevGroup > 0
        ? prevGroup
        : Math.max(0, ...next.map((e) => e.supersetGroup ?? 0)) + 1;
    next[index - 1].supersetGroup = groupId;
    next[index].supersetGroup = groupId;
  }
  return renumberSupersetGroups(next);
}
