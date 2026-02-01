/**
 * useSessionTypes Hook - Universal Master Schedule (Phase 5)
 * ==========================================================
 *
 * Purpose:
 * Fetch and manage session type definitions for buffer-aware scheduling.
 * Provides CRUD helpers, reorder support, and effective end time utilities.
 *
 * Blueprint Reference:
 * docs/ai-workflow/blueprints/UNIVERSAL-SCHEDULE-PHASE-5-BUFFER-TIMES.md
 */

import { useCallback, useState } from 'react';
import apiService from '../../../services/api';

export interface SessionType {
  id: number;
  name: string;
  description?: string;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  color: string;
  price?: number;
  isActive: boolean;
  sortOrder: number;
}

export interface UseSessionTypesReturn {
  sessionTypes: SessionType[];
  loading: boolean;
  error: string | null;
  fetchSessionTypes: () => Promise<void>;
  createSessionType: (data: Partial<SessionType>) => Promise<SessionType>;
  updateSessionType: (id: number, data: Partial<SessionType>) => Promise<SessionType>;
  deleteSessionType: (id: number) => Promise<void>;
  reorderSessionTypes: (ids: number[]) => Promise<void>;
  getEffectiveEndTime: (startTime: Date, sessionTypeId: number) => Date;
}

const normalizeSessionType = (payload: any): SessionType => ({
  id: Number(payload.id),
  name: payload.name,
  description: payload.description ?? undefined,
  duration: Number(payload.duration ?? 60),
  bufferBefore: Number(payload.bufferBefore ?? 0),
  bufferAfter: Number(payload.bufferAfter ?? 0),
  color: payload.color ?? '#00FFFF',
  price: payload.price ?? undefined,
  isActive: Boolean(payload.isActive ?? true),
  sortOrder: Number(payload.sortOrder ?? 0)
});

export const useSessionTypes = (): UseSessionTypesReturn => {
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get('/api/session-types');
      const payload = response?.data?.data ?? response?.data ?? [];
      const normalized = Array.isArray(payload) ? payload.map(normalizeSessionType) : [];
      setSessionTypes(normalized);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to fetch session types';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSessionType = useCallback(async (data: Partial<SessionType>) => {
    const response = await apiService.post('/api/session-types', data);
    const payload = response?.data?.data ?? response?.data;
    const created = normalizeSessionType(payload);
    setSessionTypes((prev) => {
      const next = [...prev, created];
      return next.sort((a, b) => a.sortOrder - b.sortOrder);
    });
    return created;
  }, []);

  const updateSessionType = useCallback(async (id: number, data: Partial<SessionType>) => {
    const response = await apiService.put(`/api/session-types/${id}`, data);
    const payload = response?.data?.data ?? response?.data;
    const updated = normalizeSessionType(payload);
    setSessionTypes((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return updated;
  }, []);

  const deleteSessionType = useCallback(async (id: number) => {
    await apiService.delete(`/api/session-types/${id}`);
    setSessionTypes((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const reorderSessionTypes = useCallback(async (ids: number[]) => {
    await apiService.post('/api/session-types/reorder', { ids });
    setSessionTypes((prev) => {
      const orderMap = new Map(ids.map((id, index) => [id, index + 1]));
      return prev
        .map((item) => ({
          ...item,
          sortOrder: orderMap.get(item.id) ?? item.sortOrder
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }, []);

  const getEffectiveEndTime = useCallback(
    (startTime: Date, sessionTypeId: number) => {
      const sessionType = sessionTypes.find((item) => item.id === sessionTypeId);
      if (!sessionType) {
        return new Date(startTime.getTime());
      }
      const totalMinutes = sessionType.duration + sessionType.bufferAfter;
      return new Date(startTime.getTime() + totalMinutes * 60000);
    },
    [sessionTypes]
  );

  return {
    sessionTypes,
    loading,
    error,
    fetchSessionTypes,
    createSessionType,
    updateSessionType,
    deleteSessionType,
    reorderSessionTypes,
    getEffectiveEndTime
  };
};

export default useSessionTypes;
