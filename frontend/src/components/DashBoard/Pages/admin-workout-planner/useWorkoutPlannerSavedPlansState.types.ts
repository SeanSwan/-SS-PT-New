/**
 * FILE: useWorkoutPlannerSavedPlansState.types.ts
 * PURPOSE: Typed boundary for saved-plan loading, lifecycle actions, and PDF viewing.
 */
import type { Dispatch, SetStateAction } from 'react';
import type { AxiosRequestConfig } from 'axios';
import type { WorkoutPlannerConfirmRequest } from './WorkoutPlannerConfirmDialog';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';

export interface PlannerAuthClient {
  get: (url: string, config?: AxiosRequestConfig) => Promise<{ data?: unknown }>;
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
  delete: (url: string) => Promise<{ data?: unknown }>;
}

export interface SavedPlansApiData {
  success?: boolean;
  plans?: Array<Record<string, unknown>>;
}

export interface UseWorkoutPlannerSavedPlansStateInput {
  authAxios: PlannerAuthClient;
  selectedClientId: number | null;
  loadedPlanId: string | null;
  currentExercisesSig: string;
  setSavedSnapshot: Dispatch<SetStateAction<string | null>>;
  setLoadedPlanName: Dispatch<SetStateAction<string | null>>;
  resetLoadedPlanState: () => void;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
  setConfirmRequest: Dispatch<SetStateAction<WorkoutPlannerConfirmRequest | null>>;
}
