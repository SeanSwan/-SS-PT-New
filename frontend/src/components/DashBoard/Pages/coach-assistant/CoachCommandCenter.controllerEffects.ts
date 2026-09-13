/**
 * Coach Command Center controller effects.
 *
 * Small hooks extracted from the main controller so route hydration, thread
 * selection, and PLAUD scrolling stay independently reviewable.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { ConversationSummary } from '../../../../hooks/useAIChat';
import { AI_CHAT_MESSAGE_MAX_CHARS } from '../../../../hooks/aiMessageLimits';
import { getConversationTitle } from './CoachCommandCenter.logic';
import type { RouteContextCopy } from './CoachCommandCenter.routeContext';
import { buildSwanCoachWorkoutPlannerRoute } from './SwanCoachWorkoutPlannerRoute';
import type {
  CoachRequestOutcome,
  CoachSelectionInstructions,
  CoachSelectionPhase,
} from './hooks/useCoachSessionSelection';

/**
 * Plan 55 §3 C3 — the narrow port the controller effects use to REQUEST a
 * selection. They never mutate the route, the pin or the active thread before
 * the adapter has admitted the candidate and the commit consumer has applied it.
 */
export type CoachSelectionPort = {
  phase: CoachSelectionPhase;
  pending: Readonly<{ requestId: string; scopeToken: string }> | null;
  instructions: CoachSelectionInstructions | null;
  requestGeneration: number;
  requestSelection: (candidate: {
    targetUserId?: unknown; conversationId?: unknown; origin?: 'picker' | 'clear' | 'thread' | 'route' | 'pin' | 'default';
  }) => Promise<CoachRequestOutcome>;
  consumeCommit: (commitId: string) => CoachSelectionInstructions | null;
  ackCommit: (commitId: string, observed: Readonly<{ targetUserId: number | null; threadId: number | null }>) => boolean;
};

/**
 * Bounded retry budget for a routed thread whose guarded load never took
 * effect. Every attempt is a read-only detail GET, so the cap is 3 — enough to
 * survive one retired attempt, small enough that a permanently failing load
 * cannot retry forever.
 */
const ROUTED_THREAD_LOAD_ATTEMPT_LIMIT = 3;

export function useLoadCoachConversations(chat: {
  listConversations: (status: string, force?: boolean) => unknown;
}) {
  useEffect(() => {
    void chat.listConversations('active', true);
    // Load once on route mount; the hook owns its cache afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useAutoSelectCoachThread(
  autoSelectedThread: ConversationSummary | null,
  chat: { loadConversation: (id: number) => unknown },
  setActiveThreadId: Dispatch<SetStateAction<number | null>>,
  setSelectedStatus: Dispatch<SetStateAction<string>>,
) {
  const lastLoadedThreadIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoSelectedThread) {
      lastLoadedThreadIdRef.current = null;
      return;
    }
    setActiveThreadId(autoSelectedThread.id);
    setSelectedStatus(`${getConversationTitle(autoSelectedThread)} - thread ready`);
    if (lastLoadedThreadIdRef.current === autoSelectedThread.id) return;
    lastLoadedThreadIdRef.current = autoSelectedThread.id;
    void chat.loadConversation(autoSelectedThread.id);
  }, [autoSelectedThread, chat, setActiveThreadId, setSelectedStatus]);
}
export function useLoadRoutedCoachThread(
  routeThreadId: number | null,
  coachThreads: ConversationSummary[],
  chat: { loadConversation: (id: number) => unknown },
  setActiveThreadId: Dispatch<SetStateAction<number | null>>,
  setSelectedStatus: Dispatch<SetStateAction<string>>,
  /**
   * Plan 55 §3 C3 — when the adapter port is present a routed thread is a
   * CANDIDATE, not an instruction: the id is requested for admission and only an
   * ACCEPTED admission (not a raw route observation) may hydrate it.
   */
  selection?: CoachSelectionPort,
  selectionAdmittedThreadId?: number | null,
) {
  const lastLoadedThreadIdRef = useRef<number | null>(null);
  const loadAttemptsRef = useRef<{ threadId: number | null; count: number }>({ threadId: null, count: 0 });
  const requestedRef = useRef<number | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // The request happens FIRST. Nothing is loaded, announced or activated while
  // the candidate is still unadmitted.
  useEffect(() => {
    if (!selection || !routeThreadId || requestedRef.current === routeThreadId) return;
    requestedRef.current = routeThreadId;
    void selection.requestSelection({ conversationId: routeThreadId, origin: 'route' });
  }, [routeThreadId, selection]);

  useEffect(() => {
    if (!routeThreadId) {
      lastLoadedThreadIdRef.current = null;
      loadAttemptsRef.current = { threadId: null, count: 0 };
      return;
    }
    // With an adapter mounted, only the ADMITTED thread may be loaded. Without
    // one this keeps the existing (pre-C3) behaviour for other callers.
    if (selection && selectionAdmittedThreadId !== routeThreadId) return;
    if (loadAttemptsRef.current.threadId !== routeThreadId) {
      loadAttemptsRef.current = { threadId: routeThreadId, count: 0 };
    }

    const thread = coachThreads.find((item) => item.id === routeThreadId) ?? null;
    setActiveThreadId(routeThreadId);
    if (thread) setSelectedStatus(`${getConversationTitle(thread)} - thread loaded`);

    if (lastLoadedThreadIdRef.current === routeThreadId) return;
    if (loadAttemptsRef.current.count >= ROUTED_THREAD_LOAD_ATTEMPT_LIMIT) return;
    lastLoadedThreadIdRef.current = routeThreadId;
    loadAttemptsRef.current.count += 1;
    void Promise.resolve(chat.loadConversation(routeThreadId)).then((conversation) => {
      // A null result means the guarded load never took effect: the operation
      // was retired before it landed (for example a remount aborting the
      // in-flight request), or the publication gate refused it. Latch only on a
      // load that actually landed, so a later render can retry - bounded by
      // ROUTED_THREAD_LOAD_ATTEMPT_LIMIT.
      if (conversation || lastLoadedThreadIdRef.current !== routeThreadId) return;
      lastLoadedThreadIdRef.current = null;
      setRetryToken((token) => token + 1);
    });
  }, [chat, coachThreads, retryToken, routeThreadId, selection, selectionAdmittedThreadId, setActiveThreadId, setSelectedStatus]);
}

/**
 * Plan 55 §3 C3 — the ONE commit consumer. Exactly one controller layout effect
 * applies each commitId once, before any private UI is enabled, and acknowledges
 * the exact observed tuple. A failed acknowledgment leaves the publication
 * DISABLED (the adapter's own `ackCommit` decides that); it is never retried
 * into a permissive fallback.
 */
export function useApplyCoachSelectionCommit(
  selection: CoachSelectionPort,
  apply: (instructions: CoachSelectionInstructions) => Readonly<{ targetUserId: number | null; threadId: number | null }> | null,
) {
  const appliedRef = useRef<string | null>(null);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const ticket = selection.instructions;
  useLayoutEffect(() => {
    if (!ticket) return;
    const port = selectionRef.current;
    if (appliedRef.current === ticket.commitId) return;
    const consumed = port.consumeCommit(ticket.commitId);
    if (!consumed) return;
    // Consumed exactly once: the local effects below run once per ticket.
    appliedRef.current = consumed.commitId;
    const observed = applyRef.current(consumed);
    if (!observed) return;
    port.ackCommit(consumed.commitId, observed);
  }, [ticket]);
}

/** Plan 55 §3 C3 — the raw route/observed-pin candidate becomes a REQUEST. */
export function useRequestCoachRouteSelection(
  observationKey: string,
  candidate: Readonly<{ targetUserId: number | null; conversationId: number | null }>,
  selection: CoachSelectionPort,
) {
  const lastKeyRef = useRef<string | null>(null);
  const requestRef = useRef(selection.requestSelection);
  requestRef.current = selection.requestSelection;
  const target = candidate.targetUserId;
  const thread = candidate.conversationId;
  useEffect(() => {
    if (lastKeyRef.current === observationKey) return;
    lastKeyRef.current = observationKey;
    void requestRef.current({ targetUserId: target, conversationId: thread, origin: 'route' });
  }, [observationKey, target, thread]);
}

export function useApplyRouteContextPrompt(
  effectiveRouteContext: RouteContextCopy,
  searchKey: string,
  setActiveThreadId: Dispatch<SetStateAction<number | null>>,
  setSelectedStatus: Dispatch<SetStateAction<string>>,
  setCommandText: Dispatch<SetStateAction<string>>,
) {
  useEffect(() => {
    if (!effectiveRouteContext.prompt || !effectiveRouteContext.status) return;
    setActiveThreadId(null);
    setSelectedStatus(effectiveRouteContext.status);
    setCommandText((current) => current.trim() ? current : effectiveRouteContext.prompt || '');
  }, [effectiveRouteContext.prompt, effectiveRouteContext.status, searchKey, setActiveThreadId, setCommandText, setSelectedStatus]);
}

export function usePlaudReviewScroll(
  shouldScroll: boolean,
  searchKey: string,
  plaudReviewRef: RefObject<HTMLElement>,
) {
  useEffect(() => {
    if (!shouldScroll) return undefined;
    const timer = window.setTimeout(() => {
      plaudReviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      plaudReviewRef.current?.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [plaudReviewRef, searchKey, shouldScroll]);
}

/* ============================================================================
 * Rule 4 extractions from CoachCommandCenter.controller.ts. Behaviour is
 * unchanged; the controller was at the 300-line cap and C3 needs the room.
 * ========================================================================= */

/** Stage a guide prompt in the composer without clobbering the trainer's words. */
export function useCoachGuidePrompt(
  setCommandText: Dispatch<SetStateAction<string>>,
  setSelectedStatus: Dispatch<SetStateAction<string>>,
  commandTextRef: RefObject<HTMLTextAreaElement>,
) {
  return useCallback((prompt: string) => {
    const trimmed = prompt.trim().slice(0, AI_CHAT_MESSAGE_MAX_CHARS);
    if (!trimmed) return;
    setCommandText((current) => current.trim() ? current : trimmed);
    setSelectedStatus('Guide prompt staged for review');
    window.setTimeout(() => commandTextRef.current?.focus(), 0);
  }, [commandTextRef, setCommandText, setSelectedStatus]);
}

/** The selected-client Planner route handed to the command actions. */
export function useCoachWorkoutPlannerRoute(params: {
  userRole: 'admin' | 'trainer' | 'client';
  selectedClientId: number | null;
  workflowReturnTo: string | null;
  searchParams: URLSearchParams;
}) {
  const { userRole, selectedClientId, workflowReturnTo, searchParams } = params;
  const searchKey = searchParams.toString();
  return useMemo(
    () => userRole === 'client'
      ? null
      : buildSwanCoachWorkoutPlannerRoute({ userRole, selectedClientId, workflowReturnTo, searchParams }),
    [searchKey, selectedClientId, userRole, workflowReturnTo],
  );
}
