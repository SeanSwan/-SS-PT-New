/**
 * useClientPlanDetail
 * ===================
 * Fetches ONE plan the client owns, in full — every week -> day -> exercise —
 * from the client-scoped read `GET /api/workouts/:userId/plans/:planId`.
 *
 * Why a dedicated hook: `useCurrentClientWorkout` (/current) deliberately returns
 * only the CURRENT week, so rendering "your plan" from it would show one week and
 * call it the whole program. This is the full-program read.
 *
 * READ-ONLY. Trainer-indispensability doctrine: the client may SEE every plan but
 * never switches or edits one — there is no write path here, by design.
 *
 * Lazy: only fetches when a planId is actually opened (the modal is closed until
 * the member taps a plan), so the home page pays nothing for it.
 */
import { useCallback, useEffect, useState } from 'react';
import apiService from '../../../../../services/api.service';

export interface ClientPlanExercise {
  id?: string | number;
  exerciseName?: string;
  name?: string;
  sets?: number | unknown[];
  targetReps?: string | number;
  reps?: string | number;
  restSeconds?: number;
  tempo?: string;
  notes?: string;
}

export interface ClientPlanDay {
  id?: string;
  dayNumber: number;
  dayName?: string;
  name?: string;
  focus?: string | null;
  exercises: ClientPlanExercise[];
}

export interface ClientPlanWeek {
  weekNumber: number;
  focus?: string | null;
  days: ClientPlanDay[];
}

export interface ClientPlanDetail {
  id: string | number;
  title?: string;
  description?: string;
  status?: string;
  durationWeeks?: number;
  difficulty?: string;
  currentWeek?: number;
  currentDay?: number;
  weeks: ClientPlanWeek[];
}

export interface ClientPlanDetailState {
  plan: ClientPlanDetail | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

interface PlanDetailResponse {
  success?: boolean;
  data?: ClientPlanDetail | null;
}

const coerceId = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
};

export function useClientPlanDetail(
  userId: unknown,
  planId: unknown,
  enabled = true,
): ClientPlanDetailState {
  const [state, setState] = useState<{ plan: ClientPlanDetail | null; loading: boolean; error: boolean }>({
    plan: null,
    loading: false,
    error: false,
  });
  const [reloadNonce, setReloadNonce] = useState(0);

  const reload = useCallback(() => setReloadNonce((n) => n + 1), []);

  useEffect(() => {
    const clientId = coerceId(userId);
    const targetPlanId = coerceId(planId);

    if (!enabled || !clientId || !targetPlanId) {
      setState({ plan: null, loading: false, error: false });
      return undefined;
    }

    let cancelled = false;
    setState({ plan: null, loading: true, error: false });

    apiService
      .get<PlanDetailResponse>(`/api/workouts/${clientId}/plans/${targetPlanId}`)
      .then((response) => {
        if (cancelled) return;
        const plan = response?.data?.data ?? null;
        // A 200 with no plan body is still a failure to show a plan — be honest
        // rather than rendering a convincing empty program.
        setState({ plan, loading: false, error: !plan });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ plan: null, loading: false, error: true });
      });

    return () => { cancelled = true; };
  }, [userId, planId, enabled, reloadNonce]);

  return { ...state, reload };
}

export default useClientPlanDetail;
