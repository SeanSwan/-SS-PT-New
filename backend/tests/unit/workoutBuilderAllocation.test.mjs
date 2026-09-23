import { describe, expect, it } from 'vitest';
import { distributeExerciseCount, unionOfRecentSessions } from '../../services/workoutBuilderAllocation.mjs';

describe('full-body exercise allocation', () => {
  it('keeps every movement family represented before assigning the remainder', () => {
    const result = distributeExerciseCount(7, ['push', 'pull', 'squat', 'hinge', 'lunge', 'core']);

    expect(result.map(({ count }) => count)).toEqual([2, 1, 1, 1, 1, 1]);
    expect(result.reduce((sum, item) => sum + item.count, 0)).toBe(7);
  });

  it('does not invent zero-count families when the request is smaller than the family list', () => {
    expect(distributeExerciseCount(4, ['push', 'pull', 'squat', 'hinge', 'lunge', 'core']))
      .toEqual([
        { category: 'push', count: 1 },
        { category: 'pull', count: 1 },
        { category: 'squat', count: 1 },
        { category: 'hinge', count: 1 },
        { category: 'lunge', count: 0 },
        { category: 'core', count: 0 },
      ]);
  });
});

describe('rotation history window (F07)', () => {
  it('avoids every exercise used in ANY of the last 7 sessions, not merely the last 7 keys', () => {
    const sessions = [
      ['squat_a', 'bench_a'],                                            // 9 sessions ago: outside the window
      ['deadlift_a'],                                                    // 8 sessions ago: outside
      ['squat_b', 'press_a', 'row_a'],                                   // 7 sessions ago: INSIDE
      ['pullup_a'], ['lunge_a'], ['plank_a'], ['hip_thrust_a'], ['curl_a'], ['dip_a'],
    ];

    const windowKeys = unionOfRecentSessions(sessions, 7);

    expect(windowKeys).toContain('squat_b');
    expect(windowKeys).toContain('dip_a');
    expect(windowKeys).not.toContain('squat_a');
    expect(windowKeys).not.toContain('deadlift_a');
    expect(new Set(windowKeys).size).toBe(windowKeys.length);
  });

  it('returns the union of whatever sessions exist and tolerates empty batches', () => {
    expect(unionOfRecentSessions([['a'], [], ['b', 'c']], 7)).toEqual(['a', 'b', 'c']);
    expect(unionOfRecentSessions([], 7)).toEqual([]);
  });
});
