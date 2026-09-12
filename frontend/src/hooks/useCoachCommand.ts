/**
 * ============================================================================
 * FILE: useCoachCommand.ts
 * PURPOSE: Command lane hook — wraps /api/ai-command/* endpoints
 * OWNER: Claude Sonnet 4.6 | LAST MODIFIED: 2026-04-09
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides typed access to the command execution pipeline.
 * All messages are routed here first; fallbackToChat responses are handled
 * by the caller (useCoachAssistant). Does not duplicate chat-lane logic.
 *
 * DATA FLOW:
 *   executeCommand → POST /api/ai-command/execute → CommandResponse
 *   confirmCommand → POST /api/ai-command/confirm → ConfirmResult
 *   cancelCommand  → POST /api/ai-command/cancel  → void
 *
 * PRIVACY: selectedClientId passed as an ID — no names sent to backend.
 */

import { useState, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePaywall } from '../context/PaywallContext';
import { audienceAllowedForActor, freezePublicationSnapshot, isAllowedRawRole, isPublicationSnapshot,
  parseStrictPositiveId, parseStrictNullableId, samePublicationToken,
  type PublicationBinding, type PublicationSnapshot } from './coachPublicationScope';
import apiService from '../services/api.service';
import { dispatchAIWorkoutEvent } from '../utils/aiWorkoutEvents';

// ── Response discriminated union ────────────────────────────────────────────

export type CommandResponse =
  | { type: 'fallback_to_chat' }
  | {
      type: 'confirmation_required';
      message: string;
      operationId: string | null;
      command: string;
      params: Record<string, unknown>;
      client: { id?: number; firstName?: string; lastName?: string } | null;
      details: Record<string, unknown> | null;
      expiresAt?: string;
      isDestructive: boolean;
      /** Server-owned confirmation policy; never inferred by the client. */
      tier?: 'fire_and_forget' | 'read_back' | 'deliberate' | 'refusal' | null;
      physical?: boolean;
      tierReasons?: string[];
      readBackSlots?: unknown[];
    }
  | {
      type: 'executed';
      command: string;
      result: Record<string, unknown> | null;
      client: { id?: number; firstName?: string } | null;
    }
  | {
      type: 'frontend_dispatch';
      message: string;
      command: string;
      event: string;
      payload: Record<string, unknown>;
      dispatched: boolean;
    }
  | { type: 'not_wired'; message: string; command: string; manualOnly: boolean; reason: string | null }
  | { type: 'debate_started'; message: string; jobId: string; debateType: string }
  | { type: 'error'; error: string; superseded?: boolean };

export interface ConfirmResult {
  superseded?: boolean;
  success: boolean;
  type: 'executed' | 'error' | 'not_wired' | 'frontend_dispatch' | 'debate_started';
  message: string;
  /** Execution result from the service (renamed from data — matches executeConfirmedOperation shape) */
  result: Record<string, unknown> | null;
  command?: string;
  event?: string;
  payload?: Record<string, unknown>;
  dispatched?: boolean;
}

/** Catch-path fallback — the only error text that means "the lane itself is down". */
export const COMMAND_TRANSPORT_FAILED = 'Command request failed. Please check your connection and try again.';

/** Honest error receipt: server errors (RBAC denials, validation) pass through
 *  verbatim; only a transport failure reads as "unreachable". */
export const commandErrorReceiptText = (error?: string | null): string => (
  error && error !== COMMAND_TRANSPORT_FAILED
    ? error
    : 'Swan Coach is unreachable — try again.'
);

const frontendDispatchReceipt = (event: string, dispatched: boolean, fallback: string): string => {
  if (dispatched) return fallback || 'Sent to the active workout surface.';
  if (event === 'AI_SUBMIT_WORKOUT') return 'No active Workout Logger was open. No workout was submitted.';
  if (event.startsWith('AI_PLANNER_')) return 'No Workout Planner is open. The plan was not changed.';
  return 'No active workout surface was open. No form was changed.';
};

const commandRequestErrorReceipt = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: { error?: unknown; message?: unknown } } })?.response?.data;
  const serverError = typeof data?.error === 'string' ? data.error.trim() : '';
  const serverMessage = typeof data?.message === 'string' ? data.message.trim() : '';
  return serverError || serverMessage || fallback;
};

// ── Hook ────────────────────────────────────────────────────────────────────

type CommandOperation = { scope: object; token: PublicationSnapshot; controller: AbortController };
const record = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const responseText = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const retiredCommand = (): CommandResponse => ({ type: 'error', error: 'Command request superseded.', superseded: true });
const retiredConfirmation = (): ConfirmResult => ({ success: false, type: 'error', message: 'Confirmation request superseded.', result: null, superseded: true });
const invalidCommand = (): CommandResponse => ({ type: 'error', error: 'Swan Coach returned an invalid command response.' });
const invalidConfirmation = (): ConfirmResult => ({ success: false, type: 'error', message: 'Swan Coach returned an invalid confirmation response.', result: null });

function readCommandPublication(binding?: PublicationBinding): PublicationSnapshot | null {
  if (!binding) return null;
  try { const value = binding.getSnapshot(); return isPublicationSnapshot(value) ? freezePublicationSnapshot(value) : null; }
  catch { return null; }
}

export function useCoachCommand(binding?: PublicationBinding) {
  const auth = useAuth();
  const { showPaywall } = usePaywall();
  const actorId = parseStrictPositiveId(auth.user?.id) ?? null;
  const rawRole = typeof auth.user?.role === 'string' ? auth.user.role : null;
  const authenticated = Boolean(auth.isAuthenticated && auth.user && !auth.loading);
  const observed = readCommandPublication(binding);
  const renderScope = useMemo(() => Object.freeze({}), [
    actorId, rawRole, authenticated, Boolean(binding), observed?.actorId, observed?.rawRole,
    observed?.audienceRole, observed?.generation, observed?.targetUserId, observed?.threadId, observed?.enabled,
  ]);
  const [executingCommand, setExecutingCommand] = useState(false);
  const [busyScope, setBusyScope] = useState(renderScope);
  const active = useRef<CommandOperation | null>(null);
  const mounted = useRef(true);
  const committedScope = useRef(renderScope);
  const generation = useRef(1);
  const actualAuth = useRef({ actorId, rawRole, authenticated });
  const bindingRef = useRef(binding);

  const retire = useCallback(() => {
    active.current?.controller.abort();
    active.current = null;
    setExecutingCommand(false);
  }, []);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current += 1; retire(); };
  }, [retire]);
  useLayoutEffect(() => {
    actualAuth.current = { actorId, rawRole, authenticated };
    bindingRef.current = binding;
    if (committedScope.current !== renderScope) {
      committedScope.current = renderScope;
      generation.current += 1;
      retire();
    }
  });

  const capture = useCallback((): PublicationSnapshot | null => {
    const identity = actualAuth.current;
    if (!mounted.current || committedScope.current !== renderScope || !identity.authenticated
      || identity.actorId === null || !isAllowedRawRole(identity.rawRole)) return null;
    if (bindingRef.current) {
      const token = readCommandPublication(bindingRef.current);
      return token && token.enabled && samePublicationToken(token, observed)
        && token.actorId === identity.actorId && token.rawRole === identity.rawRole
        && audienceAllowedForActor(identity.rawRole, token.audienceRole) ? token : null;
    }
    return freezePublicationSnapshot({ actorId: identity.actorId, rawRole: identity.rawRole,
      audienceRole: identity.rawRole, generation: generation.current, targetUserId: null, threadId: null, enabled: true });
  }, [renderScope, observed]);

  const begin = useCallback((token: PublicationSnapshot): CommandOperation => {
    retire();
    const operation = { scope: committedScope.current, token, controller: new AbortController() };
    active.current = operation;
    setBusyScope(committedScope.current);
    setExecutingCommand(true);
    return operation;
  }, [retire]);

  const isCurrent = useCallback((operation: CommandOperation): boolean => {
    const identity = actualAuth.current;
    if (!mounted.current || active.current !== operation || operation.controller.signal.aborted
      || operation.scope !== committedScope.current || !identity.authenticated
      || identity.actorId !== operation.token.actorId || identity.rawRole !== operation.token.rawRole) return false;
    if (!bindingRef.current) return operation.token.generation === generation.current;
    const token = readCommandPublication(bindingRef.current);
    return Boolean(token?.enabled && samePublicationToken(token, operation.token));
  }, []);

  const finish = useCallback((operation: CommandOperation) => {
    if (active.current !== operation) return;
    active.current = null;
    setExecutingCommand(false);
  }, []);

  const currentPaywall = useCallback((error: unknown, operation: CommandOperation) => {
    if (!isCurrent(operation)) return;
    const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response;
    if (response?.status === 402) showPaywall('Swan Coach', record(response.data) ? response.data : {});
  }, [isCurrent, showPaywall]);

  const executeCommand = useCallback(async (
    message: string,
    opts?: {
      selectedClientId?: number | null;
      previousContext?: string;
      routeContext?: Record<string, unknown> | null;
      commandType?: string;
      inputMode?: 'text' | 'voice' | 'ui' | 'unknown' | null;
      surface?: 'workout-planner' | 'workout-logger' | 'bootcamp-builder' | 'pain-chart';
    },
  ): Promise<CommandResponse> => {
    const token = capture();
    if (!token) return retiredCommand();
    const explicitTarget = opts?.selectedClientId === undefined ? undefined : parseStrictNullableId(opts.selectedClientId);
    if (opts?.selectedClientId !== undefined && explicitTarget === undefined) return { type: 'error', error: 'selectedClientId must be a positive integer or null.' };
    if (bindingRef.current && explicitTarget !== undefined && explicitTarget !== token.targetUserId) return retiredCommand();
    const target = bindingRef.current ? token.targetUserId : explicitTarget;
    const operation = begin(token);
    try {
      if (!isCurrent(operation)) return retiredCommand();
      const res = await apiService.post('/api/ai-command/execute', {
        message,
        selectedClientId: target ?? undefined,
        previousContext: opts?.previousContext ?? undefined,
        routeContext: { ...(opts?.routeContext ?? {}), ...(opts?.commandType ? { commandType: opts.commandType } : {}),
          ...(opts?.surface ? { surface: opts.surface } : {}), inputMode: opts?.inputMode ?? 'unknown' },
      }, { signal: operation.controller.signal, _isBackgroundRequest: true } as never);
      if (!isCurrent(operation)) return retiredCommand();
      const data = res.data;
      if (!record(data)) return invalidCommand();
      if (data.success !== true) return { type: 'error', error: responseText(data.error, 'Command failed') };
      if (data.type === 'chat' || data.type === 'clarification_needed') return { type: 'fallback_to_chat' };
      if (data.fallbackToChat === true) return invalidCommand();
      if (data.type === 'confirmation_required') {
        if (data.params !== undefined && !record(data.params)) return invalidCommand();
        return { type: 'confirmation_required', message: responseText(data.message),
          operationId: typeof data.operationId === 'string' ? data.operationId : null, command: responseText(data.command),
          params: data.params ?? {}, client: data.client ?? null, details: data.details ?? null,
          expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : undefined,
          isDestructive: Boolean(data.isDestructive), tier: data.tier ?? null, physical: Boolean(data.physical),
          tierReasons: Array.isArray(data.tierReasons) ? data.tierReasons.filter((x: unknown) => typeof x === 'string') : [],
          readBackSlots: Array.isArray(data.readBackSlots) ? data.readBackSlots : [],
        };
      }
      if (data.type === 'executed') return { type: 'executed', command: responseText(data.command), result: data.result ?? null, client: data.client ?? null };
      if (data.type === 'frontend_dispatch') {
        if (typeof data.event !== 'string' || !data.event || !record(data.payload)) return invalidCommand();
        if (!isCurrent(operation)) return retiredCommand();
        const dispatched = dispatchAIWorkoutEvent(data.event, data.payload);
        if (!isCurrent(operation)) return retiredCommand();
        return { type: 'frontend_dispatch', message: frontendDispatchReceipt(data.event, dispatched, responseText(data.message, 'Sent to the workout form.')),
          command: responseText(data.command), event: data.event, payload: data.payload, dispatched };
      }
      if (data.type === 'not_wired') return { type: 'not_wired', message: responseText(data.message, 'Command not yet wired.'),
        command: responseText(data.command), manualOnly: Boolean(data.manualOnly), reason: typeof data.reason === 'string' ? data.reason : null };
      if (data.type === 'debate_started' && typeof data.jobId === 'string' && data.jobId && typeof data.debateType === 'string') {
        return { type: 'debate_started', message: responseText(data.message), jobId: data.jobId, debateType: data.debateType };
      }
      return invalidCommand();
    } catch (error) {
      if (!isCurrent(operation)) return retiredCommand();
      currentPaywall(error, operation);
      if (!isCurrent(operation)) return retiredCommand();
      return { type: 'error', error: commandRequestErrorReceipt(error, COMMAND_TRANSPORT_FAILED) };
    } finally { finish(operation); }
  }, [begin, capture, currentPaywall, finish, isCurrent]);

  /**
   * @param renderedDigest proof that the caller displayed the STORED operation
   *   (card 1.1). ConfirmationSheet callers supply one. The direct hook remains
   *   a compatibility escape hatch for callers outside the shared sheet, which
   *   is why the server runs the check in `observe` mode until route parity is
   *   complete.
   *
   *   GATE — do not flip APPROVAL_RENDER_DIGEST=enforce until every confirm
   *   caller sends a digest, or a direct caller starts failing closed with
   *   `render_digest_required`. The Command Center log and surface docks now
   *   use ConfirmationSheet (digest ✓); remaining direct callers are a parity
   *   gate before enforcement.
   *
   * @param confirmChannel how the human actually confirmed — the M3 split.
   *   DELIBERATELY has no default. The server treats an undeclared channel as
   *   unproven and refuses anything identity-crossing, so a future caller that
   *   forgets this fails loudly instead of silently acquiring an authority it
   *   never declared. That is the whole reason the gate note above exists: this
   *   hook was already the caller that quietly lacked the OTHER proof.
   */
  // The server remains authoritative for digest and physical-confirmation rules.
  // Missing channel is forwarded as missing; this hook never invents a gesture.
  const confirmCommand = useCallback(async (
    operationId: string, renderedDigest?: string, confirmChannel?: 'tap' | 'keyboard' | 'voice',
  ): Promise<ConfirmResult> => {
    const token = capture();
    if (!token) return retiredConfirmation();
    if (typeof operationId !== 'string' || !operationId.trim()) return invalidConfirmation();
    const operation = begin(token);
    try {
      if (!isCurrent(operation)) return retiredConfirmation();
      const res = await apiService.post('/api/ai-command/confirm', { operationId, renderedDigest, confirmChannel },
        { signal: operation.controller.signal, _isBackgroundRequest: true } as never);
      if (!isCurrent(operation)) return retiredConfirmation();
      const data = res.data;
      if (!record(data)) return invalidConfirmation();
      if (data.success !== true) return { success: false, type: data.type === 'not_wired' ? 'not_wired' : 'error',
        message: responseText(data.message, responseText(data.error, 'The command was not confirmed.')),
        result: null, command: typeof data.command === 'string' ? data.command : undefined };
      if (data.type === 'frontend_dispatch') {
        if (typeof data.event !== 'string' || !data.event || !record(data.payload)) return invalidConfirmation();
        if (!isCurrent(operation)) return retiredConfirmation();
        const dispatched = dispatchAIWorkoutEvent(data.event, data.payload);
        if (!isCurrent(operation)) return retiredConfirmation();
        return { success: true, type: 'frontend_dispatch', message: frontendDispatchReceipt(data.event, dispatched, responseText(data.message)),
          result: { dispatched, event: data.event }, command: typeof data.command === 'string' ? data.command : undefined,
          event: data.event, payload: data.payload, dispatched };
      }
      if (!['executed', 'debate_started'].includes(data.type)) return invalidConfirmation();
      return { success: true, type: data.type, message: responseText(data.message), result: data.result ?? null,
        command: typeof data.command === 'string' ? data.command : undefined };
    } catch (error) {
      if (!isCurrent(operation)) return retiredConfirmation();
      currentPaywall(error, operation);
      if (!isCurrent(operation)) return retiredConfirmation();
      return { success: false, type: 'error', message: commandRequestErrorReceipt(error, 'Confirm request failed.'), result: null };
    } finally { finish(operation); }
  }, [begin, capture, currentPaywall, finish, isCurrent]);

  const cancelCommand = useCallback(async (operationId: string): Promise<void> => {
    const token = capture();
    if (!token || typeof operationId !== 'string' || !operationId.trim()) return;
    const operation = begin(token);
    try {
      if (!isCurrent(operation)) return;
      await apiService.post('/api/ai-command/cancel', { operationId },
        { signal: operation.controller.signal, _isBackgroundRequest: true } as never);
    } catch (error) { currentPaywall(error, operation); }
    finally { finish(operation); }
  }, [begin, capture, currentPaywall, finish, isCurrent]);

  const visible = authenticated && actorId !== null && isAllowedRawRole(rawRole)
    && (!binding || (observed?.enabled && observed.actorId === actorId && observed.rawRole === rawRole
      && audienceAllowedForActor(rawRole, observed.audienceRole)));
  return { executeCommand, confirmCommand, cancelCommand,
    executingCommand: Boolean(visible && busyScope === renderScope && executingCommand) };
}
