/**
 * useOfflineQueue
 * ===============
 * Offline-first workout submission queue. Stores canonical workout submit
 * payloads in localStorage and flushes them through the same service path
 * used by online saves.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { dailyWorkoutFormService } from '../../services/nasmApiService';
import type { DailyWorkoutFormSubmitPayload } from '../../services/nasmApiService';
import { recordCoachIntent } from '../../utils/coachIntentRecorder';
import {
  readQueue as storeReadQueue,
  writeQueue as storeWriteQueue,
  type QueueStorage,
} from './offlineQueueStore';

/** Intent name for a workout parked in the offline queue (C2 memory). */
const OFFLINE_QUEUE_INTENT = 'OFFLINE_QUEUE_WORKOUT';
/** Intent name for a queued workout that reached the server (C2 memory). */
const OFFLINE_SYNC_INTENT = 'OFFLINE_SYNC_WORKOUT';

interface QueuedWorkout {
  id: string;
  timestamp: string;
  formData: DailyWorkoutFormSubmitPayload;
}

let offlineQueueIdFallbackCounter = 0;

function createOfflineQueueId(): string {
  offlineQueueIdFallbackCounter += 1;
  return `offline-local-${Date.now()}-${offlineQueueIdFallbackCounter}`;
}

/**
 * Persistence lives in offlineQueueStore.ts (pure + injectable) so the case that
 * matters most — what happens when the write FAILS — is testable without a DOM.
 * These thin wrappers bind it to the real localStorage.
 */
function storage(): QueueStorage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function readQueue(clientId: number): QueuedWorkout[] {
  const s = storage();
  return s ? storeReadQueue<DailyWorkoutFormSubmitPayload>(s, clientId) : [];
}

function writeQueue(clientId: number, queue: QueuedWorkout[]): boolean {
  const s = storage();
  return s ? storeWriteQueue(s, clientId, queue) : false;
}

export function useOfflineQueue(clientId: number) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(() => readQueue(clientId).length);
  const isFlushing = useRef(false);

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
    if (isFlushing.current) return 0;
    isFlushing.current = true;

    const queue = readQueue(clientId);
    if (queue.length === 0) {
      isFlushing.current = false;
      return 0;
    }

    let synced = 0;
    const failed: QueuedWorkout[] = [];

    for (const entry of queue) {
      try {
        const response = await dailyWorkoutFormService.submitWorkoutForm(entry.formData);
        if (response.success) {
          synced++;
        } else {
          failed.push(entry);
        }
      } catch {
        failed.push(entry);
      }
    }

    const rewritten = writeQueue(clientId, failed);
    // Read back rather than trusting the in-memory array — if the rewrite
    // failed, already-synced entries may still be on disk and would re-send.
    setPendingCount(readQueue(clientId).length);
    isFlushing.current = false;

    // Each synced workout is a real server write; record it so Coach's memory
    // can distinguish "durably queued" from "actually landed".
    for (let i = 0; i < synced; i++) {
      recordCoachIntent(OFFLINE_SYNC_INTENT, { clientId }, true, true);
    }

    if (synced > 0) {
      toast.success(`Synced ${synced} offline workout${synced > 1 ? 's' : ''}`);
    }
    if (failed.length > 0) {
      toast.warning(`${failed.length} workout${failed.length > 1 ? 's' : ''} still pending`);
    }
    if (!rewritten) {
      // The queue could not be rewritten, so synced entries may not have been
      // cleared. Say so — a duplicate re-send is recoverable, a silent one is not.
      toast.error(
        'Offline queue could not be updated on this device. Some workouts may re-send.',
        { autoClose: false },
      );
    }

    return synced;
  }, [clientId]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      void flush();
    }
  }, [flush, isOnline, pendingCount]);

  /**
   * Queue a submission for later sync.
   *
   * Returns whether it was ACTUALLY persisted. Callers must not treat a queued
   * workout as saved without checking — see writeQueue for why.
   */
  const queueSubmission = useCallback((formData: QueuedWorkout['formData']): boolean => {
    const entry: QueuedWorkout = {
      id: createOfflineQueueId(),
      timestamp: new Date().toISOString(),
      formData,
    };

    const queue = readQueue(clientId);
    queue.push(entry);
    const persisted = writeQueue(clientId, queue);

    // Count what is really on disk, not what we hoped to put there.
    setPendingCount(readQueue(clientId).length);

    // Record against the Coach memory so a queued-but-unsynced workout is never
    // believed to have landed. `applied` here means "durably queued", not
    // "written to the server" — the server outcome reconciles on flush.
    recordCoachIntent(
      OFFLINE_QUEUE_INTENT,
      { clientId, queuedId: entry.id },
      true,
      persisted,
    );

    if (persisted) {
      toast.info('Workout saved offline. Will sync when connected.');
    } else {
      toast.error(
        'Could not save this workout offline — device storage is full or blocked. '
        + 'Keep this screen open and try again once you are back online.',
        { autoClose: false },
      );
    }
    return persisted;
  }, [clientId]);

  return {
    isOnline,
    pendingCount,
    queueSubmission,
    flush,
  };
}
