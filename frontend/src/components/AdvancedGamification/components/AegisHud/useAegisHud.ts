/**
 * ============================================================================
 * FILE: useAegisHud.ts
 * PURPOSE: React hook for fetching and managing Aegis HUD needs data
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * ============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AegisHudData } from './AegisHudTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: API Helpers
// ─────────────────────────────────────────────────────────────

const API_BASE = '/api/gamification';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Aegis HUD API error: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ──��──────────────────────────────────────────────────────────

interface UseAegisHudOptions {
  /** Auto-refresh interval in ms (default: 60000 = 1 min) */
  refreshInterval?: number;
  /** Skip fetching (for SSR or conditional rendering) */
  skip?: boolean;
}

export function useAegisHud(userId: number | null | undefined, options: UseAegisHudOptions = {}) {
  const { refreshInterval = 60000, skip = false } = options;

  const [data, setData] = useState<AegisHudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNeeds = useCallback(async () => {
    if (!userId || skip) return;

    try {
      setError(null);
      const result = await fetchWithAuth(`${API_BASE}/users/${userId}/aegis-hud`);
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load Aegis HUD';
      setError(msg);
      console.error('[AegisHUD]', msg);
    } finally {
      setLoading(false);
    }
  }, [userId, skip]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchNeeds();

    if (refreshInterval > 0 && !skip) {
      intervalRef.current = setInterval(fetchNeeds, refreshInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNeeds, refreshInterval, skip]);

  // Replenish action (call after workout, social post, etc.)
  const replenish = useCallback(async (actionType: string) => {
    if (!userId) return;
    try {
      const result = await fetchWithAuth(`${API_BASE}/users/${userId}/aegis-hud/replenish`, {
        method: 'POST',
        body: JSON.stringify({ actionType }),
      });
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error('[AegisHUD] replenish failed:', err);
    }
  }, [userId]);

  return { data, loading, error, refresh: fetchNeeds, replenish };
}

export default useAegisHud;
