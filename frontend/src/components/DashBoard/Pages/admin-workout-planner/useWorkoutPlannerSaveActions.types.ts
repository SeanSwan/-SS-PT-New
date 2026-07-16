/**
 * FILE: useWorkoutPlannerSaveActions.types.ts
 * PURPOSE: Typed boundary for canonical planner save and update operations.
 */
import type { Dispatch, SetStateAction } from 'react';
import type { PlannerClient, PlanDuration, PlanGoal } from './WorkoutPlannerTypes';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';
import type { buildWorkoutPlanSaveFields } from './workoutPlannerSavePayload';

export type PdfAttachResult = 'attached' | 'failed' | 'queued' | 'skipped';
type WorkoutPlanSaveFields = ReturnType<typeof buildWorkoutPlanSaveFields>;

export interface PlannerAuthClient {
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
}

interface PdfDerivativeSummary {
  enabled?: boolean;
  state?: string;
}

export interface SaveActionResponseData {
  plan?: { id?: unknown; title?: unknown };
  pdfDerivative?: PdfDerivativeSummary;
}

export interface SaveOperationResult {
  client: PlannerClient | undefined;
  planData: unknown;
  saveFields: WorkoutPlanSaveFields;
  planId: string | null;
  planTitle?: unknown;
  pdfDerivative?: PdfDerivativeSummary;
}

export interface RunSaveOperationInput {
  activate: boolean;
  requiresLoadedPlan: boolean;
  operation: () => Promise<SaveOperationResult>;
  successText: string;
  errorLogLabel: string;
  errorText: string;
}

export interface UseWorkoutPlannerSaveActionsInput {
  authAxios: PlannerAuthClient;
  selectedClientId: number | null;
  planExercisesLength: number;
  hasGeneratedHorizonPlan: boolean;
  loadedPlanId: string | null;
  loadedPlanRevision: number;
  planDuration: PlanDuration;
  userRole?: string;
  phaseName: string;
  phaseNumber: number;
  categoryLabel: string;
  goal: PlanGoal;
  clients: PlannerClient[];
  buildPlanData: () => unknown;
  currentExercisesSig: string;
  fetchSavedPlans: (clientId: number | null) => Promise<void>;
  setSavedSnapshot: Dispatch<SetStateAction<string | null>>;
  setLoadedPlanId: Dispatch<SetStateAction<string | null>>;
  setLoadedPlanName: Dispatch<SetStateAction<string | null>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
}
