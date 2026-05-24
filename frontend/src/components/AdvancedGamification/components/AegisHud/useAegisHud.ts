/**
 * ============================================================================
 * FILE: useAegisHud.ts
 * PURPOSE: React hook for fetching and managing Aegis HUD needs data
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * ============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../../../../services/api.service';
import type { AegisHudData } from './AegisHudTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: API Helpers
// ─────────────────────────────────────────────────────────────

const API_BASE = '/api/gamification';

const parseBody = (body: BodyInit | null | undefined) => {
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const data = parseBody(options.body);
  const config = { validateStatus: () => true };
  const res = method === 'POST'
    ? await apiService.post(url, data, config)
    : method === 'PUT'
      ? await apiService.put(url, data, config)
      : method === 'DELETE'
        ? await apiService.delete(url, config)
        : await apiService.get(url, config);

  if (res.status < 200 || res.status >= 300) {
    const message = (res.data as { message?: string; error?: string } | undefined)?.message
      || (res.data as { message?: string; error?: string } | undefined)?.error
      || `Aegis HUD API error: ${res.status}`;
    throw new Error(message);
  }

  return res.data as T;
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

interface AegisHudResponse {
  success: boolean;
  data: AegisHudData;
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
      const result = await fetchWithAuth<AegisHudResponse>(`${API_BASE}/users/${userId}/aegis-hud`);
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
      const result = await fetchWithAuth<AegisHudResponse>(`${API_BASE}/users/${userId}/aegis-hud/replenish`, {
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
