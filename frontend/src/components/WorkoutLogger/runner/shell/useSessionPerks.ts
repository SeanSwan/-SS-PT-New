/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ useSessionPerks — Batch 4 host behaviors, one home.         │
 * │ usePRToast: first stats compute = baseline (restored drafts │
 * │   and plan loads never fake-celebrate); genuinely NEW or    │
 * │   improved PRs toast the moment the set logs.               │
 * │ useWarmupRamp: prepend 40/60/80% ramp sets from the         │
 * │   exercise's top working weight, renumbering what follows.  │
 * └─────────────────────────────────────────────────────────────┘
 */
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import type { ExerciseEntry, ExerciseSet } from '../../../../services/nasmApiService';
import type { PersonalRecord } from '../../useSessionStats';
import { ensureWorkoutLoggerSetId } from '../../WorkoutLogger.helpers';
import { buildWarmupRamp, diffNewPRs } from './sessionTools';

/** Only PRs produced by a HAND-LOGGED set may celebrate (ms window). */
const PR_TOAST_LOG_WINDOW_MS = 5000;

export function usePRToast(
  prs: PersonalRecord[],
  lastLoggedAtRef: React.RefObject<number>,
): void {
  const baselineRef = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    const snapshot = new Map(prs.map((pr) => [`${pr.exerciseName}|${pr.type}`, pr.value]));
    // Bulk arrivals (draft restore, plan load, AI prefill) re-baseline
    // SILENTLY — only a set logged moments ago earns a celebration.
    const loggedRecently = Date.now() - (lastLoggedAtRef.current ?? 0) < PR_TOAST_LOG_WINDOW_MS;
    if (baselineRef.current === null || !loggedRecently) {
      baselineRef.current = snapshot;
      return;
    }
    const previous = Array.from(baselineRef.current.entries()).map(([key, value]) => {
      const [exerciseName, type] = key.split('|');
      return { exerciseName, type: type as PersonalRecord['type'], value, label: '' };
    });
    for (const pr of diffNewPRs(previous, prs)) {
      toast.success(`🏆 PR — ${pr.exerciseName}: ${pr.label}`);
    }
    baselineRef.current = snapshot;
  }, [prs, lastLoggedAtRef]);
}

export function useWarmupRamp(
  setExercises: React.Dispatch<React.SetStateAction<ExerciseEntry[]>>,
  createLocalId: (prefix: string) => string,
): (exerciseIndex: number) => void {
  return useCallback((exerciseIndex: number) => {
    setExercises((prev) => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      const topWeight = Math.max(0, ...exercise.sets.map((set) => set.weight || 0));
      const ramp = buildWarmupRamp(topWeight);
      if (ramp.length === 0) return exercise;
      const rampSets = ramp.map((step, idx) => ensureWorkoutLoggerSetId({
        setNumber: idx + 1, weight: step.weight, reps: 0, rpe: null,
        tempo: '', restTime: 60, formQuality: null, notes: 'warm-up',
      } as ExerciseSet, () => createLocalId('set')));
      const renumbered = exercise.sets.map((set, idx) => ({ ...set, setNumber: ramp.length + idx + 1 }));
      toast.success(`Warm-up ramp added — ${ramp.map((r) => r.weight).join(' / ')} lbs`);
      return { ...exercise, sets: [...rampSets, ...renumbered] };
    }));
  }, [setExercises, createLocalId]);
}
