import { useCallback, useEffect, useState } from 'react';
import apiService from '../../../services/api.service';
import {
  getApiErrorMessage,
} from '../SessionDetailModal.actions';
import type { SessionDetail } from '../SessionDetailModal.types';

interface UseSessionClientFeedbackInput {
  open: boolean;
  session: SessionDetail | null;
  onUpdated: () => void;
  setFormError: (error: string | null) => void;
}

export const useSessionClientFeedback = ({
  open,
  session,
  onUpdated,
  setFormError,
}: UseSessionClientFeedbackInput) => {
  const [clientRating, setClientRating] = useState<number>(0);
  const [clientComment, setClientComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    if (!open || !session) {
      setClientRating(0);
      setClientComment('');
      setFeedbackSubmitted(false);
      setFeedbackLoading(false);
      return;
    }

    const hasClientFeedback = session.feedbackProvided === true;
    setClientRating(hasClientFeedback ? session.rating || 0 : 0);
    setClientComment('');
    setFeedbackSubmitted(hasClientFeedback);
    setFeedbackLoading(false);
  }, [open, session]);

  const handleSubmitFeedback = useCallback(async () => {
    if (!session || clientRating === 0) {
      setFormError('Please select a rating before submitting.');
      return;
    }

    setFeedbackLoading(true);
    setFormError(null);

    try {
      const response = await apiService.post(`/api/sessions/${session.id}/feedback`, {
        rating: clientRating,
        comment: clientComment.trim() || undefined
      });

      const result = response.data;
      if (result?.success === false) {
        setFormError(result?.message || 'Failed to submit feedback.');
        return;
      }

      setFeedbackSubmitted(true);
      onUpdated();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setFormError(getApiErrorMessage(error, 'Failed to submit feedback. Please try again.'));
    } finally {
      setFeedbackLoading(false);
    }
  }, [clientComment, clientRating, onUpdated, session, setFormError]);

  return {
    clientRating,
    clientComment,
    feedbackSubmitted,
    feedbackLoading,
    setClientRating,
    setClientComment,
    handleSubmitFeedback,
  };
};
