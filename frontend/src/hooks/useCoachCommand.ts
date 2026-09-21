/**
 * ============================================================================
 * FILE: useCoachCommand.ts
 * PURPOSE: Command lane hook — wraps /api/ai-command/* endpoints
 * OWNER: Claude Sonnet 4.6 | LAST MODIFIED: 2026-09-20
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
 * PRIVACY: `selectedClientId` crosses the boundary as an ID only. The client also posts
 * `message`, `previousContext` and `routeContext` as free text (`:117-121`).
 *
 * No PII middleware covers this route. Verified twice: at the route's own guard list
 * (`aiCommandRoutes.mjs:119` — `protect, aiCommandLaneKillSwitch, aiCommandRateLimiter`
 * only) and at its mount (`core/routes.mjs:642` — no parent PII middleware; every
 * `app.use` there is a path-scoped route mount). `piiSanitizationMiddleware` is imported by
 * `aiChatRoutes.mjs` (the chat lane), NOT by the command lane.
 *
 * The pipeline (`commandExecutor.mjs` PIPELINE_STEPS :516-520) runs `stepSanitize` →
 * `stepPHIScan` → `stepClassify`, and `stepPHIScan` (:190-206) scans and strips
 * **`ctx.sanitizedInput` ONLY — i.e. `message`**. It does NOT cover `previousContext`, which
 * `aiCommandRoutes.mjs:166` passes through raw and `intentClassifier.mjs:123-125`
 * interpolates into the provider prompt. **PHI placed in `previousContext` therefore reaches
 * a provider unscanned.** Tracked as R2-01. The other two context fields are bounded:
 * `routeContext` is normalized to a token allowlist server-side (`normalizeRouteContext`
 * `:88-110`), and `selectedClientName` is hardcoded `null` (`:164`), so neither is a live
 * text channel.
 *
 * Detection is PARTIAL and must not be read as a guarantee. `scanForPHI` collects only the
 * FIRST match per pattern (`text.match` without `/g`), so a second distinct identifier is
 * never enumerated and survives `stripPHI` — measured `"a 123-45-6789 b 987-65-4321 c"` →
 * only the first is redacted. And a client name plus a symptom is not detected at all —
 * measured `"log a workout for Jordan T., knee felt bad"` → `hasPHI: false`. The `scanForPHI`
 * at `intentClassifier.mjs:175` is a re-check with the SAME detector on the chat-fallback
 * path, not an independent gate.
 *
 * Audit storage IS redacted (`commandAudit.redactParams`, `commandAudit.mjs:41`).
 *
 * This note has now been wrong TWICE — first claiming no names are sent, then claiming PHI
 * is removed from the assembled provider request. Do not restate this file's privacy posture
 * without re-measuring it. Findings: R2-01, R2-02 in
 * docs/ai-workflow/AI-HANDOFF/BLUEPRINT-coach-cc-ai-harness-2026-09-20/.
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
  type: 'executed' | 'error' | 'not_wired' | 'frontend_dispatch';
  message: string;
  /** Execution result from the service (renamed from data — matches executeConfirmedOperation shape) */
  result: Record<string, unknown> | null;
  command?: string;
  event?: string;
  payload?: Record<string, unknown>;
  dispatched?: boolean;
}

const frontendDispatchReceipt = (event: string, dispatched: boolean, fallback: string): string => {
  if (dispatched) return fallback || 'Sent to the active workout surface.';
  if (event === 'AI_SUBMIT_WORKOUT') return 'No active Workout Logger was open. No workout was submitted.';
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
    },
  ): Promise<CommandResponse> => {
    setExecutingCommand(true);
    try {
      const res = await apiService.post('/api/ai-command/execute', {
        message,
        selectedClientId: opts?.selectedClientId ?? undefined,
        previousContext: opts?.previousContext ?? undefined,
        routeContext: opts?.routeContext ?? undefined,
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
        error: commandRequestErrorReceipt(
          error,
          'Command request failed. Please check your connection and try again.'
        ),
      };
    } finally {
      setExecutingCommand(false);
    }
  }, []);

  const confirmCommand = useCallback(async (operationId: string): Promise<ConfirmResult> => {
    try {
      const res = await apiService.post('/api/ai-command/confirm', { operationId });
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
