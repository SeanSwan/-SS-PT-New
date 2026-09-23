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
  /** Scoped queues require native Storage enumeration; legacy tests may omit it. */
  readonly length?: number;
  key?(index: number): string | null;
}

export interface QueuedEntry<TPayload = unknown> {
  id: string;
  timestamp: string;
  formData: TPayload;
  /** New queues are owned by the authenticated actor as well as the client. */
  actorId?: number;
  clientId?: number;
}

export const QUEUE_KEY_PREFIX = 'ss-workout-queue';

const isPositiveInteger = (value: unknown): value is number => (
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
);

export function getQueueKey(clientId: number): string {
  return `${QUEUE_KEY_PREFIX}-${clientId}`;
}

/** Key for the actor-owned queue. The old client-only key is legacy data. */
export function getScopedQueueKey(actorId: number, clientId: number): string {
  return `${QUEUE_KEY_PREFIX}-${actorId}-${clientId}`;
}

const getScopedEntryPrefix = (actorId: number, clientId: number): string => (
  `${getScopedQueueKey(actorId, clientId)}-entry-`
);

/** Immutable per-entry key; appends and removals never rewrite a shared array. */
export function getScopedQueueEntryKey(actorId: number, clientId: number, id: string): string {
  return `${getScopedEntryPrefix(actorId, clientId)}${encodeURIComponent(id)}`;
}

export interface QueueRemovalResult {
  persisted: boolean;
  removedCount: number;
}

interface StoredQueue<TPayload> {
  raw: string | null;
  entries: QueuedEntry<TPayload>[];
  valid: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

/**
 * Validate an entry before it can be submitted for an actor/client scope.
 * Legacy entries intentionally fail this check because they have no actor.
 */
export function isValidScopedQueueEntry<TPayload>(
  value: unknown,
  actorId: number,
  clientId: number,
): value is QueuedEntry<TPayload> & { actorId: number; clientId: number } {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || value.id.trim() === '') return false;
  if (typeof value.timestamp !== 'string' || Number.isNaN(Date.parse(value.timestamp))) return false;
  if (!isPositiveInteger(value.actorId) || value.actorId !== actorId) return false;
  if (!isPositiveInteger(value.clientId) || value.clientId !== clientId) return false;
  if (!isObject(value.formData)) return false;
  const payloadClientId = value.formData.clientId;
  return isPositiveInteger(payloadClientId) && payloadClientId === clientId;
}

const readStoredQueue = <TPayload>(
  storage: QueueStorage,
  key: string,
  validate: (entry: unknown) => boolean,
): StoredQueue<TPayload> => {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return { raw: null, entries: [], valid: true };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { raw, entries: [], valid: false };
    if (!parsed.every(validate)) return { raw, entries: [], valid: false };
    return { raw, entries: parsed as QueuedEntry<TPayload>[], valid: true };
  } catch {
    return { raw: null, entries: [], valid: false };
  }
};

interface ScopedStoredQueue<TPayload> {
  entries: (QueuedEntry<TPayload> & { actorId: number; clientId: number })[];
  valid: boolean;
  available: boolean;
}

const listScopedEntryKeys = (
  storage: QueueStorage,
  actorId: number,
  clientId: number,
): string[] | null => {
  try {
    const keyReader = storage.key;
    const length = storage.length;
    if (typeof keyReader !== 'function' || typeof length !== 'number') return null;
    if (!Number.isSafeInteger(length) || length < 0) return null;
    const prefix = getScopedEntryPrefix(actorId, clientId);
    const keys: string[] = [];
    for (let index = 0; index < length; index += 1) {
      const key = keyReader.call(storage, index);
      if (key !== null && key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  } catch {
    return null;
  }
};

const readScopedQueue = <TPayload>(
  storage: QueueStorage,
  actorId: number,
  clientId: number,
): ScopedStoredQueue<TPayload> => {
  const keys = listScopedEntryKeys(storage, actorId, clientId);
  if (keys === null) return { entries: [], valid: false, available: false };
  const prefix = getScopedEntryPrefix(actorId, clientId);
  const entries: (QueuedEntry<TPayload> & { actorId: number; clientId: number })[] = [];
  try {
    for (const key of keys) {
      const encodedId = key.slice(prefix.length);
      if (!encodedId) return { entries: [], valid: false, available: true };
      const id = decodeURIComponent(encodedId);
      if (getScopedQueueEntryKey(actorId, clientId, id) !== key) {
        return { entries: [], valid: false, available: true };
      }
      const raw = storage.getItem(key);
      // Another tab may remove the key between enumeration and read. That is
      // a normal concurrent disappearance, not malformed payload evidence.
      if (raw === null) continue;
      const parsed: unknown = JSON.parse(raw);
      if (!isValidScopedQueueEntry<TPayload>(parsed, actorId, clientId) || parsed.id !== id) {
        return { entries: [], valid: false, available: true };
      }
      entries.push(parsed);
    }
    return { entries, valid: true, available: true };
  } catch {
    return { entries: [], valid: false, available: true };
  }
};

const writeScopedEntry = <TPayload>(
  storage: QueueStorage,
  actorId: number,
  clientId: number,
  entry: QueuedEntry<TPayload>,
): boolean => {
  try {
    const key = getScopedQueueEntryKey(actorId, clientId, entry.id);
    const serialized = JSON.stringify(entry);
    const existing = storage.getItem(key);
    // Never overwrite a different payload that happens to share an ID.
    if (existing !== null) return existing === serialized;
    storage.setItem(key, serialized);
    return storage.getItem(key) === serialized;
  } catch {
    return false;
  }
};

/**
 * Read the queue. Any failure — missing, unparseable, wrong shape — yields an
 * empty queue rather than throwing into a trainer's save path.
 *
 * Non-array JSON is rejected: a corrupted entry that parsed to an object would
 * otherwise flow into `.push()` and produce a queue that can never be read back.
 */
export function readQueue<T>(
  storage: QueueStorage,
  clientId: number,
  actorId?: number,
): QueuedEntry<T>[] {
  const scoped = isPositiveInteger(actorId);
  if (scoped) {
    const stored = readScopedQueue<T>(storage, actorId, clientId);
    return stored.valid ? stored.entries : [];
  }
  const key = getQueueKey(clientId);
  const stored = readStoredQueue<T>(
    storage,
    key,
    (entry) => isObject(entry) && typeof entry.id === 'string' && isObject(entry.formData),
  );
  if (!stored.valid) return [];
  return stored.entries;
}

/**
 * Persist the queue and report whether it ACTUALLY landed.
 *
 * @returns true only when each scoped entry or legacy serialized queue reads
 * back exactly after the write.
 */
export function writeQueue<T>(
  storage: QueueStorage,
  clientId: number,
  queue: QueuedEntry<T>[],
  actorId?: number,
): boolean {
  const scoped = isPositiveInteger(actorId);
  if (scoped && !isPositiveInteger(clientId)) return false;
  if (scoped && !queue.every((entry) => isValidScopedQueueEntry(entry, actorId, clientId))) {
    return false;
  }
  if (scoped) {
    const current = readScopedQueue<T>(storage, actorId, clientId);
    if (!current.available || !current.valid) return false;
    return queue.every((entry) => writeScopedEntry(storage, actorId, clientId, entry))
      && readScopedQueue<T>(storage, actorId, clientId).valid;
  }
  const key = scoped ? getScopedQueueKey(actorId, clientId) : getQueueKey(clientId);
  try {
    if (queue.length === 0) {
      storage.removeItem(key);
      // An empty queue is durable only if the key is really gone.
      return storage.getItem(key) === null;
    }
    const serialized = JSON.stringify(queue);
    storage.setItem(key, serialized);
    // Exact serialized read-back, not absence-of-throw or a matching count.
    return storage.getItem(key) === serialized;
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
  actorId?: number,
): { persisted: boolean; pendingCount: number } {
  const scoped = isPositiveInteger(actorId);
  if (scoped) {
    if (!isPositiveInteger(clientId) || !isValidScopedQueueEntry(entry, actorId, clientId)) {
      return { persisted: false, pendingCount: 0 };
    }
    const stored = readScopedQueue<T>(storage, actorId, clientId);
    if (!stored.available || !stored.valid) {
      return { persisted: false, pendingCount: stored.entries.length };
    }
    const serialized = JSON.stringify(entry);
    const existing = stored.entries.find((candidate) => candidate.id === entry.id);
    if (existing) {
      const key = getScopedQueueEntryKey(actorId, clientId, entry.id);
      return {
        persisted: storage.getItem(key) === serialized,
        pendingCount: stored.entries.length,
      };
    }
    const persisted = writeScopedEntry(storage, actorId, clientId, entry);
    const current = readScopedQueue<T>(storage, actorId, clientId);
    return {
      persisted: persisted && current.valid && current.entries.some((candidate) => candidate.id === entry.id),
      pendingCount: current.entries.length,
    };
  }
  const key = getQueueKey(clientId);
  const stored = readStoredQueue<T>(
    storage,
    key,
    (candidate) => isObject(candidate) && typeof candidate.id === 'string' && isObject(candidate.formData),
  );
  // Refuse to overwrite malformed or mismatched bytes. They remain available
  // for an explicit recovery flow instead of being silently destroyed.
  if (!stored.valid) return { persisted: false, pendingCount: stored.entries.length };
  const previousCount = stored.entries.length;
  const queue = stored.entries;
  queue.push(entry);
  const persisted = writeQueue(storage, clientId, queue);
  return { persisted, pendingCount: persisted ? queue.length : previousCount };
}

function removeQueuedEntriesInternal<T>(
  storage: QueueStorage,
  actorId: number,
  clientId: number,
  ids: readonly string[],
): QueueRemovalResult {
  if (!isPositiveInteger(actorId) || !isPositiveInteger(clientId) || ids.length === 0) {
    return { persisted: false, removedCount: 0 };
  }
  const stored = readScopedQueue<T>(storage, actorId, clientId);
  if (!stored.available || !stored.valid) return { persisted: false, removedCount: 0 };
  const idSet = new Set(ids.filter((id) => typeof id === 'string' && id.length > 0));
  let removedCount = 0;
  for (const id of idSet) {
    const entry = stored.entries.find((candidate) => candidate.id === id);
    if (!entry) continue;
    const key = getScopedQueueEntryKey(actorId, clientId, id);
    try {
      storage.removeItem(key);
      if (storage.getItem(key) !== null) return { persisted: false, removedCount };
      removedCount += 1;
    } catch {
      return { persisted: false, removedCount };
    }
  }
  return { persisted: true, removedCount };
}

/**
 * Remove only server-confirmed entries from the current scoped key set.
 * Re-enumerating immediately before the deletes preserves entries appended
 * while a previous network request was awaiting its response.
 */
export function removeQueuedEntries<T>(
  storage: QueueStorage,
  actorId: number,
  clientId: number,
  ids: readonly string[],
): QueueRemovalResult {
  return removeQueuedEntriesInternal(storage, actorId, clientId, ids);
}

/** True when client-only legacy bytes exist and need owner verification. */
export function hasLegacyQueue(storage: QueueStorage, clientId: number): boolean {
  try {
    return storage.getItem(getQueueKey(clientId)) !== null;
  } catch {
    return false;
  }
}
