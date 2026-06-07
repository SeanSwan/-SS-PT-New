/**
 * useCopilotSingleWorkoutActions.types
 *
 * Purpose: Keeps single-workout copilot orchestration contracts out of the
 * runtime hook so the hook stays below the SwanStudios file-size ceiling.
 */

import type { Dispatch, SetStateAction } from 'react';
import type { Toast } from '../../../../../hooks/use-toast';
import type { createAiWorkoutService } from '../../../../../services/aiWorkoutService';
import type { createPainEntryService } from '../../../../../services/painEntryService';
import type {
  CopilotState,
  DegradedResponse,
  ExerciseRecommendation,
  Explainability,
  PainEntry,
  SafetyConstraints,
  SwanCoachPlanningFingerprint,
  ValidationError,
  WorkoutPlan,
} from './copilot-types';

type Setter<T> = Dispatch<SetStateAction<T>>;
type AiWorkoutService = Pick<ReturnType<typeof createAiWorkoutService>, 'generateDraft' | 'approveDraft'>;
type PainEntryService = Pick<ReturnType<typeof createPainEntryService>, 'getActive'>;
type ToastFn = (toast: Omit<Toast, 'id'>) => void;

export interface UseCopilotSingleWorkoutActionsOptions {
  open: boolean;
  autoGenerate: boolean;
  state: CopilotState;
  isSubmitting: boolean;
  clientId: number;
  clientName: string;
  editedPlan: WorkoutPlan | null;
  auditLogId: number | null;
  overrideReason: string;
  overrideReasonRequired: boolean;
  trainerNotes: string;
  planningReviewAcknowledged: boolean;
  painAcknowledged: boolean;
  service: AiWorkoutService;
  painService: PainEntryService;
  toast: ToastFn;
  onSuccess?: () => void;
  setState: Setter<CopilotState>;
  setEditedPlan: Setter<WorkoutPlan | null>;
  setExplainability: Setter<Explainability | null>;
  setSafetyConstraints: Setter<SafetyConstraints | null>;
  setExerciseRecs: Setter<ExerciseRecommendation[]>;
  setWarnings: Setter<string[]>;
  setMissingInputs: Setter<string[]>;
  setGenerationMode: Setter<string>;
  setSwanCoachPlanning: Setter<SwanCoachPlanningFingerprint | null>;
  setPlanningReviewAcknowledged: Setter<boolean>;
  setAuditLogId: Setter<number | null>;
  setOverrideReasonRequired: Setter<boolean>;
  setDegradedData: Setter<DegradedResponse | null>;
  setSavedPlanId: Setter<number | null>;
  setUnmatchedExercises: Setter<Array<{ dayNumber: number; name: string }>>;
  setValidationWarnings: Setter<ValidationError[]>;
  setErrorMessage: Setter<string>;
  setErrorCode: Setter<string>;
  setApproveErrors: Setter<ValidationError[]>;
  setActivePainEntries: Setter<PainEntry[]>;
  setPainAcknowledged: Setter<boolean>;
  setExpandedDays: Setter<Set<number>>;
  setIsSubmitting: Setter<boolean>;
}
