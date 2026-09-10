import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  beginDraft,
  createInitialDraftState,
  discardDraft,
  editDraft,
  freezeForSubmit,
  requestTargetChange,
  resolveTargetChange,
  type DraftPatch,
  type DraftState,
  type SelectionIntent,
  type ScopeToken,
  type SubmittedDraft,
  type TargetChange,
} from './coachSessionDraftState';

export interface CoachSessionDraftContextValue {
  actorId: number | null;
  actorRole: string | null;
  generation: number;
  draft: DraftState['draft'];
  submitted: SubmittedDraft | null;
  pendingTargetChange: TargetChange | null;
  begin: (targetUserId: unknown, origin: string) => ScopeToken | null;
  edit: (scopeToken: ScopeToken, expectedRevision: number, patch: DraftPatch) => ReturnType<typeof editDraft>;
  freezeForSubmit: (scopeToken: ScopeToken, expectedRevision: number) => SubmittedDraft | null;
  requestTargetChange: (nextTargetUserId: unknown) => ReturnType<typeof requestTargetChange>;
  resolveTargetChange: (scopeToken: ScopeToken, decision: 'return' | 'discard') => SelectionIntent;
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
  const identityRef = useRef<string | null>(identity);
  stateRef.current = state;

  useEffect(() => {
    if (identityRef.current === identity) return;
    identityRef.current = identity;
    setState((previous) => {
      const next = createInitialDraftState(normalizedActor, normalizedRole, previous.generation + 1);
      stateRef.current = next;
      return next;
    });
  }, [identity, normalizedActor, normalizedRole]);

  const update = useCallback((transition: (previous: DraftState) => DraftState) => {
    setState((previous) => {
      const next = transition(previous);
      stateRef.current = next;
      return next;
    });
  }, []);

  const begin = useCallback((targetUserId: unknown, origin: string) => {
    const result = beginDraft(stateRef.current, targetUserId, origin);
    if (result.ok) update(() => result.state);
    return result.ok ? result.scopeToken : null;
  }, [update]);

  const edit = useCallback((scopeToken: ScopeToken, expectedRevision: number, patch: DraftPatch) => {
    const result = editDraft(stateRef.current, scopeToken, expectedRevision, patch);
    if (result.ok) update(() => result.state);
    return result;
  }, [update]);

  const freeze = useCallback((scopeToken: ScopeToken, expectedRevision: number) => {
    const result = freezeForSubmit(stateRef.current, scopeToken, expectedRevision);
    if (result.ok) update(() => result.state);
    return result.ok ? result.submitted : null;
  }, [update]);

  const requestChange = useCallback((nextTargetUserId: unknown) => {
    const result = requestTargetChange(stateRef.current, nextTargetUserId);
    if (result.ok) update(() => result.state);
    return result;
  }, [update]);

  const resolveChange = useCallback((scopeToken: ScopeToken, decision: 'return' | 'discard') => {
    const result = resolveTargetChange(stateRef.current, scopeToken, decision);
    if (result.intent.kind !== 'none' || result.state !== stateRef.current) update(() => result.state);
    return result.intent;
  }, [update]);

  const discard = useCallback((scopeToken: ScopeToken) => {
    update((previous) => discardDraft(previous, scopeToken));
  }, [update]);

  const value = useMemo<CoachSessionDraftContextValue>(() => ({
    actorId: state.actorId,
    actorRole: state.actorRole,
    generation: state.generation,
    draft: state.draft,
    submitted: state.submitted,
    pendingTargetChange: state.pendingTargetChange,
    begin,
    edit,
    freezeForSubmit: freeze,
    requestTargetChange: requestChange,
    resolveTargetChange: resolveChange,
    discard,
  }), [state, begin, edit, freeze, requestChange, resolveChange, discard]);

  return <CoachSessionDraftContext.Provider value={value}>{children}</CoachSessionDraftContext.Provider>;
};

export const useCoachSessionDraftContext = (): CoachSessionDraftContextValue => {
  const context = useContext(CoachSessionDraftContext);
  if (!context) throw new Error('useCoachSessionDraft must be used within CoachSessionDraftProvider');
  return context;
};

