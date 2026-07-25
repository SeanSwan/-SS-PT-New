/**
 * HOOK: useWorkoutSubmit
 * Parent: WorkoutLogger (decomposition slice D2 — submit cluster).
 * PURPOSE: The money-path save flow in one place: guarded submit (double-
 * fire race lock, session-balance gate, incomplete-set gate), offline
 * queueing, the 30s abort window, duplicate-day unlock, the
 * AI_SUBMIT_WORKOUT command bridge, and post-save summary generation.
 * Extracted VERBATIM from WorkoutLogger.tsx — guard order, toasts, and
 * failure semantics are unchanged and remain locked by the submit-guard,
 * submit-payload, and submit-receipt suites.
 */
import React, { useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  dailyWorkoutFormService,
  type ExerciseEntry,
} from '../../services/nasmApiService';
import type { DailyWorkoutForm } from '../../services/nasmApiService';
import { ApiService } from '../../services/api.service';
import {
  AI_SUBMIT_WORKOUT,
  type AISubmitWorkoutEventDetail,
} from '../../utils/aiWorkoutEvents';
import { dispatchWorkoutLogged } from '../../utils/workoutLoggedEvent';
import { getErrorMessage } from './WorkoutLoggerCS';
import { buildWorkoutSubmitSuccessMessage } from './WorkoutLogger.submitReceipt';
import { buildWorkoutFormSubmitBody } from './workoutLoggerSubmitPayload';
import { shouldBlockWorkoutSubmitForSessionBalance } from './WorkoutLogger.submitGuard';
import {
  hasIncompleteWorkoutSets,
  isWorkoutSubmitCanceled,
} from './WorkoutLogger.helpers';
import type { PlannedAssignment, WorkoutLoggerClient } from './WorkoutLogger.localTypes';
import type { useOfflineQueue } from './useOfflineQueue';

interface WorkoutSubmitParams {
  client: WorkoutLoggerClient | null;
  // Submit-result state lives in the COMPONENT (consumed by useWorkoutDraft
  // above this hook's call site and by the success-panel JSX).
  setIsGeneratingSummary: React.Dispatch<React.SetStateAction<boolean>>;
  setLastChallengeProgress: React.Dispatch<React.SetStateAction<DailyWorkoutForm['challengeProgress'] | null>>;
  setLastSaveResponse: React.Dispatch<React.SetStateAction<DailyWorkoutForm | null>>;
  setSubmittedFormId: React.Dispatch<React.SetStateAction<string | null>>;
  submittedFormId: string | null;
  effectiveClientId: number | undefined;
  equipmentProfileId: number | null;
  exercises: ExerciseEntry[];
  isSubmittingRef: React.MutableRefObject<boolean>;
  offlineQueue: ReturnType<typeof useOfflineQueue>;
  overallIntensity: number | null;
  plannedAssignment: PlannedAssignment | null;
  scheduledSessionId: string | null;
  sessionNotes: string;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setOverallIntensity: React.Dispatch<React.SetStateAction<number | null>>;
  setSessionNotes: React.Dispatch<React.SetStateAction<string>>;
  userRole: string | undefined;
  workoutDateValue: string;
  workoutDraft: { clear: () => void };
}

export function useWorkoutSubmit({
  client,
  setIsGeneratingSummary,
  setLastChallengeProgress,
  setLastSaveResponse,
  setSubmittedFormId,
  submittedFormId,
  effectiveClientId,
  equipmentProfileId,
  exercises,
  isSubmittingRef,
  offlineQueue,
  overallIntensity,
  plannedAssignment,
  scheduledSessionId,
  sessionNotes,
  setIsSubmitting,
  setOverallIntensity,
  setSessionNotes,
  userRole,
  workoutDateValue,
  workoutDraft,
}: WorkoutSubmitParams) {
  const handleSubmit = useCallback(async (
    submitOverrides?: { overallIntensity?: number | null; sessionNotes?: string },
  ) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true; // Set IMMEDIATELY after check to close race window
    setIsSubmitting(true);
    const submitIntensity = typeof submitOverrides?.overallIntensity === 'number'
      ? submitOverrides.overallIntensity
      : overallIntensity;
    const submitSessionNotes = typeof submitOverrides?.sessionNotes === 'string'
      ? submitOverrides.sessionNotes
      : sessionNotes;

    if (exercises.length === 0) { toast.error('Please add at least one exercise'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    if (!client) { toast.error('Client information not loaded'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    // Null balances and linked scheduled sessions pass through to backend billing validation.
    if (shouldBlockWorkoutSubmitForSessionBalance({
      availableSessions: client.availableSessions,
      userRole,
      clientSource: client.clientSource,
      scheduledSessionId,
    })) {
      toast.error('Client has no available sessions remaining'); isSubmittingRef.current = false; setIsSubmitting(false); return;
    }

    if (hasIncompleteWorkoutSets(exercises)) {
      toast.error('Please complete all exercise sets before submitting'); isSubmittingRef.current = false; setIsSubmitting(false); return;
    }

    if (typeof effectiveClientId !== 'number') {
      toast.error('No client context - unable to submit');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const formData = buildWorkoutFormSubmitBody({
      clientId: effectiveClientId,
      date: workoutDateValue,
      exercises,
      sessionNotes: submitSessionNotes,
      overallIntensity: submitIntensity,
      scheduledSessionId,
      equipmentProfileId,
      plannedAssignment,
    });

    if (!offlineQueue.isOnline) {
      // queueSubmission reports whether it ACTUALLY persisted. If it did not,
      // the draft must survive — clearing it would destroy the only remaining
      // copy of the workout. (queueSubmission raises the error toast itself.)
      offlineQueue.queueSubmission(formData);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    setLastChallengeProgress(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await dailyWorkoutFormService.submitWorkoutForm(
        formData,
        { signal: controller.signal }
      );

      if (response.success && response.data) {
        setLastChallengeProgress(response.data.challengeProgress ?? null);
        toast.success(buildWorkoutSubmitSuccessMessage(response.data, response.message));
        setSubmittedFormId(response.data.id || response.data.formId || null);
        dispatchWorkoutLogged({
          clientId: response.data.clientId ?? effectiveClientId,
          formId: response.data.id || response.data.formId || null,
          date: response.data.date || workoutDateValue,
        });
        // Phase 2.1a: onComplete deferred to SaveSuccessPanel's Done action.
        setLastSaveResponse(response.data);
        workoutDraft.clear();
      } else {
        setLastChallengeProgress(null);
        const existingFormId = response.data?.id || response.data?.formId || null;
        if (existingFormId) {
          setSubmittedFormId(existingFormId);
          workoutDraft.clear();
          toast.warning(response.message || 'Workout already exists for this date. Summary tools are unlocked.');
        } else {
          toast.error(response.message || 'Workout was not saved. Please review and try again.');
        }
      }
    } catch (error: unknown) {
      console.error('Error submitting workout form:', error);
      if (isWorkoutSubmitCanceled(error)) {
        toast.error('Workout submission timed out. Please try again.');
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { status?: number } }).response?.status === 'number' &&
        (error as { response?: { status?: number } }).response!.status! >= 400 &&
        (error as { response?: { status?: number } }).response!.status! < 500
      ) {
        const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        toast.error(message || 'Workout was not saved. Please review and try again.');
      } else {
        offlineQueue.queueSubmission(formData);
      }
    } finally {
      clearTimeout(timeoutId);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    client,
    effectiveClientId,
    equipmentProfileId,
    exercises,
    isSubmittingRef,
    offlineQueue,
    overallIntensity,
    plannedAssignment,
    scheduledSessionId,
    sessionNotes,
    setIsSubmitting,
    setLastChallengeProgress,
    setLastSaveResponse,
    setSubmittedFormId,
    userRole,
    workoutDateValue,
    workoutDraft,
  ]);

  useEffect(() => {
    const onSubmitWorkout = (event: Event) => {
      const detail = (event as CustomEvent<AISubmitWorkoutEventDetail>).detail || {};
      const nextIntensity = typeof detail.intensity === 'number' ? detail.intensity : overallIntensity;
      const nextNotes = typeof detail.notes === 'string' ? detail.notes : sessionNotes;

      if (typeof detail.intensity === 'number') setOverallIntensity(detail.intensity);
      if (typeof detail.notes === 'string') setSessionNotes(detail.notes);

      detail.acknowledgeAIWorkoutEvent?.();
      void handleSubmit({ overallIntensity: nextIntensity, sessionNotes: nextNotes });
    };

    window.addEventListener(AI_SUBMIT_WORKOUT, onSubmitWorkout);
    return () => window.removeEventListener(AI_SUBMIT_WORKOUT, onSubmitWorkout);
  }, [handleSubmit, overallIntensity, sessionNotes, setOverallIntensity, setSessionNotes]);

  const handleGenerateSummary = useCallback(async () => {
    if (!submittedFormId) {
      toast.error('Complete and save the workout before sending a summary');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const api = new ApiService();
      const payload = {
        clientId: effectiveClientId,
        formId: submittedFormId,
        exercises: exercises.map(ex => ({
          exerciseName: ex.exerciseName,
          sets: ex.sets.map(s => ({ weight: s.weight, reps: s.reps, rpe: s.rpe, tempo: s.tempo })),
          formRating: ex.formRating,
          painLevel: ex.painLevel,
        })),
        sessionNotes,
        overallIntensity,
        sendEmail: true,
      };

      const response = await api.post('/api/workout-summaries', payload);
      const data = response?.data ?? response;

      if (data.success) {
        toast.success(data.emailSent ? 'Summary generated and sent to client!' : 'Summary generated successfully!');
      } else {
        throw new Error(data.message || 'Failed to generate summary');
      }
    } catch (error: unknown) {
      console.error('Failed to generate summary:', error);
      toast.error(getErrorMessage(error, 'Failed to generate workout summary'));
    } finally {
      setIsGeneratingSummary(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveClientId, submittedFormId, exercises, sessionNotes, overallIntensity]);

  return { handleGenerateSummary, handleSubmit };
}
