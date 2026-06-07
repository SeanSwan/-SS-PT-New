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

interface QueuedWorkout {
  id: string;
  timestamp: string;
  formData: DailyWorkoutFormSubmitPayload;
}

const QUEUE_KEY_PREFIX = 'ss-workout-queue';

function getQueueKey(clientId: number): string {
  return `${QUEUE_KEY_PREFIX}-${clientId}`;
}

let offlineQueueIdFallbackCounter = 0;

function createOfflineQueueId(): string {
  offlineQueueIdFallbackCounter += 1;
  return `offline-local-${Date.now()}-${offlineQueueIdFallbackCounter}`;
}

function readQueue(clientId: number): QueuedWorkout[] {
  try {
    const raw = localStorage.getItem(getQueueKey(clientId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(clientId: number, queue: QueuedWorkout[]): void {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(getQueueKey(clientId));
    } else {
      localStorage.setItem(getQueueKey(clientId), JSON.stringify(queue));
    }
  } catch {
    // localStorage can be full or unavailable in private browsing.
  }
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

    writeQueue(clientId, failed);
    setPendingCount(failed.length);
    isFlushing.current = false;

    if (synced > 0) {
      toast.success(`Synced ${synced} offline workout${synced > 1 ? 's' : ''}`);
    }
    if (failed.length > 0) {
      toast.warning(`${failed.length} workout${failed.length > 1 ? 's' : ''} still pending`);
    }

    return synced;
  }, [clientId]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      void flush();
    }
  }, [flush, isOnline, pendingCount]);

  const queueSubmission = useCallback((formData: QueuedWorkout['formData']): void => {
    const entry: QueuedWorkout = {
      id: createOfflineQueueId(),
      timestamp: new Date().toISOString(),
      formData,
    };

    const queue = readQueue(clientId);
    queue.push(entry);
    writeQueue(clientId, queue);
    setPendingCount(queue.length);

    toast.info('Workout saved offline. Will sync when connected.');
  }, [clientId]);

  return {
    isOnline,
    pendingCount,
    queueSubmission,
    flush,
  };
}
