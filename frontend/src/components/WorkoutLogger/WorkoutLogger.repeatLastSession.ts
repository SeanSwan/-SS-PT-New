/**
 * WorkoutLogger.repeatLastSession
 * -------------------------------
 * Repeat Last Session click-saver. Two layers:
 * - groupWorkoutLogsToEntries maps raw WorkoutLog rows from
 *   GET /api/admin/clients/:id/workouts to the logger's ExerciseEntry[] shape.
 * - repeatLastSessionIntoLogger handles fetch/toast orchestration.
 *
 * Data-truth: the prescription is carried forward as a starting hint, but
 * subjective ratings are not copied into the new draft.
 */
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '../../services/api.service';
import type { ExerciseEntry, ExerciseSet } from '../../services/nasmApiService';
import { getErrorMessage } from './WorkoutLoggerCS';

export interface RawWorkoutLog {
  exerciseName?: string | null;
  setNumber?: number | string | null;
  reps?: number | string | null;
  weight?: number | string | null;
  tempo?: string | null;
  rest?: number | string | null;
  restTime?: number | string | null;
}

const toNum = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function groupWorkoutLogsToEntries(
  logs: RawWorkoutLog[] | null | undefined,
  makeExerciseId: () => string,
  makeSetId: () => string,
): ExerciseEntry[] {
  if (!Array.isArray(logs) || logs.length === 0) return [];

  const order: string[] = [];
  const byName = new Map<string, RawWorkoutLog[]>();

  for (const log of logs) {
    const name = (log?.exerciseName ?? '').toString().trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, []);
      order.push(key);
    }
    byName.get(key)!.push(log);
  }

  return order.map((key) => {
    const group = byName.get(key)!;
    const displayName = (group[0].exerciseName ?? '').toString().trim();
    const orderedSets = [...group].sort(
      (a, b) => toNum(a.setNumber, 0) - toNum(b.setNumber, 0),
    );

    const sets: ExerciseSet[] = orderedSets.map((log, index) => ({
      loggerSetId: makeSetId(),
      setNumber: index + 1,
      weight: toNum(log.weight, 0),
      reps: toNum(log.reps, 0),
      rpe: null,
      tempo: (log.tempo ?? '').toString(),
      restTime: toNum(log.rest ?? log.restTime, 60),
      formQuality: null,
      notes: '',
    }));

    return {
      loggerExerciseId: makeExerciseId(),
      exerciseId: `repeat-${key}`,
      exerciseName: displayName,
      sets,
      formRating: null,
      painLevel: 0,
      performanceNotes: '',
    };
  });
}

interface RepeatLastSessionParams {
  effectiveClientId?: number;
  isClientSelfMode?: boolean;
  createWorkoutLoggerLocalId: (prefix: string) => string;
  setExercises: Dispatch<SetStateAction<ExerciseEntry[]>>;
  setIsRepeatingSession: Dispatch<SetStateAction<boolean>>;
}

export async function repeatLastSessionIntoLogger({
  effectiveClientId,
  isClientSelfMode = false,
  createWorkoutLoggerLocalId,
  setExercises,
  setIsRepeatingSession,
}: RepeatLastSessionParams): Promise<void> {
  if (isClientSelfMode) return;
  if (typeof effectiveClientId !== 'number') {
    toast.info('No client context - cannot load a previous session');
    return;
  }
  setIsRepeatingSession(true);
  try {
    const api = new ApiService();
    const response = await api.get(`/api/admin/clients/${effectiveClientId}/workouts?limit=1`);
    const data = response?.data ?? response;
    const lastWorkout = Array.isArray(data?.workouts) ? data.workouts[0] : null;
    const logs = lastWorkout?.logs ?? lastWorkout?.exercises ?? [];
    const mapped = groupWorkoutLogsToEntries(
      logs,
      () => createWorkoutLoggerLocalId('repeat'),
      () => createWorkoutLoggerLocalId('set'),
    );
    if (mapped.length === 0) {
      toast.info('No previous session found to repeat for this client');
      return;
    }
    setExercises(prev => [...prev, ...mapped]);
    const copiedSets = mapped.reduce((sum, entry) => sum + entry.sets.length, 0);
    toast.success(`Loaded ${mapped.length} exercise${mapped.length === 1 ? '' : 's'} (${copiedSets} sets) from the last session. Adjust loads and re-rate before saving.`);
  } catch (error: unknown) {
    console.error('Failed to repeat last session:', error);
    toast.error(getErrorMessage(error, 'Could not load the previous session'));
  } finally {
    setIsRepeatingSession(false);
  }
}
