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
import { useMessagingLifecycleEffects } from './useMessagingLifecycleEffects';
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

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (error?.type !== 'transient') return undefined;
    const timer = setTimeout(() => {
      if (mountedRef.current) setError(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const fetchConversations = useCallback(async () => {
    if (!currentUserId || !enabled) {
      if (mountedRef.current) setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<unknown>('/conversations');
      if (mountedRef.current) {
        setConversations(normalizeConversationsPayload(data));
        setError(null);
      }
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('conversations'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentUserId, enabled]);

  const fetchMessages = useCallback(async (convId: string | number) => {
    if (!convId || !enabled) return;
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    if (mountedRef.current) setMessagesLoading(true);
    try {
      const segment = encodeMessagingPathSegment(convId);
      const data = await apiFetch<unknown>(`/conversations/${segment}/messages?limit=500&sort=desc`, { signal: controller.signal });
      if (mountedRef.current && String(activeConvRef.current) === String(convId)) {
        setMessages(normalizeMessagesPayload(data));
      }
    } catch (err: unknown) {
      if (!isMessagingRequestCancellation(err) && mountedRef.current) setError(createMessagingErrorState('messages'));
    } finally {
      if (mountedRef.current) setMessagesLoading(false);
    }
  }, [enabled]);

  const applyConversationUpdate = useCallback((conversation: ConversationData | null) => {
    if (!conversation || !mountedRef.current) return;
    setConversations(prev => prev.some(item => String(item.id) === String(conversation.id))
      ? prev.map(item => String(item.id) === String(conversation.id) ? conversation : item)
      : [conversation, ...prev]);
  }, []);

  const {
    renameConversation,
    addConversationParticipants,
    updateParticipantRole,
    removeConversationParticipant,
  } = useMessagingGroupActions({
    enabled,
    currentUserId,
    mountedRef,
    applyConversationUpdate,
    setConversations,
    setActiveConversationId,
    setMessages,
    setError,
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!enabled || !activeConversationId || !content.trim()) return;
    const trimmed = content.trim();

    if (connected) {
      setPendingMessages(prev => [...prev, trimmed]);
      emit('send_message', { conversationId: activeConversationId, content: trimmed });
      return;
    }

    try {
      const segment = encodeMessagingPathSegment(activeConversationId);
      const data = await apiFetch<unknown>(`/conversations/${segment}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: trimmed }),
      });
      const sentMessage = normalizeMessagePayload(data);
      if (mountedRef.current) {
        if (sentMessage) setMessages(prev => [...prev, sentMessage]);
        fetchConversations();
      }
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('send'));
    }
  }, [activeConversationId, connected, emit, enabled, fetchConversations]);

  const emitTyping = useCallback(() => {
    if (!enabled || !activeConversationId || !connected || typingTimeoutRef.current) return;
    emit('is_typing', { conversationId: activeConversationId });
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  }, [activeConversationId, connected, emit, enabled]);

  const markAsRead = useCallback((conversationId: string | number, lastMessageId: string | number) => {
    if (enabled && connected) emit('mark_as_read', { conversationId, lastMessageId });
  }, [connected, emit, enabled]);

  const createConversation = useCallback(async (input: CreateConversationInput) => {
    if (!enabled) return null;
    try {
      const data = await apiFetch<unknown>('/conversations', {
        method: 'POST',
        body: JSON.stringify(normalizeCreateConversationInput(input)),
      });
      const conversation = normalizeConversationPayload(data);
      if (mountedRef.current) {
        await fetchConversations();
        if (conversation) setActiveConversationId(conversation.id);
      }
      return conversation;
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('create'));
      return null;
    }
  }, [enabled, fetchConversations]);


  const searchUsers = useCallback(async (query: string): Promise<SearchUserResult[]> => {
    if (!enabled) return [];
    try {
      const data = await apiFetch<unknown>(`/users/search${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      return normalizeSearchUsersPayload(data);
    } catch {
      return [];
    }
  }, [enabled]);

  const selectConversation = useCallback((convId: string | number) => {
    if (!enabled) return;
    setActiveConversationId(convId);
    setTypingUsers([]);
    setPendingMessages([]);
    fetchMessages(convId);
  }, [enabled, fetchMessages]);

  const getOtherParticipant = useCallback((conv: ConversationData) => {
    if (!currentUserId) return conv.participants[0] || null;
    return conv.participants.find(p => p.id !== currentUserId) || conv.participants[0] || null;
  }, [currentUserId]);

  const dismissError = useCallback(() => setError(null), []);

  useMessagingSocketEffects({
    enabled,
    connected,
    conversations,
    emit,
    on,
    activeConvRef,
    currentUserId,
    mountedRef,
    typingClearTimers,
    setMessages,
    setPendingMessages,
    setConversations,
    setTypingUsers,
    setOnlineUserIds,
  });

  useMessagingLifecycleEffects({
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
  });

  return {
    conversations,
    activeConversationId,
    messages,
    loading,
    messagesLoading,
    error,
    typingUsers,
    onlineUserIds,
    connected,
    connectionState,
    pendingMessages,
    sendMessage,
    createConversation,
    renameConversation,
    addConversationParticipants,
    updateParticipantRole,
    removeConversationParticipant,
    selectConversation,
    searchUsers,
    getOtherParticipant,
    setActiveConversationId,
    emitTyping,
    markAsRead,
    dismissError,
  };
}
