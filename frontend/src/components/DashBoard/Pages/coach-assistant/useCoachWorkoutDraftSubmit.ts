import { useCallback, useMemo, useState } from 'react';
import { createCoachWorkoutDraft } from '../../../../services/coachProposalService';
import {
  buildCoachWorkoutDraftRequest,
  type CoachWorkoutDraftRequest,
  CoachWorkoutDraftContractError,
} from './coachWorkoutDraftContract';
import { useCoachSessionDraft } from './useCoachSessionDraft';

export interface CoachWorkoutDraftSubmitState {
  submitting: boolean;
  error: CoachWorkoutDraftContractError | Error | null;
  lastResponse: Awaited<ReturnType<typeof createCoachWorkoutDraft>> | null;
  request: CoachWorkoutDraftRequest | null;
  submit: () => Promise<Awaited<ReturnType<typeof createCoachWorkoutDraft>> | null>;
}

export const useCoachWorkoutDraftSubmit = (): CoachWorkoutDraftSubmitState => {
  const { submitted } = useCoachSessionDraft();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<CoachWorkoutDraftContractError | Error | null>(null);
  const [lastResponse, setLastResponse] = useState<Awaited<ReturnType<typeof createCoachWorkoutDraft>> | null>(null);
  const request = useMemo(() => {
    if (!submitted) return null;
    try {
      return buildCoachWorkoutDraftRequest(submitted);
    } catch (nextError) {
      return nextError instanceof Error ? nextError : new Error('Invalid workout draft.');
    }
  }, [submitted]);
  const submit = useCallback(async () => {
    setError(null);
    setLastResponse(null);
    if (!request || request instanceof Error) {
      const nextError = request instanceof Error ? request : new Error('No submitted workout draft is available.');
      setError(nextError);
      return null;
    }
    setSubmitting(true);
    try {
      const response = await createCoachWorkoutDraft(request);
      setLastResponse(response);
      return response;
    } catch (nextError) {
      const normalized = nextError instanceof Error ? nextError : new Error('Workout draft submission failed.');
      setError(normalized);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [request]);
  return { submitting, error, lastResponse, request: request instanceof Error ? null : request, submit };
};

export default useCoachWorkoutDraftSubmit;
