import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createCoachWorkoutDraft } from '../../../../services/coachProposalService';
import {
  buildCoachWorkoutDraftRequest,
  type CoachWorkoutDraftRequest,
  CoachWorkoutDraftContractError,
} from './coachWorkoutDraftContract';
import type { DraftState } from './coachSessionDraftState';
import { useCoachSessionDraft } from './useCoachSessionDraft';

type DraftResponse = Awaited<ReturnType<typeof createCoachWorkoutDraft>>;
type SubmitError = CoachWorkoutDraftContractError | Error;
export interface CoachWorkoutDraftSubmitState {
  submitting: boolean;
  error: SubmitError | null;
  lastResponse: DraftResponse | null;
  request: CoachWorkoutDraftRequest | null;
  submit: () => Promise<DraftResponse | null>;
}

// A frozen request keeps its identity across retries. A changed working revision,
// actor, task, target, or pending target decision retires only local interest.
function submissionScope(state: Readonly<DraftState>): string | null {
  const { draft, submitted } = state;
  if (!draft || !submitted || state.pendingTargetChange
      || draft.actorId !== state.actorId || draft.actorRole !== state.actorRole
      || submitted.actorId !== state.actorId || submitted.snapshot.actorRole !== state.actorRole
      || draft.taskId !== submitted.taskId || draft.targetUserId !== submitted.targetUserId
      || draft.revision !== submitted.submittedRevision) return null;
  return JSON.stringify([state.actorId, state.actorRole, state.generation, draft.taskId,
    draft.targetUserId, draft.revision, submitted.requestKey]);
}
function freezeRequest<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(freezeRequest);
    Object.freeze(value);
  }
  return value;
}
interface Publication {
  scope: string | null;
  submitting: boolean;
  error: SubmitError | null;
  lastResponse: DraftResponse | null;
}
interface Flight {
  scope: string;
  promise: Promise<DraftResponse | null>;
}
const EMPTY_PUBLICATION: Publication = { scope: null, submitting: false, error: null, lastResponse: null };

export const useCoachWorkoutDraftSubmit = (): CoachWorkoutDraftSubmitState => {
  const owner = useCoachSessionDraft();
  const scope = submissionScope(owner);
  const mountedRef = useRef(true);
  const flightRef = useRef<Flight | null>(null);
  const [publication, setPublication] = useState<Publication>(EMPTY_PUBLICATION);
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; flightRef.current = null; };
  }, []);
  const request = useMemo(() => {
    if (!owner.submitted || !scope) return null;
    try {
      return freezeRequest(buildCoachWorkoutDraftRequest(owner.submitted));
    } catch (nextError) {
      return nextError instanceof Error ? nextError : new Error('Invalid workout draft.');
    }
  }, [owner.submitted, scope]);
  const submit = useCallback((): Promise<DraftResponse | null> => {
    // Read the synchronous shell owner, including changes batched in this event.
    // A callback retained from an old render must not submit a different task.
    if (!mountedRef.current || submissionScope(owner.getSnapshot()) !== scope) return Promise.resolve(null);
    if (!scope || !request || request instanceof Error) {
      setPublication({ scope, submitting: false, lastResponse: null,
        error: request instanceof Error ? request : new Error('No current submitted workout draft is available.') });
      return Promise.resolve(null);
    }
    const existing = flightRef.current;
    if (existing?.scope === scope) return existing.promise;
    const flight: Flight = { scope, promise: Promise.resolve(null) };
    flightRef.current = flight;
    const isCurrent = () => mountedRef.current && flightRef.current === flight
      && submissionScope(owner.getSnapshot()) === scope;
    setPublication({ scope, submitting: true, error: null, lastResponse: null });
    flight.promise = (async () => {
      try {
        const response = await createCoachWorkoutDraft(request);
        if (!isCurrent()) return null;
        setPublication({ scope, submitting: false, error: null, lastResponse: response });
        return response;
      } catch (nextError) {
        if (isCurrent()) setPublication({ scope, submitting: false, lastResponse: null,
          error: nextError instanceof Error ? nextError : new Error('Workout draft submission failed.') });
        return null;
      } finally {
        // Local retirement does not cancel or roll back a server-side operation.
        // An old completion cannot clear a newer task's single-flight latch.
        if (flightRef.current === flight) flightRef.current = null;
      }
    })();
    return flight.promise;
  }, [owner.getSnapshot, request, scope]);
  const visible = publication.scope === scope ? publication : EMPTY_PUBLICATION;
  return { submitting: visible.submitting, error: visible.error, lastResponse: visible.lastResponse,
    request: request instanceof Error ? null : request, submit };
};

export default useCoachWorkoutDraftSubmit;
