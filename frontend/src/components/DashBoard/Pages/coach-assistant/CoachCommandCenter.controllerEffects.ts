/**
 * Coach Command Center controller effects.
 *
 * Small hooks extracted from the main controller so route hydration, thread
 * selection, and PLAUD scrolling stay independently reviewable.
 */
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { ConversationSummary } from '../../../../hooks/useAIChat';
import { getConversationTitle } from './CoachCommandCenter.logic';
import type { RouteContextCopy } from './CoachCommandCenter.routeContext';

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
) {
  const lastLoadedThreadIdRef = useRef<number | null>(null);
  const loadAttemptsRef = useRef<{ threadId: number | null; count: number }>({ threadId: null, count: 0 });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!routeThreadId) {
      lastLoadedThreadIdRef.current = null;
      loadAttemptsRef.current = { threadId: null, count: 0 };
      return;
    }
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
  }, [chat, coachThreads, retryToken, routeThreadId, setActiveThreadId, setSelectedStatus]);
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
