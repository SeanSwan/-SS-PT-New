/**
 * useAIChat Hook
 * ==============
 * Manages AI assistant conversations for clients, trainers, and admins.
 * Handles conversation CRUD, message sending, and conversation listing.
 *
 * Uses the production apiService so auth refresh / login redirect behavior is
 * shared with the rest of the dashboard.
 */
import { useState, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePaywall } from '../context/PaywallContext';
import apiService from '../services/api.service';
import {
  buildAiApiError,
  buildAiSendFailure,
  buildChatMessageTooLongError,
  type AiApiError,
  isChatMessageTooLong,
  isNonRetryableAiErrorCode,
} from './aiMessageLimits';
import {
  audienceAllowedForActor,
  freezePublicationSnapshot,
  isAllowedRawRole,
  isPublicationSnapshot,
  parseStrictNullableId,
  parseStrictPositiveId,
  samePublicationToken,
  type CreatedThread,
  type PublicationBinding,
  type PublicationSnapshot,
} from './coachPublicationScope';

const CONVERSATION_CACHE_TTL_MS = 5 * 60 * 1000;
const CREATED_THREAD_ADOPTION_TIMEOUT_MS = 5000;

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
    [key: string]: unknown;
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

function normalizeTargetUserId(value?: number | string | null): number | null | undefined {
  return parseStrictNullableId(value === undefined ? null : value);
}

function activeConversationMatchesRequest(
  conversation: Conversation | null,
  context: AIContext,
  targetUserId?: number | string | null,
  audienceRole?: AIConversationRole,
): conversation is Conversation {
  if (!conversation || conversation.context !== context) return false;
  if (audienceRole && conversation.role !== audienceRole) return false;
  const activeTarget = normalizeTargetUserId(conversation.targetUserId);
  const requestedTarget = normalizeTargetUserId(targetUserId);
  return activeTarget !== undefined && requestedTarget !== undefined && activeTarget === requestedTarget;
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
    || maybeErr?.name === 'CanceledError'
    || maybeErr?.code === 'ERR_CANCELED'
    || maybeErr?.message === 'canceled';
}

function toAiApiError(err: unknown, fallback: string): AiApiError {
  const maybeErr = err as AxiosLikeError;
  const status = maybeErr?.response?.status;
  if (status) {
    return buildAiApiError(maybeErr.response?.data || {}, fallback, status);
  }

  if (err instanceof Error) {
    return err as AiApiError;
  }

  return new Error(fallback) as AiApiError;
}

function isPaywallError(err: unknown): boolean {
  return (err as AxiosLikeError)?.response?.status === 402;
}

function getPaywallPayload(err: unknown): Record<string, unknown> {
  return (err as AxiosLikeError)?.response?.data || {};
}

function dispatchSafeFrontendActions(actions: FrontendAction[] | undefined, isCurrent: () => boolean) {
  if (!Array.isArray(actions)) return;
  for (const action of actions) {
    if (!isCurrent()) return;
    const eventName = typeof action?.event === 'string' ? action.event : '';
    if (!eventName || BLOCKED_FRONTEND_EVENTS.has(eventName)) continue;
    window.dispatchEvent(new CustomEvent(eventName, { detail: action.payload ?? {} }));
  }
}

/** Swap the optimistic user message for the server exchange without ever
 * deleting a real message: remove by object identity, and skip re-appending
 * the user message when a mid-flight reload already persisted it as the tail. */
function mergeRealExchange(
  messages: Message[],
  optimistic: Message,
  userMessage: Message,
  assistantMessage: Message,
): Message[] {
  const base = messages.filter(entry => entry !== optimistic);
  const tail = base[base.length - 1];
  const hasUserTail = Boolean(tail && tail.role === 'user' && tail.content === userMessage.content);
  return hasUserTail ? [...base, assistantMessage] : [...base, userMessage, assistantMessage];
}

function enrichAssistantMessageWithActionMetadata(data: any): Message {
  const enrichedAssistantMsg = { ...data.assistantMessage };
  if (
    data.coachActionProposals ||
    data.coachActionProposalError ||
    data.clientCreateResult ||
    data.workoutImportResults ||
    data.frontendActionRefusals
  ) {
    enrichedAssistantMsg.metadata = {
      ...enrichedAssistantMsg.metadata,
      coachActionProposals: data.coachActionProposals || undefined,
      coachActionProposalError: data.coachActionProposalError || undefined,
      clientCreateResult: data.clientCreateResult || undefined,
      workoutImportResults: data.workoutImportResults || undefined,
      // Cortex P0 §5.4: server-refused dispatches → charming-no notice
      frontendActionRefusals: data.frontendActionRefusals || undefined,
    };
  }
  return enrichedAssistantMsg;
}

const hasOwn = (value: unknown, key: string): boolean => (
  typeof value === 'object' && value !== null && Object.prototype.hasOwnProperty.call(value, key)
);

function validateCreatedThread(
  data: unknown,
  requestedTargetUserId: number | null,
  expectedAudienceRole?: string,
): CreatedThread | null {
  if (!data || typeof data !== 'object') return null;
  const conversation = (data as { conversation?: unknown }).conversation;
  if (!conversation || typeof conversation !== 'object') return null;
  const record = conversation as Record<string, unknown>;
  const id = parseStrictPositiveId(record.id);
  const role = typeof record.role === 'string' ? record.role : null;
  const target = hasOwn(record, 'targetUserId')
    ? parseStrictNullableId(record.targetUserId)
    : undefined;
  if (id === undefined || !role || !isAllowedRawRole(role) || target === undefined) return null;
  if (expectedAudienceRole && role !== expectedAudienceRole) return null;
  if (target !== requestedTargetUserId) return null;
  return Object.freeze({ id, role, targetUserId: target });
}

function isChatMessage(value: unknown, expectedRole?: Message['role']): value is Message {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (row.role === 'user' || row.role === 'assistant')
    && (!expectedRole || row.role === expectedRole)
    && typeof row.content === 'string' && typeof row.timestamp === 'string';
}

function validExchange(data: any, id: number): boolean {
  return data?.success === true && parseStrictPositiveId(data.conversationId) === id
    && isChatMessage(data.userMessage, 'user') && isChatMessage(data.assistantMessage, 'assistant')
    && Number.isSafeInteger(data.messageCount) && data.messageCount >= 2;
}

function validDetail(
  row: any, id: number, captured: PublicationSnapshot, expectedAudience?: string, bound = false,
): Conversation | null {
  if (!row || parseStrictPositiveId(row.id) !== id || !isAllowedRawRole(row.role)
    || !audienceAllowedForActor(captured.rawRole, row.role)
    || (expectedAudience && row.role !== expectedAudience)
    || !hasOwn(row, 'targetUserId') || !Array.isArray(row.messages)
    || !row.messages.every((message: unknown) => isChatMessage(message))) return null;
  const target = parseStrictNullableId(row.targetUserId);
  if (target === undefined || (bound && target !== captured.targetUserId)
    || (captured.rawRole === 'client' && target !== null && target !== captured.actorId)) return null;
  return { ...row, id, targetUserId: target };
}

type AuthPublicationIdentity = {
  actorId: number | null;
  rawRole: string | null;
  authenticated: boolean;
};

type ChatOperation = {
  id: number;
  scopeGeneration: number;
  controller: AbortController;
  opaque: object;
  retired: boolean;
  phase: 'active' | 'adopting';
  adoption?: { captured: PublicationSnapshot; thread: CreatedThread };
  optimistic?: Message;
  mutationTarget?: number;
  readThreadId?: number;
};

function readPublicationBinding(source?: PublicationBinding): PublicationSnapshot | null {
  if (!source) return null;
  try {
    const candidate = source.getSnapshot();
    return isPublicationSnapshot(candidate) ? freezePublicationSnapshot(candidate) : null;
  } catch { return null; }
}

function retireOperationSet(operations: Set<ChatOperation>): void {
  for (const operation of operations) {
    operation.retired = true;
    operation.controller.abort();
  }
  operations.clear();
}
export function useAIChat(
  audienceRole?: AIConversationRole,
  binding?: PublicationBinding,
) {
  const auth = useAuth();
  const { showPaywall } = usePaywall();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const [lastErrorRetryable, setLastErrorRetryable] = useState(true);

  const operationsRef = useRef<Set<ChatOperation>>(new Set());
  const mutationOperationsRef = useRef<Map<number, ChatOperation>>(new Map());
  const adoptedTransitionRef = useRef<{
    snapshot: PublicationSnapshot; scopeGeneration: number;
    operation: ChatOperation; originScope: object;
  } | null>(null);
  const operationSequenceRef = useRef(0);
  const scopeGenerationRef = useRef(1);
  const authGenerationRef = useRef(1);
  const selectedConversationRef = useRef<number | null>(null);
  const conversationEpochRef = useRef(1);
  const renderedConversationEpoch = conversationEpochRef.current;
  const convCacheTimeRef = useRef<number>(0);
  const convCacheStatusRef = useRef<string | null>(null);
  const renderIdentity: AuthPublicationIdentity = {
    actorId: parseStrictPositiveId(auth.user?.id) ?? null,
    rawRole: typeof auth.user?.role === 'string' ? auth.user.role : null,
    authenticated: Boolean(auth.isAuthenticated && auth.user && !auth.loading),
  };
  const authKey = renderIdentity.authenticated
    ? `${renderIdentity.actorId}:${renderIdentity.rawRole}`
    : null;
  const renderSnapshot = readPublicationBinding(binding);
  // A render observes identity. Only the committed layout below can admit it.
  // A fresh memo token also retires A -> B -> A callbacks without changing refs
  // or aborting work during a speculative render.
  const renderScope = useMemo(() => Object.freeze({}), [
    authKey, audienceRole, Boolean(binding), renderSnapshot?.actorId,
    renderSnapshot?.rawRole, renderSnapshot?.audienceRole, renderSnapshot?.generation,
    renderSnapshot?.targetUserId, renderSnapshot?.threadId, renderSnapshot?.enabled,
  ]);
  const committedScopeRef = useRef(renderScope);
  const [publishedScope, setPublishedScope] = useState(renderScope);
  const mountedRef = useRef(false);
  const bindingRef = useRef(binding);
  const authIdentityRef = useRef<AuthPublicationIdentity>(renderIdentity);
  const conversationCacheRef = useRef<ConversationSummary[]>([]);
  const readLiveSnapshot = useCallback(readPublicationBinding, []);

  const canUseRenderScope = useCallback((): boolean => {
    const identity = authIdentityRef.current;
    if (!mountedRef.current || committedScopeRef.current !== renderScope
      || !identity.authenticated || identity.actorId === null
      || !isAllowedRawRole(identity.rawRole)
      || !audienceAllowedForActor(identity.rawRole, audienceRole ?? identity.rawRole)) return false;
    if (!bindingRef.current) return !binding;
    const current = readPublicationBinding(bindingRef.current);
    return Boolean(current && current.enabled && samePublicationToken(current, renderSnapshot));
  }, [renderScope, audienceRole]);

  const authMatchesSnapshot = useCallback((current: PublicationSnapshot): boolean => {
    const identity = authIdentityRef.current;
    return identity.authenticated
      && identity.actorId === current.actorId
      && identity.rawRole !== null
      && identity.rawRole === current.rawRole
      && isAllowedRawRole(identity.rawRole)
      && audienceAllowedForActor(identity.rawRole, current.audienceRole)
      && (!audienceRole || current.audienceRole === audienceRole)
      && current.enabled;
  }, [audienceRole]);

  const capturePublication = useCallback((
    source: PublicationBinding | undefined,
    targetUserId: number | null,
    threadId: number | null,
  ): PublicationSnapshot | null => {
    if (!canUseRenderScope()) return null;
    const identity = authIdentityRef.current;
    if (
      !identity.authenticated
      || identity.actorId === null
      || identity.rawRole === null
      || !isAllowedRawRole(identity.rawRole)
    ) {
      return null;
    }
    if (source) {
      const current = readLiveSnapshot(source);
      if (!current || !authMatchesSnapshot(current)) return null;
      if (current.targetUserId !== targetUserId || current.threadId !== threadId) return null;
      return current;
    }
    const currentAudience = audienceRole ?? identity.rawRole;
    if (!audienceAllowedForActor(identity.rawRole, currentAudience)) return null;
    return freezePublicationSnapshot({
      actorId: identity.actorId,
      rawRole: identity.rawRole,
      audienceRole: currentAudience,
      generation: authGenerationRef.current,
      targetUserId,
      threadId,
      enabled: true,
    });
  }, [audienceRole, authMatchesSnapshot, readLiveSnapshot, canUseRenderScope]);

  const operationIsCurrent = useCallback((
    operation: ChatOperation,
    captured: PublicationSnapshot,
    source?: PublicationBinding,
  ): boolean => {
    if (
      !mountedRef.current
      || operation.retired
      || operation.controller.signal.aborted
      || operation.scopeGeneration !== scopeGenerationRef.current
    ) {
      return false;
    }
    const identity = authIdentityRef.current;
    if (
      !identity.authenticated
      || identity.actorId !== captured.actorId
      || identity.rawRole !== captured.rawRole
    ) {
      return false;
    }
    if (source) {
      const live = readLiveSnapshot(bindingRef.current);
      return Boolean(live && samePublicationToken(live, captured) && authMatchesSnapshot(live));
    }
    return captured.generation === authGenerationRef.current;
  }, [authMatchesSnapshot, readLiveSnapshot]);

  const adoptionWaitIsCurrent = useCallback((
    operation: ChatOperation,
    captured: PublicationSnapshot,
    createdThreadId: number,
    source: PublicationBinding,
  ): boolean => {
    if (
      !mountedRef.current
      || operation.retired
      || operation.controller.signal.aborted
      || operation.scopeGeneration !== scopeGenerationRef.current
    ) {
      return false;
    }
    const identity = authIdentityRef.current;
    const live = readLiveSnapshot(bindingRef.current);
    if (
      !live
      || !identity.authenticated
      || identity.actorId !== captured.actorId
      || identity.rawRole !== captured.rawRole
      || live.actorId !== captured.actorId
      || live.rawRole !== captured.rawRole
      || live.audienceRole !== captured.audienceRole
      || live.generation !== captured.generation
      || live.targetUserId !== captured.targetUserId
    ) {
      return false;
    }
    return (!live.enabled && live.threadId === captured.threadId) || live.threadId === createdThreadId;
  }, [readLiveSnapshot]);

  const removeOptimistic = useCallback((operation: ChatOperation): void => {
    const optimistic = operation.optimistic;
    if (!optimistic) return;
    setActiveConversation(previous => previous?.messages.includes(optimistic)
      ? { ...previous, messages: previous.messages.filter(message => message !== optimistic) }
      : previous);
  }, []);

  const retireOperation = useCallback((operation: ChatOperation | null): void => {
    if (!operation) return;
    operation.retired = true;
    operation.controller.abort();
    operationsRef.current.delete(operation);
    if (operation.mutationTarget !== undefined && mutationOperationsRef.current.get(operation.mutationTarget) === operation) {
      mutationOperationsRef.current.delete(operation.mutationTarget);
    }
    removeOptimistic(operation);
  }, [removeOptimistic]);

  const beginOperation = useCallback((
    phase: ChatOperation['phase'],
    superseded?: { current: ChatOperation | null },
  ): ChatOperation => {
    if (superseded?.current) retireOperation(superseded.current);
    const operation: ChatOperation = {
      id: ++operationSequenceRef.current,
      scopeGeneration: scopeGenerationRef.current,
      controller: new AbortController(),
      opaque: Object.freeze({}),
      retired: false,
      phase,
    };
    operationsRef.current.add(operation);
    if (superseded) superseded.current = operation;
    return operation;
  }, [retireOperation]);

  const beginMetadataOperation = useCallback((id: number): ChatOperation => {
    retireOperation(mutationOperationsRef.current.get(id) ?? null);
    const operation = beginOperation('active');
    operation.mutationTarget = id;
    mutationOperationsRef.current.set(id, operation);
    return operation;
  }, [beginOperation, retireOperation]);

  const finishOperation = useCallback((operation: ChatOperation): void => {
    operationsRef.current.delete(operation);
    if (operation.mutationTarget !== undefined && mutationOperationsRef.current.get(operation.mutationTarget) === operation) {
      mutationOperationsRef.current.delete(operation.mutationTarget);
    }
    removeOptimistic(operation);
  }, [removeOptimistic]);

  const clearError = useCallback(() => {
    if (!canUseRenderScope()) return;
    setError(null);
    setLastErrorCode(null);
    setLastErrorRetryable(true);
  }, [canUseRenderScope]);

  const setFailureState = useCallback((msg: string, code?: string | null, retryable = true) => {
    setError(msg);
    setLastErrorCode(code || null);
    setLastErrorRetryable(retryable);
  }, []);

  const awaitCreatedThreadAdoption = useCallback(async (
    operation: ChatOperation,
    captured: PublicationSnapshot,
    createdThread: CreatedThread,
    source: PublicationBinding,
  ): Promise<PublicationSnapshot | null> => {
    const adopter = source.adoptCreatedThread;
    if (!adopter || captured.threadId !== null) return null;
    operation.phase = 'adopting';
    operation.adoption = { captured, thread: createdThread };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), CREATED_THREAD_ADOPTION_TIMEOUT_MS);
    });
    let onAbort: () => void;
    const aborted = new Promise<null>(resolve => {
      onAbort = () => resolve(null);
      operation.controller.signal.addEventListener('abort', onAbort, { once: true });
      if (operation.controller.signal.aborted) resolve(null);
    });
    const adoptionPromise = Promise.resolve()
      .then(() => (operationIsCurrent(operation, captured, source)
        || adoptionWaitIsCurrent(operation, captured, createdThread.id, source)) ? adopter({
        captured,
        operation: operation.opaque,
        thread: createdThread,
        signal: operation.controller.signal,
      }) : null)
      .catch(() => null);
    const adopted = await Promise.race([adoptionPromise, timeout, aborted]);
    if (timer !== undefined) clearTimeout(timer);
    operation.controller.signal.removeEventListener('abort', onAbort!);
    if (
      !adopted
      || !isPublicationSnapshot(adopted)
      || !adoptionWaitIsCurrent(operation, captured, createdThread.id, source)
      || adopted.actorId !== captured.actorId
      || adopted.rawRole !== captured.rawRole
      || adopted.audienceRole !== captured.audienceRole
      || adopted.generation !== captured.generation
      || adopted.targetUserId !== captured.targetUserId
      || adopted.threadId !== createdThread.id
      || !adopted.enabled
      || !samePublicationToken(readLiveSnapshot(bindingRef.current), adopted)
    ) {
      operation.retired = true;
      operation.controller.abort();
      return null;
    }
    adoptedTransitionRef.current = {
      snapshot: freezePublicationSnapshot(adopted), scopeGeneration: scopeGenerationRef.current,
      operation, originScope: committedScopeRef.current,
    };
    operation.phase = 'active';
    operation.adoption = undefined;
    return freezePublicationSnapshot(adopted);
  }, [adoptionWaitIsCurrent, operationIsCurrent]);

  const validateOperationAndAuth = useCallback((
    operation: ChatOperation,
    captured: PublicationSnapshot,
    source?: PublicationBinding,
  ): boolean => operationIsCurrent(operation, captured, source), [operationIsCurrent]);

  const createOperationRef = useRef<ChatOperation | null>(null);
  const listOperationRef = useRef<ChatOperation | null>(null);
  const loadOperationRef = useRef<ChatOperation | null>(null);
  const sendOperationRef = useRef<ChatOperation | null>(null);
  const loadingOperationRef = useRef<ChatOperation | null>(null);

  const beginLoading = useCallback((operation: ChatOperation): void => {
    loadingOperationRef.current = operation;
    setLoading(true);
  }, []);

  const finishLoading = useCallback((operation: ChatOperation): void => {
    if (loadingOperationRef.current === operation) {
      loadingOperationRef.current = null;
      setLoading(false);
    }
  }, []);

  const invalidateHistory = useCallback((removedThreadId?: number): void => {
    if (removedThreadId !== undefined && selectedConversationRef.current === removedThreadId) {
      selectedConversationRef.current = null;
      conversationEpochRef.current += 1;
      retireOperation(sendOperationRef.current);
      sendOperationRef.current = null;
      setSending(false);
    }
    const listing = listOperationRef.current;
    if (listing) {
      retireOperation(listing);
      finishLoading(listing);
      listOperationRef.current = null;
    }
    const loadingThread = loadOperationRef.current;
    if (removedThreadId !== undefined && loadingThread?.readThreadId === removedThreadId) {
      retireOperation(loadingThread);
      finishLoading(loadingThread);
      loadOperationRef.current = null;
    }
    convCacheTimeRef.current = 0;
    convCacheStatusRef.current = null;
    conversationCacheRef.current = [];
  }, [retireOperation, finishLoading]);

  const selectConversationIntent = useCallback((threadId: number | null, force = false): void => {
    if (!force && selectedConversationRef.current === threadId) return;
    selectedConversationRef.current = threadId;
    conversationEpochRef.current += 1;
    scopeGenerationRef.current += 1;
    adoptedTransitionRef.current = null;
    retireOperationSet(operationsRef.current);
    mutationOperationsRef.current.clear();
    createOperationRef.current = null;
    listOperationRef.current = null;
    loadOperationRef.current = null;
    sendOperationRef.current = null;
    loadingOperationRef.current = null;
    setActiveConversation(null);
    setLoading(false);
    setSending(false);
  }, []);

  useLayoutEffect(() => {
    mountedRef.current = true;
    setLoading(false);
    setSending(false);
    return () => {
      mountedRef.current = false;
      scopeGenerationRef.current += 1;
      authGenerationRef.current += 1;
      retireOperationSet(operationsRef.current);
      mutationOperationsRef.current.clear();
      loadingOperationRef.current = null;
      sendOperationRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    authIdentityRef.current = renderIdentity;
    bindingRef.current = binding;
    if (committedScopeRef.current === renderScope) return;
    const adopted = adoptedTransitionRef.current;
    adoptedTransitionRef.current = null;
    if (adopted && adopted.originScope === committedScopeRef.current
      && adopted.scopeGeneration === scopeGenerationRef.current
      && samePublicationToken(renderSnapshot, adopted.snapshot)
      && authMatchesSnapshot(adopted.snapshot)) {
      for (const operation of [...operationsRef.current]) {
        if (operation !== adopted.operation) retireOperation(operation);
      }
      committedScopeRef.current = renderScope;
      setPublishedScope(renderScope);
      return;
    }
    // Only the original create may wait across its own disabled/acknowledged
    // metadata transition. It publishes nothing while waiting.
    const waiting = [...operationsRef.current].filter(operation => {
      const adoption = operation.adoption;
      return operation.phase === 'adopting' && adoption && binding
        && adoptionWaitIsCurrent(operation, adoption.captured, adoption.thread.id, binding);
    });
    if (waiting.length !== 1) {
      selectedConversationRef.current = null;
      conversationEpochRef.current += 1;
      scopeGenerationRef.current += 1;
      authGenerationRef.current += 1;
      retireOperationSet(operationsRef.current);
      mutationOperationsRef.current.clear();
    } else {
      for (const operation of [...operationsRef.current]) {
        if (operation !== waiting[0]) retireOperation(operation);
      }
    }
    committedScopeRef.current = renderScope;
    setPublishedScope(renderScope);
    setConversations([]);
    setActiveConversation(null);
    convCacheTimeRef.current = 0;
    conversationCacheRef.current = [];
    setError(null);
    setLastErrorCode(null);
    setLastErrorRetryable(true);
    setLoading(false);
    setSending(false);
    if (waiting.length !== 1) {
      loadingOperationRef.current = null;
      sendOperationRef.current = null;
    }
  });


  const createConversation = useCallback(async (
    context: AIContext = 'general',
    title?: string,
    targetUserId?: number | string | null,
    responseStyle: ResponseStyle = 'both',
  ): Promise<Conversation | null> => {
    const requestedTarget = authIdentityRef.current.rawRole === 'client' ? null : normalizeTargetUserId(targetUserId);
    if (requestedTarget === undefined) return null;
    const source = bindingRef.current;
    const captured = capturePublication(source, requestedTarget, null);
    if (
      !captured
      || (source && captured.threadId !== null)
      || (source && !source.adoptCreatedThread)
    ) return null;

    selectConversationIntent(null, true);
    const operation = beginOperation('active', createOperationRef);
    beginLoading(operation);
    setError(null);
    try {
      const payload: Record<string, unknown> = { context, title, responseStyle };
      if (audienceRole) payload.audienceRole = audienceRole;
      if (requestedTarget !== null) payload.targetUserId = requestedTarget;
      if (!validateOperationAndAuth(operation, captured, source)) return null;
      const res = await apiService.post('/api/ai-chat/conversations', payload, {
        signal: operation.controller.signal,
        _isBackgroundRequest: true,
      } as never);
      const data = res.data;
      if (data.success !== true) throw buildAiApiError(data, 'Failed to create conversation', res.status);
      if (!validateOperationAndAuth(operation, captured, source)) return null;
      const createdThread = validateCreatedThread(data, requestedTarget, captured.audienceRole);
      if (!createdThread) return null;

      let accepted = captured;
      if (source) {
        const adopted = await awaitCreatedThreadAdoption(operation, captured, createdThread, source);
        if (!adopted) return null;
        accepted = adopted;
      }
      if (!validateOperationAndAuth(operation, accepted, source)) return null;

      const newConv: Conversation = {
        ...data.conversation,
        id: createdThread.id,
        targetUserId: createdThread.targetUserId,
        messages: [],
        role: createdThread.role,
        metadata: {},
      };
      invalidateHistory();
      selectedConversationRef.current = createdThread.id;
      setActiveConversation(newConv);
      return newConv;
    } catch (err: unknown) {
      if (!validateOperationAndAuth(operation, captured, source) || isCanceledAiRequest(err)) return null;
      setFailureState(toAiApiError(err, 'Failed to create conversation').message);
      return null;
    } finally {
      finishLoading(operation);
      finishOperation(operation);
      if (createOperationRef.current === operation) createOperationRef.current = null;
    }
  }, [
    audienceRole,
    awaitCreatedThreadAdoption,
    beginLoading,
    beginOperation,
    capturePublication,
    finishLoading,
    finishOperation,
    invalidateHistory,
    selectConversationIntent,
    setFailureState,
    validateOperationAndAuth,
  ]);

  const listConversations = useCallback(async (status = 'active', force = false): Promise<ConversationSummary[]> => {
    const source = bindingRef.current;
    const current = readLiveSnapshot(source);
    const captured = capturePublication(source, current?.targetUserId ?? null, current?.threadId ?? null);
    if (!captured) return [];
    if (!force && convCacheStatusRef.current === status && conversationCacheRef.current.length > 0
      && Date.now() - convCacheTimeRef.current < CONVERSATION_CACHE_TTL_MS) {
      return conversationCacheRef.current;
    }
    const operation = beginOperation('active', listOperationRef);
    beginLoading(operation);
    setError(null);
    try {
      const audienceQuery = audienceRole ? `&audienceRole=${audienceRole}` : '';
      if (!validateOperationAndAuth(operation, captured, source)) return [];
      const res = await apiService.get(`/api/ai-chat/conversations?status=${status}&limit=20${audienceQuery}`, {
        signal: operation.controller.signal,
        _isBackgroundRequest: true,
      } as never);
      const data = res.data;
      if (data.success !== true || !Array.isArray(data.conversations)) {
        throw buildAiApiError(data, 'Failed to list conversations', res.status);
      }
      if (!validateOperationAndAuth(operation, captured, source)) return [];
      setConversations(data.conversations);
      conversationCacheRef.current = data.conversations;
      convCacheStatusRef.current = status;
      convCacheTimeRef.current = Date.now();
      return data.conversations;
    } catch (err: unknown) {
      if (!validateOperationAndAuth(operation, captured, source) || isCanceledAiRequest(err)) return [];
      setFailureState(toAiApiError(err, 'Failed to list conversations').message);
      return [];
    } finally {
      finishLoading(operation);
      finishOperation(operation);
      if (listOperationRef.current === operation) listOperationRef.current = null;
    }
  }, [
    audienceRole,
    beginLoading,
    beginOperation,
    capturePublication,
    finishLoading,
    finishOperation,
    readLiveSnapshot,
    setFailureState,
    validateOperationAndAuth,
  ]);

  const loadConversation = useCallback(async (id: number): Promise<Conversation | null> => {
    const requestedId = parseStrictPositiveId(id);
    if (requestedId === undefined) return null;
    const source = bindingRef.current;
    const current = readLiveSnapshot(source);
    const target = current?.targetUserId ?? normalizeTargetUserId(activeConversation?.targetUserId);
    const captured = capturePublication(source, target ?? null, requestedId);
    if (!captured) return null;
    selectConversationIntent(requestedId);
    const operation = beginOperation('active', loadOperationRef);
    operation.readThreadId = requestedId;
    beginLoading(operation);
    setError(null);
    try {
      const audienceQuery = audienceRole ? `?audienceRole=${audienceRole}` : '';
      if (!validateOperationAndAuth(operation, captured, source)) return null;
      const res = await apiService.get(`/api/ai-chat/conversations/${requestedId}${audienceQuery}`, {
        signal: operation.controller.signal,
        _isBackgroundRequest: true,
      } as never);
      const data = res.data;
      if (data.success !== true || !data.conversation) {
        throw buildAiApiError(data, 'Failed to load conversation', res.status);
      }
      if (!validateOperationAndAuth(operation, captured, source)) return null;
      const conversation = validDetail(data.conversation, requestedId, captured,
        source ? captured.audienceRole : audienceRole, Boolean(source));
      if (!conversation) return null;
      setActiveConversation(conversation);
      return conversation;
    } catch (err: unknown) {
      if (!validateOperationAndAuth(operation, captured, source) || isCanceledAiRequest(err)) return null;
      setFailureState(toAiApiError(err, 'Failed to load conversation').message);
      return null;
    } finally {
      finishLoading(operation);
      finishOperation(operation);
      if (loadOperationRef.current === operation) loadOperationRef.current = null;
    }
  }, [
    activeConversation?.targetUserId,
    audienceRole,
    beginLoading,
    beginOperation,
    capturePublication,
    finishLoading,
    finishOperation,
    readLiveSnapshot,
    selectConversationIntent,
    setFailureState,
    validateOperationAndAuth,
  ]);


  const sendMessage = useCallback(async (message: string) => {
    if (!canUseRenderScope() || renderedConversationEpoch !== conversationEpochRef.current) return null;
    if (isChatMessageTooLong(message)) {
      const msg = buildChatMessageTooLongError(message.length);
      setFailureState(msg, 'MESSAGE_TOO_LONG', false);
      return { failed: true, originalMessage: message, errorCode: 'MESSAGE_TOO_LONG', retryable: false };
    }
    if (!activeConversation) {
      setFailureState('No active conversation');
      return null;
    }
    const conversationId = parseStrictPositiveId(activeConversation.id);
    const target = normalizeTargetUserId(activeConversation.targetUserId);
    if (conversationId === undefined || target === undefined) return null;
    const source = bindingRef.current;
    const captured = capturePublication(source, target, conversationId);
    if (!captured) return null;

    const operation = beginOperation('active', sendOperationRef);
    sendOperationRef.current = operation;
    setSending(true);
    clearError();
    const optimisticUserMsg: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    operation.optimistic = optimisticUserMsg;

    try {
      if (!validateOperationAndAuth(operation, captured, source)) return null;
      setActiveConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, optimisticUserMsg],
      } : prev);

      const res = await apiService.post(
        `/api/ai-chat/conversations/${conversationId}/messages`,
        { message },
        { signal: operation.controller.signal, _isBackgroundRequest: true } as never,
      );
      const data = res.data;
      if (data.success !== true) throw buildAiApiError(data, 'Failed to send message', res.status);
      if (!validExchange(data, conversationId)) throw buildAiApiError({ error: 'Swan Coach returned an invalid message response.', code: 'INVALID_AI_RESPONSE', retryable: false }, 'Invalid response', 502);
      if (!validateOperationAndAuth(operation, captured, source)) return null;
      invalidateHistory();
      const enrichedAssistantMsg = enrichAssistantMessageWithActionMetadata(data);
      setActiveConversation(prev => {
        if (!prev || prev.id !== conversationId || !operationIsCurrent(operation, captured, source)) return prev;
        return {
          ...prev,
          messages: mergeRealExchange(prev.messages, optimisticUserMsg, data.userMessage, enrichedAssistantMsg),
          messageCount: data.messageCount,
          title: prev.title || data.userMessage.content.slice(0, 47),
          lastMessageAt: enrichedAssistantMsg.timestamp,
        };
      });
      if (!validateOperationAndAuth(operation, captured, source)) return null;
      dispatchSafeFrontendActions(data.frontendActions, () => operationIsCurrent(operation, captured, source));
      if (!validateOperationAndAuth(operation, captured, source)) return null;
      return enrichedAssistantMsg;
    } catch (err: unknown) {
      if (!validateOperationAndAuth(operation, captured, source) || isCanceledAiRequest(err)) return null;
      if (isPaywallError(err)) {
        showPaywall('Swan Coach', getPaywallPayload(err));
        setActiveConversation(prev => prev && prev.id === conversationId ? {
          ...prev,
          messages: prev.messages.filter(entry => entry !== optimisticUserMsg),
        } : prev);
        return { paywallRequired: true, ...getPaywallPayload(err), originalMessage: message };
      }
      const apiErr = toAiApiError(err, 'Failed to send message');
      const msg = apiErr.message || 'Failed to send message';
      const code = apiErr.status === 429 ? 'RATE_LIMITED' : apiErr.code;
      const retryable = apiErr.retryable !== false && !isNonRetryableAiErrorCode(code);
      setFailureState(msg, code, retryable);
      setActiveConversation(prev => prev && prev.id === conversationId ? {
        ...prev,
        messages: prev.messages.filter(entry => entry !== optimisticUserMsg),
      } : prev);
      return buildAiSendFailure(message, apiErr);
    } finally {
      if (sendOperationRef.current === operation) {
        sendOperationRef.current = null;
        setSending(false);
      }
      finishOperation(operation);
    }
  }, [
    activeConversation,
    renderedConversationEpoch,
    beginOperation,
    capturePublication,
    clearError,
    finishOperation,
    invalidateHistory,
    operationIsCurrent,
    showPaywall,
    setFailureState,
    validateOperationAndAuth,
  ]);

  // Brain-v4 review #4: a null send was refused either before the MESSAGE POST (the
  // words were not sent; a created thread may exist, empty) or after it (the message
  // may be saved). Callers read which, once, right after their own send resolves.
  const sendReachedNetworkRef = useRef(false);
  const lastSendReachedNetwork = useCallback(() => sendReachedNetworkRef.current, []);

  const sendMessageWithConversation = useCallback(async (
    message: string,
    context: AIContext = 'general',
    title?: string,
    targetUserId?: number | string | null,
    responseStyle: ResponseStyle = 'both',
    foodContext?: Record<string, unknown> | null,
    requestContext?: AIRequestContext | null,
  ) => {
    sendReachedNetworkRef.current = false;
    if (!canUseRenderScope() || renderedConversationEpoch !== conversationEpochRef.current) return null;
    if (isChatMessageTooLong(message)) {
      const msg = buildChatMessageTooLongError(message.length);
      setFailureState(msg, 'MESSAGE_TOO_LONG', false);
      return { failed: true, originalMessage: message, errorCode: 'MESSAGE_TOO_LONG', retryable: false };
    }
    const requestedTarget = authIdentityRef.current.rawRole === 'client' ? null : normalizeTargetUserId(targetUserId);
    if (requestedTarget === undefined) return null;

    const source = bindingRef.current;
    const existing = activeConversationMatchesRequest(activeConversation, context, requestedTarget, audienceRole)
      ? activeConversation : null;
    const existingId = existing ? parseStrictPositiveId(existing.id) : undefined;
    const initialPublication = capturePublication(source, requestedTarget, existingId ?? null);
    if (
      !initialPublication
      || (existingId === undefined && source && initialPublication.threadId !== null)
      || (existingId === undefined && source && !source.adoptCreatedThread)
    ) {
      return null;
    }

    if (existingId === undefined) selectConversationIntent(null, true);
    const operation = beginOperation('active', sendOperationRef);
    let publication: PublicationSnapshot = initialPublication;

    sendOperationRef.current = operation;
    setSending(true);
    clearError();
    let convId: number | null = existingId ?? null;
    const optimisticUserMsg: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    operation.optimistic = optimisticUserMsg;

    try {
      if (!validateOperationAndAuth(operation, publication, source)) return null;

      if (!convId) {
        const payload: Record<string, unknown> = { context, title, responseStyle };
        if (audienceRole) payload.audienceRole = audienceRole;
        if (requestedTarget !== null) payload.targetUserId = requestedTarget;
        const createRes = await apiService.post('/api/ai-chat/conversations', payload, {
          signal: operation.controller.signal,
          _isBackgroundRequest: true,
        } as never);
        const createData = createRes.data;
        if (createData.success !== true) {
          throw buildAiApiError(createData, 'Failed to create conversation', createRes.status);
        }
        if (!validateOperationAndAuth(operation, publication, source)) return null;
        const createdThread = validateCreatedThread(createData, requestedTarget, publication.audienceRole);
        if (!createdThread) return null;
        convId = createdThread.id;

        if (source) {
          const adopted = await awaitCreatedThreadAdoption(operation, publication, createdThread, source);
          if (!adopted) return null;
          publication = adopted;
        }
        if (!validateOperationAndAuth(operation, publication, source)) return null;

        const newConv: Conversation = {
          ...createData.conversation,
          id: createdThread.id,
          targetUserId: createdThread.targetUserId,
          messages: [],
          role: createdThread.role,
          metadata: {},
        };
        invalidateHistory();
        selectedConversationRef.current = createdThread.id;
        setActiveConversation(newConv);
      }

      if (convId === null || !validateOperationAndAuth(operation, publication, source)) return null;
      setSending(true);
      setActiveConversation(prev => prev ? { ...prev, messages: [...prev.messages, optimisticUserMsg] } : prev);

      const safeRequestContext = buildSafeRequestContext(requestContext);
      if (!validateOperationAndAuth(operation, publication, source)) return null;
      sendReachedNetworkRef.current = true;
      const res = await apiService.post(
        `/api/ai-chat/conversations/${convId}/messages`,
        {
          message,
          ...(foodContext ? { foodContext } : {}),
          ...(safeRequestContext ? { requestContext: safeRequestContext } : {}),
        },
        { signal: operation.controller.signal, _isBackgroundRequest: true } as never,
      );
      const data = res.data;
      if (data.success !== true) throw buildAiApiError(data, 'Failed to send message', res.status);
      if (!validExchange(data, convId)) throw buildAiApiError({ error: 'Swan Coach returned an invalid message response.', code: 'INVALID_AI_RESPONSE', retryable: false }, 'Invalid response', 502);
      if (!validateOperationAndAuth(operation, publication, source)) return null;

      invalidateHistory();
      const enrichedAssistantMsg = enrichAssistantMessageWithActionMetadata(data);
      setActiveConversation(prev => {
        if (!prev || prev.id !== convId || !operationIsCurrent(operation, publication, source)) return prev;
        return {
          ...prev,
          messages: mergeRealExchange(prev.messages, optimisticUserMsg, data.userMessage, enrichedAssistantMsg),
          messageCount: data.messageCount,
          title: prev.title || data.userMessage.content.slice(0, 47),
          lastMessageAt: enrichedAssistantMsg.timestamp,
        };
      });
      if (!validateOperationAndAuth(operation, publication, source)) return null;
      dispatchSafeFrontendActions(data.frontendActions, () => operationIsCurrent(operation, publication, source));
      if (!validateOperationAndAuth(operation, publication, source)) return null;
      return enrichedAssistantMsg;
    } catch (err: unknown) {
      if (!validateOperationAndAuth(operation, publication, source) || isCanceledAiRequest(err)) return null;
      if (isPaywallError(err)) {
        showPaywall('Swan Coach', getPaywallPayload(err));
        setActiveConversation(prev => prev && prev.id === convId
          ? { ...prev, messages: prev.messages.filter(entry => entry !== optimisticUserMsg) }
          : prev);
        return { paywallRequired: true, ...getPaywallPayload(err), originalMessage: message };
      }
      const apiErr = toAiApiError(err, 'Failed to send message');
      const msg = apiErr.message || 'Failed to send message';
      const code = apiErr.status === 429 ? 'RATE_LIMITED' : apiErr.code;
      const retryable = apiErr.retryable !== false && !isNonRetryableAiErrorCode(code);
      setFailureState(msg, code, retryable);
      setActiveConversation(prev => prev && prev.id === convId
        ? { ...prev, messages: prev.messages.filter(entry => entry !== optimisticUserMsg) }
        : prev);
      return buildAiSendFailure(message, apiErr);
    } finally {
      if (sendOperationRef.current === operation) {
        sendOperationRef.current = null;
        setSending(false);
      }
      finishOperation(operation);
    }
  }, [
    activeConversation,
    audienceRole,
    renderedConversationEpoch,
    awaitCreatedThreadAdoption,
    beginOperation,
    capturePublication,
    clearError,
    finishOperation,
    invalidateHistory,
    operationIsCurrent,
    selectConversationIntent,
    showPaywall,
    setFailureState,
    validateOperationAndAuth,
  ]);

  const newChat = useCallback(() => {
    if (!canUseRenderScope()) return;
    // A created-thread adoption bound the staff snapshot to that thread; New chat
    // must return to the thread-less admitted scope or every later send is refused.
    bindingRef.current?.releaseAdoptedThread?.();
    selectedConversationRef.current = null;
    conversationEpochRef.current += 1;
    scopeGenerationRef.current += 1;
    adoptedTransitionRef.current = null;
    retireOperationSet(operationsRef.current);
    mutationOperationsRef.current.clear();
    createOperationRef.current = null;
    listOperationRef.current = null;
    loadOperationRef.current = null;
    sendOperationRef.current = null;
    loadingOperationRef.current = null;
    setActiveConversation(null);
    setConversations([]);
    convCacheTimeRef.current = 0;
    conversationCacheRef.current = [];
    setLoading(false);
    setSending(false);
    clearError();
  }, [clearError, canUseRenderScope]);

  const deleteConversation = useCallback(async (id: number): Promise<void> => {
    const requestedId = parseStrictPositiveId(id);
    if (requestedId === undefined) return;
    const source = bindingRef.current;
    const current = readLiveSnapshot(source);
    const target = current?.targetUserId ?? normalizeTargetUserId(activeConversation?.targetUserId);
    const thread = current?.threadId ?? parseStrictPositiveId(activeConversation?.id) ?? null;
    const captured = capturePublication(source, target ?? null, thread);
    if (!captured) return;
    const operation = beginMetadataOperation(requestedId);
    try {
      if (!validateOperationAndAuth(operation, captured, source)) return;
      const res = await apiService.delete(`/api/ai-chat/conversations/${requestedId}`, {
        signal: operation.controller.signal,
        _isBackgroundRequest: true,
      } as never);
      if (res.data?.success !== true || !validateOperationAndAuth(operation, captured, source)) return;
      invalidateHistory(requestedId);
      setConversations(prev => operationIsCurrent(operation, captured, source)
        ? prev.filter(c => c.id !== requestedId) : prev);
      setActiveConversation(prev => operationIsCurrent(operation, captured, source)
        && prev?.id === requestedId ? null : prev);
    } catch {
      // Silent fail for delete, including a retired operation.
    } finally {
      finishOperation(operation);
    }
  }, [
    activeConversation?.id,
    activeConversation?.targetUserId,
    beginMetadataOperation,
    capturePublication,
    finishOperation,
    invalidateHistory,
    operationIsCurrent,
    readLiveSnapshot,
    validateOperationAndAuth,
  ]);

  const renameConversation = useCallback(async (id: number, title: string): Promise<void> => {
    const requestedId = parseStrictPositiveId(id);
    if (requestedId === undefined) return;
    const source = bindingRef.current;
    const current = readLiveSnapshot(source);
    const activeId = parseStrictPositiveId(activeConversation?.id);
    const target = current?.targetUserId ?? normalizeTargetUserId(activeConversation?.targetUserId) ?? null;
    const thread = current?.threadId ?? (activeId === requestedId ? requestedId : null);
    const captured = capturePublication(source, target, thread);
    if (!captured) return;
    const operation = beginMetadataOperation(requestedId);
    try {
      if (!validateOperationAndAuth(operation, captured, source)) return;
      const res = await apiService.patch(`/api/ai-chat/conversations/${requestedId}`, { title }, {
        signal: operation.controller.signal,
        _isBackgroundRequest: true,
      } as never);
      const data = res.data;
      if (data.success !== true) throw buildAiApiError(data, 'Failed to rename conversation', res.status);
      if (!validateOperationAndAuth(operation, captured, source)) return;
      if (parseStrictPositiveId(data.conversation?.id) !== requestedId) return;
      invalidateHistory();
      setConversations(prev => operationIsCurrent(operation, captured, source)
        ? prev.map(c => c.id === requestedId ? { ...c, title } : c) : prev);
      setActiveConversation(prev => operationIsCurrent(operation, captured, source)
        && prev?.id === requestedId ? { ...prev, title } : prev);
    } catch (err: unknown) {
      if (!validateOperationAndAuth(operation, captured, source) || isCanceledAiRequest(err)) return;
      setFailureState(toAiApiError(err, 'Failed to rename conversation').message);
    } finally {
      finishOperation(operation);
    }
  }, [
    activeConversation?.id,
    activeConversation?.targetUserId,
    beginMetadataOperation,
    capturePublication,
    finishOperation,
    invalidateHistory,
    operationIsCurrent,
    readLiveSnapshot,
    setFailureState,
    validateOperationAndAuth,
  ]);

  const archiveConversation = useCallback(async (id: number): Promise<void> => {
    const requestedId = parseStrictPositiveId(id);
    if (requestedId === undefined) return;
    const source = bindingRef.current;
    const current = readLiveSnapshot(source);
    const activeId = parseStrictPositiveId(activeConversation?.id);
    const target = current?.targetUserId ?? normalizeTargetUserId(activeConversation?.targetUserId) ?? null;
    const thread = current?.threadId ?? (activeId === requestedId ? requestedId : null);
    const captured = capturePublication(source, target, thread);
    if (!captured) return;
    const operation = beginMetadataOperation(requestedId);
    try {
      if (!validateOperationAndAuth(operation, captured, source)) return;
      const res = await apiService.patch(`/api/ai-chat/conversations/${requestedId}`, { status: 'archived' }, {
        signal: operation.controller.signal,
        _isBackgroundRequest: true,
      } as never);
      const data = res.data;
      if (data.success !== true) throw buildAiApiError(data, 'Failed to archive conversation', res.status);
      if (!validateOperationAndAuth(operation, captured, source)) return;
      if (parseStrictPositiveId(data.conversation?.id) !== requestedId) return;
      invalidateHistory(requestedId);
      setConversations(prev => operationIsCurrent(operation, captured, source)
        ? prev.filter(c => c.id !== requestedId) : prev);
      setActiveConversation(prev => operationIsCurrent(operation, captured, source)
        && prev?.id === requestedId ? null : prev);
    } catch (err: unknown) {
      if (!validateOperationAndAuth(operation, captured, source) || isCanceledAiRequest(err)) return;
      setFailureState(toAiApiError(err, 'Failed to archive conversation').message);
    } finally {
      finishOperation(operation);
    }
  }, [
    activeConversation?.id,
    activeConversation?.targetUserId,
    beginMetadataOperation,
    capturePublication,
    finishOperation,
    invalidateHistory,
    operationIsCurrent,
    readLiveSnapshot,
    setFailureState,
    validateOperationAndAuth,
  ]);

  const liveSnapshot = renderSnapshot;
  const identity = renderIdentity;
  const publicationVisible = Boolean(
    publishedScope === renderScope && identity.authenticated
      && identity.actorId !== null
      && identity.rawRole !== null
      && isAllowedRawRole(identity.rawRole)
      && audienceAllowedForActor(identity.rawRole, audienceRole ?? identity.rawRole)
      && (!binding || (liveSnapshot && authMatchesSnapshot(liveSnapshot))),
  );
  const visibleConversation = publicationVisible ? activeConversation : null;

  return {
    conversations: publicationVisible ? conversations : [],
    activeConversation: visibleConversation,
    messages: visibleConversation?.messages || [],
    loading: publicationVisible ? loading : false,
    sending: publicationVisible ? sending : false,
    error: publicationVisible ? error : null,
    lastErrorCode: publicationVisible ? lastErrorCode : null,
    lastErrorRetryable: publicationVisible ? lastErrorRetryable : true,
    publicationVisible,
    createConversation,
    listConversations,
    loadConversation,
    sendMessage,
    sendMessageWithConversation,
    lastSendReachedNetwork,
    deleteConversation,
    renameConversation,
    archiveConversation,
    newChat,
    clearError,
  };
}

export type { Message, Conversation, ConversationSummary, AIContext, AIConversationRole, ResponseStyle };
