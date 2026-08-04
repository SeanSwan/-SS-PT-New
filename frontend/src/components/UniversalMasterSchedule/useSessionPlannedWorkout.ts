/**
 * useSessionPlannedWorkout — data spine for the Plan Reveal panel (S1).
 * =====================================================================
 * Answers "what workout is planned for THIS session?" with two EXISTING
 * scoped reads in parallel (refuse-new-endpoint law; recorded deviation
 * from the master plan's detail=full allowlist extension — this uses S0's
 * `?forDate=` investment and never touches the projection layer's
 * fail-closed normalizer):
 *   1. GET /api/workouts/:clientId/current?forDate=YYYY-MM-DD
 *      → the plan day's FULL exercises + basis (planDayResolver chain).
 *      Auth: ensureClientAccess (client=self-only, trainer=assigned, admin).
 *   2. GET /api/training-plan-projections (1 client, 1 day)
 *      → completionState from immutable receipts. Failure here degrades to
 *      completion-unknown; it never blanks the panel.
 * Manual sessions (no linked user) render NOTHING — the hook never fetches.
 */
import { useEffect, useRef, useState } from 'react';
import apiService from '../../services/api.service';
import { trainingPlanProjectionService } from '../../services/training-plan-projection-service';

export interface PlannedWorkoutExercise {
  name: string;
  setScheme: string;
  tempo: string | null;
  rest: string | null;
}

export type SessionPlannedWorkout =
  | { status: 'hidden' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'none' }
  | {
    status: 'ready';
    planTitle: string | null;
    weekNumber: number | null;
    dayNumber: number | null;
    dayLabel: string | null;
    focus: string | null;
    basis: string;
    completionState: 'completed' | 'planned' | null;
    exercises: PlannedWorkoutExercise[];
  };

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const compactScheme = (exercise: Record<string, unknown>): string => {
  const sets = exercise.sets;
  const setCount = Array.isArray(sets) ? sets.length : Number(sets) || null;
  const reps = exercise.targetReps ?? exercise.reps ?? exercise.repGoal ?? null;
  if (setCount && reps) return `${setCount} × ${reps}`;
  if (setCount) return `${setCount} sets`;
  return typeof exercise.setScheme === 'string' ? exercise.setScheme : '—';
};

const text = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

export function useSessionPlannedWorkout(
  clientId: number | null | undefined,
  sessionDateISO: string | null,
): SessionPlannedWorkout {
  const [state, setState] = useState<SessionPlannedWorkout>(
    clientId && sessionDateISO ? { status: 'loading' } : { status: 'hidden' },
  );
  const requestRef = useRef(0);

  useEffect(() => {
    const id = Number(clientId);
    if (!Number.isInteger(id) || id <= 0 || !sessionDateISO || !DATE_ONLY.test(sessionDateISO)) {
      setState({ status: 'hidden' });
      return undefined;
    }
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setState({ status: 'loading' });

    const dayPromise = apiService.get(
      `/api/workouts/${id}/current`,
      { params: { forDate: sessionDateISO } },
    );
    // Completion is best-effort enrichment — its failure must not blank the day.
    const completionPromise = trainingPlanProjectionService
      .getProjections({
        startDate: sessionDateISO, endDate: sessionDateISO,
        clientIds: [id], page: 1, limit: 25,
      })
      .catch(() => null);

    Promise.all([dayPromise, completionPromise]).then(([dayRes, projections]) => {
      if (requestRef.current !== requestId) return;
      const body = dayRes?.data ?? {};
      const dayForDate = body.dayForDate;
      if (!dayForDate || dayForDate.basis === 'none' || !body.plan) {
        setState({ status: 'none' });
        return;
      }
      const exercises: PlannedWorkoutExercise[] = (Array.isArray(dayForDate.exercises) ? dayForDate.exercises : [])
        .map((exercise: Record<string, unknown>) => ({
          name: text(exercise.exerciseName) || text(exercise.name) || 'Exercise',
          setScheme: compactScheme(exercise),
          tempo: text(exercise.tempo),
          rest: text(exercise.restPeriod) || text(exercise.restTime != null ? `${exercise.restTime}s` : null),
        }));
      const projectionItem = projections?.items?.find((item) => (
        item.scheduledDate === sessionDateISO
        && item.weekNumber === dayForDate.weekNumber
        && item.dayNumber === dayForDate.dayNumber
      )) ?? null;
      setState({
        status: 'ready',
        planTitle: text(body.plan?.title) || text(body.plan?.name),
        weekNumber: dayForDate.weekNumber ?? null,
        dayNumber: dayForDate.dayNumber ?? null,
        dayLabel: text(dayForDate.dayLabel),
        focus: text(dayForDate.weekFocus) || text(dayForDate.day?.focus),
        basis: String(dayForDate.basis),
        completionState: projectionItem
          ? (projectionItem.completionState === 'completed' ? 'completed' : 'planned')
          : null,
        exercises,
      });
    }).catch(() => {
      if (requestRef.current !== requestId) return;
      setState({ status: 'error' });
    });

    return () => { requestRef.current += 1; };
  }, [clientId, sessionDateISO]);

  return state;
}
