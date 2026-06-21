/**
 * ============================================================================
 * FILE: useMacroSummary.ts
 * PURPOSE: Fetch daily macro summary from GET /api/macros/summary
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Fetches the authenticated user's daily macro totals
 * for a given date. Returns { protein, carbs, fat, totalCalories, mealCount }
 * plus loading/error states.
 *
 * HOW IT FITS IN THE APP: NutritionWorkspace -> MacroDonut / NutritionBalanceRadar
 */
import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';
import { formatLocalCalendarDate } from '../components/DashBoard/workspaces/clients-team/nutritionDate';

const MACRO_SUMMARY_ERROR = 'Macro summary unavailable. Try refreshing your dashboard.';

export interface MacroSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
  mealCount: number;
  meals: Record<string, { calories: number; protein: number; carbs: number; fat: number; count: number }>;
}

interface UseMacroSummaryResult {
  summary: MacroSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMacroSummary(date?: string): UseMacroSummaryResult {
  const [summary, setSummary] = useState<MacroSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateParam = date || formatLocalCalendarDate();
      const response = await apiService.get(`/api/macros/summary?date=${dateParam}`);
      const json = response.data;
      if (json.success && json.summary) {
        setSummary(json.summary);
      } else {
        setSummary(null);
        setError(MACRO_SUMMARY_ERROR);
      }
    } catch {
      setSummary(null);
      setError(MACRO_SUMMARY_ERROR);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}
