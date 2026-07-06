import { useCallback, useEffect, useState } from 'react';
import apiService from '../../../services/api.service';
import {
  buildCompleteSessionPayload,
  getApiErrorMessage,
  isValidTrainerRating,
} from '../SessionDetailModal.actions';
import type { SessionDetail } from '../SessionDetailModal.types';
import {
  canDeductScheduledSessionCredit,
  isCompletionBillingApplicable,
} from './sessionCreditEligibility';

const WAIVE_REASON_MIN_LENGTH = 5;

interface UseSessionCompletionInput {
  open: boolean;
  session: SessionDetail | null;
  onUpdated: () => void;
  onClose: () => void;
  setFormError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useSessionCompletion = ({
  open,
  session,
  onUpdated,
  onClose,
  setFormError,
  setLoading,
}: UseSessionCompletionInput) => {
  const [notes, setNotes] = useState('');
  const [trainerRating, setTrainerRating] = useState<string>('');
  const [clientFeedback, setClientFeedback] = useState('');
  const [deductCompletionSessionCredit, setDeductCompletionSessionCredit] = useState(false);
  const [completionWaiveReason, setCompletionWaiveReason] = useState('');
  const canDeductCompletionSessionCredit = canDeductScheduledSessionCredit(session);
  const completionBillingApplicable = isCompletionBillingApplicable(session);
  // A completion that will NOT deduct a billable client's credit is a waive
  // and needs a recorded reason (server enforces this once server-side
  // completion billing is enabled; the UI enforces it up front).
  const completionWaiveReasonRequired =
    completionBillingApplicable
    && !(canDeductCompletionSessionCredit && deductCompletionSessionCredit);

  useEffect(() => {
    if (!open || !session) {
      setNotes('');
      setTrainerRating('');
      setClientFeedback('');
      setDeductCompletionSessionCredit(false);
      setCompletionWaiveReason('');
      return;
    }

    const hasSubmittedClientFeedback = session.feedbackProvided === true;
    setNotes(session.notes || '');
    setTrainerRating(!hasSubmittedClientFeedback && session.rating ? String(session.rating) : '');
    setClientFeedback(!hasSubmittedClientFeedback ? session.feedback || '' : '');
    setDeductCompletionSessionCredit(canDeductCompletionSessionCredit);
    setCompletionWaiveReason('');
  }, [canDeductCompletionSessionCredit, open, session]);

  const handleComplete = useCallback(async () => {
    if (!session) {
      return;
    }

    setFormError(null);
    setLoading(true);

    if (!isValidTrainerRating(trainerRating)) {
      setFormError('Trainer rating must be a number between 1 and 5.');
      setLoading(false);
      return;
    }

    const trimmedWaiveReason = completionWaiveReason.trim();
    if (completionWaiveReasonRequired && trimmedWaiveReason.length < WAIVE_REASON_MIN_LENGTH) {
      setFormError('Add a short reason (5+ characters) for completing without deducting a session credit.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.patch(`/api/sessions/${session.id}/complete`, buildCompleteSessionPayload({
        notes,
        trainerRating,
        clientFeedback,
        deductSessionCredit: canDeductCompletionSessionCredit
          ? deductCompletionSessionCredit
          : false,
        waiveReason: completionWaiveReasonRequired ? trimmedWaiveReason : undefined,
      }));
      const result = response.data;
      if (result?.success === false) {
        setFormError(result?.message || 'Failed to mark session complete.');
        return;
      }

      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error completing session:', error);
      setFormError(getApiErrorMessage(error, 'Failed to mark session complete. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [
    canDeductCompletionSessionCredit,
    clientFeedback,
    completionWaiveReason,
    completionWaiveReasonRequired,
    deductCompletionSessionCredit,
    notes,
    onClose,
    onUpdated,
    session,
    setFormError,
    setLoading,
    trainerRating,
  ]);

  return {
    notes,
    trainerRating,
    clientFeedback,
    canDeductCompletionSessionCredit,
    completionBillingApplicable,
    completionWaiveReasonRequired,
    completionWaiveReason,
    deductCompletionSessionCredit,
    setNotes,
    setTrainerRating,
    setClientFeedback,
    setCompletionWaiveReason,
    setDeductCompletionSessionCredit,
    handleComplete,
  };
};
