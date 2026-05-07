/**
 * PlaudMergeWorkspace.apply.ts
 * =============================
 * Approval helper for PLAUD merged-review cards. This is the bridge from
 * PLAUD review data into the existing Swan Coach transcript mapper and the
 * canonical admin workout-log write endpoint.
 */
import apiService from '../../services/api.service';
import {
  approveMergeRequest,
  type MergeResponse,
  type PlaudDateSplitSegment,
} from '../../services/plaudMergeService';
import {
  parsedWorkoutToLogPayload,
  type ParsedWorkout,
} from '../DashBoard/Pages/coach-assistant/utils/parsedWorkoutToLogPayload';

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

  const response = await apiService.post(`/api/admin/clients/${args.clientId}/workouts`, body);

  const mergeMarkedApproved = await approveMergeRequest(args.mergeRequestId)
    .then(() => true)
    .catch(() => false);

  return {
    success: !!response.data?.success,
    workoutId: response.data?.workout?.id,
    mergeMarkedApproved,
  };
}

export async function applyMergeSegmentApproval(args: {
  clientId: number;
  mergeRequestId: string;
  segment: PlaudDateSplitSegment;
  parsedWorkout: MergeResponse['parsedWorkout'];
}): Promise<{ success: boolean; workoutId?: number | string }> {
  const coachParsedWorkout = normalizeForCoachMapper(args.parsedWorkout);
  const body = {
    ...parsedWorkoutToLogPayload(coachParsedWorkout, {
      fallbackTitle: `PLAUD segment ${args.segment.segmentIndex} ${args.segment.date}`,
      fallbackDate: args.segment.date,
      targetDate: args.segment.date,
      fallbackDurationMinutes: 60,
    }),
    source: 'plaud_merge_segment',
    mergeRequestId: args.mergeRequestId,
    plaudSegmentId: args.segment.segmentId,
    plaudSegmentIndex: args.segment.segmentIndex,
  };

  const response = await apiService.post(`/api/admin/clients/${args.clientId}/workouts`, body);

  return {
    success: !!response.data?.success,
    workoutId: response.data?.workout?.id,
  };
}
