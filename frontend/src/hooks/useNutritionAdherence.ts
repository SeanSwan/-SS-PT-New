/**
 * useNutritionAdherence.ts — targets + 7-day logged macros, composed (BP02 §5.1)
 * ================================================================================
 * Joins the two canonical sources that were NEVER joined before:
 *   - GET /api/nutrition/:userId/current  (ClientNutritionPlan targets;
 *     client self-access VERIFIED at clientAccess.mjs:58-61)
 *   - GET /api/macros/weekly              (per-day logged totals)
 * No new endpoints; no second aggregation path (one truth per metric).
 * Status is honest: 'no-targets' is a real product state with a role-aware
 * CTA — never a blank.
 */
import { useEffect, useState } from 'react';
import apiService from '../services/api.service';
import { useNutritionPlan } from './useNutritionPlan';
import { hasUsableTargets, type AdherenceTargets, type LoggedDay } from '../utils/nutritionAdherence';

export type NutritionAdherenceStatus = 'loading' | 'no-targets' | 'ready' | 'error';

export interface UseNutritionAdherenceResult {
  status: NutritionAdherenceStatus;
  targets: AdherenceTargets | null;
  planName: string | null;
  week: LoggedDay[];
}

const isoDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

export function useNutritionAdherence(userId?: number): UseNutritionAdherenceResult {
  const plan = useNutritionPlan(userId, true);
  const [week, setWeek] = useState<LoggedDay[]>([]);
  const [weekState, setWeekState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!userId) {
      setWeekState('ready');
      return;
    }
    let cancelled = false;
    setWeekState('loading');
    apiService
      .get(`/api/macros/weekly?start=${isoDaysAgo(6)}&end=${isoDaysAgo(0)}`, {
        _isBackgroundRequest: true,
      } as never)
      .then((response) => {
        if (cancelled) return;
        const days = Array.isArray(response?.data?.days) ? response.data.days : [];
        setWeek(days as LoggedDay[]);
        setWeekState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setWeek([]);
        setWeekState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const targets: AdherenceTargets | null = plan.data
    ? {
        calories: plan.data.dailyCalories,
        protein: plan.data.macros?.protein,
        carbs: plan.data.macros?.carbs,
        fat: plan.data.macros?.fat,
      }
    : null;

  let status: NutritionAdherenceStatus;
  if (plan.isLoading || weekState === 'loading') {
    status = 'loading';
  } else if (plan.error && !plan.data) {
    status = 'error';
  } else if (!hasUsableTargets(targets)) {
    status = 'no-targets';
  } else {
    status = 'ready';
  }

  return { status, targets, planName: plan.data?.name ?? null, week };
}

export default useNutritionAdherence;
