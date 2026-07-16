/**
 * FILE: useAegisHud.ts
 * PURPOSE: Fetch and manage Aegis HUD needs data through apiService.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../../../../services/api.service';
import { GAMIFICATION_SAFE_ERROR_COPY, getGamificationUserPath } from '../../utils/gamificationPath';
import type { AegisHudData } from './AegisHudTypes';

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
    throw new Error(`Aegis HUD API error: ${res.status}`);
  }

  if ((res.data as { success?: unknown } | null | undefined)?.success === false) {
    throw new Error(`Aegis HUD API error: ${res.status}`);
  }

  return res.data as T;
}

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

const isAegisHudData = (value: unknown): value is AegisHudData => {
  const data = value as Partial<AegisHudData> | null | undefined;
  return Array.isArray(data?.needs)
    && typeof data.overallHealth === 'number'
    && Number.isFinite(data.overallHealth);
};

const getValidAegisHudData = (result: AegisHudResponse): AegisHudData => {
  if (!result.success || !isAegisHudData(result.data)) {
    throw new Error('Invalid Aegis HUD payload');
  }
  return result.data;
};

export function useAegisHud(userId: number | null | undefined, options: UseAegisHudOptions = {}) {
  const { refreshInterval = 60000, skip = false } = options;

  const [data, setData] = useState<AegisHudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNeeds = useCallback(async () => {
    const aegisPath = getGamificationUserPath(userId, '/aegis-hud');
    if (!aegisPath || skip) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth<AegisHudResponse>(`${API_BASE}${aegisPath}`);
      setData(getValidAegisHudData(result));
    } catch {
      setData(null);
      setError(GAMIFICATION_SAFE_ERROR_COPY);
    } finally {
      setLoading(false);
    }
  }, [userId, skip]);

  useEffect(() => {
    fetchNeeds();

    if (refreshInterval > 0 && !skip && getGamificationUserPath(userId, '/aegis-hud')) {
      intervalRef.current = setInterval(fetchNeeds, refreshInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNeeds, refreshInterval, skip, userId]);

  const replenish = useCallback(async (actionType: string) => {
    const aegisPath = getGamificationUserPath(userId, '/aegis-hud/replenish');
    if (!aegisPath) return;
    try {
      const result = await fetchWithAuth<AegisHudResponse>(`${API_BASE}${aegisPath}`, {
        method: 'POST',
        body: JSON.stringify({ actionType }),
      });
      setData(getValidAegisHudData(result));
    } catch {
      setError(GAMIFICATION_SAFE_ERROR_COPY);
    }
  }, [userId]);

  return { data, loading, error, refresh: fetchNeeds, replenish };
}

export default useAegisHud;
