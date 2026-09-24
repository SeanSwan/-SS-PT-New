import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  beginDraft,
  createInitialDraftState,
  discardDraft,
  editDraft,
  freezeForSubmit,
  rememberSelection,
  requestTargetChange,
  resolveTargetChange,
  type DraftPatch,
  type DraftState,
  type SelectionAnchor,
  type SelectionIntent,
  type ScopeToken,
  type SubmittedDraft,
  type TargetChangeMetadata,
  type TargetChange,
} from './coachSessionDraftState';

export interface CoachSessionDraftContextValue {
  actorId: number | null;
  actorRole: string | null;
  generation: number;
  draft: DraftState['draft'];
  submitted: SubmittedDraft | null;
  pendingTargetChange: TargetChange | null;
  selectionAnchor: SelectionAnchor | null;
  /** Read the sole owner's current state for synchronous continuation fences. */
  getSnapshot: () => Readonly<DraftState>;
  begin: (targetUserId: unknown, origin: string) => ScopeToken | null;
  edit: (scopeToken: ScopeToken, expectedRevision: number, patch: DraftPatch) => ReturnType<typeof editDraft>;
  freezeForSubmit: (scopeToken: ScopeToken, expectedRevision: number) => SubmittedDraft | null;
  requestTargetChange: (nextTargetUserId: unknown, metadata?: TargetChangeMetadata) => ReturnType<typeof requestTargetChange>;
  rememberSelection: (scopeToken: ScopeToken, anchor: unknown) => ReturnType<typeof rememberSelection>;
  resolveTargetChange: {
    (scopeToken: ScopeToken, decision: 'return' | 'discard'): SelectionIntent;
    (scopeToken: ScopeToken, requestId: string, decision: 'return' | 'discard'): SelectionIntent;
  };
  discard: (scopeToken: ScopeToken) => void;
}

const CoachSessionDraftContext = createContext<CoachSessionDraftContextValue | null>(null);

interface CoachSessionDraftProviderProps {
  actorId: string | number | null | undefined;
  actorRole: string | null | undefined;
  children: ReactNode;
}

export const CoachSessionDraftProvider = ({ actorId, actorRole, children }: CoachSessionDraftProviderProps) => {
  const initialState = createInitialDraftState(actorId, actorRole);
  const normalizedActor = initialState.actorId;
  const normalizedRole = initialState.actorRole;
  const identity = `${normalizedActor ?? 'none'}:${normalizedRole ?? 'none'}`;
  const [state, setState] = useState<DraftState>(() => initialState);
  const stateRef = useRef(state);
  const identityRef = useRef({ identity });
  const admission = identityRef.current;
  const mountedRef = useRef(true);

  // Mask during rendering; retire the old generation at the committed boundary.
  // A passive effect is too late: children could render the previous actor's task.
  const visibleState = state.actorId === normalizedActor && state.actorRole === normalizedRole
    ? state
    : createInitialDraftState(normalizedActor, normalizedRole, state.generation + 1);
  useLayoutEffect(() => {
    if (identityRef.current.identity === identity) return;
    identityRef.current = { identity };
    const next = createInitialDraftState(normalizedActor, normalizedRole, stateRef.current.generation + 1);
    stateRef.current = next;
    setState(next);
  }, [identity, normalizedActor, normalizedRole]);
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const previous = stateRef.current;
      stateRef.current = createInitialDraftState(previous.actorId, previous.actorRole, previous.generation + 1);
    };
  }, []);

  // Object identity is the actor admission generation: A→B→A cannot revive
  // callbacks issued for the first A, including begin (which has no scope token).
  const isAdmitted = useCallback(() => mountedRef.current
    && identityRef.current === admission && admission.identity === identity, [admission, identity]);
  const getSnapshot = useCallback((): Readonly<DraftState> => isAdmitted()
    ? stateRef.current
    : createInitialDraftState(normalizedActor, normalizedRole, stateRef.current.generation),
  [isAdmitted, normalizedActor, normalizedRole]);
  const update = useCallback((transition: (previous: DraftState) => DraftState) => {
    if (!isAdmitted()) return;
    // Transitions are linearized here, not in React's deferred/replayed updater.
    const next = transition(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, [isAdmitted]);

  const begin = useCallback((targetUserId: unknown, origin: string) => {
    if (!isAdmitted()) return null;
    const result = beginDraft(getSnapshot(), targetUserId, origin);
    if (result.ok) update(() => result.state);
    return result.ok ? result.scopeToken : null;
  }, [getSnapshot, isAdmitted, update]);

  const edit = useCallback((scopeToken: ScopeToken, expectedRevision: number, patch: DraftPatch) => {
    const result = editDraft(getSnapshot(), scopeToken, expectedRevision, patch);
    if (result.ok) update(() => result.state);
    return result;
  }, [getSnapshot, update]);

  const freeze = useCallback((scopeToken: ScopeToken, expectedRevision: number) => {
    const result = freezeForSubmit(getSnapshot(), scopeToken, expectedRevision);
    if (result.ok) update(() => result.state);
    return result.ok ? result.submitted : null;
  }, [getSnapshot, update]);

  const requestChange = useCallback((nextTargetUserId: unknown, metadata?: TargetChangeMetadata) => {
    const result = requestTargetChange(getSnapshot(), nextTargetUserId, metadata);
    if (result.ok) update(() => result.state);
    return result;
  }, [getSnapshot, update]);

  const remember = useCallback((scopeToken: ScopeToken, anchor: unknown) => {
    const result = rememberSelection(getSnapshot(), scopeToken, anchor);
    if (result.ok) update(() => result.state);
    return result;
  }, [getSnapshot, update]);

  // Capture the pending request ID in the render that issued the resolver.
  // A delayed legacy callback must not resolve a later competing request.
  const pendingRequestId = visibleState.pendingTargetChange?.requestId ?? null;
  const resolveChange = useCallback((
    scopeToken: ScopeToken,
    requestOrDecision: string | 'return' | 'discard',
    explicitDecision?: 'return' | 'discard',
  ) => {
    const requestId: string = explicitDecision === undefined
      ? pendingRequestId ?? ''
      : typeof requestOrDecision === 'string' ? requestOrDecision : '';
    const decision: 'return' | 'discard' = explicitDecision === undefined
      ? requestOrDecision as 'return' | 'discard'
      : explicitDecision;
    const result = resolveTargetChange(getSnapshot(), scopeToken, requestId, decision);
    if (result.intent.kind !== 'none' || result.state !== stateRef.current) update(() => result.state);
    return result.intent;
  }, [getSnapshot, pendingRequestId, update]);

  const discard = useCallback((scopeToken: ScopeToken) => {
    update((previous) => discardDraft(previous, scopeToken));
  }, [update]);

  const value = useMemo<CoachSessionDraftContextValue>(() => ({
    actorId: visibleState.actorId,
    actorRole: visibleState.actorRole,
    generation: visibleState.generation,
    draft: visibleState.draft,
    submitted: visibleState.submitted,
    pendingTargetChange: visibleState.pendingTargetChange,
    selectionAnchor: visibleState.selectionAnchor,
    getSnapshot,
    begin,
    edit,
    freezeForSubmit: freeze,
    requestTargetChange: requestChange,
    rememberSelection: remember,
    resolveTargetChange: resolveChange,
    discard,
  }), [visibleState, getSnapshot, begin, edit, freeze, requestChange, remember, resolveChange, discard]);

  return <CoachSessionDraftContext.Provider value={value}>{children}</CoachSessionDraftContext.Provider>;
};

export const useCoachSessionDraftContext = (): CoachSessionDraftContextValue => {
  const context = useContext(CoachSessionDraftContext);
  if (!context) throw new Error('useCoachSessionDraft must be used within CoachSessionDraftProvider');
  return context;
};
