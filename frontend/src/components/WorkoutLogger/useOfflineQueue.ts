/**
 * useOfflineQueue
 * ===============
 * Offline-first workout submission queue. Entries are owned by the
 * authenticated actor and selected client, and only server-confirmed IDs are
 * removed from durable storage.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { dailyWorkoutFormService } from '../../services/nasmApiService';
import type { DailyWorkoutFormSubmitPayload } from '../../services/nasmApiService';
import { recordCoachIntent } from '../../utils/coachIntentRecorder';
import {
  getScopedQueueKey,
  hasLegacyQueue,
  readQueue as storeReadQueue,
  removeQueuedEntries,
  appendToQueue,
  type QueueStorage,
  type QueuedEntry,
} from './offlineQueueStore';

const OFFLINE_QUEUE_INTENT = 'OFFLINE_QUEUE_WORKOUT';
const OFFLINE_SYNC_INTENT = 'OFFLINE_SYNC_WORKOUT';

interface QueuedWorkout extends QueuedEntry<DailyWorkoutFormSubmitPayload> {
  actorId: number;
  clientId: number;
}

let offlineQueueIdFallbackCounter = 0;

const getCrypto = (): Crypto | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  return (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;
};

// A page nonce keeps the non-Web-Crypto fallback distinct across tabs. The
// per-entry counter then makes repeated fallback calls unique within a page.
const offlineQueuePageNonce = (() => {
  try {
    const cryptoApi = getCrypto();
    if (cryptoApi?.getRandomValues) {
      const values = new Uint32Array(4);
      cryptoApi.getRandomValues(values);
      return Array.from(values).map((value) => value.toString(16).padStart(8, '0')).join('');
    }
  } catch {
    // Fall through to a best-effort page nonce when the browser blocks crypto.
  }
  const random = () => Math['random']().toString(36).slice(2);
  return `${Date.now().toString(36)}-${random()}-${random()}`;
})();

function createOfflineQueueId(): string {
  const cryptoApi = getCrypto();
  try {
    if (cryptoApi?.randomUUID) return `offline-${cryptoApi.randomUUID()}`;
  } catch {
    // Fall through to getRandomValues or the page nonce fallback.
  }
  try {
    if (cryptoApi?.getRandomValues) {
      const values = new Uint32Array(2);
      cryptoApi.getRandomValues(values);
      return `offline-${offlineQueuePageNonce}-${Array.from(values)
        .map((value) => value.toString(16).padStart(8, '0')).join('')}`;
    }
  } catch {
    // Fall through to the per-page nonce and counter.
  }
  offlineQueueIdFallbackCounter += 1;
  return `offline-${offlineQueuePageNonce}-${Date.now().toString(36)}-${offlineQueueIdFallbackCounter}`;
}

const isPositiveInteger = (value: unknown): value is number => (
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
);

function storage(): QueueStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readScopedQueue(actorId: number | undefined, clientId: number | undefined): QueuedWorkout[] {
  const s = storage();
  if (!s || !isPositiveInteger(actorId) || !isPositiveInteger(clientId)) return [];
  return storeReadQueue<DailyWorkoutFormSubmitPayload>(s, clientId, actorId) as QueuedWorkout[];
}

type LockManagerLike = {
  request: <T>(name: string, callback: () => Promise<T>) => Promise<T>;
};

const documentLockTails = new Map<string, Promise<void>>();

function getWebLocks(): LockManagerLike | null {
  if (typeof navigator === 'undefined') return null;
  const locks = (navigator as Navigator & { locks?: LockManagerLike }).locks;
  return locks && typeof locks.request === 'function' ? locks : null;
}

/** Serialize same-document fallback calls; Web Locks covers other tabs. */
async function withScopeLock<T>(scope: string, task: () => Promise<T>): Promise<T> {
  const webLocks = getWebLocks();
  if (webLocks) return webLocks.request(`swanstudios:workout-queue:${scope}`, task);

  const previous = documentLockTails.get(scope) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  documentLockTails.set(scope, current);
  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
    if (documentLockTails.get(scope) === current) documentLockTails.delete(scope);
  }
}

export interface OfflineQueueState {
  isOnline: boolean;
  pendingCount: number;
  legacyQueuePresent: boolean;
  queueSubmission: (formData: DailyWorkoutFormSubmitPayload) => boolean;
  flush: () => Promise<number>;
}

export function useOfflineQueue(
  actorId: number | undefined,
  clientId: number | undefined,
): OfflineQueueState {
  const validActorId = isPositiveInteger(actorId) ? actorId : undefined;
  const validClientId = isPositiveInteger(clientId) ? clientId : undefined;
  const scope = validActorId && validClientId
    ? getScopedQueueKey(validActorId, validClientId)
    : null;
  const [isOnline, setIsOnline] = useState(() => (
    typeof navigator !== 'undefined' ? navigator.onLine : true
  ));
  const [pendingCount, setPendingCount] = useState(() => readScopedQueue(validActorId, validClientId).length);
  const [legacyQueuePresent, setLegacyQueuePresent] = useState(() => {
    const s = storage();
    return !!s && !!validClientId && hasLegacyQueue(s, validClientId);
  });
  const flushingScope = useRef<string | null>(null);
  const lifecycleGeneration = useRef(0);
  const activeScope = useRef<string | null>(null);

  // A generation changes on target changes and unmount. Awaited responses from
  // an old scope may finish, but they cannot send again or mutate UI/storage.
  useEffect(() => {
    const generation = lifecycleGeneration.current + 1;
    lifecycleGeneration.current = generation;
    activeScope.current = scope;
    setPendingCount(readScopedQueue(validActorId, validClientId).length);
    const s = storage();
    setLegacyQueuePresent(!!s && !!validClientId && hasLegacyQueue(s, validClientId));
    return () => {
      if (lifecycleGeneration.current === generation) lifecycleGeneration.current += 1;
      if (activeScope.current === scope) activeScope.current = null;
    };
  }, [scope, validActorId, validClientId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online - syncing queued workouts...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Workouts will be saved locally.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const flush = useCallback(async (): Promise<number> => {
    if (!scope || !validActorId || !validClientId || flushingScope.current === scope) return 0;
    flushingScope.current = scope;
    const generation = lifecycleGeneration.current;
    const isCurrent = () => lifecycleGeneration.current === generation;

    try {
      return await withScopeLock(scope, async () => {
        if (!isCurrent()) return 0;
        const queue = readScopedQueue(validActorId, validClientId);
        if (queue.length === 0) return 0;
        let synced = 0;
        let failed = 0;
        let removalFailed = false;

        for (const entry of queue) {
          if (!isCurrent()) break;
          try {
            const response = await dailyWorkoutFormService.submitWorkoutForm(entry.formData);
            if (!isCurrent()) break;
            if (response.success) {
              synced += 1;
              const currentStorage = storage();
              const result = currentStorage
                ? removeQueuedEntries(currentStorage, validActorId, validClientId, [entry.id])
                : { persisted: false, removedCount: 0 };
              if (!result.persisted) removalFailed = true;
            } else {
              failed += 1;
            }
          } catch {
            failed += 1;
          }
        }

        if (!isCurrent()) return synced;
        setPendingCount(readScopedQueue(validActorId, validClientId).length);
        for (let i = 0; i < synced; i += 1) {
          recordCoachIntent(OFFLINE_SYNC_INTENT, { clientId: validClientId }, true, true);
        }
        if (synced > 0) {
          toast.success(`Synced ${synced} offline workout${synced > 1 ? 's' : ''}`);
        }
        if (failed > 0) {
          toast.warning(`${failed} workout${failed > 1 ? 's' : ''} still pending`);
        }
        if (removalFailed) {
          toast.error(
            'Offline queue could not be updated on this device. Some workouts may re-send.',
            { autoClose: false },
          );
        }
        return synced;
      });
    } finally {
      if (flushingScope.current === scope) flushingScope.current = null;
    }
  }, [scope, validActorId, validClientId]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) void flush();
  }, [flush, isOnline, pendingCount]);

  const queueSubmission = useCallback((formData: DailyWorkoutFormSubmitPayload): boolean => {
    if (activeScope.current !== scope) return false;
    if (!validActorId || !validClientId || formData.clientId !== validClientId) {
      toast.error('Workout could not be saved: authenticated client context is unavailable.', { autoClose: false });
      return false;
    }
    const s = storage();
    if (!s) {
      toast.error('Could not save this workout offline — device storage is unavailable.', { autoClose: false });
      return false;
    }
    const entry: QueuedWorkout = {
      actorId: validActorId,
      clientId: validClientId,
      id: createOfflineQueueId(),
      timestamp: new Date().toISOString(),
      formData,
    };
    const result = appendToQueue(s, validClientId, entry, validActorId);
    setPendingCount(readScopedQueue(validActorId, validClientId).length);
    recordCoachIntent(
      OFFLINE_QUEUE_INTENT,
      { actorId: validActorId, clientId: validClientId, queuedId: entry.id },
      true,
      result.persisted,
    );
    if (result.persisted) {
      toast.info('Workout saved offline. Will sync when connected.');
    } else {
      toast.error(
        'Could not save this workout offline — device storage is full, blocked, or needs recovery. '
        + 'Keep this screen open and try again once you are back online.',
        { autoClose: false },
      );
    }
    return result.persisted;
  }, [scope, validActorId, validClientId]);

  return { isOnline, pendingCount, legacyQueuePresent, queueSubmission, flush };
}
