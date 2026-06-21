/**
 * ============================================================================
 * FILE: useHydration.ts
 * PURPOSE: Hook for daily hydration tracking — syncs with backend API,
 *          falls back to localStorage for unauthenticated users
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../services/api.service';
import { formatLocalCalendarDate } from '../components/DashBoard/workspaces/clients-team/nutritionDate';

const LS_KEY_PREFIX = 'ss-hydration-';
const DEFAULT_GLASS_OZ = 8;
const DEFAULT_DAILY_GOAL = 8;
const MAX_GLASSES = 30;
const MAX_GLASS_OZ = 32;
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;
const todayStr = () => formatLocalCalendarDate();

const toPrimitiveDecimalNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampWholeNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const numberValue = toPrimitiveDecimalNumber(value);
  if (numberValue === null) return fallback;
  return Math.max(min, Math.min(Math.round(numberValue), max));
};

const boundedPositiveNumberOrDefault = (value: unknown, fallback: number, max: number) => {
  const numberValue = toPrimitiveDecimalNumber(value);
  if (numberValue === null || numberValue <= 0) return fallback;
  return Math.min(numberValue, max);
};

const boundedWholeNumberOrDefault = (value: unknown, fallback: number, max: number) => {
  const numberValue = toPrimitiveDecimalNumber(value);
  if (numberValue === null || numberValue <= 0) return fallback;
  return Math.min(Math.round(numberValue), max);
};

interface UseHydrationResult {
  filled: number;
  dailyGoal: number;
  glassOz: number;
  loading: boolean;
  updateFilled: (count: number) => void;
  resetToday: () => void;
}

interface PendingHydrationSave {
  count: number;
  date: string;
}

export function useHydration(): UseHydrationResult {
  const [filled, setFilled] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL);
  const [glassOz, setGlassOz] = useState(DEFAULT_GLASS_OZ);
  const [loading, setLoading] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<PendingHydrationSave | null>(null);

  // Load today's hydration on mount
  useEffect(() => {
    if (!apiService.isAuthenticated()) {
      // Unauthenticated: use localStorage
      const saved = localStorage.getItem(`${LS_KEY_PREFIX}${todayStr()}`);
      if (saved) setFilled(clampWholeNumber(saved, 0, 0, MAX_GLASSES));
      setLoading(false);
      return;
    }

    // Authenticated: fetch from API
    apiService.get(`/api/hydration?date=${todayStr()}`)
      .then(response => {
        const data = response.data;
        if (data.success && data.hydration) {
          setFilled(clampWholeNumber(data.hydration.glassesFilled, 0, 0, MAX_GLASSES));
          setDailyGoal(boundedWholeNumberOrDefault(data.hydration.dailyGoal, DEFAULT_DAILY_GOAL, MAX_GLASSES));
          setGlassOz(boundedPositiveNumberOrDefault(data.hydration.glassOz, DEFAULT_GLASS_OZ, MAX_GLASS_OZ));
        }
      })
      .catch(() => {
        // Fallback to localStorage on API failure
        const saved = localStorage.getItem(`${LS_KEY_PREFIX}${todayStr()}`);
        if (saved) setFilled(clampWholeNumber(saved, 0, 0, MAX_GLASSES));
      })
      .finally(() => setLoading(false));
  }, []);

  const persistHydration = useCallback(({ count, date }: PendingHydrationSave) => {
    if (!apiService.isAuthenticated()) {
      localStorage.setItem(`${LS_KEY_PREFIX}${date}`, String(count));
      return;
    }

    apiService.put('/api/hydration', { glassesFilled: count, date }).catch(() => {
      localStorage.setItem(`${LS_KEY_PREFIX}${date}`, String(count));
    });
  }, []);

  // Debounced save to backend
  const saveToBackend = useCallback((count: number) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    const save = { count, date: todayStr() };
    pendingSave.current = save;
    saveTimeout.current = setTimeout(() => {
      saveTimeout.current = null;
      pendingSave.current = null;
      persistHydration(save);
    }, 300);
  }, [persistHydration]);

  useEffect(() => () => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }

    if (pendingSave.current) {
      const save = pendingSave.current;
      pendingSave.current = null;
      persistHydration(save);
    }
  }, [persistHydration]);

  const updateFilled = useCallback((count: number) => {
    const clamped = clampWholeNumber(count, 0, 0, MAX_GLASSES);
    setFilled(clamped);
    saveToBackend(clamped);
  }, [saveToBackend]);

  const resetToday = useCallback(() => {
    updateFilled(0);
  }, [updateFilled]);

  return { filled, dailyGoal, glassOz, loading, updateFilled, resetToday };
}
