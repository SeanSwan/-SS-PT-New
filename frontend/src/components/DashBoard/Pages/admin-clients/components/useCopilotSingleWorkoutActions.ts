/**
 * useCopilotSingleWorkoutActions
 *
 * Purpose: Owns the single-workout copilot action flow so the panel can stay
 * focused on layout and state ownership.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Toast } from '../../../../../hooks/use-toast';
import {
  createAiWorkoutService,
  isDegraded,
  isDraftSuccess,
} from '../../../../../services/aiWorkoutService';
import { createPainEntryService } from '../../../../../services/painEntryService';
import type {
  CopilotState,
  DegradedResponse,
  ExerciseRecommendation,
  Explainability,
  PainEntry,
  SafetyConstraints,
  ValidationError,
  WorkoutPlan,
} from './copilot-types';
import { getCopilotApiError } from './copilot-api-error';

type Setter<T> = Dispatch<SetStateAction<T>>;
type AiWorkoutService = Pick<ReturnType<typeof createAiWorkoutService>, 'generateDraft' | 'approveDraft'>;
type PainEntryService = Pick<ReturnType<typeof createPainEntryService>, 'getActive'>;
type ToastFn = (toast: Omit<Toast, 'id'>) => void;

interface UseCopilotSingleWorkoutActionsOptions {
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

export const useCopilotSingleWorkoutActions = ({
  open,
  autoGenerate,
  state,
  isSubmitting,
  clientId,
  clientName,
  editedPlan,
  auditLogId,
  overrideReason,
  overrideReasonRequired,
  trainerNotes,
  painAcknowledged,
  service,
  painService,
  toast,
  onSuccess,
  setState,
  setEditedPlan,
  setExplainability,
  setSafetyConstraints,
  setExerciseRecs,
  setWarnings,
  setMissingInputs,
  setGenerationMode,
  setAuditLogId,
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
}: UseCopilotSingleWorkoutActionsOptions) => {
  const autoGenerateTriggered = useRef(false);
  const checkPainEntriesRef = useRef<(() => Promise<void>) | null>(null);

  const doGenerate = useCallback(async () => {
    setIsSubmitting(true);
    setState('generating');
    setErrorMessage('');
    setErrorCode('');

    try {
      const resp = await service.generateDraft(clientId, overrideReason.trim() || undefined);

      if (isDegraded(resp)) {
        setDegradedData(resp);
        setState('degraded');
      } else if (isDraftSuccess(resp)) {
        setEditedPlan(resp.plan);
        setExplainability(resp.explainability);
        setSafetyConstraints(resp.safetyConstraints);
        setExerciseRecs(resp.exerciseRecommendations);
        setWarnings(resp.warnings);
        setMissingInputs(resp.missingInputs);
        setGenerationMode(resp.generationMode);
        setAuditLogId(resp.auditLogId);
        if (resp.plan.days.length > 0) {
          setExpandedDays(new Set([0]));
        }
        setState('draft_review');
      }
    } catch (err: unknown) {
      const { data, message } = getCopilotApiError(err);
      if (data.code === 'MISSING_OVERRIDE_REASON') {
        if (overrideReasonRequired) {
          setErrorMessage(data.message || 'Admin override requires a reason');
          setErrorCode(data.code || '');
          setState('error');
          return;
        }
        setOverrideReasonRequired(true);
        setState('idle');
        return;
      }
      setErrorMessage(data.message || message || 'Failed to generate workout plan');
      setErrorCode(data.code || '');
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clientId,
    overrideReason,
    overrideReasonRequired,
    service,
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
    setMissingInputs,
    setOverrideReasonRequired,
    setSafetyConstraints,
    setState,
    setWarnings,
  ]);

  const checkPainEntries = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const resp = await painService.getActive(clientId);
      const entries = resp.entries || [];

      if (entries.length > 0 && !painAcknowledged) {
        setActivePainEntries(entries);
        setState('pain_check');
      } else {
        await doGenerate();
        return;
      }
    } catch {
      await doGenerate();
      return;
    }

    setIsSubmitting(false);
  }, [
    clientId,
    doGenerate,
    isSubmitting,
    painAcknowledged,
    painService,
    setActivePainEntries,
    setIsSubmitting,
    setState,
  ]);

  useEffect(() => {
    checkPainEntriesRef.current = checkPainEntries;
  }, [checkPainEntries]);

  useEffect(() => {
    if (!open) {
      autoGenerateTriggered.current = false;
      return;
    }
    if (autoGenerate && !autoGenerateTriggered.current && state === 'idle' && !isSubmitting) {
      autoGenerateTriggered.current = true;
      const timer = setTimeout(() => {
        void checkPainEntriesRef.current?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoGenerate, isSubmitting, open, state]);

  const handleGenerate = useCallback(async () => {
    if (isSubmitting) return;
    await checkPainEntries();
  }, [checkPainEntries, isSubmitting]);

  const handlePainAcknowledgeAndGenerate = useCallback(() => {
    setPainAcknowledged(true);
    void doGenerate();
  }, [doGenerate, setPainAcknowledged]);

  const handleApprove = useCallback(async () => {
    if (isSubmitting || !editedPlan) return;
    setIsSubmitting(true);
    setState('approving');
    setApproveErrors([]);

    try {
      const resp = await service.approveDraft({
        userId: clientId,
        plan: editedPlan,
        auditLogId,
        overrideReason: overrideReason.trim() || undefined,
        trainerNotes: trainerNotes.trim() || undefined,
      });

      setSavedPlanId(resp.planId);
      setUnmatchedExercises(resp.unmatchedExercises);
      setValidationWarnings(resp.validationWarnings);
      setState('saved');

      toast({
        title: 'Workout Plan Approved',
        description: `Plan saved (ID: ${resp.planId}) for ${clientName}`,
        variant: 'default',
      });

      onSuccess?.();
    } catch (err: unknown) {
      const { data } = getCopilotApiError(err);
      if (data.code === 'MISSING_OVERRIDE_REASON') {
        if (overrideReasonRequired) {
          setErrorMessage(data.message || 'Admin override requires a reason');
          setErrorCode(data.code || '');
          setState('approve_error');
          return;
        }
        setOverrideReasonRequired(true);
        setState('idle');
        return;
      }
      setErrorMessage(data.message || 'Failed to approve plan');
      setErrorCode(data.code || '');
      setApproveErrors(data.errors || []);
      setState('approve_error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    auditLogId,
    clientId,
    clientName,
    editedPlan,
    isSubmitting,
    onSuccess,
    overrideReason,
    overrideReasonRequired,
    service,
    setApproveErrors,
    setErrorCode,
    setErrorMessage,
    setIsSubmitting,
    setOverrideReasonRequired,
    setSavedPlanId,
    setState,
    setUnmatchedExercises,
    setValidationWarnings,
    toast,
    trainerNotes,
  ]);

  return {
    handleGenerate,
    handlePainAcknowledgeAndGenerate,
    handleApprove,
  };
};
