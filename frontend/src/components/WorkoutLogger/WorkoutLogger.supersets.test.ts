/**
 * WorkoutLogger.supersets.test.ts
 * =================================
 * Phase 3c.2 (launch charter P1-6): supersets become LOGGABLE, not
 * display-only. Locks the pure grouping algebra: link-with-previous,
 * join-existing-group, unlink, contiguity enforcement, and singleton
 * dissolution — groups are always compact 1..N runs of ≥2 adjacent exercises.
 */
import type { ExerciseEntry } from '../../services/nasmApiService';
import {
  toggleSupersetLink,
  isLinkedToPrevious,
  renumberSupersetGroups,
} from './WorkoutLogger.supersets';
import { stripNullRatings } from './workoutLoggerSubmitPayload';

const ex = (name: string, supersetGroup: number | null = null): ExerciseEntry => ({
  loggerExerciseId: `ex-${name}`,
  exerciseId: `id-${name}`,
  exerciseName: name,
  sets: [],
  formRating: null,
  painLevel: 0,
  supersetGroup,
});

const groups = (list: ExerciseEntry[]) => list.map((e) => e.supersetGroup ?? null);

describe('toggleSupersetLink', () => {
  it('links an exercise with its predecessor into a new group', () => {
    const result = toggleSupersetLink([ex('A'), ex('B'), ex('C')], 1);
    expect(groups(result)).toEqual([1, 1, null]);
  });

  it('joins the predecessor’s existing group instead of forking a new one', () => {
    const result = toggleSupersetLink([ex('A', 1), ex('B', 1), ex('C')], 2);
    expect(groups(result)).toEqual([1, 1, 1]);
  });

  it('unlinks a linked pair and dissolves the leftover singleton', () => {
    const result = toggleSupersetLink([ex('A', 1), ex('B', 1), ex('C')], 1);
    expect(groups(result)).toEqual([null, null, null]);
  });

  it('unlinking the middle of a 3-chain never leaves non-adjacent group members', () => {
    const result = toggleSupersetLink([ex('A', 1), ex('B', 1), ex('C', 1)], 1);
    // B leaves; A and C are no longer adjacent — both singletons dissolve.
    expect(groups(result)).toEqual([null, null, null]);
  });

  it('unlinking the tail keeps the surviving pair grouped', () => {
    const result = toggleSupersetLink([ex('A', 1), ex('B', 1), ex('C', 1)], 2);
    expect(groups(result)).toEqual([1, 1, null]);
  });

  it('is a no-op for the first exercise and out-of-range indexes', () => {
    const list = [ex('A'), ex('B')];
    expect(groups(toggleSupersetLink(list, 0))).toEqual([null, null]);
    expect(groups(toggleSupersetLink(list, 5))).toEqual([null, null]);
  });

  it('creates compact sequential ids across multiple groups', () => {
    let list = toggleSupersetLink([ex('A'), ex('B'), ex('C'), ex('D')], 1);
    list = toggleSupersetLink(list, 3);
    expect(groups(list)).toEqual([1, 1, 2, 2]);
  });
});

describe('renumberSupersetGroups', () => {
  it('splits non-adjacent same-id runs and dissolves singletons (post-removal state)', () => {
    // Simulates removing the middle member of a group-1 triple.
    const result = renumberSupersetGroups([ex('A', 1), ex('X'), ex('C', 1), ex('D', 1)]);
    expect(groups(result)).toEqual([null, null, 1, 1]);
  });

  it('compacts sparse ids to 1..N', () => {
    const result = renumberSupersetGroups([ex('A', 7), ex('B', 7), ex('C', 3), ex('D', 3)]);
    expect(groups(result)).toEqual([1, 1, 2, 2]);
  });
});

describe('submit wire contract', () => {
  it('supersetGroup rides the wire when live and is omitted when ungrouped', () => {
    const sanitized = stripNullRatings([ex('A', 2), ex('B', null)]);
    expect(sanitized[0].supersetGroup).toBe(2);
    expect('supersetGroup' in sanitized[1]).toBe(false);
  });
});

describe('isLinkedToPrevious', () => {
  it('reports true only when both share a live group', () => {
    const list = [ex('A', 1), ex('B', 1), ex('C')];
    expect(isLinkedToPrevious(list, 1)).toBe(true);
    expect(isLinkedToPrevious(list, 2)).toBe(false);
    expect(isLinkedToPrevious(list, 0)).toBe(false);
  });
});
