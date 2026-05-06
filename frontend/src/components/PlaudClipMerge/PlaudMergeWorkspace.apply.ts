/**
 * PlaudMergeWorkspace.apply.ts
 * =============================
 * Approval helper for PLAUD merged-review cards. This is the bridge from
 * PLAUD review data into the existing Swan Coach transcript mapper and the
 * canonical admin workout-log write endpoint.
 */
import axios from 'axios';
import { approveMergeRequest, type MergeResponse } from '../../services/plaudMergeService';
import {
  parsedWorkoutToLogPayload,
  type ParsedWorkout,
} from '../DashBoard/Pages/coach-assistant/utils/parsedWorkoutToLogPayload';

const API_BASE_URL =
  (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env?.VITE_API_URL ||
  'http://localhost:10000';

function parseReps(raw: number | string | undefined): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') return Number.parseInt(raw, 10) || 0;
  return 0;
}

function normalizeForCoachMapper(parsedWorkout: MergeResponse['parsedWorkout']): ParsedWorkout {
  return {
    exercises: (parsedWorkout.exercises || []).map((ex, index) => ({
      exerciseName: ex.exerciseName || ex.name || `Exercise ${index + 1}`,
      sets: (ex.sets || []).map((set, setIndex) => ({
        setNumber: setIndex + 1,
        reps: parseReps(set.reps),
        weight: typeof set.weight === 'number' ? set.weight : null,
        rpe: set.rpe,
        tempo: set.tempo,
      })),
      performanceNotes: ex.notes,
    })),
    date: parsedWorkout.date,
    overallIntensity:
      typeof parsedWorkout.overallIntensity === 'number'
        ? parsedWorkout.overallIntensity
        : typeof parsedWorkout.intensity === 'number'
          ? parsedWorkout.intensity
          : undefined,
  };
}

export async function applyMergeApproval(args: {
  clientId: number;
  mergeRequestId: string;
  parsedWorkout: MergeResponse['parsedWorkout'];
}): Promise<{ success: boolean; workoutId?: number | string; mergeMarkedApproved: boolean }> {
  const coachParsedWorkout = normalizeForCoachMapper(args.parsedWorkout);
  const body = {
    ...parsedWorkoutToLogPayload(coachParsedWorkout, {
      fallbackTitle: `PLAUD merge ${coachParsedWorkout.date || 'review'}`,
      fallbackDate: coachParsedWorkout.date,
      fallbackDurationMinutes: 60,
    }),
    source: 'plaud_merge',
    mergeRequestId: args.mergeRequestId,
  };

  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_BASE_URL}/api/admin/clients/${args.clientId}/workouts`, body, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const mergeMarkedApproved = await approveMergeRequest(args.mergeRequestId)
    .then(() => true)
    .catch(() => false);

  return {
    success: !!response.data?.success,
    workoutId: response.data?.workout?.id,
    mergeMarkedApproved,
  };
}
