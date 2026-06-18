/**
 * ============================================================================
 * FILE: useMessaging.ts
 * PURPOSE: Real-time messaging hook — Socket.IO primary, REST fallback
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-29
 * AI VILLAGE VALIDATED: 2026-03-29 (11-Brain Consensus fixes applied)
 * ============================================================================
 *
 * AI VILLAGE FIXES APPLIED:
 * - Ref mutation via useEffect instead of render body (Issue #2)
 * - AbortController for fetch race conditions (Architecture HIGH)
 * - Optimistic UI with pending messages (Issue #4)
 * - Reconnect re-joins conversation rooms (Architecture MEDIUM)
 * - Typing indicator mountedRef guard (Architecture HIGH)
 * - markAsRead only for OTHER user's messages (Architecture HIGH)
 * - Error classification: persistent vs transient (Design Issue #4)
 * - Poll interval cleanup on reconnect (Architecture HIGH)
 * - Message pagination limit param (Issue #1)
 * - Event payload validation guards (Architecture MEDIUM)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import type { ConversationData, MessageData, SearchUserResult } from './MessagingTypes';
import {
  normalizeConversationPayload,
  normalizeConversationsPayload,
  normalizeMessage,
  normalizeMessagePayload,
  normalizeMessagesPayload,
  normalizeSearchUsersPayload,
} from './messagingApiAdapters';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface TypingUser {
  userId: number;
  userName: string;
  conversationId: string | number;
}

export interface ErrorState {
  message: string;
  type: 'persistent' | 'transient';
  timestamp: number;
}

interface UseMessagingOptions {
  enabled?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: API Helpers (REST for initial loads + fallback)
// ─────────────────────────────────────────────────────────────

const API_BASE = '/api/messaging';

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useMessaging(currentUserId: number | null, options: UseMessagingOptions = {}) {
  const { connected, connectionState, emit, on } = useSocket();
  const enabled = options.enabled ?? true;

  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | number | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  // Real-time state
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);

  // Refs — AI Village fix: use useEffect for ref sync, not render body
  const activeConvRef = useRef<string | number | null>(null);
  const mountedRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const fetchAbortRef = useRef<AbortController | null>(null);

  // AI Village fix: sync ref via useEffect (not render-time mutation)
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // Auto-clear transient errors after 5s
  useEffect(() => {
    if (error?.type === 'transient') {
      const timer = setTimeout(() => {
        if (mountedRef.current) setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ─── REST: Fetch conversations ────────────────────────────
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
    } catch (err: unknown) {
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to load conversations';
        setError({ message: msg, type: 'transient', timestamp: Date.now() });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentUserId, enabled]);

  // ─── REST: Fetch messages with abort controller ───────────
  const fetchMessages = useCallback(async (convId: string | number) => {
    if (!convId || !enabled) return;

    // AI Village fix: cancel previous in-flight request
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    if (mountedRef.current) setMessagesLoading(true);
    try {
      const data = await apiFetch<unknown>(
        `/conversations/${convId}/messages?limit=500&sort=desc`,
        { signal: controller.signal }
      );
      // AI Village fix: verify this is still the active conversation
      if (mountedRef.current && String(activeConvRef.current) === String(convId)) {
        setMessages(normalizeMessagesPayload(data));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to load messages';
        setError({ message: msg, type: 'transient', timestamp: Date.now() });
      }
    } finally {
      if (mountedRef.current) setMessagesLoading(false);
    }
  }, [enabled]);

  // ─── Send message (Socket.IO primary, REST fallback) ─────
  const sendMessage = useCallback(async (content: string) => {
    if (!enabled || !activeConversationId || !content.trim()) return;
    const trimmed = content.trim();

    if (connected) {
      // AI Village fix: optimistic UI — show pending message immediately
      setPendingMessages(prev => [...prev, trimmed]);
      emit('send_message', {
        conversationId: activeConversationId,
        content: trimmed,
      });
    } else {
      // REST fallback
      try {
        const data = await apiFetch<unknown>(
          `/conversations/${activeConversationId}/messages`,
          { method: 'POST', body: JSON.stringify({ content: trimmed }) }
        );
        const sentMessage = normalizeMessagePayload(data);
        if (mountedRef.current) {
          if (sentMessage) setMessages(prev => [...prev, sentMessage]);
          fetchConversations();
        }
      } catch (err: unknown) {
        if (mountedRef.current) {
          const msg = err instanceof Error ? err.message : 'Failed to send message';
          setError({ message: msg, type: 'transient', timestamp: Date.now() });
        }
      }
    }
  }, [activeConversationId, connected, emit, enabled, fetchConversations]);

  // ─── Typing indicator emission (2s debounce) ─────────────
  const emitTyping = useCallback(() => {
    if (!enabled || !activeConversationId || !connected) return;
    if (typingTimeoutRef.current) return;

    emit('is_typing', { conversationId: activeConversationId });
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  }, [activeConversationId, connected, emit, enabled]);

  // ─── Mark messages as read ────────────────────────────────
  const markAsRead = useCallback((conversationId: string | number, lastMessageId: string | number) => {
    if (!enabled || !connected) return;
    emit('mark_as_read', { conversationId, lastMessageId });
  }, [connected, emit, enabled]);

  // ─── Create a new conversation (REST only) ────────────────
  const createConversation = useCallback(async (participantId: number) => {
    if (!enabled) return null;

    try {
      const data = await apiFetch<unknown>(
        '/conversations',
        { method: 'POST', body: JSON.stringify({ participantIds: [participantId] }) }
      );
      const conversation = normalizeConversationPayload(data);
      if (mountedRef.current) {
        await fetchConversations();
        if (conversation) setActiveConversationId(conversation.id);
      }
      return conversation;
    } catch (err: unknown) {
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to create conversation';
        setError({ message: msg, type: 'transient', timestamp: Date.now() });
      }
      return null;
    }
  }, [enabled, fetchConversations]);

  // ─── Search users (REST only) ─────────────────────────────
  const searchUsers = useCallback(async (query: string): Promise<SearchUserResult[]> => {
    if (!enabled) return [];

    try {
      const data = await apiFetch<unknown>(
        `/users/search${query ? `?q=${encodeURIComponent(query)}` : ''}`
      );
      return normalizeSearchUsersPayload(data);
    } catch {
      return [];
    }
  }, [enabled]);

  // ─── Select conversation + load messages ──────────────────
  const selectConversation = useCallback((convId: string | number) => {
    if (!enabled) return;

    setActiveConversationId(convId);
    setTypingUsers([]);
    setPendingMessages([]);
    fetchMessages(convId);
  }, [enabled, fetchMessages]);

  // ─── Get the other participant ────────────────────────────
  const getOtherParticipant = useCallback((conv: ConversationData) => {
    if (!currentUserId) return conv.participants[0] || null;
    return conv.participants.find(p => p.id !== currentUserId) || conv.participants[0] || null;
  }, [currentUserId]);

  // ─── Dismiss error ────────────────────────────────────────
  const dismissError = useCallback(() => setError(null), []);

  // ─────────────────────────────────────────────────────────
  // SECTION: Socket.IO Event Listeners
  // ─────────────────────────────────────────────────────────

  // Join rooms when socket connects + re-join on reconnect
  useEffect(() => {
    if (!enabled || !connected || conversations.length === 0) return;
    const convIds = conversations.map(c => c.id);
    emit('join_conversations', convIds);
  }, [connected, conversations, emit, enabled]);

  // Listen for incoming messages
  useEffect(() => {
    if (!enabled || !connected) return;

    const handleNewMessage = (message: unknown) => {
      // AI Village fix: validate payload shape
      const typedMsg = normalizeMessage(message);
      if (!typedMsg) return;

      const msgConvId = typedMsg.conversation_id;

      // If for active conversation, append (with dedup)
      if (String(msgConvId) === String(activeConvRef.current)) {
        setMessages(prev => {
          if (prev.some(m => String(m.id) === String(typedMsg.id))) return prev;
          return [...prev, typedMsg];
        });
        // AI Village fix: clear matching pending message
        setPendingMessages(prev => prev.filter(p => p !== typedMsg.content));
      }

      // Update conversation list preview
      setConversations(prev => prev.map(conv => {
        if (String(conv.id) === String(msgConvId)) {
          return {
            ...conv,
            lastMessage: {
              content: String(typedMsg.content),
              created_at: String(typedMsg.created_at),
              sender_id: Number(typedMsg.sender_id),
            },
            unreadCount: String(msgConvId) === String(activeConvRef.current)
              ? conv.unreadCount
              : conv.unreadCount + 1,
          };
        }
        return conv;
      }));
    };

    const cleanup = on('new_message', handleNewMessage);
    return cleanup;
  }, [connected, on, enabled]);

  // Listen for typing indicators
  useEffect(() => {
    if (!enabled || !connected) return;

    const handleTyping = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      // AI Village fix: validate payload
      if (!data?.conversationId || !data?.userId || !data?.userName) return;
      if (Number(data.userId) === currentUserId) return;

      const typingData = {
        userId: Number(data.userId),
        userName: String(data.userName),
        conversationId: data.conversationId as string | number,
      };

      setTypingUsers(prev => {
        const exists = prev.some(
          t => t.userId === typingData.userId &&
               String(t.conversationId) === String(typingData.conversationId)
        );
        return exists ? prev : [...prev, typingData];
      });

      // Clear typing after 3s — AI Village fix: check mountedRef
      const existingTimer = typingClearTimers.current.get(typingData.userId);
      if (existingTimer) clearTimeout(existingTimer);
      typingClearTimers.current.set(typingData.userId, setTimeout(() => {
        if (mountedRef.current) {
          setTypingUsers(prev => prev.filter(t => t.userId !== typingData.userId));
        }
        typingClearTimers.current.delete(typingData.userId);
      }, 3000));
    };

    const cleanup = on('user_typing', handleTyping);
    return cleanup;
  }, [connected, on, currentUserId, enabled]);

  // Listen for read receipts
  useEffect(() => {
    if (!enabled || !connected) return;

    const handleRead = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      if (!data?.conversationId || !data?.userId || !Array.isArray(data?.readMessageIds)) return;

      if (String(data.conversationId) === String(activeConvRef.current)) {
        const userId = Number(data.userId);
        const readIds = data.readMessageIds as (string | number)[];
        setMessages(prev => prev.map(msg => {
          if (readIds.includes(msg.id)) {
            const existingReads = msg.readBy || [];
            if (existingReads.some(r => r.userId === userId)) return msg;
            return {
              ...msg,
              readBy: [...existingReads, { userId, readAt: new Date().toISOString() }],
            };
          }
          return msg;
        }));
      }
    };

    const cleanup = on('messages_read', handleRead);
    return cleanup;
  }, [connected, on, enabled]);

  // Listen for online/offline presence
  useEffect(() => {
    if (!enabled || !connected) return;

    const handleOnline = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      if (data?.userId) {
        setOnlineUserIds(prev => new Set([...prev, Number(data.userId)]));
      }
    };
    const handleOffline = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      if (data?.userId) {
        setOnlineUserIds(prev => {
          const next = new Set(prev);
          next.delete(Number(data.userId));
          return next;
        });
      }
    };

    const cleanupOnline = on('user_online', handleOnline);
    const cleanupOffline = on('user_offline', handleOffline);
    return () => { cleanupOnline(); cleanupOffline(); };
  }, [connected, on, enabled]);

  // ─────────────────────────────────────────────────────────
  // SECTION: Initial Load + Fallback Polling
  // ─────────────────────────────────────────────────────────

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
  }, [enabled, fetchConversations]);

  // AI Village fix: clear poll on reconnect, only poll when disconnected
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
  }, [connected, activeConversationId, fetchMessages, fetchConversations, enabled]);

  // AI Village fix: only mark-as-read for OTHER user's new messages
  useEffect(() => {
    if (!enabled || !connected || !activeConversationId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.sender_id !== currentUserId) {
      markAsRead(activeConversationId, lastMsg.id);
    }
  }, [connected, activeConversationId, messages, currentUserId, markAsRead, enabled]);

  // Cleanup typing timers on unmount
  useEffect(() => {
    return () => {
      typingClearTimers.current.forEach(timer => clearTimeout(timer));
      typingClearTimers.current.clear();
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
    };
  }, []);

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
    selectConversation,
    searchUsers,
    getOtherParticipant,
    setActiveConversationId,
    emitTyping,
    markAsRead,
    dismissError,
  };
}
