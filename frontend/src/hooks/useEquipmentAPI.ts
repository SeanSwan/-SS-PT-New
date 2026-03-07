/**
 * useEquipmentAPI — React hook for Equipment Profile Manager CRUD + AI scan.
 * Phase 7: Communicates with /api/equipment-profiles endpoints.
 */
import { useCallback } from 'react';

const API_BASE = '/api/equipment-profiles';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...getHeaders(), ...options?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export interface EquipmentProfile {
  id: number;
  trainerId: number;
  name: string;
  locationType: 'gym' | 'park' | 'home' | 'client_home' | 'custom';
  description: string | null;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
  equipmentCount: number;
  coverPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentItem {
  id: number;
  profileId: number;
  name: string;
  trainerLabel: string | null;
  category: string;
  resistanceType: string | null;
  description: string | null;
  photoUrl: string | null;
  aiScanData: AiScanData | null;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'manual';
  approvedAt: string | null;
  isActive: boolean;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiScanData {
  confidence: number;
  boundingBox: { x: number; y: number; w: number; h: number } | null;
  suggestedName: string;
  suggestedCategory: string;
  suggestedExercises: string[];
  rawResponse: Record<string, unknown>;
  latencyMs: number;
  model: string;
  scannedAt: string;
}

export interface ExerciseMapping {
  id: number;
  equipmentItemId: number;
  exerciseKey: string;
  exerciseName: string;
  isCustomExercise: boolean;
  customExerciseId: number | null;
  isPrimary: boolean;
  isAiSuggested: boolean;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScanResult {
  confidence: number;
  suggestedName: string;
  suggestedCategory: string;
  suggestedExercises: string[];
  boundingBox: { x: number; y: number; w: number; h: number } | null;
}

export interface EquipmentStats {
  profileCount: number;
  itemCount: number;
  pendingApprovals: number;
}

export function useEquipmentAPI() {
  // ── Profile CRUD ──────────────────────────────────────────────────

  const listProfiles = useCallback(async (params?: { locationType?: string; trainerId?: number }) => {
    const qs = new URLSearchParams();
    if (params?.locationType) qs.set('locationType', params.locationType);
    if (params?.trainerId) qs.set('trainerId', String(params.trainerId));
    return apiFetch<{ success: boolean; profiles: EquipmentProfile[] }>(`${API_BASE}?${qs.toString()}`);
  }, []);

  const getProfile = useCallback(async (id: number) => {
    return apiFetch<{ success: boolean; profile: EquipmentProfile; items: EquipmentItem[] }>(`${API_BASE}/${id}`);
  }, []);

  const createProfile = useCallback(async (data: {
    name: string; locationType?: string; description?: string; address?: string;
  }) => {
    return apiFetch<{ success: boolean; profile: EquipmentProfile }>(API_BASE, {
      method: 'POST', body: JSON.stringify(data),
    });
  }, []);

  const updateProfile = useCallback(async (id: number, data: Partial<{
    name: string; locationType: string; description: string; address: string;
  }>) => {
    return apiFetch<{ success: boolean; profile: EquipmentProfile }>(`${API_BASE}/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }, []);

  const deleteProfile = useCallback(async (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`${API_BASE}/${id}`, { method: 'DELETE' });
  }, []);

  // ── Item CRUD ─────────────────────────────────────────────────────

  const listItems = useCallback(async (profileId: number, params?: {
    category?: string; approvalStatus?: string; page?: number; limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.approvalStatus) qs.set('approvalStatus', params.approvalStatus);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiFetch<{ success: boolean; items: EquipmentItem[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
      `${API_BASE}/${profileId}/items?${qs.toString()}`
    );
  }, []);

  const addItem = useCallback(async (profileId: number, data: {
    name: string; category?: string; resistanceType?: string; description?: string; quantity?: number;
  }) => {
    return apiFetch<{ success: boolean; item: EquipmentItem }>(`${API_BASE}/${profileId}/items`, {
      method: 'POST', body: JSON.stringify(data),
    });
  }, []);

  const updateItem = useCallback(async (profileId: number, itemId: number, data: Partial<{
    name: string; trainerLabel: string; category: string; resistanceType: string; description: string; quantity: number;
  }>) => {
    return apiFetch<{ success: boolean; item: EquipmentItem }>(`${API_BASE}/${profileId}/items/${itemId}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }, []);

  const deleteItem = useCallback(async (profileId: number, itemId: number) => {
    return apiFetch<{ success: boolean; message: string }>(`${API_BASE}/${profileId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }, []);

  // ── AI Scan ───────────────────────────────────────────────────────

  const scanEquipment = useCallback(async (profileId: number, photo: File) => {
    const formData = new FormData();
    formData.append('photo', photo);
    const res = await fetch(`${API_BASE}/${profileId}/scan`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Scan failed (${res.status})`);
    return data as { success: boolean; item: EquipmentItem; scanResult: ScanResult };
  }, []);

  const approveItem = useCallback(async (profileId: number, itemId: number, overrides?: {
    name?: string; trainerLabel?: string; category?: string; resistanceType?: string;
  }) => {
    return apiFetch<{ success: boolean; item: EquipmentItem }>(
      `${API_BASE}/${profileId}/items/${itemId}/approve`,
      { method: 'PUT', body: JSON.stringify(overrides || {}) }
    );
  }, []);

  const rejectItem = useCallback(async (profileId: number, itemId: number) => {
    return apiFetch<{ success: boolean; message: string }>(
      `${API_BASE}/${profileId}/items/${itemId}/reject`,
      { method: 'PUT' }
    );
  }, []);

  // ── Exercise Mapping ──────────────────────────────────────────────

  const listExerciseMappings = useCallback(async (profileId: number, itemId: number) => {
    return apiFetch<{ success: boolean; mappings: ExerciseMapping[] }>(
      `${API_BASE}/${profileId}/items/${itemId}/exercises`
    );
  }, []);

  const addExerciseMapping = useCallback(async (profileId: number, itemId: number, data: {
    exerciseKey: string; exerciseName: string; isCustomExercise?: boolean; customExerciseId?: number; isPrimary?: boolean;
  }) => {
    return apiFetch<{ success: boolean; mapping: ExerciseMapping }>(
      `${API_BASE}/${profileId}/items/${itemId}/exercises`,
      { method: 'POST', body: JSON.stringify(data) }
    );
  }, []);

  const removeExerciseMapping = useCallback(async (profileId: number, itemId: number, mapId: number) => {
    return apiFetch<{ success: boolean; message: string }>(
      `${API_BASE}/${profileId}/items/${itemId}/exercises/${mapId}`,
      { method: 'DELETE' }
    );
  }, []);

  const confirmExerciseMapping = useCallback(async (profileId: number, itemId: number, mapId: number) => {
    return apiFetch<{ success: boolean; mapping: ExerciseMapping }>(
      `${API_BASE}/${profileId}/items/${itemId}/exercises/${mapId}/confirm`,
      { method: 'PUT' }
    );
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────

  const getStats = useCallback(async () => {
    return apiFetch<{ success: boolean; stats: EquipmentStats }>(`${API_BASE}/stats`);
  }, []);

  return {
    listProfiles, getProfile, createProfile, updateProfile, deleteProfile,
    listItems, addItem, updateItem, deleteItem,
    scanEquipment, approveItem, rejectItem,
    listExerciseMappings, addExerciseMapping, removeExerciseMapping, confirmExerciseMapping,
    getStats,
  };
}

export default useEquipmentAPI;
