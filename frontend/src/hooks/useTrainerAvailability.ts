/**
 * useTrainerAvailability - Trainer Availability Hooks
 * ====================================================
 * Provides hooks for fetching and managing trainer availability.
 */

import { useState, useEffect, useCallback } from 'react';

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

  const dateStr = date ? date.toISOString().split('T')[0] : null;

  const fetchSlots = useCallback(async () => {
    if (!trainerId || !dateStr) {
      setSlots([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/availability/${trainerId}/slots?date=${dateStr}&duration=${duration}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch slots');
      }

      const result = await response.json();
      setSlots(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [trainerId, dateStr, duration]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return {
    slots,
    isLoading,
    error,
    refetch: fetchSlots
  };
};
