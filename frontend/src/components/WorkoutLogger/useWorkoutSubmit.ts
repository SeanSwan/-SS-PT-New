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
import {
  WORKOUT_SUBMIT_OUTCOME,
  type WorkoutSubmitOutcome,
} from './workoutSubmitOutcome';
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
  userRole,
  workoutDateValue,
  workoutDraft,
}: WorkoutSubmitParams) {
  const handleSubmit = useCallback(async (
    submitOverrides?: {
      overallIntensity?: number | null;
      sessionNotes?: string;
      /** Synchronous seam ack. Called exactly once, before the first await. */
      acknowledge?: (handled?: boolean) => void;
    },
  ) => {
    const ack = submitOverrides?.acknowledge;
    if (isSubmittingRef.current) { ack?.(false); return WORKOUT_SUBMIT_OUTCOME.BUSY; }
    isSubmittingRef.current = true; // Set IMMEDIATELY after check to close race window
    setIsSubmitting(true);
    const submitIntensity = typeof submitOverrides?.overallIntensity === 'number'
      ? submitOverrides.overallIntensity
      : overallIntensity;
    const submitSessionNotes = typeof submitOverrides?.sessionNotes === 'string'
      ? submitOverrides.sessionNotes
      : sessionNotes;

    if (exercises.length === 0) { toast.error('Please add at least one exercise'); isSubmittingRef.current = false; setIsSubmitting(false); ack?.(false); return WORKOUT_SUBMIT_OUTCOME.NEEDS_REVIEW; }
    if (!client) { toast.error('Client information not loaded'); isSubmittingRef.current = false; setIsSubmitting(false); ack?.(false); return WORKOUT_SUBMIT_OUTCOME.NEEDS_REVIEW; }
    // Null balances and linked scheduled sessions pass through to backend billing validation.
    if (shouldBlockWorkoutSubmitForSessionBalance({
      availableSessions: client.availableSessions,
      userRole,
      clientSource: client.clientSource,
      scheduledSessionId,
    })) {
      toast.error('Client has no available sessions remaining'); isSubmittingRef.current = false; setIsSubmitting(false); ack?.(false); return WORKOUT_SUBMIT_OUTCOME.NEEDS_REVIEW;
    }

    if (hasIncompleteWorkoutSets(exercises)) {
      toast.error('Please complete all exercise sets before submitting'); isSubmittingRef.current = false; setIsSubmitting(false); ack?.(false); return WORKOUT_SUBMIT_OUTCOME.NEEDS_REVIEW;
    }

    if (typeof effectiveClientId !== 'number') {
      toast.error('No client context - unable to submit');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      ack?.(false);
      return WORKOUT_SUBMIT_OUTCOME.NEEDS_REVIEW;
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
      ack?.(true);
      return WORKOUT_SUBMIT_OUTCOME.KEPT_LOCAL;
    }

    setLastChallengeProgress(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let outcome: WorkoutSubmitOutcome = WORKOUT_SUBMIT_OUTCOME.FAILED;

    // Last synchronous instant: the request is about to be issued. This says
    // ACCEPTED, not saved. See the seam limitation note at the AI bridge.
    ack?.(true);

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
        outcome = WORKOUT_SUBMIT_OUTCOME.SAVED;
      } else {
        setLastChallengeProgress(null);
        const existingFormId = response.data?.id || response.data?.formId || null;
        if (existingFormId) {
          setSubmittedFormId(existingFormId);
          // C4a: NEVER clear the draft here — this branch means a DIFFERENT
          // save already owns the date; clearing would destroy the only copy
          // of the just-entered workout (probe finding #2).
          toast.warning(response.message || 'A workout already exists for this date. Summary tools are unlocked — your current entries stay saved as a draft.');
          // A DIFFERENT save owns this date. Nothing of THIS workout reached the
          // server, so it is a review item, never a success.
          outcome = WORKOUT_SUBMIT_OUTCOME.NEEDS_REVIEW;
        } else {
          toast.error(response.message || 'Workout was not saved. Please review and try again.');
          outcome = WORKOUT_SUBMIT_OUTCOME.FAILED;
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
        outcome = WORKOUT_SUBMIT_OUTCOME.FAILED;
      } else {
        offlineQueue.queueSubmission(formData);
        outcome = WORKOUT_SUBMIT_OUTCOME.KEPT_LOCAL;
      }
    } finally {
      clearTimeout(timeoutId);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }

    return outcome;
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

  // ── AI_SUBMIT_WORKOUT containment — plan 60 §8 R60-A / requirement R60-R1 ──
  //
  // This listener used to write `detail.intensity` / `detail.notes` into LIVE
  // form state and then call handleSubmit, so an unbound event could edit
  // notes/intensity, take the single-flight lock, queue, POST
  // /api/workout-forms, toast a save receipt and clear the draft. Nothing in
  // the event identified an actor, target, Logger instance or draft revision,
  // and the bus (aiWorkoutEvents.ts) broadcasts to every mounted listener.
  //
  // R60-A contains that at the receiver, the one point every producer shares:
  // useCoachCommand execute/confirm, and the direct ConfirmationSheet onDone in
  // ClientTrainingCommandBar. Bound delivery is R60-B1/B2/B3 (server approval
  // binding, owner capture + one-time local permit, exactly-one-receiver
  // delivery) and is NOT authorized here — so every submit event reachable
  // today is unbound by construction and declines synchronously, before any
  // side effect. The pre-fix chain is positively asserted in
  // tmp/coach-astra-hostile-20260912/r60a-prefix-probe-20260912.log.
  //
  // Acknowledging `false` is the truthful signal: an effector saw the event and
  // declined, which `resolveOutcome(true, false)` records as `noop` — never the
  // believable `applied` this lane used to fabricate (see
  // useWorkoutSubmit.aiAckTruth.test.tsx and plan 60 §5). It is deliberately
  // NOT a second copy of the submit refusal rules: containment declines before
  // the real guards are reachable, and R60-B3 replaces this effect with the
  // permit/instance/revision compare-and-consume path, which must keep the
  // no-mutation-before-admission ordering locked by
  // useWorkoutSubmit.confirmedBinding.test.tsx.
  //
  // setOverallIntensity / setSessionNotes stay on WorkoutSubmitParams for that
  // B3 path; they are no longer consumed here because this lane must not write
  // live form state before admission.
  useEffect(() => {
    const onSubmitWorkout = (event: Event) => {
      const detail = (event as CustomEvent<AISubmitWorkoutEventDetail>).detail;
      detail?.acknowledgeAIWorkoutEvent?.(false);
    };

    window.addEventListener(AI_SUBMIT_WORKOUT, onSubmitWorkout);
    return () => window.removeEventListener(AI_SUBMIT_WORKOUT, onSubmitWorkout);
  }, []);

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
