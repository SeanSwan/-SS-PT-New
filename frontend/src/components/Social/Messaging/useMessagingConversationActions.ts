/**
 * FILE: useMessagingConversationActions.ts
 * PURPOSE: Conversation-level archive, unread, mute, and search actions for messaging.
 */
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ConversationData, MessageData } from './MessagingTypes';
import { encodeMessagingPathSegment, normalizeMessageSearchPayload } from './messagingApiAdapters';
import { apiFetch } from './messagingApiFetch';
import { createMessagingErrorState, type MessagingErrorState } from './messagingSafeErrors';

interface UseMessagingConversationActionsParams {
  enabled: boolean;
  activeConvRef: MutableRefObject<string | number | null>;
  fetchConversations: () => Promise<void>;
  mountedRef: MutableRefObject<boolean>;
  setActiveConversationId: Dispatch<SetStateAction<string | number | null>>;
  setConversations: Dispatch<SetStateAction<ConversationData[]>>;
  setError: Dispatch<SetStateAction<MessagingErrorState | null>>;
  setMessages: Dispatch<SetStateAction<MessageData[]>>;
}

export function useMessagingConversationActions({
  enabled,
  activeConvRef,
  fetchConversations,
  mountedRef,
  setActiveConversationId,
  setConversations,
  setError,
  setMessages,
}: UseMessagingConversationActionsParams) {
  const searchConversationMessages = useCallback(async (conversationId: string | number, query: string): Promise<MessageData[]> => {
    const trimmed = query.trim();
    if (!enabled || !conversationId || trimmed.length < 2) return [];

    try {
      const segment = encodeMessagingPathSegment(conversationId);
      const data = await apiFetch<unknown>(`/conversations/${segment}/messages/search?q=${encodeURIComponent(trimmed)}&limit=25`);
      return normalizeMessageSearchPayload(data);
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('messages'));
      return [];
    }
  }, [enabled, mountedRef, setError]);

  const archiveConversation = useCallback(async (conversationId: string | number): Promise<boolean> => {
    if (!enabled || !conversationId) return false;
    try {
      const segment = encodeMessagingPathSegment(conversationId);
      await apiFetch<unknown>(`/conversations/${segment}/archive`, { method: 'PATCH' });
      if (mountedRef.current) {
        setConversations(prev => prev.filter(item => String(item.id) !== String(conversationId)));
        if (String(activeConvRef.current) === String(conversationId)) {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
      await fetchConversations();
      return true;
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('conversations'));
      return false;
    }
  }, [activeConvRef, enabled, fetchConversations, mountedRef, setActiveConversationId, setConversations, setError, setMessages]);

  const markConversationUnread = useCallback(async (conversationId: string | number): Promise<boolean> => {
    if (!enabled || !conversationId) return false;
    try {
      const segment = encodeMessagingPathSegment(conversationId);
      await apiFetch<unknown>(`/conversations/${segment}/mark-unread`, { method: 'PATCH' });
      if (mountedRef.current) {
        setConversations(prev => prev.map(item => String(item.id) === String(conversationId)
          ? { ...item, unreadCount: Math.max(1, item.unreadCount) }
          : item));
      }
      await fetchConversations();
      return true;
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('conversations'));
      return false;
    }
  }, [enabled, fetchConversations, mountedRef, setConversations, setError]);

  const muteConversation = useCallback(async (conversationId: string | number): Promise<boolean> => {
    if (!enabled || !conversationId) return false;
    try {
      const segment = encodeMessagingPathSegment(conversationId);
      await apiFetch<unknown>(`/conversations/${segment}/mute`, { method: 'PUT' });
      if (mountedRef.current) {
        setConversations(prev => prev.map(item => String(item.id) === String(conversationId) ? { ...item, isMuted: true, mutedUntil: null } : item));
      }
      await fetchConversations();
      return true;
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('conversations'));
      return false;
    }
  }, [enabled, fetchConversations, mountedRef, setConversations, setError]);

  const unmuteConversation = useCallback(async (conversationId: string | number): Promise<boolean> => {
    if (!enabled || !conversationId) return false;
    try {
      const segment = encodeMessagingPathSegment(conversationId);
      await apiFetch<unknown>(`/conversations/${segment}/mute`, { method: 'DELETE' });
      if (mountedRef.current) {
        setConversations(prev => prev.map(item => String(item.id) === String(conversationId) ? { ...item, isMuted: false, mutedUntil: null } : item));
      }
      await fetchConversations();
      return true;
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('conversations'));
      return false;
    }
  }, [enabled, fetchConversations, mountedRef, setConversations, setError]);

  return { archiveConversation, markConversationUnread, muteConversation, searchConversationMessages, unmuteConversation };
}
