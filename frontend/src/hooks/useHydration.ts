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

const LS_KEY_PREFIX = 'ss-hydration-';
const todayStr = () => new Date().toISOString().split('T')[0];

interface UseHydrationResult {
  filled: number;
  dailyGoal: number;
  loading: boolean;
  updateFilled: (count: number) => void;
  resetToday: () => void;
}

export function useHydration(): UseHydrationResult {
  const [filled, setFilled] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(8);
  const [loading, setLoading] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load today's hydration on mount
  useEffect(() => {
    if (!apiService.isAuthenticated()) {
      // Unauthenticated: use localStorage
      const saved = localStorage.getItem(`${LS_KEY_PREFIX}${todayStr()}`);
      if (saved) setFilled(Number(saved) || 0);
      setLoading(false);
      return;
    }

    // Authenticated: fetch from API
    apiService.get(`/api/hydration?date=${todayStr()}`)
      .then(response => {
        const data = response.data;
        if (data.success && data.hydration) {
          setFilled(data.hydration.glassesFilled);
          setDailyGoal(data.hydration.dailyGoal);
        }
      })
      .catch(() => {
        // Fallback to localStorage on API failure
        const saved = localStorage.getItem(`${LS_KEY_PREFIX}${todayStr()}`);
        if (saved) setFilled(Number(saved) || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  // Debounced save to backend
  const saveToBackend = useCallback((count: number) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(() => {
      if (!apiService.isAuthenticated()) {
        localStorage.setItem(`${LS_KEY_PREFIX}${todayStr()}`, String(count));
        return;
      }

      apiService.put('/api/hydration', { glassesFilled: count, date: todayStr() }).catch(() => {
        // Save to localStorage as fallback
        localStorage.setItem(`${LS_KEY_PREFIX}${todayStr()}`, String(count));
      });
    }, 300);
  }, []);

  const updateFilled = useCallback((count: number) => {
    const clamped = Math.max(0, Math.min(count, 30));
    setFilled(clamped);
    saveToBackend(clamped);
  }, [saveToBackend]);

  const resetToday = useCallback(() => {
    updateFilled(0);
  }, [updateFilled]);

  return { filled, dailyGoal, loading, updateFilled, resetToday };
}
