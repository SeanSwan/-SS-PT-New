/**
 * useBootcampAPI -- Frontend hook for Boot Camp Class Builder (Phase 10)
 */
import { useCallback, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────

export type ClassFormat = 'stations_4x' | 'stations_3x5' | 'stations_2x7' | 'full_group' | 'custom';
export type DayType = 'lower_body' | 'upper_body' | 'cardio' | 'full_body' | 'custom';

export interface BootcampExercise {
  exerciseName: string;
  durationSec: number;
  restSec: number;
  sortOrder: number;
  isCardioFinisher: boolean;
  muscleTargets: string;
  easyVariation: string | null;
  mediumVariation: string | null;
  hardVariation: string | null;
  kneeMod: string | null;
  shoulderMod: string | null;
  ankleMod: string | null;
  wristMod: string | null;
  backMod: string | null;
  equipmentRequired: string | null;
  stationIndex?: number;
  board?: 'main' | 'alternative';
  setupTimeSec?: number;
  pyramidStartWeight?: string | null;
  pyramidDrops?: number | null;
  supersetOrder?: number | null;
  supersetGroupId?: number | null;
  exerciseLibraryId?: number | null;
}

export interface BootcampStation {
  stationNumber: number;
  stationName: string;
  equipmentNeeded: string;
  sortOrder: number;
  setupTimeSec?: number;
  flowScore?: number;
  bottleneck?: boolean;
}

export interface StationFlowData {
  station: number;
  name: string;
  maxSetupSec: number;
  avgSetupSec: number;
  flowScore: number;
  bottleneck: boolean;
}

export interface OverflowPlan {
  triggerCount: number;
  strategy: string;
  lapExercises: Array<{ name: string; durationMin: number }>;
  lapDurationMin: number;
}

export interface BootcampExplanation {
  type: string;
  message: string;
}

export type ClassStyle = 'standard' | 'pyramid' | 'superset' | 'mixed';
export type IntensityCategory = 'high_impact' | 'medium_impact' | 'calisthenics' | 'stability' | 'flexibility' | 'cardio';

export interface BootcampStretch {
  exerciseName: string;
  targetMuscles: string;
  durationSec: number;
  sortOrder: number;
}

export interface GeneratedBootcamp {
  name: string;
  classFormat: ClassFormat;
  classStyle?: ClassStyle;
  dayType: DayType;
  intensityCategory?: IntensityCategory;
  stationCount: number;
  targetDuration: number;
  totalWorkoutMin: number;
  demoDuration: number;
  clearDuration: number;
  stretchDurationMin?: number;
  totalClassMin: number;
  expectedParticipants: number;
  includeStretch?: boolean;
  stations: BootcampStation[];
  exercises: BootcampExercise[];
  stretches?: BootcampStretch[];
  overflowPlan: OverflowPlan | null;
  flowData?: StationFlowData[];
  explanations: BootcampExplanation[];
  aiGenerated: boolean;
}

export interface SpaceProfile {
  id: number;
  name: string;
  locationName: string | null;
  totalAreaSqft: number | null;
  maxStations: number | null;
  maxPerStation: number;
  hasOutdoorAccess: boolean;
  outdoorDescription: string | null;
}

export interface ClassLogEntry {
  id: number;
  classDate: string;
  dayType: string | null;
  actualParticipants: number | null;
  overflowActivated: boolean;
  exercisesUsed: unknown;
  trainerNotes: string | null;
  classRating: number | null;
  energyLevel: string | null;
}

export interface ExerciseTrend {
  id: number;
  exerciseName: string;
  source: string;
  trendScore: number | null;
  nasmRating: string | null;
  impactLevel: string | null;
  muscleTargets: string | null;
  difficulty: string | null;
  description: string | null;
  isApproved: boolean;
}

// ── API Helpers ───────────────────────────────────────────────────────

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const API_BASE_URL = import.meta.env.PROD ||
  window.location.hostname.includes('render.com') ||
  window.location.hostname.includes('sswanstudios.com') ||
  window.location.hostname.includes('swanstudios.com')
    ? 'https://ss-pt-new.onrender.com'
    : 'http://localhost:10000';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, { ...options, headers: { ...getHeaders(), ...options?.headers } });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned invalid response (${res.status})`);
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useBootcampAPI() {
  const generateClass = useCallback(async (params: {
    classFormat: ClassFormat;
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
