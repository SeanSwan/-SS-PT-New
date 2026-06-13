/**
 * Coach Command Center controller effects.
 *
 * Small hooks extracted from the main controller so route hydration, thread
 * selection, and PLAUD scrolling stay independently reviewable.
 */
import { useEffect } from 'react';
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
  setActiveThreadId: Dispatch<SetStateAction<number | null>>,
  setSelectedStatus: Dispatch<SetStateAction<string>>,
) {
  useEffect(() => {
    if (!autoSelectedThread) return;
    setActiveThreadId(autoSelectedThread.id);
    setSelectedStatus(`${getConversationTitle(autoSelectedThread)} - thread ready`);
  }, [autoSelectedThread, setActiveThreadId, setSelectedStatus]);
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
