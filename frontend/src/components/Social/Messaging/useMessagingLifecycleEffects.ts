import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ConversationData, MessageData } from './MessagingTypes';
import type { MessagingErrorState } from './messagingSafeErrors';

interface UseMessagingLifecycleEffectsOptions {
  enabled: boolean;
  connected: boolean;
  activeConversationId: string | number | null;
  messages: MessageData[];
  currentUserId: string | number | null;
  mountedRef: MutableRefObject<boolean>;
  pollRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
  typingClearTimers: MutableRefObject<Map<number, ReturnType<typeof setTimeout>>>;
  fetchAbortRef: MutableRefObject<AbortController | null>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string | number) => Promise<void>;
  markAsRead: (conversationId: string | number, lastMessageId: string | number) => void;
  setConversations: Dispatch<SetStateAction<ConversationData[]>>;
  setActiveConversationId: Dispatch<SetStateAction<string | number | null>>;
  setMessages: Dispatch<SetStateAction<MessageData[]>>;
  setError: Dispatch<SetStateAction<MessagingErrorState | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

export function useMessagingLifecycleEffects({
  enabled,
  connected,
  activeConversationId,
  messages,
  currentUserId,
  mountedRef,
  pollRef,
  typingClearTimers,
  fetchAbortRef,
  fetchConversations,
  fetchMessages,
  markAsRead,
  setConversations,
  setActiveConversationId,
  setMessages,
  setError,
  setLoading,
}: UseMessagingLifecycleEffectsOptions) {
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
      setError(null);
      setLoading(false);
      return () => { mountedRef.current = false; };
    }
    fetchConversations();
    return () => { mountedRef.current = false; };
  }, [enabled, fetchConversations, mountedRef, setActiveConversationId, setConversations, setError, setLoading, setMessages]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (enabled && !connected && activeConversationId) {
      pollRef.current = setInterval(() => {
        fetchMessages(activeConversationId);
        fetchConversations();
      }, 30000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConversationId, connected, enabled, fetchConversations, fetchMessages, pollRef]);

  useEffect(() => {
    if (!enabled || !connected || !activeConversationId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && String(lastMsg.sender_id) !== String(currentUserId)) {
      markAsRead(activeConversationId, lastMsg.id);
    }
  }, [activeConversationId, connected, currentUserId, enabled, markAsRead, messages]);

  useEffect(() => {
    return () => {
      typingClearTimers.current.forEach(timer => clearTimeout(timer));
      typingClearTimers.current.clear();
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
    };
  }, [fetchAbortRef, typingClearTimers]);
}
