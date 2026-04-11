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

const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.PROD ? '' : 'http://localhost:10000');

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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
  | { type: 'not_wired'; message: string; command: string }
  | { type: 'debate_started'; message: string; jobId: string; debateType: string }
  | { type: 'error'; error: string };

export interface ConfirmResult {
  success: boolean;
  message: string;
  /** Execution result from the service (renamed from data — matches executeConfirmedOperation shape) */
  result: Record<string, unknown> | null;
  command?: string;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useCoachCommand() {
  const [executingCommand, setExecutingCommand] = useState(false);

  const executeCommand = useCallback(async (
    message: string,
    opts?: { selectedClientId?: number | null; previousContext?: string },
  ): Promise<CommandResponse> => {
    setExecutingCommand(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai-command/execute`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          message,
          selectedClientId: opts?.selectedClientId ?? undefined,
          previousContext: opts?.previousContext ?? undefined,
        }),
      });
      const data = await res.json();

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

      if (data.type === 'not_wired') {
        return { type: 'not_wired', message: data.message ?? 'Command not yet wired.', command: data.command ?? '' };
      }

      if (data.type === 'debate_started') {
        return { type: 'debate_started', message: data.message, jobId: data.jobId, debateType: data.debateType };
      }

      // chat / clarification_needed — both are chat fallbacks
      return { type: 'fallback_to_chat' };
    } catch {
      return { type: 'error', error: 'Network error. Falling back to chat.' };
    } finally {
      setExecutingCommand(false);
    }
  }, []);

  const confirmCommand = useCallback(async (operationId: string): Promise<ConfirmResult> => {
    try {
      const res = await fetch(`${API_BASE}/api/ai-command/confirm`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ operationId }),
      });
      const data = await res.json();
      return {
        success: !!data.success,
        message: data.message || '',
        result: data.result ?? null,
        command: data.command ?? undefined,
      };
    } catch {
      return { success: false, message: 'Confirm request failed.', result: null };
    }
  }, []);

  const cancelCommand = useCallback(async (operationId: string): Promise<void> => {
    try {
      await fetch(`${API_BASE}/api/ai-command/cancel`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ operationId }),
      });
    } catch {
      // best-effort — operation will expire server-side in 120 s anyway
    }
  }, []);

  return { executeCommand, confirmCommand, cancelCommand, executingCommand };
}
