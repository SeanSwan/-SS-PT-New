/**
 * ============================================================================
 * FILE: useSprintAPI.ts
 * PURPOSE: Frontend hook for Sprint Planner API operations
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import apiService, { ProductionTokenManager } from '../services/api.service';
import { streamSprintGeneration } from './sprintGenerationStream';

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
  // R-H04 (slice D): the server's terminal fallback for a job whose event buffer
  // is gone — the run was interrupted rather than completing or never starting.
  // Modelled here because the API emits it; without this the UI cannot tell an
  // interrupted run from an ordinary failure.
  interrupted?: boolean;
  // Present on the `complete` fallback: the persisted status could not be echoed
  // or the buffer had expired, so no replay was possible.
  replayUnavailable?: boolean;
  persistedStatus?: string | null;
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

  // R-H04 (slice D): the SSE transport lives in sprintGenerationStream.ts. This
  // file is over the rule-4 cap at baseline, so the transport is not kept here.
  const generateSprint = useCallback((
    sprintId: number,
    onProgress: (evt: GenerationProgress) => void,
  ): (() => void) => streamSprintGeneration({
    sprintId,
    token: ProductionTokenManager.getToken(),
    onProgress,
  }), []);

  const confirmSlot = useCallback(async (
    sprintId: number, slotId: number, usedDate?: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.put(`/api/bootcamp/sprints/${sprintId}/slots/${slotId}/confirm`, { usedDate });
      const data = response.data;
      // DEFENSIVE, not the reachable refusal path (hostile review, round 116 R6). The server sends
      // every refusal as a 4xx through `sendSprintRouteError` (`sprintRoutes.mjs:102-108`), which
      // axios REJECTS — so the `catch` below is what surfaces a refusal today, and those are the
      // tests that pin the behaviour. A 200 with `success:false` is a shape this route does not
      // currently emit; keeping the branch costs one comparison and stops the message being dropped
      // silently if that ever changes. It is NOT the fix for the silent-refusal defect — the catch
      // already carried that message and the PANEL was what failed to render it (round 114 F2).
      if (!data.success) {
        setError(data.error || data.message || 'The confirmation was refused.');
        return false;
      }
      // No `setError(null)` on the success path, and TWO providers make that safe — the earlier
      // comment named only the first and was therefore wrong about the causal chain (round 116 R7):
      //   1. EVERY action in this hook resets `error` at its START, so no in-hook caller can see a
      //      stale refusal after a later action;
      //   2. the only production caller, `SlotDetailPanel`, is UNMOUNTED by its parent on success
      //      (`SprintPlannerPage.tsx:288-291` clears the selected slot), so the hook instance holding
      //      the message is destroyed outright.
      // Probes M41/M42 (round 115) showed the reset is the only *in-hook* provider; M43 removed the
      // reset and failed the suite, which is how these tests became discriminating.
      return true;
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const regenerateSlot = useCallback(async (
    sprintId: number, slotId: number,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.post(`/api/bootcamp/sprints/${sprintId}/slots/${slotId}/regenerate`);
      const data = response.data;
      // Same as confirmSlot above: never return a bare false with no message (round 114 F2).
      if (!data.success) {
        setError(data.error || data.message || 'The slot could not be regenerated.');
        return false;
      }
      return true;
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
