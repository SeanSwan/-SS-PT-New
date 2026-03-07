/**
 * useVariationAPI — React hook for Workout Variation Engine.
 * Phase 8: Communicates with /api/variation endpoints.
 */
import { useCallback } from 'react';

const API_BASE = '/api/variation';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...getHeaders(), ...options?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export interface SwapSuggestion {
  original: string;
  replacement: string | null;
  muscleMatch: number;
  nasmConfidence: string;
  replacementName?: string;
  originalName?: string;
  muscles?: string[];
}

export interface SuggestResponse {
  success: boolean;
  sessionType: 'build' | 'switch';
  sessionNumber: number;
  rotationPattern: string;
  suggestions: SwapSuggestion[] | null;
  logId: number;
}

export interface TimelineEntry {
  id: number;
  sessionType: 'build' | 'switch';
  sessionNumber: number;
  sessionDate: string;
  accepted: boolean;
  exerciseCount: number;
}

export interface TimelineResponse {
  success: boolean;
  timeline: TimelineEntry[];
  nextSessionType: 'build' | 'switch';
  rotationPattern: string;
}

export interface VariationLog {
  id: number;
  clientId: number;
  trainerId: number;
  templateCategory: string;
  sessionType: 'build' | 'switch';
  rotationPattern: string;
  sessionNumber: number;
  exercisesUsed: string[];
  swapDetails: SwapSuggestion[] | null;
  equipmentProfileId: number | null;
  nasmPhase: string | null;
  sessionDate: string;
  accepted: boolean;
  acceptedAt: string | null;
}

export interface ExerciseEntry {
  key: string;
  name: string;
  muscles: string[];
  category: string;
  equipment: string[];
  nasmLevel: number;
}

export interface RotationPattern {
  key: string;
  buildCount: number;
  label: string;
}

export function useVariationAPI() {
  const suggest = useCallback(async (data: {
    clientId: number;
    templateCategory: string;
    exercises: string[];
    rotationPattern?: string;
    compensations?: string[];
    equipmentProfileId?: number;
    nasmPhase?: string;
  }) => {
    return apiFetch<SuggestResponse>(`${API_BASE}/suggest`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }, []);

  const accept = useCallback(async (logId: number) => {
    return apiFetch<{ success: boolean; log: VariationLog }>(`${API_BASE}/accept`, {
      method: 'POST',
      body: JSON.stringify({ logId }),
    });
  }, []);

  const getHistory = useCallback(async (clientId: number, params?: {
    category?: string; page?: number; limit?: number;
  }) => {
    const qs = new URLSearchParams();
    qs.set('clientId', String(clientId));
    if (params?.category) qs.set('category', params.category);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiFetch<{
      success: boolean;
      logs: VariationLog[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`${API_BASE}/history?${qs.toString()}`);
  }, []);

  const getTimeline = useCallback(async (clientId: number, category: string, pattern?: string) => {
    const qs = new URLSearchParams();
    qs.set('clientId', String(clientId));
    qs.set('category', category);
    if (pattern) qs.set('pattern', pattern);
    return apiFetch<TimelineResponse>(`${API_BASE}/timeline?${qs.toString()}`);
  }, []);

  const getExercises = useCallback(async (params?: { category?: string; muscle?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.muscle) qs.set('muscle', params.muscle);
    return apiFetch<{ success: boolean; exercises: ExerciseEntry[] }>(
      `${API_BASE}/exercises?${qs.toString()}`
    );
  }, []);

  const getPatterns = useCallback(async () => {
    return apiFetch<{ success: boolean; patterns: RotationPattern[] }>(`${API_BASE}/patterns`);
  }, []);

  return { suggest, accept, getHistory, getTimeline, getExercises, getPatterns };
}

export default useVariationAPI;
