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
  getScopedQueueKey,
  getScopedQueueEntryKey,
  readQueue,
  removeQueuedEntries,
  writeQueue,
  type QueueStorage,
} from './offlineQueueStore';

const workingStorage = (): QueueStorage => {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
    get length() { return map.size; },
    key: (index) => Array.from(map.keys())[index] ?? null,
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

  it('keeps actor scopes isolated even when they target the same client', () => {
    const s = workingStorage();
    const scopedEntry = (actorId: number, clientId: number, id: string) => ({
      actorId,
      clientId,
      id,
      timestamp: '2026-07-25T00:00:00Z',
      formData: { clientId, exercises: [] },
    });
    expect(writeQueue(s, 42, [scopedEntry(11, 42, 'a')], 11)).toBe(true);
    expect(writeQueue(s, 42, [scopedEntry(12, 42, 'b')], 12)).toBe(true);
    expect(readQueue(s, 42, 11).map((item) => item.id)).toEqual(['a']);
    expect(readQueue(s, 42, 12).map((item) => item.id)).toEqual(['b']);
    expect(getScopedQueueKey(11, 42)).not.toBe(getScopedQueueKey(12, 42));
  });

  it('refuses mismatched scoped payloads without overwriting their bytes', () => {
    const s = workingStorage();
    const raw = JSON.stringify([{
      actorId: 11,
      clientId: 42,
      id: 'wrong-target',
      timestamp: '2026-07-25T00:00:00Z',
      formData: { clientId: 99, exercises: [] },
    }]);
    const key = getScopedQueueEntryKey(11, 42, 'wrong-target');
    s.setItem(key, raw);

    expect(readQueue(s, 42, 11)).toEqual([]);
    expect(appendToQueue(s, 42, {
      actorId: 11,
      clientId: 42,
      id: 'new',
      timestamp: '2026-07-25T00:00:00Z',
      formData: { clientId: 42, exercises: [] },
    }, 11).persisted).toBe(false);
    expect(s.getItem(key)).toBe(raw);
  });

  it('fails closed when scoped storage enumeration is blocked', () => {
    const s: QueueStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      get length() { throw new Error('SecurityError'); },
      key: () => null,
    };
    const scopedEntry = {
      actorId: 11,
      clientId: 42,
      id: 'blocked-enumeration',
      timestamp: '2026-07-25T00:00:00Z',
      formData: { clientId: 42, exercises: [] },
    };
    expect(() => readQueue(s, 42, 11)).not.toThrow();
    expect(appendToQueue(s, 42, scopedEntry, 11)).toEqual({ persisted: false, pendingCount: 0 });
  });

  it('removes confirmed IDs from current storage while preserving later entries', () => {
    const s = workingStorage();
    const scopedEntry = (id: string) => ({
      actorId: 11,
      clientId: 42,
      id,
      timestamp: '2026-07-25T00:00:00Z',
      formData: { clientId: 42, exercises: [] },
    });
    writeQueue(s, 42, [scopedEntry('a'), scopedEntry('b')], 11);
    expect(removeQueuedEntries(s, 11, 42, ['a'])).toMatchObject({ persisted: true, removedCount: 1 });
    expect(readQueue(s, 42, 11).map((item) => item.id)).toEqual(['b']);
  });

  it('preserves an append when removal runs before the append', () => {
    const map = new Map<string, string>();
    let s!: QueueStorage;
    s = {
      getItem: (key) => (map.has(key) ? map.get(key)! : null),
      setItem: (key, value) => { map.set(key, value); },
      removeItem: (key) => { map.delete(key); },
      get length() { return map.size; },
      key: (index) => Array.from(map.keys())[index] ?? null,
    };
    const scopedEntry = (id: string) => ({
      actorId: 11,
      clientId: 42,
      id,
      timestamp: '2026-07-25T00:00:00Z',
      formData: { clientId: 42, exercises: [] },
    });

    writeQueue(s, 42, [scopedEntry('a')], 11);
    expect(removeQueuedEntries(s, 11, 42, ['a'])).toMatchObject({ persisted: true, removedCount: 1 });
    expect(appendToQueue(s, 42, scopedEntry('b'), 11)).toMatchObject({ persisted: true });
    expect(readQueue(s, 42, 11).map((item) => item.id)).toEqual(['b']);
  });

  it('preserves an append when it runs before removal', () => {
    const s = workingStorage();
    const scopedEntry = (id: string) => ({
      actorId: 11,
      clientId: 42,
      id,
      timestamp: '2026-07-25T00:00:00Z',
      formData: { clientId: 42, exercises: [] },
    });
    writeQueue(s, 42, [scopedEntry('a')], 11);
    expect(appendToQueue(s, 42, scopedEntry('b'), 11)).toMatchObject({ persisted: true });
    expect(removeQueuedEntries(s, 11, 42, ['a'])).toMatchObject({ persisted: true, removedCount: 1 });
    expect(readQueue(s, 42, 11).map((item) => item.id)).toEqual(['b']);
  });

  it('preserves simultaneous appends because each entry has its own immutable key', () => {
    const map = new Map<string, string>();
    let nested = false;
    let s!: QueueStorage;
    const scopedEntry = (id: string) => ({
      actorId: 11,
      clientId: 42,
      id,
      timestamp: '2026-07-25T00:00:00Z',
      formData: { clientId: 42, exercises: [] },
    });
    s = {
      getItem: (key) => (map.has(key) ? map.get(key)! : null),
      setItem: (key, value) => {
        if (!nested && key === getScopedQueueEntryKey(11, 42, 'a')) {
          nested = true;
          expect(appendToQueue(s, 42, scopedEntry('b'), 11)).toMatchObject({ persisted: true });
        }
        map.set(key, value);
      },
      removeItem: (key) => { map.delete(key); },
      get length() { return map.size; },
      key: (index) => Array.from(map.keys())[index] ?? null,
    };
    expect(appendToQueue(s, 42, scopedEntry('a'), 11)).toMatchObject({ persisted: true });
    expect(readQueue(s, 42, 11).map((item) => item.id).sort()).toEqual(['a', 'b']);
  });
});
