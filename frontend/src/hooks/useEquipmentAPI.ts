/**
 * useEquipmentAPI - React hook for Equipment Profile Manager CRUD + AI scan.
 * Phase 7: Communicates with /api/equipment-profiles endpoints.
 */
import { useCallback, useMemo } from 'react';
import apiService from '../services/api.service';
import type {
  EquipmentItem,
  EquipmentProfile,
  EquipmentScanCandidateReviewPayload,
  EquipmentScanCandidateReviewResponse,
  EquipmentScanError,
  EquipmentScanErrorPayload,
  EquipmentScanResponse,
  EquipmentStats,
  ExerciseMapping,
} from './equipmentApiTypes';
export type {
  AiScanData,
  EquipmentItem,
  EquipmentProfile,
  EquipmentScanCandidate,
  EquipmentScanCandidateReviewPayload,
  EquipmentScanCandidateReviewResponse,
  EquipmentScanDuplicate,
  EquipmentScanError,
  EquipmentScanErrorPayload,
  EquipmentScanResponse,
  EquipmentScanSession,
  EquipmentStats,
  ExerciseMapping,
  ScanResult,
} from './equipmentApiTypes';

const API_BASE = '/api/equipment-profiles';
const ACCEPTED_EQUIPMENT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_EQUIPMENT_IMAGE_BYTES = 10 * 1024 * 1024;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const method = (options?.method || 'GET').toUpperCase();
    const payload = typeof options?.body === 'string'
      ? JSON.parse(options.body)
      : options?.body;

    if (method === 'POST') {
      const response = await apiService.post<T>(url, payload);
      return response.data;
    }
    if (method === 'PUT') {
      const response = await apiService.put<T>(url, payload);
      return response.data;
    }
    if (method === 'DELETE') {
      const response = await apiService.delete<T>(url);
      return response.data;
    }

    const response = await apiService.get<T>(url);
    return response.data;
  } catch (err) {
    throw new Error(getEquipmentApiErrorMessage(err, 'Request failed'));
  }
}

type ApiErrorLike = {
  message?: unknown;
  response?: {
    data?: {
      error?: unknown;
      message?: unknown;
    };
  };
};

const firstNonEmptyString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
};

export function getEquipmentApiErrorMessage(err: unknown, fallback: string): string {
  const apiError = err as ApiErrorLike;
  return firstNonEmptyString(
    apiError.response?.data?.error,
    apiError.response?.data?.message,
    apiError.message,
  ) || fallback;
}

export function getEquipmentScanErrorPayload(err: unknown): EquipmentScanErrorPayload | undefined {
  const payload = (err as ApiErrorLike)?.response?.data;
  if (!payload || typeof payload !== 'object') return undefined;
  const scanPayload = payload as EquipmentScanErrorPayload;
  const hasScanDetails = Array.isArray(scanPayload.items)
    || Array.isArray(scanPayload.candidates)
    || Array.isArray(scanPayload.possibleItems)
    || Array.isArray(scanPayload.duplicates)
    || Boolean(scanPayload.scanSession);
  return hasScanDetails ? scanPayload : undefined;
}
export function validateEquipmentPhoto(file: File): string | null {
  if (!ACCEPTED_EQUIPMENT_IMAGE_TYPES.includes(file.type)) {
    return 'Please upload a JPG, PNG, or WebP equipment photo.';
  }

  if (file.size > MAX_EQUIPMENT_IMAGE_BYTES) {
    return 'Equipment photos must be 10MB or smaller.';
  }

  return null;
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
    const photoError = validateEquipmentPhoto(photo);
    if (photoError) throw new Error(photoError);

    const formData = new FormData();
    formData.append('photo', photo);
    try {
      const response = await apiService.post(`${API_BASE}/${profileId}/scan`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data as EquipmentScanResponse;
    } catch (err) {
      // Preserve the HTTP status + a transient/non-transient hint so the caller
      // can auto-retry a flaky AI connection without burning quota on a 429/503.
      const status = (err as any)?.response?.status;
      const configurable = (err as any)?.response?.data?.configurable === true;
      const scanError = new Error(getEquipmentApiErrorMessage(err, 'Scan failed')) as EquipmentScanError;
      if (typeof status === 'number') scanError.status = status;
      scanError.scanResponse = getEquipmentScanErrorPayload(err);
      scanError.retryable = typeof status !== 'number'
        ? true
        : status >= 500 && status !== 503 && !configurable;
      throw scanError;
    }
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

  const reviewScanCandidate = useCallback(async (
    profileId: number,
    payload: EquipmentScanCandidateReviewPayload,
  ) => {
    return apiFetch<EquipmentScanCandidateReviewResponse>(
      `${API_BASE}/${profileId}/scan-candidates/${payload.candidateIndex}/review`,
      { method: 'PUT', body: JSON.stringify(payload) },
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

  return useMemo(() => ({
    listProfiles, getProfile, createProfile, updateProfile, deleteProfile,
    listItems, addItem, updateItem, deleteItem,
    scanEquipment, approveItem, rejectItem, reviewScanCandidate,
    listExerciseMappings, addExerciseMapping, removeExerciseMapping, confirmExerciseMapping,
    getStats,
  }), [
    listProfiles, getProfile, createProfile, updateProfile, deleteProfile,
    listItems, addItem, updateItem, deleteItem,
    scanEquipment, approveItem, rejectItem, reviewScanCandidate,
    listExerciseMappings, addExerciseMapping, removeExerciseMapping, confirmExerciseMapping,
    getStats,
  ]);
}

export default useEquipmentAPI;
