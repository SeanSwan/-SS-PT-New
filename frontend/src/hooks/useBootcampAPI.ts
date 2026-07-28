/**
 * useBootcampAPI -- Frontend hook for Boot Camp Class Builder (Phase 10)
 */
import { useCallback, useMemo } from 'react';
import apiService from '../services/api.service';
import type {
  ClassFormat,
  ClassLogEntry,
  ClassStyle,
  DayType,
  ExerciseTrend,
  GeneratedBootcamp,
  IntensityCategory,
  SpaceProfile,
} from './useBootcampAPI.types';

export type {
  BootcampExercise,
  BootcampExplanation,
  BootcampEquipmentReadiness,
  BootcampStation,
  BootcampStretch,
  ClassFormat,
  ClassLogEntry,
  ClassStyle,
  DayType,
  ExerciseTrend,
  GeneratedBootcamp,
  IntensityCategory,
  OverflowPlan,
  SpaceProfile,
  StationFlowData,
} from './useBootcampAPI.types';

// Types

// API Helpers

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const payload = typeof options?.body === 'string'
    ? JSON.parse(options.body)
    : options?.body;

  try {
    const response = method === 'POST'
      ? await apiService.post<T>(url, payload)
      : method === 'PUT'
        ? await apiService.put<T>(url, payload)
        : method === 'DELETE'
          ? await apiService.delete<T>(url)
          : await apiService.get<T>(url);

    return response.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Request failed');
  }
}

// Hook

export function useBootcampAPI() {
  const generateClass = useCallback(async (params: {
    classFormat: ClassFormat;
    stationCount?: number;
    exercisesPerStation?: number;
    classStyle?: ClassStyle;
    dayType: DayType;
    intensityCategory?: IntensityCategory;
    targetDuration?: number;
    expectedParticipants?: number;
    spaceProfileId?: number;
    equipmentProfileId?: number;
    name?: string;
    optPhase?: number;
    includeStretch?: boolean;
    stretchDurationMin?: number;
  }): Promise<GeneratedBootcamp> => {
    const data = await apiFetch<{ success: boolean; bootcamp: GeneratedBootcamp }>(
      '/api/bootcamp/generate',
      { method: 'POST', body: JSON.stringify(params) }
    );
    return data.bootcamp;
  }, []);

  const saveTemplate = useCallback(async (generatedClass: GeneratedBootcamp): Promise<number> => {
    const data = await apiFetch<{ success: boolean; templateId: number }>(
      '/api/bootcamp/save',
      { method: 'POST', body: JSON.stringify({ generatedClass }) }
    );
    return data.templateId;
  }, []);

  const getTemplates = useCallback(async (params?: {
    classFormat?: ClassFormat;
    dayType?: DayType;
  }) => {
    const query = new URLSearchParams();
    if (params?.classFormat) query.set('classFormat', params.classFormat);
    if (params?.dayType) query.set('dayType', params.dayType);
    const data = await apiFetch<{ success: boolean; templates: unknown[] }>(
      `/api/bootcamp/templates?${query}`
    );
    return data.templates;
  }, []);

  const logClass = useCallback(async (params: {
    classDate: string;
    exercisesUsed: unknown;
    templateId?: number;
    dayType?: DayType;
    actualParticipants?: number;
    trainerNotes?: string;
    classRating?: number;
    energyLevel?: string;
    overflowActivated?: boolean;
    modificationsMade?: unknown;
  }): Promise<number> => {
    const data = await apiFetch<{ success: boolean; logId: number }>(
      '/api/bootcamp/log',
      { method: 'POST', body: JSON.stringify(params) }
    );
    return data.logId;
  }, []);

  const getHistory = useCallback(async (params?: { dayType?: DayType; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.dayType) query.set('dayType', params.dayType);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const data = await apiFetch<{ success: boolean; logs: ClassLogEntry[]; total: number }>(
      `/api/bootcamp/history?${query}`
    );
    return data;
  }, []);

  const getSpaces = useCallback(async (): Promise<SpaceProfile[]> => {
    const data = await apiFetch<{ success: boolean; spaces: SpaceProfile[] }>('/api/bootcamp/spaces');
    return data.spaces;
  }, []);

  const createSpace = useCallback(async (params: {
    name: string;
    locationName?: string;
    totalAreaSqft?: number;
    maxStations?: number;
    maxPerStation?: number;
    hasOutdoorAccess?: boolean;
    outdoorDescription?: string;
  }): Promise<SpaceProfile> => {
    const data = await apiFetch<{ success: boolean; space: SpaceProfile }>(
      '/api/bootcamp/spaces',
      { method: 'POST', body: JSON.stringify(params) }
    );
    return data.space;
  }, []);

  const getTrends = useCallback(async (params?: { source?: string; isApproved?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.source) query.set('source', params.source);
    if (params?.isApproved != null) query.set('isApproved', String(params.isApproved));
    const data = await apiFetch<{ success: boolean; trends: ExerciseTrend[] }>(
      `/api/bootcamp/trends?${query}`
    );
    return data.trends;
  }, []);

  const approveTrend = useCallback(async (trendId: number) => {
    await apiFetch(`/api/bootcamp/trends/${trendId}/approve`, { method: 'POST' });
  }, []);

  return useMemo(() => ({
    generateClass,
    saveTemplate,
    getTemplates,
    logClass,
    getHistory,
    getSpaces,
    createSpace,
    getTrends,
    approveTrend,
  }), [generateClass, saveTemplate, getTemplates, logClass, getHistory, getSpaces, createSpace, getTrends, approveTrend]);
}
