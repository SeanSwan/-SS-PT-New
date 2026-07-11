/**
 * useAIChat Hook
 * ==============
 * Manages AI assistant conversations for clients, trainers, and admins.
 * Handles conversation CRUD, message sending, and conversation listing.
 *
 * Uses the production apiService so auth refresh / login redirect behavior is
 * shared with the rest of the dashboard.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import apiService from '../services/api.service';
import {
  buildAiApiError,
  buildAiSendFailure,
  buildChatMessageTooLongError,
  type AiApiError,
  isChatMessageTooLong,
  isNonRetryableAiErrorCode,
} from './aiMessageLimits';

const CONVERSATION_CACHE_TTL_MS = 5 * 60 * 1000;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    provider?: string;
    model?: string;
    tokenUsage?: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
    coachActionProposals?: unknown[];
    coachActionProposalError?: { code: string; message: string };
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
  targetUserId?: number | string | null;
  metadata?: Record<string, unknown>;
}

interface ConversationSummary {
  id: number;
  title: string | null;
  context: string;
  role?: string;
  status: string;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  targetUserId?: number | string | null;
}

type AIContext = 'coach_assistant' | 'general' | 'macro_logging' | 'form_tips' | 'workout_suggestions' | 'workout_generation' | 'client_review' | 'data_management' | 'scheduling' | 'progress_analysis' | 'exercise_library' | 'gamification' | 'client_onboarding';
type AIConversationRole = 'admin' | 'trainer' | 'client';
type ResponseStyle = 'phd_only' | 'balanced' | 'simple_only' | 'both';
export interface AIRequestContext {
  source?: string | null;
  intent?: string | null;
  surface?: string | null;
  equipmentProfileId?: number | null;
  scheduledSessionId?: number | string | null;
  scheduledSessionDate?: string | null;
  scheduledSessionCredits?: number | string | null;
  workoutDate?: string | null;
}

type FrontendAction = { event?: string; payload?: unknown };
const BLOCKED_FRONTEND_EVENTS = new Set(['AI_SUBMIT_WORKOUT']);
const ROUTE_CONTEXT_TOKEN_PATTERN = /^[a-z0-9_-]{1,80}$/i;

function safeRouteContextToken(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  return ROUTE_CONTEXT_TOKEN_PATTERN.test(token) ? token : null;
}

function normalizeTargetUserId(value?: number | string | null): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function activeConversationMatchesRequest(
  conversation: Conversation | null,
  context: AIContext,
  targetUserId?: number | string | null,
  audienceRole?: AIConversationRole,
): conversation is Conversation {
  if (!conversation || conversation.context !== context) return false;
  if (audienceRole && conversation.role !== audienceRole) return false;
  return normalizeTargetUserId(conversation.targetUserId) === normalizeTargetUserId(targetUserId);
}

export function buildSafeRequestContext(raw?: AIRequestContext | null): AIRequestContext | null {
  const safe: AIRequestContext = {};
  const source = safeRouteContextToken(raw?.source);
  if (source) safe.source = source;
  const intent = safeRouteContextToken(raw?.intent);
  if (intent) safe.intent = intent;
  const surface = safeRouteContextToken(raw?.surface);
  if (surface) safe.surface = surface;

  const equipmentProfileId = Number(raw?.equipmentProfileId);
  if (Number.isSafeInteger(equipmentProfileId) && equipmentProfileId > 0) {
    safe.equipmentProfileId = equipmentProfileId;
  }

  const scheduledSessionId = String(raw?.scheduledSessionId ?? '').trim();
  if (/^[1-9]\d*$/.test(scheduledSessionId) && Number.isSafeInteger(Number(scheduledSessionId))) {
    safe.scheduledSessionId = scheduledSessionId;
  }

  const scheduledSessionDate = String(raw?.scheduledSessionDate ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(scheduledSessionDate)) {
    safe.scheduledSessionDate = scheduledSessionDate;
  }

  const rawScheduledSessionCredits = raw?.scheduledSessionCredits;
  if (
    rawScheduledSessionCredits !== undefined
    && rawScheduledSessionCredits !== null
    && String(rawScheduledSessionCredits).trim() !== ''
  ) {
    const scheduledSessionCredits = Number(rawScheduledSessionCredits);
    if (Number.isSafeInteger(scheduledSessionCredits) && scheduledSessionCredits >= 0) {
      safe.scheduledSessionCredits = scheduledSessionCredits;
    }
  }

  const workoutDate = String(raw?.workoutDate ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(workoutDate)) {
    safe.workoutDate = workoutDate;
  }

  return Object.keys(safe).length ? safe : null;
}

type AxiosLikeError = Error & {
  code?: string;
  response?: {
    status?: number;
    data?: Record<string, unknown>;
  };
};

function isCanceledAiRequest(err: unknown): boolean {
  const maybeErr = err as AxiosLikeError;
  return (err instanceof DOMException && err.name === 'AbortError')
    || maybeErr.name === 'CanceledError'
    || maybeErr.code === 'ERR_CANCELED'
    || maybeErr.message === 'canceled';
}

function toAiApiError(err: unknown, fallback: string): AiApiError {
  const maybeErr = err as AxiosLikeError;
  const status = maybeErr.response?.status;
  if (status) {
    return buildAiApiError(maybeErr.response?.data || {}, fallback, status);
  }

  if (err instanceof Error) {
    return err as AiApiError;
  }

  return new Error(fallback) as AiApiError;
}

function isPaywallError(err: unknown): boolean {
  return (err as AxiosLikeError).response?.status === 402;
}

function getPaywallPayload(err: unknown): Record<string, unknown> {
  return (err as AxiosLikeError).response?.data || {};
}

function dispatchSafeFrontendActions(actions?: FrontendAction[]) {
  if (!Array.isArray(actions)) return;
  for (const action of actions) {
    const eventName = typeof action?.event === 'string' ? action.event : '';
    if (!eventName || BLOCKED_FRONTEND_EVENTS.has(eventName)) continue;
    window.dispatchEvent(new CustomEvent(eventName, { detail: action.payload ?? {} }));
  }
}

function enrichAssistantMessageWithActionMetadata(data: any): Message {
  const enrichedAssistantMsg = { ...data.assistantMessage };
  if (
    data.coachActionProposals ||
    data.coachActionProposalError ||
    data.clientCreateResult ||
    data.workoutImportResults
  ) {
    enrichedAssistantMsg.metadata = {
      ...enrichedAssistantMsg.metadata,
      coachActionProposals: data.coachActionProposals || undefined,
      coachActionProposalError: data.coachActionProposalError || undefined,
      clientCreateResult: data.clientCreateResult || undefined,
      workoutImportResults: data.workoutImportResults || undefined,
    };
  }
  return enrichedAssistantMsg;
}

export function useAIChat(audienceRole?: AIConversationRole) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const [lastErrorRetryable, setLastErrorRetryable] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const convCacheTimeRef = useRef<number>(0);
  const loadConversationRequestRef = useRef(0);
  const previousAudienceRoleRef = useRef(audienceRole);

  useEffect(() => {
    if (previousAudienceRoleRef.current === audienceRole) return;
    previousAudienceRoleRef.current = audienceRole;
    convCacheTimeRef.current = 0;
    setConversations([]);
    setActiveConversation(null);
  }, [audienceRole]);

  const clearError = useCallback(() => {
    setError(null);
    setLastErrorCode(null);
    setLastErrorRetryable(true);
  }, []);

  const setFailureState = useCallback((msg: string, code?: string | null, retryable = true) => {
    setError(msg);
    setLastErrorCode(code || null);
    setLastErrorRetryable(retryable);
  }, []);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(async (context: AIContext = 'general', title?: string, targetUserId?: number | string | null, responseStyle: ResponseStyle = 'both') => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { context, title, responseStyle };
      if (audienceRole) payload.audienceRole = audienceRole;
      if (targetUserId) payload.targetUserId = targetUserId;
      const res = await apiService.post('/api/ai-chat/conversations', payload);
      const data = res.data;
      if (!data.success) throw buildAiApiError(data, 'Failed to create conversation', res.status);

      const newConv: Conversation = {
        ...data.conversation,
        messages: [],
        role: data.conversation.role || audienceRole || '',
        metadata: {},
      };
      setActiveConversation(newConv);
      return newConv;
    } catch (err: unknown) {
      const msg = toAiApiError(err, 'Failed to create conversation').message;
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [audienceRole]);

  /**
   * List user's conversations
   */
  const listConversations = useCallback(async (status = 'active', force = false) => {
    // Skip fetch if cache is fresh (unless forced)
    if (!force && conversations.length > 0 && Date.now() - convCacheTimeRef.current < CONVERSATION_CACHE_TTL_MS) {
      return conversations;
    }
    setLoading(true);
    setError(null);
    try {
      const audienceQuery = audienceRole ? `&audienceRole=${audienceRole}` : '';
      const res = await apiService.get(`/api/ai-chat/conversations?status=${status}&limit=20${audienceQuery}`);
      const data = res.data;
      if (!data.success) throw buildAiApiError(data, 'Failed to list conversations', res.status);
      setConversations(data.conversations);
      convCacheTimeRef.current = Date.now();
      return data.conversations;
    } catch (err: unknown) {
      const msg = toAiApiError(err, 'Failed to list conversations').message;
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [audienceRole, conversations]);

  /**
   * Load a specific conversation with full message history
   */
  const loadConversation = useCallback(async (id: number) => {
    const requestId = loadConversationRequestRef.current + 1;
    loadConversationRequestRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const audienceQuery = audienceRole ? `?audienceRole=${audienceRole}` : '';
      const res = await apiService.get(`/api/ai-chat/conversations/${id}${audienceQuery}`);
      const data = res.data;
      if (!data.success) throw buildAiApiError(data, 'Failed to load conversation', res.status);
      if (loadConversationRequestRef.current === requestId) {
        setActiveConversation(data.conversation);
      }
      return data.conversation;
    } catch (err: unknown) {
      const msg = toAiApiError(err, 'Failed to load conversation').message;
      if (loadConversationRequestRef.current === requestId) setError(msg);
      return null;
    } finally {
      if (loadConversationRequestRef.current === requestId) setLoading(false);
    }
  }, [audienceRole]);

  /**
   * Send a message to the active conversation and get AI response
   */
  const sendMessage = useCallback(async (message: string) => {
    if (isChatMessageTooLong(message)) {
      const msg = buildChatMessageTooLongError(message.length);
      setFailureState(msg, 'MESSAGE_TOO_LONG', false);
      return { failed: true, originalMessage: message, errorCode: 'MESSAGE_TOO_LONG', retryable: false };
    }

    if (!activeConversation) {
      setFailureState('No active conversation');
      return null;
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setSending(true);
    clearError();

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
      const res = await apiService.post(
        `/api/ai-chat/conversations/${activeConversation.id}/messages`,
        { message },
        { signal: abortRef.current.signal },
      );
      const data = res.data;

      if (!data.success) throw buildAiApiError(data, 'Failed to send message', res.status);

      const enrichedAssistantMsg = enrichAssistantMessageWithActionMetadata(data);

      // Replace optimistic message with real response
      setActiveConversation(prev => {
        if (!prev) return prev;
        // Remove optimistic user message, add real user + assistant messages
        const messagesWithoutOptimistic = prev.messages.slice(0, -1);
        return {
          ...prev,
          messages: [...messagesWithoutOptimistic, data.userMessage, enrichedAssistantMsg],
          messageCount: data.messageCount,
          title: prev.title || data.userMessage.content.slice(0, 47),
          lastMessageAt: enrichedAssistantMsg.timestamp,
        };
      });

      dispatchSafeFrontendActions(data.frontendActions);

      return enrichedAssistantMsg;
    } catch (err: unknown) {
      if (isCanceledAiRequest(err)) return null;
      if (isPaywallError(err)) {
        setActiveConversation(prev => prev ? {
          ...prev,
          messages: prev.messages.slice(0, -1),
        } : prev);
        return { paywallRequired: true, ...getPaywallPayload(err), originalMessage: message };
      }
      const apiErr = toAiApiError(err, 'Failed to send message');
      const msg = apiErr.message || 'Failed to send message';
      const code = apiErr.status === 429 ? 'RATE_LIMITED' : apiErr.code;
      const retryable = apiErr.retryable !== false && !isNonRetryableAiErrorCode(code);
      setFailureState(msg, code, retryable);
      // Remove optimistic message on error
      setActiveConversation(prev => prev ? {
        ...prev,
        messages: prev.messages.slice(0, -1),
      } : prev);
      // Return failure indicator so component can restore input
      return buildAiSendFailure(message, apiErr);
    } finally {
      setSending(false);
    }
  }, [activeConversation, audienceRole, clearError, setFailureState]);

  /**
   * Archive or delete a conversation
   */
  const deleteConversation = useCallback(async (id: number) => {
    try {
      await apiService.delete(`/api/ai-chat/conversations/${id}`);
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
    foodContext?: Record<string, unknown> | null,
    requestContext?: AIRequestContext | null,
  ) => {
    if (isChatMessageTooLong(message)) {
      const msg = buildChatMessageTooLongError(message.length);
      setFailureState(msg, 'MESSAGE_TOO_LONG', false);
      return { failed: true, originalMessage: message, errorCode: 'MESSAGE_TOO_LONG', retryable: false };
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setSending(true);
    clearError();

    try {
      // Step 1: Ensure we have a conversation (create if needed)
      let convId = activeConversationMatchesRequest(activeConversation, context, targetUserId, audienceRole)
        ? activeConversation.id
        : null;
      if (!convId) {
        const payload: Record<string, unknown> = { context, title, responseStyle };
        if (audienceRole) payload.audienceRole = audienceRole;
        if (targetUserId) payload.targetUserId = targetUserId;
        const createRes = await apiService.post('/api/ai-chat/conversations', payload, {
          signal: abortRef.current.signal,
        });
        const createData = createRes.data;
        if (!createData.success) throw buildAiApiError(createData, 'Failed to create conversation', createRes.status);
        convId = createData.conversation.id;
        const newConv: Conversation = {
          ...createData.conversation,
          targetUserId: createData.conversation.targetUserId ?? targetUserId ?? null,
          messages: [],
          role: createData.conversation.role || audienceRole || '',
          metadata: {},
        };
        setActiveConversation(newConv);
      }

      // Step 2: Optimistic user message
      const optimisticUserMsg: Message = { role: 'user', content: message, timestamp: new Date().toISOString() };
      setActiveConversation(prev => prev ? { ...prev, messages: [...prev.messages, optimisticUserMsg] } : prev);

      // Step 3: Send message using the conversation ID we have (not from state)
      const safeRequestContext = buildSafeRequestContext(requestContext);
      const res = await apiService.post(
        `/api/ai-chat/conversations/${convId}/messages`,
        {
          message,
          ...(foodContext ? { foodContext } : {}),
          ...(safeRequestContext ? { requestContext: safeRequestContext } : {}),
        },
        { signal: abortRef.current.signal },
      );
      const data = res.data;

      if (!data.success) throw buildAiApiError(data, 'Failed to send message', res.status);

      const enrichedAssistantMsg = enrichAssistantMessageWithActionMetadata(data);

      setActiveConversation(prev => {
        if (!prev) return prev;
        const messagesWithoutOptimistic = prev.messages.slice(0, -1);
        return {
          ...prev,
          messages: [...messagesWithoutOptimistic, data.userMessage, enrichedAssistantMsg],
          messageCount: data.messageCount,
          title: prev.title || data.userMessage.content.slice(0, 47),
          lastMessageAt: enrichedAssistantMsg.timestamp,
        };
      });

      dispatchSafeFrontendActions(data.frontendActions);

      return enrichedAssistantMsg;
    } catch (err: unknown) {
      if (isCanceledAiRequest(err)) return null;
      if (isPaywallError(err)) {
        setActiveConversation(prev => prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev);
        return { paywallRequired: true, ...getPaywallPayload(err), originalMessage: message };
      }
      const apiErr = toAiApiError(err, 'Failed to send message');
      const msg = apiErr.message || 'Failed to send message';
      const code = apiErr.status === 429 ? 'RATE_LIMITED' : apiErr.code;
      const retryable = apiErr.retryable !== false && !isNonRetryableAiErrorCode(code);
      setFailureState(msg, code, retryable);
      // Remove optimistic message on error
      setActiveConversation(prev => prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev);
      return buildAiSendFailure(message, apiErr);
    } finally {
      setSending(false);
    }
  }, [activeConversation, audienceRole, clearError, setFailureState]);

  /**
   * Start a fresh conversation (clear active)
   */
  const newChat = useCallback(() => {
    setActiveConversation(null);
    clearError();
  }, [clearError]);

  /**
   * Rename a conversation title via PATCH
   */
  const renameConversation = useCallback(async (id: number, title: string) => {
    try {
      const res = await apiService.patch(`/api/ai-chat/conversations/${id}`, { title });
      const data = res.data;
      if (!data.success) throw buildAiApiError(data, 'Failed to rename', res.status);
      // Update in conversations list
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
      // Update active if same conversation
      setActiveConversation(prev => prev?.id === id ? { ...prev, title } : prev);
    } catch (err: unknown) {
      const msg = toAiApiError(err, 'Failed to rename conversation').message;
      setError(msg);
    }
  }, []);

  /**
   * Archive a conversation (set status to 'archived')
   */
  const archiveConversation = useCallback(async (id: number) => {
    try {
      const res = await apiService.patch(`/api/ai-chat/conversations/${id}`, { status: 'archived' });
      const data = res.data;
      if (!data.success) throw buildAiApiError(data, 'Failed to archive', res.status);
      // Remove from active conversations list
      setConversations(prev => prev.filter(c => c.id !== id));
      // Clear active if same conversation
      if (activeConversation?.id === id) {
        setActiveConversation(null);
      }
    } catch (err: unknown) {
      const msg = toAiApiError(err, 'Failed to archive conversation').message;
      setError(msg);
    }
  }, [activeConversation]);

  return {
    // State
    conversations,
    activeConversation,
    messages: activeConversation?.messages || [],
    loading,
    sending,
    error,
    lastErrorCode,
    lastErrorRetryable,

    // Actions
    createConversation,
    listConversations,
    loadConversation,
    sendMessage,
    sendMessageWithConversation,
    deleteConversation,
    renameConversation,
    archiveConversation,
    newChat,
    clearError,
  };
}

export type { Message, Conversation, ConversationSummary, AIContext, AIConversationRole, ResponseStyle };
