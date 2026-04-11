/**
 * ============================================================================
 * FILE: useCoachAssistant.ts
 * PURPOSE: Orchestration hook for Swan Studios Coach Assistant
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-09
 * AI VILLAGE VALIDATED: 2026-03-30
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Wraps useAIChat with Coach Assistant-specific logic.
 * Sprint A: Routes messages through the command lane first. Falls back to the
 * chat lane for conversational queries. Exposes confirmCommand / cancelCommand
 * for inline confirmation cards.
 *
 * LANE ROUTING:
 *   sendMessage → executeCommand (POST /api/ai-command/execute)
 *     ├─ fallback_to_chat | error  → chat lane (sendMessageWithConversation)
 *     ├─ confirmation_required     → commandMessages (renders ConfirmationCard)
 *     ├─ executed                  → commandMessages (renders ExecutionResultCard)
 *     └─ debate_started            → commandMessages (info bubble)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAIChat } from '../../../../../hooks/useAIChat';
import { useCoachCommand } from '../../../../../hooks/useCoachCommand';
import { DEFAULT_RESPONSE_STYLE, WELCOME_MESSAGE } from '../SwanCoachConstants';
import type { CoachContext, ResponseStyle, CoachMessageData } from '../SwanCoachTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Human-readable result summaries
// PURPOSE: Replace machine "Done: log_workout" with real copy.
//          Only describe what we actually know — never invent values.
// ─────────────────────────────────────────────────────────────
function commandResultSummary(
  command: string,
  result: Record<string, unknown> | null,
  client: { id?: number; firstName?: string } | null,
): string {
  const r = result ?? {};
  const forClient = client?.firstName ? ` for ${client.firstName}` : '';
  switch (command) {
    case 'log_workout': {
      const count = typeof r.exerciseCount === 'number' ? ` ${r.exerciseCount} exercise(s),` : '';
      const sets = typeof r.totalSets === 'number' ? ` ${r.totalSets} sets.` : '.';
      const xp = typeof r.xpAwarded === 'number' ? ` +${r.xpAwarded} XP.` : '';
      return `Workout logged${forClient}.${count}${sets}${xp}`;
    }
    case 'log_meals': {
      const cal = r.calories != null ? `${r.calories} kcal` : null;
      const prot = r.protein != null ? `${r.protein}g protein` : null;
      const detail = [cal, prot].filter(Boolean).join(', ');
      return `Meal logged.${detail ? ' ' + detail + '.' : ''}`;
    }
    case 'create_client':
      // Specialized clientCreateResult card handles this — no plain-text needed.
      return 'Client created.';
    case 'view_workout_history': {
      const count = typeof r.count === 'number' ? r.count : 0;
      const last = typeof r.lastSessionDate === 'string' ? ` Last: ${r.lastSessionDate}.` : '';
      const title = typeof r.recentTitle === 'string' ? ` "${r.recentTitle}"` : '';
      return `${count} recent session${count !== 1 ? 's' : ''}${forClient}.${last}${title}`;
    }
    case 'create_hermes_task': {
      const agent = typeof r.agentType === 'string' ? r.agentType : 'agent';
      const id = typeof r.taskId === 'string' ? ` (${r.taskId.slice(0, 8)}…)` : '';
      return `Task queued for ${agent} agent${id}.`;
    }
    case 'list_hermes_tasks': {
      const count = typeof r.count === 'number' ? r.count : 0;
      const pending = typeof r.pending === 'number' ? r.pending : 0;
      return `${count} Hermes task${count !== 1 ? 's' : ''} found — ${pending} pending.`;
    }
    default: {
      if (command.startsWith('navigate_') || command.startsWith('scan_command')) {
        const dest = typeof r.destination === 'string' ? r.destination : command.replace(/_/g, ' ');
        return `Navigated to ${dest}.`;
      }
      if (command.startsWith('view_')) {
        return `${command.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} loaded.`;
      }
      return `${command.replace(/_/g, ' ')} completed.`;
    }
  }
}

interface UseCoachAssistantOptions {
  defaultContext?: CoachContext;
  defaultStyle?: ResponseStyle;
  /** Pass an external useAIChat instance to share state with the page */
  chat?: ReturnType<typeof useAIChat>;
  /** Target client ID for trainer/admin — routes AI data writes to this client */
  targetClientId?: number | null;
}

export function useCoachAssistant(options?: UseCoachAssistantOptions) {
  const {
    defaultContext = 'coach_assistant',
    defaultStyle = DEFAULT_RESPONSE_STYLE,
    chat: externalChat,
    targetClientId = null,
  } = options || {};

  const internalChat = useAIChat();
  const chat = externalChat || internalChat;
  const {
    executeCommand,
    confirmCommand: execConfirm,
    cancelCommand: execCancel,
    executingCommand,
  } = useCoachCommand();

  const [context, setContext] = useState<CoachContext>(defaultContext);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>(defaultStyle);
  const [localMessages, setLocalMessages] = useState<CoachMessageData[]>([]);
  const [commandMessages, setCommandMessages] = useState<CoachMessageData[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ── Merge chat-lane messages with command-lane messages ──
  const chatMessages: CoachMessageData[] = chat.activeConversation?.messages?.length
    ? chat.activeConversation.messages.map((m, i) => ({
        id: `${chat.activeConversation!.id}-${i}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        metadata: m.metadata,
      }))
    : localMessages;

  const allMessages = [...chatMessages, ...commandMessages];

  const messages: CoachMessageData[] = allMessages.length > 0
    ? allMessages
    : [{
        id: 'welcome',
        role: WELCOME_MESSAGE.role,
        content: WELCOME_MESSAGE.content,
        timestamp: WELCOME_MESSAGE.timestamp,
      }];

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send message (command lane first, chat lane fallback) ──
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || chat.sending || executingCommand) return;

    const cmdResult = await executeCommand(text.trim(), { selectedClientId: targetClientId });

    if (cmdResult.type === 'fallback_to_chat' || cmdResult.type === 'error') {
      // Route to chat lane as normal
      const backendStyle = responseStyle === 'balanced' ? 'both' : responseStyle;
      await chat.sendMessageWithConversation(
        text.trim(),
        context as Parameters<typeof chat.sendMessageWithConversation>[1],
        'Swan Coach Session',
        targetClientId,
        backendStyle as Parameters<typeof chat.sendMessageWithConversation>[4]
      );
      setLocalMessages([]);
      return;
    }

    // Command lane handled — inject messages into commandMessages
    const userMsg: CoachMessageData = {
      id: `cmd-user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    if (cmdResult.type === 'confirmation_required') {
      const cmdMsg: CoachMessageData = {
        id: `cmd-confirm-${Date.now()}`,
        role: 'assistant',
        content: cmdResult.message,
        timestamp: new Date().toISOString(),
        metadata: {
          commandConfirmation: {
            message: cmdResult.message,
            operationId: cmdResult.operationId,
            command: cmdResult.command,
            params: cmdResult.params,
            client: cmdResult.client,
            details: cmdResult.details,
            isDestructive: cmdResult.isDestructive,
          },
        },
      };
      setCommandMessages(prev => [...prev, userMsg, cmdMsg]);
      setLocalMessages([]);
      return;
    }

    if (cmdResult.type === 'executed') {
      const cmdMsg: CoachMessageData = {
        id: `cmd-result-${Date.now()}`,
        role: 'assistant',
        content: commandResultSummary(cmdResult.command, cmdResult.result, cmdResult.client),
        timestamp: new Date().toISOString(),
        metadata: {
          commandResult: {
            command: cmdResult.command,
            result: cmdResult.result,
            client: cmdResult.client,
          },
        },
      };
      setCommandMessages(prev => [...prev, userMsg, cmdMsg]);
      setLocalMessages([]);
      return;
    }

    if (cmdResult.type === 'debate_started') {
      const cmdMsg: CoachMessageData = {
        id: `cmd-debate-${Date.now()}`,
        role: 'assistant',
        content: cmdResult.message,
        timestamp: new Date().toISOString(),
      };
      setCommandMessages(prev => [...prev, userMsg, cmdMsg]);
      setLocalMessages([]);
      return;
    }

    if (cmdResult.type === 'not_wired') {
      const cmdMsg: CoachMessageData = {
        id: `cmd-notwired-${Date.now()}`,
        role: 'assistant',
        content: cmdResult.message,
        timestamp: new Date().toISOString(),
      };
      setCommandMessages(prev => [...prev, userMsg, cmdMsg]);
      setLocalMessages([]);
    }
  }, [chat, context, responseStyle, targetClientId, executeCommand]);

  // ── Confirm a pending destructive/confirmation command ──
  const confirmCommand = useCallback(async (operationId: string): Promise<{ success: boolean; error?: string }> => {
    const result = await execConfirm(operationId);

    if (!result.success) {
      // Leave the confirmation card in place — don't upgrade to result card
      return { success: false, error: result.message };
    }

    setCommandMessages(prev => prev.map(msg => {
      if (msg.metadata?.commandConfirmation?.operationId !== operationId) return msg;
      return {
        ...msg,
        content: result.message,
        metadata: {
          ...msg.metadata,
          commandConfirmation: undefined,
          commandResult: {
            command: msg.metadata.commandConfirmation!.command,
            result: result.result,
            client: msg.metadata.commandConfirmation!.client,
            message: result.message,
          },
        },
      };
    }));
    return { success: true };
  }, [execConfirm]);

  // ── Cancel a pending command ──
  const cancelCommand = useCallback(async (operationId: string | null) => {
    if (operationId) await execCancel(operationId);
    setCommandMessages(prev =>
      prev.filter(msg => msg.metadata?.commandConfirmation?.operationId !== operationId)
    );
  }, [execCancel]);

  // ── Send message with structured food context ──
  const sendMessageWithFood = useCallback(async (
    text: string,
    foodContext: Record<string, unknown>,
  ) => {
    if (!text.trim() || chat.sending) return null;
    const backendStyle = responseStyle === 'balanced' ? 'both' : responseStyle;
    const result = await chat.sendMessageWithConversation(
      text.trim(),
      'macro_logging' as Parameters<typeof chat.sendMessageWithConversation>[1],
      'Nutrition Coach',
      targetClientId,
      backendStyle as Parameters<typeof chat.sendMessageWithConversation>[4],
      foodContext,
    );
    setLocalMessages([]);
    return result;
  }, [chat, responseStyle, targetClientId]);

  // ── Switch context ──
  const switchContext = useCallback((newContext: CoachContext) => {
    setContext(newContext);
    if (chat.activeConversation) {
      chat.newChat();
      setLocalMessages([]);
      setCommandMessages([]);
    }
  }, [chat]);

  // ── Clear conversation ──
  const clearConversation = useCallback(() => {
    chat.newChat();
    setLocalMessages([]);
    setCommandMessages([]);
  }, [chat]);

  return {
    messages,
    sending: chat.sending || executingCommand,
    loading: chat.loading,
    error: chat.error,
    context,
    responseStyle,
    setResponseStyle,
    switchContext,
    sendMessage,
    sendMessageWithFood,
    confirmCommand,
    cancelCommand,
    clearConversation,
    clearError: chat.clearError,
    messagesEndRef,
  };
}
