/**
 * FILE: useMessaging.ts
 * PURPOSE: Real-time messaging hook with REST fallback and group controls.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import type { ConversationData, CreateConversationRequest, MessageData, SearchUserResult, TypingUser } from './MessagingTypes';
import {
  encodeMessagingPathSegment,
  normalizeConversationPayload,
  normalizeConversationsPayload,
  normalizeMessagePayload,
  normalizeMessagesPayload,
  normalizeSearchUsersPayload,
} from './messagingApiAdapters';
import { apiFetch } from './messagingApiFetch';
import { createMessagingErrorState, type MessagingErrorState } from './messagingSafeErrors';
import { useMessagingActorScope, useMessagingLifecycleEffects } from './useMessagingLifecycleEffects';
import { useMessagingSocketEffects } from './useMessagingSocketEffects';
import { useMessagingGroupActions } from './useMessagingGroupActions';

export type ErrorState = MessagingErrorState;
type CreateConversationInput = number | CreateConversationRequest;

interface UseMessagingOptions {
  enabled?: boolean;
}

const isMessagingRequestCancellation = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  const code = (err as { code?: unknown }).code;
  return err.name === 'AbortError' || err.name === 'CanceledError' || code === 'ERR_CANCELED';
};

const normalizeCreateConversationInput = (input: CreateConversationInput): CreateConversationRequest => {
  if (typeof input === 'number') return { type: 'direct', participantIds: [input] };
  return {
    type: input.type || (input.participantIds.length > 1 ? 'group' : 'direct'),
    name: input.name,
    participantIds: input.participantIds,
    adminIds: input.adminIds || [],
  };
};

export function useMessaging(currentUserId: number | null, options: UseMessagingOptions = {}) {
  const { connected, connectionState, emit, on } = useSocket();
  const enabled = options.enabled ?? true;

  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | number | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);

  const activeConvRef = useRef<string | number | null>(null);
  const mountedRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const fetchAbortRef = useRef<AbortController | null>(null);
  const pendingSendKeysRef = useRef<Set<string>>(new Set());
  const conversationRequestRef = useRef(0);
  activeConvRef.current = activeConversationId;
  const { actorGeneration, ownsState, isCurrentActor, scopedSetters, conversationFetchAbortRef } = useMessagingActorScope({
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
  });

  useEffect(() => {
    setPendingMessages([]);
  }, [activeConversationId]);

  const fetchConversations = useCallback(async () => {
    if (!isCurrentActor(actorGeneration)) return;
    const requestId = ++conversationRequestRef.current;
    conversationFetchAbortRef.current?.abort();
    const controller = new AbortController();
    conversationFetchAbortRef.current = controller;
    const isCurrentRead = () => isCurrentActor(actorGeneration)
      && requestId === conversationRequestRef.current && !controller.signal.aborted;
    try {
      const data = await apiFetch<unknown>('/conversations', { signal: controller.signal });
      if (isCurrentRead()) {
        setConversations(normalizeConversationsPayload(data));
        setError(null);
      }
    } catch {
      if (isCurrentRead()) setError(createMessagingErrorState('conversations'));
    } finally {
      if (isCurrentRead()) setLoading(false);
    }
  }, [actorGeneration, conversationFetchAbortRef, isCurrentActor]);

  const fetchMessages = useCallback(async (convId: string | number) => {
    if (!convId || !isCurrentActor(actorGeneration)) return;
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const isCurrentRead = () => isCurrentActor(actorGeneration)
      && fetchAbortRef.current === controller && !controller.signal.aborted
      && String(activeConvRef.current) === String(convId);

    if (mountedRef.current) setMessagesLoading(true);
    try {
      const segment = encodeMessagingPathSegment(convId);
      const data = await apiFetch<unknown>(`/conversations/${segment}/messages?limit=500&sort=desc`, { signal: controller.signal });
      if (isCurrentRead()) {
        setMessages(normalizeMessagesPayload(data));
      }
    } catch (err: unknown) {
      if (!isMessagingRequestCancellation(err) && isCurrentRead()) setError(createMessagingErrorState('messages'));
    } finally {
      if (isCurrentRead()) setMessagesLoading(false);
    }
  }, [actorGeneration, isCurrentActor]);

  const applyConversationUpdate = useCallback((conversation: ConversationData | null) => {
    if (!conversation || !isCurrentActor(actorGeneration)) return;
    setConversations(prev => prev.some(item => String(item.id) === String(conversation.id))
      ? prev.map(item => String(item.id) === String(conversation.id) ? conversation : item)
      : [conversation, ...prev]);
  }, [actorGeneration, isCurrentActor]);

  const {
    renameConversation,
    addConversationParticipants,
    updateParticipantRole,
    removeConversationParticipant,
  } = useMessagingGroupActions({
    enabled: enabled && currentUserId !== null,
    currentUserId,
    mountedRef,
    applyConversationUpdate,
    setConversations: scopedSetters.setConversations,
    setActiveConversationId: scopedSetters.setActiveConversationId,
    setMessages: scopedSetters.setMessages,
    setError: scopedSetters.setError,
  });

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!isCurrentActor(actorGeneration) || !activeConversationId || !content.trim()) return false;
    const trimmed = content.trim();
    const submittedConversationId = activeConversationId;
    const pendingKey = `${actorGeneration}:${String(submittedConversationId)}\u0000${trimmed}`;

    if (pendingSendKeysRef.current.has(pendingKey)) return false;
    pendingSendKeysRef.current.add(pendingKey);
    setPendingMessages(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);

    try {
      const segment = encodeMessagingPathSegment(submittedConversationId);
      const data = await apiFetch<unknown>(`/conversations/${segment}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: trimmed }),
      });
      const sentMessage = normalizeMessagePayload(data);
      const stillCurrent = isCurrentActor(actorGeneration)
        && String(activeConvRef.current) === String(submittedConversationId);
      if (!stillCurrent) return false;
      if (!sentMessage) {
        setError(createMessagingErrorState('send', 'persistent'));
        return false;
      }
      setMessages(prev => prev.some(message => String(message.id) === String(sentMessage.id))
        ? prev
        : [...prev, sentMessage]);
      setPendingMessages(prev => prev.filter(item => item !== trimmed));
      void fetchConversations();
      return true;
    } catch {
      if (isCurrentActor(actorGeneration) && String(activeConvRef.current) === String(submittedConversationId)) {
        setError(createMessagingErrorState('send', 'persistent'));
      }
      return false;
    } finally {
      pendingSendKeysRef.current.delete(pendingKey);
      if (isCurrentActor(actorGeneration) && String(activeConvRef.current) === String(submittedConversationId)) {
        setPendingMessages(prev => prev.filter(item => item !== trimmed));
      }
    }
  }, [activeConversationId, actorGeneration, isCurrentActor, fetchConversations]);

  const emitTyping = useCallback(() => {
    if (!isCurrentActor(actorGeneration) || !activeConversationId || !connected || typingTimeoutRef.current) return;
    emit('is_typing', { conversationId: activeConversationId });
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  }, [activeConversationId, actorGeneration, connected, emit, isCurrentActor]);

  const markAsRead = useCallback((conversationId: string | number, lastMessageId: string | number) => {
    if (isCurrentActor(actorGeneration) && connected) emit('mark_as_read', { conversationId, lastMessageId });
  }, [actorGeneration, connected, emit, isCurrentActor]);

  const createConversation = useCallback(async (input: CreateConversationInput) => {
    if (!isCurrentActor(actorGeneration)) return null;
    try {
      const data = await apiFetch<unknown>('/conversations', {
        method: 'POST',
        body: JSON.stringify(normalizeCreateConversationInput(input)),
      });
      const conversation = normalizeConversationPayload(data);
      if (isCurrentActor(actorGeneration)) {
        await fetchConversations();
        if (!isCurrentActor(actorGeneration)) return null;
        if (conversation) setActiveConversationId(conversation.id);
        return conversation;
      }
      return null;
    } catch {
      if (isCurrentActor(actorGeneration)) setError(createMessagingErrorState('create'));
      return null;
    }
  }, [actorGeneration, isCurrentActor, fetchConversations]);


  const searchUsers = useCallback(async (query: string): Promise<SearchUserResult[]> => {
    if (!isCurrentActor(actorGeneration)) return [];
    try {
      const data = await apiFetch<unknown>(`/users/search${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      return isCurrentActor(actorGeneration) ? normalizeSearchUsersPayload(data) : [];
    } catch {
      return [];
    }
  }, [actorGeneration, isCurrentActor]);

  const selectConversation = useCallback((convId: string | number) => {
    if (!isCurrentActor(actorGeneration)) return;
    activeConvRef.current = convId;
    setActiveConversationId(convId);
    setTypingUsers([]);
    setPendingMessages([]);
    fetchMessages(convId);
  }, [actorGeneration, isCurrentActor, fetchMessages]);

  const getOtherParticipant = useCallback((conv: ConversationData) => {
    if (!currentUserId) return conv.participants[0] || null;
    return conv.participants.find(p => p.id !== currentUserId) || conv.participants[0] || null;
  }, [currentUserId]);

  const dismissError = useCallback(() => setError(null), []);

  useMessagingSocketEffects({
    enabled,
    connected,
    conversations: ownsState ? conversations : [],
    emit,
    on,
    activeConvRef,
    currentUserId,
    mountedRef,
    typingClearTimers,
    setMessages: scopedSetters.setMessages,
    setConversations: scopedSetters.setConversations,
    setTypingUsers: scopedSetters.setTypingUsers,
    setOnlineUserIds: scopedSetters.setOnlineUserIds,
  });

  useMessagingLifecycleEffects({
    enabled,
    connected,
    activeConversationId: ownsState ? activeConversationId : null,
    messages: ownsState ? messages : [],
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
  });

  return {
    conversations: ownsState ? conversations : [],
    activeConversationId: ownsState ? activeConversationId : null,
    messages: ownsState ? messages : [],
    loading,
    messagesLoading,
    error: ownsState ? error : null,
    typingUsers: ownsState ? typingUsers : [],
    onlineUserIds: ownsState ? onlineUserIds : new Set<number>(),
    connected,
    connectionState,
    pendingMessages: ownsState ? pendingMessages : [],
    sendMessage,
    createConversation,
    renameConversation,
    addConversationParticipants,
    updateParticipantRole,
    removeConversationParticipant,
    selectConversation,
    searchUsers,
    getOtherParticipant,
    setActiveConversationId: scopedSetters.setActiveConversationId,
    emitTyping,
    markAsRead,
    dismissError,
  };
}
