/**
 * ============================================================================
 * FILE: WorkoutLogger/offlineQueueStore.ts
 * PURPOSE: Honest persistence for the offline workout queue.
 * CREATED: 2026-07-25 (Coach Hive-Mind C2 remainder)
 * ============================================================================
 *
 * WHY THIS EXISTS
 *   The queue's read/write helpers lived inside `useOfflineQueue`, a React hook,
 *   so the one behaviour that matters most — what happens when the write FAILS —
 *   could not be tested without a DOM and a storage backend that misbehaves on
 *   demand.
 *
 *   It mattered because the original `writeQueue` swallowed its error and
 *   returned `void`, and `queueSubmission` then told the trainer
 *   "Workout saved offline. Will sync when connected." unconditionally. When
 *   localStorage was full or blocked (private browsing — a case the original
 *   code's own comment anticipated), the workout was GONE and the trainer was
 *   told it was safe. Offline, mid-session, that is the worst failure shape
 *   available: silent data loss delivered with positive confirmation.
 *
 * THE RULE
 *   A persistence helper must report whether it persisted. Never `void`, never
 *   a swallowed catch that reads as success. And verify by reading back rather
 *   than trusting the absence of a throw — a storage backend that silently
 *   no-ops (quota-capped, sandboxed, extension-shimmed) throws nothing at all.
 *
 * PURE + INJECTABLE. Takes a Storage-shaped object so failure modes are
 * reproducible in a test instead of theoretical.
 */

/** The slice of the Storage API this module needs. */
export interface QueueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface QueuedEntry<TPayload = unknown> {
  id: string;
  timestamp: string;
  formData: TPayload;
}

export const QUEUE_KEY_PREFIX = 'ss-workout-queue';

export function getQueueKey(clientId: number): string {
  return `${QUEUE_KEY_PREFIX}-${clientId}`;
}

/**
 * Read the queue. Any failure — missing, unparseable, wrong shape — yields an
 * empty queue rather than throwing into a trainer's save path.
 *
 * Non-array JSON is rejected: a corrupted entry that parsed to an object would
 * otherwise flow into `.push()` and produce a queue that can never be read back.
 */
export function readQueue<T>(storage: QueueStorage, clientId: number): QueuedEntry<T>[] {
  try {
    const raw = storage.getItem(getQueueKey(clientId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedEntry<T>[]) : [];
  } catch {
    return [];
  }
}

/**
 * Persist the queue and report whether it ACTUALLY landed.
 *
 * @returns true only when a read-back confirms the expected entry count.
 */
export function writeQueue<T>(
  storage: QueueStorage,
  clientId: number,
  queue: QueuedEntry<T>[],
): boolean {
  try {
    if (queue.length === 0) {
      storage.removeItem(getQueueKey(clientId));
      // An empty queue is durable only if the key is really gone.
      return readQueue(storage, clientId).length === 0;
    }
    storage.setItem(getQueueKey(clientId), JSON.stringify(queue));
    // Read-back, not absence-of-throw: a silently no-op storage throws nothing.
    return readQueue<T>(storage, clientId).length === queue.length;
  } catch {
    return false;
  }
}

/**
 * Append one entry, reporting durability.
 *
 * `pendingCount` is derived from what is really on disk, never from the
 * in-memory array we hoped to write — that mismatch is what let the old code
 * report a phantom queued workout.
 */
export function appendToQueue<T>(
  storage: QueueStorage,
  clientId: number,
  entry: QueuedEntry<T>,
): { persisted: boolean; pendingCount: number } {
  const queue = readQueue<T>(storage, clientId);
  queue.push(entry);
  const persisted = writeQueue(storage, clientId, queue);
  return { persisted, pendingCount: readQueue(storage, clientId).length };
}