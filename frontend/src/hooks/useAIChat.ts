/**
 * useAIChat Hook
 * ==============
 * Manages AI assistant conversations for clients, trainers, and admins.
 * Handles conversation CRUD, message sending, and conversation listing.
 *
 * Uses localStorage token via api.service.ts interceptors for auth.
 */
import { useState, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.PROD ? '' : 'http://localhost:10000');

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    provider?: string;
    model?: string;
    tokenUsage?: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
  };
}

interface Conversation {
  id: number;
  title: string | null;
  context: string;
  role: string;
  status: string;
  messages: Message[];
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface ConversationSummary {
  id: number;
  title: string | null;
  context: string;
  status: string;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

type AIContext = 'general' | 'macro_logging' | 'form_tips' | 'workout_suggestions' | 'workout_generation' | 'client_review' | 'data_management' | 'scheduling' | 'progress_analysis' | 'exercise_library' | 'gamification';
type ResponseStyle = 'phd_only' | 'simple_only' | 'both';

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useAIChat() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const convCacheTimeRef = useRef<number>(0);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const clearError = useCallback(() => setError(null), []);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(async (context: AIContext = 'general', title?: string, targetUserId?: number | string | null, responseStyle: ResponseStyle = 'both') => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { context, title, responseStyle };
      if (targetUserId) payload.targetUserId = targetUserId;
      const res = await fetch(`${API_BASE}/api/ai-chat/conversations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create conversation');

      const newConv: Conversation = {
        ...data.conversation,
        messages: [],
        role: '',
        metadata: {},
      };
      setActiveConversation(newConv);
      return newConv;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * List user's conversations
   */
  const listConversations = useCallback(async (status = 'active', force = false) => {
    // Skip fetch if cache is fresh (unless forced)
    if (!force && conversations.length > 0 && Date.now() - convCacheTimeRef.current < CACHE_TTL) {
      return conversations;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai-chat/conversations?status=${status}&limit=20`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to list conversations');
      setConversations(data.conversations);
      convCacheTimeRef.current = Date.now();
      return data.conversations;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to list conversations';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [conversations]);

  /**
   * Load a specific conversation with full message history
   */
  const loadConversation = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai-chat/conversations/${id}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load conversation');
      setActiveConversation(data.conversation);
      return data.conversation;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Send a message to the active conversation and get AI response
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!activeConversation) {
      setError('No active conversation');
      return null;
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setSending(true);
    setError(null);

    // Optimistic: add user message immediately
    const optimisticUserMsg: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setActiveConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, optimisticUserMsg],
    } : prev);

    try {
      const res = await fetch(
        `${API_BASE}/api/ai-chat/conversations/${activeConversation.id}/messages`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ message }),
          signal: abortRef.current.signal,
        }
      );
      const data = await res.json();

      // Handle 402 — subscription paywall
      if (res.status === 402) {
        // Remove optimistic message
        setActiveConversation(prev => prev ? {
          ...prev,
          messages: prev.messages.slice(0, -1),
        } : prev);
        setSending(false);
        return { paywallRequired: true, ...data, originalMessage: message } as any;
      }

      if (!data.success) throw new Error(data.error || 'Failed to send message');

      // Replace optimistic message with real response
      setActiveConversation(prev => {
        if (!prev) return prev;
        // Remove optimistic user message, add real user + assistant messages
        const messagesWithoutOptimistic = prev.messages.slice(0, -1);
        return {
          ...prev,
          messages: [...messagesWithoutOptimistic, data.userMessage, data.assistantMessage],
          messageCount: data.messageCount,
          title: prev.title || data.userMessage.content.slice(0, 47),
          lastMessageAt: data.assistantMessage.timestamp,
        };
      });

      // Dispatch FRONTEND_DISPATCH actions as CustomEvents for WorkoutLogger
      if (data.frontendActions?.length) {
        for (const action of data.frontendActions) {
          window.dispatchEvent(new CustomEvent(action.event, { detail: action.payload }));
        }
      }

      return data.assistantMessage;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setError(msg);
      // Remove optimistic message on error
      setActiveConversation(prev => prev ? {
        ...prev,
        messages: prev.messages.slice(0, -1),
      } : prev);
      // Return failure indicator so component can restore input
      return { failed: true, originalMessage: message } as any;
    } finally {
      setSending(false);
    }
  }, [activeConversation]);

  /**
   * Archive or delete a conversation
   */
  const deleteConversation = useCallback(async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/ai-chat/conversations/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversation?.id === id) setActiveConversation(null);
    } catch {
      // Silent fail for delete
    }
  }, [activeConversation]);

  /**
   * Atomic send: creates conversation if needed, then sends message.
   * Eliminates the race condition where sendMessage fires before
   * createConversation's state update has been applied.
   */
  const sendMessageWithConversation = useCallback(async (
    message: string,
    context: AIContext = 'general',
    title?: string,
    targetUserId?: number | string | null,
    responseStyle: ResponseStyle = 'both',
  ) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setSending(true);
    setError(null);

    try {
      // Step 1: Ensure we have a conversation (create if needed)
      let convId = activeConversation?.id;
      if (!convId) {
        const payload: Record<string, unknown> = { context, title, responseStyle };
        if (targetUserId) payload.targetUserId = targetUserId;
        const createRes = await fetch(`${API_BASE}/api/ai-chat/conversations`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
          signal: abortRef.current.signal,
        });
        const createData = await createRes.json();
        if (!createData.success) throw new Error(createData.error || 'Failed to create conversation');
        convId = createData.conversation.id;
        const newConv: Conversation = { ...createData.conversation, messages: [], role: '', metadata: {} };
        setActiveConversation(newConv);
      }

      // Step 2: Optimistic user message
      const optimisticUserMsg: Message = { role: 'user', content: message, timestamp: new Date().toISOString() };
      setActiveConversation(prev => prev ? { ...prev, messages: [...prev.messages, optimisticUserMsg] } : prev);

      // Step 3: Send message using the conversation ID we have (not from state)
      const res = await fetch(`${API_BASE}/api/ai-chat/conversations/${convId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to send message');

      setActiveConversation(prev => {
        if (!prev) return prev;
        const messagesWithoutOptimistic = prev.messages.slice(0, -1);
        return {
          ...prev,
          messages: [...messagesWithoutOptimistic, data.userMessage, data.assistantMessage],
          messageCount: data.messageCount,
          title: prev.title || data.userMessage.content.slice(0, 47),
          lastMessageAt: data.assistantMessage.timestamp,
        };
      });

      // Dispatch FRONTEND_DISPATCH actions as CustomEvents for WorkoutLogger
      if (data.frontendActions?.length) {
        for (const action of data.frontendActions) {
          window.dispatchEvent(new CustomEvent(action.event, { detail: action.payload }));
        }
      }

      return data.assistantMessage;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setError(msg);
      // Remove optimistic message on error
      setActiveConversation(prev => prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev);
      return { failed: true, originalMessage: message } as any;
    } finally {
      setSending(false);
    }
  }, [activeConversation]);

  /**
   * Start a fresh conversation (clear active)
   */
  const newChat = useCallback(() => {
    setActiveConversation(null);
    setError(null);
  }, []);

  return {
    // State
    conversations,
    activeConversation,
    messages: activeConversation?.messages || [],
    loading,
    sending,
    error,

    // Actions
    createConversation,
    listConversations,
    loadConversation,
    sendMessage,
    sendMessageWithConversation,
    deleteConversation,
    newChat,
    clearError,
  };
}

export type { Message, Conversation, ConversationSummary, AIContext, ResponseStyle };
