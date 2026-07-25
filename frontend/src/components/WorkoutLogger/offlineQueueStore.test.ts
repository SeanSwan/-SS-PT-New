/**
 * Offline queue persistence — it must never claim a save it did not make.
 *
 * The defect this guards: `writeQueue` swallowed its error and returned void,
 * so `queueSubmission` toasted "Workout saved offline. Will sync when
 * connected." unconditionally. With localStorage full or blocked (private
 * browsing), the workout was gone and the trainer was told it was safe —
 * silent data loss delivered with positive confirmation, offline, mid-session.
 */
import { describe, expect, it } from 'vitest';
import {
  appendToQueue,
  getQueueKey,
  readQueue,
  writeQueue,
  type QueueStorage,
} from './offlineQueueStore';

const workingStorage = (): QueueStorage => {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
};

/** Quota exceeded — throws on write. */
const throwingStorage = (): QueueStorage => ({
  getItem: () => null,
  setItem: () => { throw new Error('QuotaExceededError'); },
  removeItem: () => {},
});

/** The nastier failure: accepts the write, stores nothing, throws nothing. */
const silentNoopStorage = (): QueueStorage => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
});

const entry = (id: string) => ({ id, timestamp: '2026-07-25T00:00:00Z', formData: { x: 1 } });

describe('offline queue persistence', () => {
  it('reports success when the write really landed', () => {
    const s = workingStorage();
    expect(writeQueue(s, 42, [entry('a')])).toBe(true);
    expect(readQueue(s, 42)).toHaveLength(1);
  });

  it('reports FAILURE when storage throws instead of swallowing it', () => {
    expect(writeQueue(throwingStorage(), 42, [entry('a')])).toBe(false);
  });

  it('reports FAILURE when storage silently no-ops', () => {
    // Absence of a throw is not evidence of persistence — this is why the
    // implementation reads back rather than trusting a clean setItem.
    expect(writeQueue(silentNoopStorage(), 42, [entry('a')])).toBe(false);
  });

  it('derives pendingCount from disk, never from the in-memory array', () => {
    const result = appendToQueue(throwingStorage(), 42, entry('a'));
    expect(result.persisted).toBe(false);
    expect(result.pendingCount).toBe(0); // the old code would have said 1
  });

  it('survives unparseable stored data', () => {
    const s = workingStorage();
    s.setItem(getQueueKey(42), '{not json');
    expect(readQueue(s, 42)).toEqual([]);
  });

  it('rejects non-array JSON that would break a later push()', () => {
    const s = workingStorage();
    s.setItem(getQueueKey(42), '{"a":1}');
    expect(readQueue(s, 42)).toEqual([]);
  });

  it('confirms the key is gone when clearing', () => {
    const s = workingStorage();
    writeQueue(s, 42, [entry('a')]);
    expect(writeQueue(s, 42, [])).toBe(true);
    expect(readQueue(s, 42)).toEqual([]);
  });

  it('keeps clients isolated', () => {
    const s = workingStorage();
    writeQueue(s, 42, [entry('a')]);
    writeQueue(s, 99, [entry('b'), entry('c')]);
    expect(readQueue(s, 42)).toHaveLength(1);
    expect(readQueue(s, 99)).toHaveLength(2);
    expect(getQueueKey(42)).not.toBe(getQueueKey(99));
  });
});