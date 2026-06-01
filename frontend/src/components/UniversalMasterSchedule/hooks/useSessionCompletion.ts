import { useCallback, useEffect, useState } from 'react';
import apiService from '../../../services/api.service';
import {
  buildCompleteSessionPayload,
  getApiErrorMessage,
  isValidTrainerRating,
} from '../SessionDetailModal.actions';
import type { SessionDetail } from '../SessionDetailModal.types';

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

  useEffect(() => {
    if (!open || !session) {
      setNotes('');
      setTrainerRating('');
      setClientFeedback('');
      return;
    }

    const hasSubmittedClientFeedback = session.feedbackProvided === true;
    setNotes(session.notes || '');
    setTrainerRating(!hasSubmittedClientFeedback && session.rating ? String(session.rating) : '');
    setClientFeedback(!hasSubmittedClientFeedback ? session.feedback || '' : '');
  }, [open, session]);

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

    try {
      const response = await apiService.patch(`/api/sessions/${session.id}/complete`, buildCompleteSessionPayload({
        notes,
        trainerRating,
        clientFeedback,
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
  }, [clientFeedback, notes, onClose, onUpdated, session, setFormError, setLoading, trainerRating]);

  return {
    notes,
    trainerRating,
    clientFeedback,
    setNotes,
    setTrainerRating,
    setClientFeedback,
    handleComplete,
  };
};
