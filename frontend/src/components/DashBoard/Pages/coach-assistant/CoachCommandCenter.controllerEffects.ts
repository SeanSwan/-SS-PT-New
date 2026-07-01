/**
 * Coach Command Center controller effects.
 *
 * Small hooks extracted from the main controller so route hydration, thread
 * selection, and PLAUD scrolling stay independently reviewable.
 */
import { useEffect, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { ConversationSummary } from '../../../../hooks/useAIChat';
import { getConversationTitle } from './CoachCommandCenter.logic';
import type { RouteContextCopy } from './CoachCommandCenter.routeContext';

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

  useEffect(() => {
    if (!routeThreadId) {
      lastLoadedThreadIdRef.current = null;
      return;
    }

    const thread = coachThreads.find((item) => item.id === routeThreadId) ?? null;
    setActiveThreadId(routeThreadId);
    if (thread) setSelectedStatus(`${getConversationTitle(thread)} - thread loaded`);

    if (lastLoadedThreadIdRef.current === routeThreadId) return;
    lastLoadedThreadIdRef.current = routeThreadId;
    void chat.loadConversation(routeThreadId);
  }, [chat, coachThreads, routeThreadId, setActiveThreadId, setSelectedStatus]);
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
