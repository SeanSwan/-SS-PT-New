/**
 * ============================================================================
 * FILE: useSprintAPI.ts
 * PURPOSE: Frontend hook for Sprint Planner API operations
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import apiService, { ProductionTokenManager } from '../services/api.service';

// ── Types ─────────────────────────────────────────────────────────────

export interface SprintClassSlot {
  id: number;
  weekId: number;
  sprintId: number;
  templateId?: number;
  classLogId?: number;
  dayOfWeek: number;
  scheduledDate: string;
  dayType: string;
  classFormat: string;
  classStyle: string;
  status: 'planned' | 'generated' | 'taught' | 'skipped';
  wasUsed: boolean;
  usedDate?: string;
  trainerConfirmedAt?: string;
  exerciseKeys: string[];
  generatedClassData?: Record<string, unknown>;
  notes?: string;
}

export interface SprintWeek {
  id: number;
  sprintId: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  theme?: string;
  isDeloadWeek: boolean;
  intensityModifier: number;
  notes?: string;
  classSlots: SprintClassSlot[];
}

export interface BootcampSprint {
  generationVersion: number;
  id: number;
  trainerId: number;
  name: string;
  startDate: string;
  endDate: string;
  durationWeeks: number;
  classesPerWeek: number;
  frequencyPattern: string[];
  focusRotation: string[];
  defaultFormat: string;
  defaultStyle: string;
  status: 'draft' | 'generating' | 'active' | 'completed' | 'archived';
  progressionStrategy: string;
  totalClassesPlanned: number;
  totalClassesCompleted: number;
  previousSprintId?: number;
  notes?: string;
  createdAt: string;
  weeks?: SprintWeek[];
}

export interface GenerationProgress {
  type: 'started' | 'progress' | 'complete' | 'error';
  completedSlots?: number;
  totalSlots?: number;
  failedSlots?: number;
  currentWeek?: number;
  percent?: number;
  sprintId?: number;
  status?: string;
  exerciseMemorySize?: number;
  error?: string;
}

export interface CreateSprintParams {
  name: string;
  startDate: string;
  durationWeeks?: number;
  classesPerWeek?: number;
  frequencyPattern?: string[];
  focusRotation?: string[];
  defaultFormat?: string;
  defaultStyle?: string;
  spaceProfileId?: number;
  progressionStrategy?: string;
  previousSprintId?: number;
  notes?: string;
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useSprintAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (err: any, fallback = 'Unknown error') =>
    err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback;

  const createSprint = useCallback(async (params: CreateSprintParams): Promise<BootcampSprint | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.post('/api/bootcamp/sprints', params);
      const data = response.data;
      if (!data.success) throw new Error(data.error || 'Failed to create sprint');
      return data.sprint;
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const listSprints = useCallback(async (): Promise<BootcampSprint[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get('/api/bootcamp/sprints');
      const data = response.data;
      if (!data.success) throw new Error(data.error);
      return data.sprints || [];
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getSprint = useCallback(async (id: number): Promise<BootcampSprint | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get(`/api/bootcamp/sprints/${id}`);
      const data = response.data;
      if (!data.success) throw new Error(data.error);
      return data.sprint;
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSprint = useCallback(async (id: number, updates: Partial<BootcampSprint>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.put(`/api/bootcamp/sprints/${id}`, updates);
      const data = response.data;
      if (!data.success) throw new Error(data.error);
      return true;
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const archiveSprint = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.delete(`/api/bootcamp/sprints/${id}`);
      const data = response.data;
      return !!data.success;
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSprint = useCallback((
    sprintId: number,
    onProgress: (evt: GenerationProgress) => void,
    expectedGenerationVersion?: number,
  ): (() => void) => {
    const token = ProductionTokenManager.getToken();
    const controller = new AbortController();
    let lastEventId = 0;
    let cancelled = false;
    let terminal = false;
    let reconnectAttempted = false;

    const emit = (evt: GenerationProgress) => {
      if (cancelled || terminal) return;
      if (evt.type === 'complete' || evt.type === 'error') terminal = true;
      onProgress(evt);
    };

    const emitError = (message: string) => {
      if (!terminal && !cancelled) {
        terminal = true;
        setError(message);
        onProgress({ type: 'error', error: message });
      }
    };

    // Parse SSE stream, tracking event IDs for reconnection (ARCH-2)
    const readStream = async (response: Response) => {
      if (!response.ok) {
        throw new Error(`Sprint request failed (${response.status})`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Sprint stream returned no readable body');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentId: number | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('id: ')) {
            currentId = parseInt(line.slice(4), 10);
          } else if (line.startsWith('data: ')) {
            try {
              const evt = JSON.parse(line.slice(6));
              if (currentId !== null && Number.isSafeInteger(currentId)) lastEventId = currentId;
              emit(evt);
            } catch {
              // Ignore a malformed event frame but keep the stream alive; the
              // terminal event still controls completion/error state.
            }
          }
        }
      }
    };

    // Reconnect via GET stream with Last-Event-ID
    const reconnect = async () => {
      if (cancelled || terminal || reconnectAttempted) return;
      reconnectAttempted = true;
      try {
        const res = await fetch(`/api/bootcamp/sprints/${sprintId}/generate/stream`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Last-Event-ID': String(lastEventId),
          },
          // Reconnect is now the primary recovery path; a cached 404/502 must
          // never be replayed as a "Reconnect failed" verdict on a live class.
          cache: 'no-store',
          signal: controller.signal,
        });
        if (res.ok) {
          await readStream(res);
          if (!terminal && !cancelled) emitError('Sprint stream ended before completion');
        } else {
          // Surface non-OK reconnect as error (Codex R18 fix — 404/401/etc)
          emitError(`Reconnect failed (${res.status})`);
        }
        // The reconnect stream reached a terminal or cancelled state: stop the
        // in-flight request. The previous code called `reader.cancel()`, but
        // `reader` is scoped to readStream and is not visible here, and the
        // trailing `break` sat outside any loop — which esbuild rejects, so the
        // production bundle could not be built at all. `controller` is the
        // correct handle for this fetch and abort() is a no-op once it settled.
        if (terminal || cancelled) controller.abort();
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          emitError(err.message);
        }
      }
    };

    (async () => {
      try {
        const res = await fetch(`/api/bootcamp/sprints/${sprintId}/generate`, {
          method: 'POST',
          body: JSON.stringify({ expectedGenerationVersion, operationId: crypto.randomUUID() }),
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        if (!res.ok) {
          emitError(`Sprint generation request failed (${res.status})`);
          return;
        }
        await readStream(res);
        if (!terminal && !cancelled) await reconnect();
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          // Connection lost mid-generation — try reconnecting to GET stream
          await reconnect();
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const confirmSlot = useCallback(async (
    sprintId: number, slotId: number, usedDate?: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.put(`/api/bootcamp/sprints/${sprintId}/slots/${slotId}/confirm`, { usedDate });
      const data = response.data;
      return !!data.success;
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const regenerateSlot = useCallback(async (
    sprintId: number, slotId: number, expectedGenerationVersion?: number,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.post(`/api/bootcamp/sprints/${sprintId}/slots/${slotId}/regenerate`, {
        expectedGenerationVersion, operationId: crypto.randomUUID(),
      });
      const data = response.data;
      return !!data.success;
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading, error,
    createSprint, listSprints, getSprint,
    updateSprint, archiveSprint,
    generateSprint, confirmSlot, regenerateSlot,
  };
}
