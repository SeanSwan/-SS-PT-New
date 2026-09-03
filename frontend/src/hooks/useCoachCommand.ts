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

import { useState, useCallback } from 'react';
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
  | { type: 'error'; error: string };

export interface ConfirmResult {
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

export function useCoachCommand() {
  const [executingCommand, setExecutingCommand] = useState(false);

  const executeCommand = useCallback(async (
    message: string,
    opts?: {
      selectedClientId?: number | null;
      previousContext?: string;
      routeContext?: Record<string, unknown> | null;
      /** Active surface for intent disambiguation (planner / logger / CC-3 dock surfaces). */
      surface?: 'workout-planner' | 'workout-logger' | 'bootcamp-builder' | 'pain-chart';
    },
  ): Promise<CommandResponse> => {
    setExecutingCommand(true);
    try {
      const res = await apiService.post('/api/ai-command/execute', {
        message,
        selectedClientId: opts?.selectedClientId ?? undefined,
        previousContext: opts?.previousContext ?? undefined,
        // Surface rides the existing allowlisted routeContext token channel
        // (aiCommandRoutes normalizeRouteContext → intent surface remap).
        routeContext: opts?.surface
          ? { ...(opts?.routeContext ?? {}), surface: opts.surface }
          : opts?.routeContext ?? undefined,
      });
      const data = res.data;

      if (!data.success) return { type: 'error', error: data.error || 'Command failed' };

      if (data.fallbackToChat) return { type: 'fallback_to_chat' };

      if (data.type === 'confirmation_required') {
        return {
          type: 'confirmation_required',
          message: data.message,
          operationId: data.operationId ?? null,
          command: data.command ?? '',
          params: data.params ?? {},
          client: data.client ?? null,
          details: data.details ?? null,
          expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : undefined,
          isDestructive: !!(data.isDestructive),
        };
      }

      if (data.type === 'executed') {
        return { type: 'executed', command: data.command ?? '', result: data.result ?? null, client: data.client ?? null };
      }

      if (data.type === 'frontend_dispatch') {
        const event = data.event ?? '';
        const payload = data.payload ?? {};
        const dispatched = event ? dispatchAIWorkoutEvent(event, payload) : false;
        return {
          type: 'frontend_dispatch',
          message: frontendDispatchReceipt(event, dispatched, data.message ?? 'Sent to the workout form.'),
          command: data.command ?? '',
          event,
          payload,
          dispatched,
        };
      }

      if (data.type === 'not_wired') {
        return {
          type: 'not_wired',
          message: data.message ?? 'Command not yet wired.',
          command: data.command ?? '',
          manualOnly: !!data.manualOnly,
          reason: data.reason ?? null,
        };
      }

      if (data.type === 'debate_started') {
        return { type: 'debate_started', message: data.message, jobId: data.jobId, debateType: data.debateType };
      }

      // chat / clarification_needed — both are chat fallbacks
      return { type: 'fallback_to_chat' };
    } catch (error) {
      return {
        type: 'error',
        error: commandRequestErrorReceipt(error, COMMAND_TRANSPORT_FAILED),
      };
    } finally {
      setExecutingCommand(false);
    }
  }, []);

  /**
   * @param renderedDigest proof that the caller displayed the STORED operation
   *   (card 1.1). ConfirmationSheet always supplies one. The Command Center's
   *   legacy transcript card does not yet, which is why the server runs the
   *   check in `observe` mode.
   *
   *   GATE — do not flip APPROVAL_RENDER_DIGEST=enforce until every confirm
   *   caller sends a digest, or the legacy path starts failing closed with
   *   `render_digest_required`. Callers today: ConfirmationSheet (digest ✓) and
   *   CoachCommandLogEntry via the transcript ConfirmationCard (digest ✗).
   */
  const confirmCommand = useCallback(async (
    operationId: string,
    renderedDigest?: string,
  ): Promise<ConfirmResult> => {
    try {
      const res = await apiService.post('/api/ai-command/confirm', { operationId, renderedDigest });
      const data = res.data;
      if (data.type === 'frontend_dispatch') {
        const event = data.event ?? '';
        const payload = data.payload ?? {};
        const dispatched = event ? dispatchAIWorkoutEvent(event, payload) : false;
        const message = frontendDispatchReceipt(event, dispatched, data.message || '');
        return {
          success: !!data.success,
          type: 'frontend_dispatch',
          message,
          result: { dispatched, event },
          command: data.command ?? undefined,
          event,
          payload,
          dispatched,
        };
      }
      return {
        success: !!data.success,
        type: data.type ?? (data.success ? 'executed' : 'error'),
        message: data.message || '',
        result: data.result ?? null,
        command: data.command ?? undefined,
      };
    } catch (error) {
      return {
        success: false,
        type: 'error',
        message: commandRequestErrorReceipt(error, 'Confirm request failed.'),
        result: null,
      };
    }
  }, []);

  const cancelCommand = useCallback(async (operationId: string): Promise<void> => {
    try {
      await apiService.post('/api/ai-command/cancel', { operationId });
    } catch {
      // best-effort — operation will expire server-side in 120 s anyway
    }
  }, []);

  return { executeCommand, confirmCommand, cancelCommand, executingCommand };
}
