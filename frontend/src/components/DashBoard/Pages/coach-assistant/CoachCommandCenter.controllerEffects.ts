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

/**
 * Load thread history when the surface can actually read it. Staff are admitted
 * asynchronously (plan 55: GET /api/ai-chat/target-access) and listConversations
 * answers [] until then, so a mount-only load left a coach's history empty until
 * their first send (brain-v4). Staff list on every admission; a surface with no
 * admission step (phase 'retired' — clients) lists once at mount.
 */
export function useLoadCoachConversations(chat: {
  listConversations: (status: string, force?: boolean) => unknown;
}, selectionPhase?: string) {
  const readable = selectionPhase === undefined || selectionPhase === 'ready' || selectionPhase === 'retired';
  useEffect(() => {
    if (readable) void chat.listConversations('active', true);
    // The trigger is "became readable"; the hook owns its cache afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readable]);
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
 * applies each commitId once, before any private UI is enabled.
 *
 * **THE "EXACT OBSERVED TUPLE" FENCE IS WEAKER THAN IT SOUNDS — READ THIS.**
 * `observed` below is `apply`'s OWN RETURN VALUE, not a read of the settled route.
 * External hostile review (GLM 5.3, round 2, finding N1) settled this by elimination
 * over every possible implementation: a live read after `setSearchParams` would see
 * the PRE-navigation tuple (React Router does not settle synchronously), which would
 * fail the ack on every tuple-changing commit and leave the publication permanently
 * disabled — so that is not what happens; the applier echoes the ticket, so the
 * strict match compares the ticket to itself. **The mismatch branch is therefore
 * unreachable by construction, and the adapter's `ackCommit` cannot refuse on a
 * route that failed to stick.**
 *
 * The harm direction is the one the check exists for: if `apply`'s mutations ever
 * fail to take effect while it still returns the ticket tuple, the echo acks anyway
 * and the publication enables for a scope the route does not show — a cross-target
 * send. Two residual hazards are recorded rather than hidden:
 *   1. The fence cannot trip (above).
 *   2. `appliedRef` is set BEFORE `apply` runs and `consumeCommit` is one-use, so a
 *      null `observed` strands the commit permanently — pin already mutated,
 *      publication disabled, phase stuck in 'committing', no retry path.
 *
 * **The fix is a deferred ack and it is NOT applied here on purpose.** It means
 * storing the consumed ticket and acking from a second effect that watches the
 * SETTLED live tuple, which changes the slice's central property; getting it wrong
 * leaves the publication permanently disabled and routed threads never hydrating,
 * which is worse than the tautology. It needs its own slice with a can-fail test
 * (mutate the URL between apply and settle; assert publication stays disabled).
 * Until then this comment tells the truth instead of advertising a fence that
 * cannot trip — see the register's N1 entry.
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
    if (lastKeyRef.current === observationKey) return undefined;
    lastKeyRef.current = observationKey;
    void requestRef.current({ targetUserId: target, conversationId: thread, origin: 'route' });
    // The adapter ABORTS its in-flight admission on unmount (useCoachSessionSelectionState).
    // A remount of the same instance — React StrictMode's dev replay, a Suspense
    // re-show, a fast-refresh — therefore needs a FRESH request. Without this reset
    // the replayed effect saw the same key, issued nothing, and the aborted first
    // request left the staff surface 'unavailable' with sends silently dropped (C2).
    return () => { lastKeyRef.current = null; };
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
