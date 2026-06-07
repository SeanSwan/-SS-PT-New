/**
 * useCopilotSingleWorkoutActions
 *
 * Purpose: Owns the single-workout copilot action flow so the panel can stay
 * focused on layout and state ownership.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  isDegraded,
  isDraftSuccess,
} from '../../../../../services/aiWorkoutService';
import { getCopilotApiError } from './copilot-api-error';
import type { UseCopilotSingleWorkoutActionsOptions } from './useCopilotSingleWorkoutActions.types';

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
  planningReviewAcknowledged,
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
  setSwanCoachPlanning,
  setPlanningReviewAcknowledged,
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
        setSwanCoachPlanning(resp.swanCoachPlanning);
        setPlanningReviewAcknowledged(false);
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
    setPlanningReviewAcknowledged,
    setSafetyConstraints,
    setState,
    setSwanCoachPlanning,
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
        planningReviewAcknowledged,
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
    planningReviewAcknowledged,
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
