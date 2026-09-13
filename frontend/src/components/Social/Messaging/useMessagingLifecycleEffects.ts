import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ConversationData, MessageData, TypingUser } from './MessagingTypes';
import type { MessagingErrorState } from './messagingSafeErrors';

interface UseMessagingLifecycleEffectsOptions {
  enabled: boolean;
  connected: boolean;
  activeConversationId: string | number | null;
  messages: MessageData[];
  currentUserId: number | null;
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
    if (lastMsg && lastMsg.sender_id !== currentUserId) {
      markAsRead(activeConversationId, lastMsg.id);
    }
  }, [activeConversationId, connected, currentUserId, enabled, markAsRead, messages]);

  useEffect(() => {
    const timersRef = typingClearTimers;
    const abortRef = fetchAbortRef;
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
      abortRef.current?.abort();
    };
  }, [fetchAbortRef, typingClearTimers]);
}

type ActorScopeOptions = Pick<UseMessagingLifecycleEffectsOptions,
  'currentUserId' | 'enabled' | 'mountedRef' | 'fetchAbortRef' | 'typingClearTimers'
  | 'setConversations' | 'setActiveConversationId' | 'setMessages' | 'setError' | 'setLoading'> & {
  activeConvRef: MutableRefObject<string | number | null>;
  pendingSendKeysRef: MutableRefObject<Set<string>>;
  typingTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setTypingUsers: Dispatch<SetStateAction<TypingUser[]>>;
  setOnlineUserIds: Dispatch<SetStateAction<Set<number>>>;
  setPendingMessages: Dispatch<SetStateAction<string[]>>;
  setMessagesLoading: Dispatch<SetStateAction<boolean>>;
  error: MessagingErrorState | null;
};

/** Actor-owned state and callbacks must not survive logout or an A -> B -> A switch. */
export function useMessagingActorScope({
  currentUserId,
  enabled,
  error,
  mountedRef,
  fetchAbortRef,
  activeConvRef,
  pendingSendKeysRef,
  typingClearTimers,
  typingTimeoutRef,
  setConversations,
  setActiveConversationId,
  setMessages,
  setTypingUsers,
  setOnlineUserIds,
  setPendingMessages,
  setError,
  setMessagesLoading,
  setLoading,
}: ActorScopeOptions) {
  const conversationFetchAbortRef = useRef<AbortController | null>(null);
  const actorScopeRef = useRef({ owner: currentUserId, enabled, generation: 0 });
  if (actorScopeRef.current.owner !== currentUserId || actorScopeRef.current.enabled !== enabled) {
    actorScopeRef.current = { owner: currentUserId, enabled, generation: actorScopeRef.current.generation + 1 };
  }
  const actorGeneration = actorScopeRef.current.generation;
  const [stateGeneration, setStateGeneration] = useState(actorGeneration);
  const ownsState = stateGeneration === actorGeneration;
  const isCurrentActor = useCallback((generation: number) => mountedRef.current
    && actorScopeRef.current.generation === generation
    && actorScopeRef.current.enabled && actorScopeRef.current.owner !== null, [mountedRef]);


  // Invalidate on render, then clear the previous actor before exposing state.
  // Captured generations also reject A -> B -> A replies and old finalizers.
  useEffect(() => {
    const conversationAbortRef = conversationFetchAbortRef;
    const messagesAbortRef = fetchAbortRef;
    conversationFetchAbortRef.current?.abort();
    fetchAbortRef.current?.abort();
    pendingSendKeysRef.current.clear();
    typingClearTimers.current.forEach(timer => clearTimeout(timer));
    typingClearTimers.current.clear();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    activeConvRef.current = null;
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    setTypingUsers([]);
    setOnlineUserIds(new Set());
    setPendingMessages([]);
    setError(null);
    setMessagesLoading(false);
    setLoading(enabled && currentUserId !== null);
    setStateGeneration(actorGeneration);
    return () => {
      conversationAbortRef.current?.abort();
      messagesAbortRef.current?.abort();
    };
  }, [activeConvRef, actorGeneration, currentUserId, enabled, fetchAbortRef,
    pendingSendKeysRef, setActiveConversationId, setConversations, setError, setLoading,
    setMessages, setMessagesLoading, setOnlineUserIds, setPendingMessages, setTypingUsers,
    typingClearTimers, typingTimeoutRef]);

  const scopedSetters = useMemo(() => {
    const guard = <T,>(setter: Dispatch<SetStateAction<T>>): Dispatch<SetStateAction<T>> => value => {
      if (isCurrentActor(actorGeneration)) setter(value);
    };
    return {
      setConversations: guard(setConversations), setMessages: guard(setMessages),
      setActiveConversationId: guard(setActiveConversationId), setError: guard(setError),
      setTypingUsers: guard(setTypingUsers), setOnlineUserIds: guard(setOnlineUserIds),
    };
  }, [actorGeneration, isCurrentActor, setActiveConversationId, setConversations,
    setError, setMessages, setOnlineUserIds, setTypingUsers]);

  useEffect(() => {
    if (error?.type !== 'transient') return;
    const timer = setTimeout(() => {
      if (isCurrentActor(actorGeneration)) setError(current => current === error ? null : current);
    }, 5000);
    return () => clearTimeout(timer);
  }, [actorGeneration, error, isCurrentActor, setError]);

  return { actorGeneration, ownsState, isCurrentActor, scopedSetters, conversationFetchAbortRef };
}
