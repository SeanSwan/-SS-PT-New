/**
 * useTrainerAvailability - Trainer Availability Hooks
 * ====================================================
 * Provides hooks for fetching and managing trainer availability.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Simple in-memory cache to deduplicate requests
const slotsCache = new Map<string, { data: any; timestamp: number; error?: boolean }>();
const CACHE_TTL = 30000; // 30 seconds
const ERROR_COOLDOWN = 60000; // 60 seconds before retrying failed requests

export interface AvailabilityEntry {
  id?: number;
  trainerId: number;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startTime: string; // "HH:MM"
  endTime: string;
  isRecurring: boolean;
  type: 'available' | 'blocked' | 'vacation';
  reason?: string;
}

export interface AvailabilitySlot {
  startTime: string; // ISO string
  endTime: string;
}

interface AvailabilityData {
  recurring: AvailabilityEntry[];
  overrides: AvailabilityEntry[];
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const useTrainerAvailability = (trainerId: number | string | null) => {
  const [data, setData] = useState<AvailabilityData>({ recurring: [], overrides: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingOverride, setIsAddingOverride] = useState(false);

  const fetchAvailability = useCallback(async () => {
    if (!trainerId) {
      setData({ recurring: [], overrides: [] });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/availability/${trainerId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const result = await response.json();
      setData(result.data || { recurring: [], overrides: [] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [trainerId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const updateSchedule = useCallback(async (schedule: AvailabilityEntry[]) => {
    if (!trainerId) {
      throw new Error('No trainer ID');
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/availability/${trainerId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ schedule })
      });

      if (!response.ok) {
        throw new Error('Failed to update availability');
      }

      const result = await response.json();
      await fetchAvailability();
      return result;
    } finally {
      setIsUpdating(false);
    }
  }, [trainerId, fetchAvailability]);

  const addOverride = useCallback(async (override: {
    date: string;
    startTime: string;
    endTime: string;
    type?: string;
    reason?: string;
    trainerId?: number;
  }) => {
    if (!trainerId) {
      throw new Error('No trainer ID');
    }

    setIsAddingOverride(true);

    try {
      const response = await fetch(`/api/availability/${trainerId}/override`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(override)
      });

      if (!response.ok) {
        throw new Error('Failed to create override');
      }

      const result = await response.json();
      await fetchAvailability();
      return result;
    } finally {
      setIsAddingOverride(false);
    }
  }, [trainerId, fetchAvailability]);

  return {
    recurring: data.recurring,
    overrides: data.overrides,
    isLoading,
    error,
    refetch: fetchAvailability,
    updateSchedule,
    isUpdating,
    addOverride,
    isAddingOverride
  };
};

export const useAvailableSlots = (
  trainerId: number | string | null,
  date: Date | null,
  duration: number = 60
) => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef(false);
  const lastParamsRef = useRef<string>('');

  // Memoize dateStr to prevent unnecessary recalculations
  const dateStr = useMemo(() => {
    return date ? date.toISOString().split('T')[0] : null;
  }, [date?.getTime()]);

  // Create a stable cache key
  const cacheKey = useMemo(() => {
    return trainerId && dateStr ? `${trainerId}-${dateStr}-${duration}` : null;
  }, [trainerId, dateStr, duration]);

  const fetchSlots = useCallback(async (forceRefresh = false) => {
    if (!trainerId || !dateStr || !cacheKey) {
      setSlots([]);
      return;
    }

    // Check cache first
    const cached = slotsCache.get(cacheKey);
    const now = Date.now();

    // If we have a cached error, don't retry until cooldown expires
    if (cached?.error && now - cached.timestamp < ERROR_COOLDOWN && !forceRefresh) {
      return;
    }

    // If we have valid cached data, use it
    if (cached && !cached.error && now - cached.timestamp < CACHE_TTL && !forceRefresh) {
      setSlots(cached.data || []);
      return;
    }

    // Prevent duplicate requests for the same params
    const paramsKey = `${trainerId}-${dateStr}-${duration}`;
    if (lastParamsRef.current === paramsKey && fetchedRef.current && !forceRefresh) {
      return;
    }

    lastParamsRef.current = paramsKey;
    fetchedRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/availability/${trainerId}/slots?date=${dateStr}&duration=${duration}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        // Cache the error to prevent repeated failed requests
        slotsCache.set(cacheKey, { data: [], timestamp: now, error: true });
        throw new Error('Failed to fetch slots');
      }

      const result = await response.json();
      const slotsData = result.data || [];

      // Cache successful response
      slotsCache.set(cacheKey, { data: slotsData, timestamp: now });
      setSlots(slotsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [trainerId, dateStr, duration, cacheKey]);

  // Reset fetch state when params change
  useEffect(() => {
    const paramsKey = `${trainerId}-${dateStr}-${duration}`;
    if (lastParamsRef.current !== paramsKey) {
      fetchedRef.current = false;
    }
  }, [trainerId, dateStr, duration]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return {
    slots,
    isLoading,
    error,
    refetch: () => fetchSlots(true)
  };
};
