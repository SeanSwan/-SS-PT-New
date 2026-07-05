/**
 * recentExercises — Slice 10 tests
 * ================================
 * Locks: record/dedupe/cap-8 semantics, corrupt-storage fail-soft, and the
 * never-block-logging guarantee (throwing localStorage is swallowed).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readRecentExercises,
  recordRecentExercise,
  RECENT_EXERCISES_CAP,
} from './recentExercises';

const KEY = 'ss-workout-logger-recent-exercises';

beforeEach(() => {
  window.localStorage.clear();
});

describe('recentExercises', () => {
  it('records newest-first and dedupes by id', () => {
    recordRecentExercise({ id: 'a', name: 'Push-Up' });
    recordRecentExercise({ id: 'b', name: 'Row' });
    recordRecentExercise({ id: 'a', name: 'Push-Up' });
    expect(readRecentExercises()).toEqual([
      { id: 'a', name: 'Push-Up' },
      { id: 'b', name: 'Row' },
    ]);
  });

  it('caps at the configured limit', () => {
    for (let i = 0; i < RECENT_EXERCISES_CAP + 3; i++) {
      recordRecentExercise({ id: `ex-${i}`, name: `Exercise ${i}` });
    }
    const list = readRecentExercises();
    expect(list).toHaveLength(RECENT_EXERCISES_CAP);
    expect(list[0].id).toBe(`ex-${RECENT_EXERCISES_CAP + 2}`);
  });

  it('coerces numeric ids to strings', () => {
    recordRecentExercise({ id: 42, name: 'Goblet Squat' });
    expect(readRecentExercises()[0]).toEqual({ id: '42', name: 'Goblet Squat' });
  });

  it('fails soft on corrupt storage', () => {
    window.localStorage.setItem(KEY, '{not json');
    expect(readRecentExercises()).toEqual([]);
    window.localStorage.setItem(KEY, JSON.stringify({ nope: true }));
    expect(readRecentExercises()).toEqual([]);
    window.localStorage.setItem(KEY, JSON.stringify([{ id: 1 }, { id: 'ok', name: 'Row' }]));
    expect(readRecentExercises()).toEqual([{ id: 'ok', name: 'Row' }]);
  });

  it('never throws when localStorage throws (private mode)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => recordRecentExercise({ id: 'a', name: 'Push-Up' })).not.toThrow();
    spy.mockRestore();
  });
});
