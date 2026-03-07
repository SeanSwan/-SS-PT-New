/**
 * useCustomExerciseAPI — React hook for Custom Exercise Builder CRUD.
 * Phase 6d: Communicates with /api/custom-exercises endpoints.
 */
import { useCallback } from 'react';

const API_BASE = '/api/custom-exercises';

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

export interface CustomExercise {
  id: number;
  trainerId: number;
  name: string;
  slug: string;
  category: string;
  baseExerciseKey: string | null;
  mechanicsSchema: MechanicsSchema;
  description: string | null;
  status: 'draft' | 'testing' | 'published' | 'archived';
  version: number;
  parentVersionId: number | null;
  isPublic: boolean;
  usageCount: number;
  validationResult: ValidationResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface MechanicsSchema {
  primaryAngle?: {
    joint: string;
    landmarks: [number, number, number];
    repPhases: {
      startAngle: number;
      bottomAngle: number;
      hysteresis?: number;
    };
  };
  formRules: FormRule[];
  checkpoints?: Checkpoint[];
}

export type FormRule =
  | AngleThresholdRule
  | LandmarkDeviationRule
  | BilateralSymmetryRule;

export interface AngleThresholdRule {
  type: 'angle_threshold';
  name: string;
  joint?: string;
  landmarks: [number, number, number];
  min: number;
  max: number;
  severity: 'info' | 'warning' | 'danger';
  cue: string;
}

export interface LandmarkDeviationRule {
  type: 'landmark_deviation';
  name: string;
  landmarkA: number;
  landmarkB: number;
  axis: 'x' | 'y' | 'z';
  maxDeviation: number;
  severity: 'info' | 'warning' | 'danger';
  cue: string;
}

export interface BilateralSymmetryRule {
  type: 'bilateral_symmetry';
  name: string;
  leftJoint: string;
  rightJoint: string;
  leftLandmarks: [number, number, number];
  rightLandmarks: [number, number, number];
  maxDiff: number;
  severity: 'info' | 'warning' | 'danger';
  cue: string;
}

export interface Checkpoint {
  name: string;
  condition: string;
  rules: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  ruleCount: number;
  hasRepDetection: boolean;
}

export interface ExerciseTemplate {
  key: string;
  name: string;
  category: string;
  ruleCount: number;
  hasRepDetection: boolean;
}

export interface ExerciseTemplateDetail extends ExerciseTemplate {
  mechanicsSchema: MechanicsSchema;
}

export function useCustomExerciseAPI() {
  const listExercises = useCallback(
    async (params?: { status?: string; category?: string; search?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.category) qs.set('category', params.category);
      if (params?.search) qs.set('search', params.search);
      if (params?.page) qs.set('page', String(params.page));
      return apiFetch<{ success: boolean; exercises: CustomExercise[]; pagination: any }>(
        `${API_BASE}?${qs.toString()}`
      );
    },
    []
  );

  const getExercise = useCallback(async (id: number) => {
    return apiFetch<{ success: boolean; exercise: CustomExercise }>(`${API_BASE}/${id}`);
  }, []);

  const createExercise = useCallback(
    async (data: {
      name: string;
      category?: string;
      baseExerciseKey?: string;
      mechanicsSchema: MechanicsSchema;
      isPublic?: boolean;
      description?: string;
    }) => {
      return apiFetch<{ success: boolean; exercise: CustomExercise }>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    []
  );

  const updateExercise = useCallback(
    async (
      id: number,
      data: Partial<{
        name: string;
        category: string;
        mechanicsSchema: MechanicsSchema;
        isPublic: boolean;
        status: string;
        description: string;
      }>
    ) => {
      return apiFetch<{ success: boolean; exercise: CustomExercise }>(`${API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    []
  );

  const archiveExercise = useCallback(async (id: number) => {
    return apiFetch<{ success: boolean; message: string }>(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
  }, []);

  const duplicateExercise = useCallback(async (id: number, name?: string) => {
    return apiFetch<{ success: boolean; exercise: CustomExercise }>(
      `${API_BASE}/${id}/duplicate`,
      { method: 'POST', body: JSON.stringify({ name }) }
    );
  }, []);

  const validateExercise = useCallback(async (id: number) => {
    return apiFetch<{ success: boolean; validation: ValidationResult }>(
      `${API_BASE}/${id}/validate`,
      { method: 'POST' }
    );
  }, []);

  const validateSchema = useCallback(async (mechanicsSchema: MechanicsSchema) => {
    return apiFetch<{ success: boolean; validation: ValidationResult }>(
      `${API_BASE}/validate-schema`,
      { method: 'POST', body: JSON.stringify({ mechanicsSchema }) }
    );
  }, []);

  const listTemplates = useCallback(async () => {
    return apiFetch<{ success: boolean; templates: ExerciseTemplate[] }>(
      `${API_BASE}/templates`
    );
  }, []);

  const getTemplate = useCallback(async (key: string) => {
    return apiFetch<{ success: boolean; template: ExerciseTemplateDetail }>(
      `${API_BASE}/templates/${key}`
    );
  }, []);

  const createFromTemplate = useCallback(async (key: string, name?: string) => {
    return apiFetch<{ success: boolean; exercise: CustomExercise }>(
      `${API_BASE}/from-template/${key}`,
      { method: 'POST', body: JSON.stringify({ name }) }
    );
  }, []);

  return {
    listExercises,
    getExercise,
    createExercise,
    updateExercise,
    archiveExercise,
    duplicateExercise,
    validateExercise,
    validateSchema,
    listTemplates,
    getTemplate,
    createFromTemplate,
  };
}

export default useCustomExerciseAPI;
