/**
 * useCopilotPanelReset
 *
 * Purpose: Resets the workout copilot state whenever the panel opens while
 * keeping reset orchestration out of the main rendering component.
 */

import { useEffect } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { CopilotModeTab } from './CopilotModeTabs';
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

interface UseCopilotPanelResetOptions {
  open: boolean;
  setState: Dispatch<SetStateAction<CopilotState>>;
  setEditedPlan: Dispatch<SetStateAction<WorkoutPlan | null>>;
  setExplainability: Dispatch<SetStateAction<Explainability | null>>;
  setSafetyConstraints: Dispatch<SetStateAction<SafetyConstraints | null>>;
  setExerciseRecs: Dispatch<SetStateAction<ExerciseRecommendation[]>>;
  setWarnings: Dispatch<SetStateAction<string[]>>;
  setMissingInputs: Dispatch<SetStateAction<string[]>>;
  setGenerationMode: Dispatch<SetStateAction<string>>;
  setSwanCoachPlanning: Dispatch<SetStateAction<SwanCoachPlanningFingerprint | null>>;
  setPlanningReviewAcknowledged: Dispatch<SetStateAction<boolean>>;
  setAuditLogId: Dispatch<SetStateAction<number | null>>;
  setTrainerNotes: Dispatch<SetStateAction<string>>;
  setOverrideReason: Dispatch<SetStateAction<string>>;
  setOverrideReasonRequired: Dispatch<SetStateAction<boolean>>;
  setDegradedData: Dispatch<SetStateAction<DegradedResponse | null>>;
  setSavedPlanId: Dispatch<SetStateAction<number | null>>;
  setUnmatchedExercises: Dispatch<SetStateAction<Array<{ dayNumber: number; name: string }>>>;
  setValidationWarnings: Dispatch<SetStateAction<ValidationError[]>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setErrorCode: Dispatch<SetStateAction<string>>;
  setApproveErrors: Dispatch<SetStateAction<ValidationError[]>>;
  setActivePainEntries: Dispatch<SetStateAction<PainEntry[]>>;
  setPainAcknowledged: Dispatch<SetStateAction<boolean>>;
  setExpandedDays: Dispatch<SetStateAction<Set<number>>>;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  setActiveTab: Dispatch<SetStateAction<CopilotModeTab>>;
  setLhFooterContent: Dispatch<SetStateAction<ReactNode | null>>;
}

export const useCopilotPanelReset = ({
  open,
  setState,
  setEditedPlan,
  setExplainability,
  setSafetyConstraints,
  setExerciseRecs,
  setWarnings,
  setMissingInputs,
  setGenerationMode,
  setSwanCoachPlanning,
  setPlanningReviewAcknowledged,
  setAuditLogId,
  setTrainerNotes,
  setOverrideReason,
  setOverrideReasonRequired,
  setDegradedData,
  setSavedPlanId,
  setUnmatchedExercises,
  setValidationWarnings,
  setErrorMessage,
  setErrorCode,
  setApproveErrors,
  setActivePainEntries,
  setPainAcknowledged,
  setExpandedDays,
  setIsSubmitting,
  setActiveTab,
  setLhFooterContent,
}: UseCopilotPanelResetOptions) => {
  useEffect(() => {
    if (!open) return;

    setState('idle');
    setEditedPlan(null);
    setExplainability(null);
    setSafetyConstraints(null);
    setExerciseRecs([]);
    setWarnings([]);
    setMissingInputs([]);
    setGenerationMode('');
    setSwanCoachPlanning(null);
    setPlanningReviewAcknowledged(false);
    setAuditLogId(null);
    setTrainerNotes('');
    setOverrideReason('');
    setOverrideReasonRequired(false);
    setDegradedData(null);
    setSavedPlanId(null);
    setUnmatchedExercises([]);
    setValidationWarnings([]);
    setErrorMessage('');
    setErrorCode('');
    setApproveErrors([]);
    setActivePainEntries([]);
    setPainAcknowledged(false);
    setExpandedDays(new Set());
    setIsSubmitting(false);
    setActiveTab('single');
    setLhFooterContent(null);
  }, [
    open,
    setActivePainEntries,
    setActiveTab,
    setApproveErrors,
    setAuditLogId,
    setDegradedData,
    setEditedPlan,
    setErrorCode,
    setErrorMessage,
    setExerciseRecs,
    setExpandedDays,
    setExplainability,
    setGenerationMode,
    setIsSubmitting,
    setLhFooterContent,
    setMissingInputs,
    setPlanningReviewAcknowledged,
    setOverrideReason,
    setOverrideReasonRequired,
    setPainAcknowledged,
    setSafetyConstraints,
    setSavedPlanId,
    setState,
    setSwanCoachPlanning,
    setTrainerNotes,
    setUnmatchedExercises,
    setValidationWarnings,
    setWarnings,
  ]);
};
