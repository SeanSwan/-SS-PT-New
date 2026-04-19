/**
 * ┌─── HOOK: useOfflineQueue ─────────────────────────────────┐
 * │ PURPOSE: Offline-first workout submission — queues form     │
 * │ data to localStorage when offline, flushes when back online │
 * │                                                              │
 * │ Features:                                                    │
 * │ - navigator.onLine detection + event listeners              │
 * │ - Queue to localStorage: ss-workout-queue-{clientId}        │
 * │ - Auto-flush on reconnect                                   │
 * │ - Manual flush API                                           │
 * │ - Pending count for UI indicator                             │
 * │                                                              │
 * │ Returns: { isOnline, pendingCount, queueSubmission, flush } │
 * └──────────────────────────────────────────────────────────────┘
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { dailyWorkoutFormService } from '../../services/nasmApiService';

interface QueuedWorkout {
  id: string;
  timestamp: string;
  formData: {
    clientId: number;
    date: string;
    exercises: any[];
    sessionNotes: string;
    // Phase 16 (2026-04-16): nullable on the wire. Older queued items
    // written before this change may still carry a number (the old
    // phantom 5) — they will flush to the backend which accepts either
    // shape and will persist whatever value was recorded at queue time.
    overallIntensity?: number | null;
  };
}

const QUEUE_KEY_PREFIX = 'ss-workout-queue';

function getQueueKey(clientId: number): string {
  return `${QUEUE_KEY_PREFIX}-${clientId}`;
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
    // localStorage full or unavailable — silent fail
  }
}

export function useOfflineQueue(clientId: number) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(() => readQueue(clientId).length);
  const isFlushing = useRef(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online — syncing queued workouts...');
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

  // Auto-flush when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      flush();
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Queue a workout submission for later sync */
  const queueSubmission = useCallback((formData: QueuedWorkout['formData']): void => {
    const entry: QueuedWorkout = {
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      formData,
    };

    const queue = readQueue(clientId);
    queue.push(entry);
    writeQueue(clientId, queue);
    setPendingCount(queue.length);

    toast.info('Workout saved offline. Will sync when connected.');
  }, [clientId]);

  /** Flush all queued workouts to the server */
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

  return {
    isOnline,
    pendingCount,
    queueSubmission,
    flush,
  };
}
