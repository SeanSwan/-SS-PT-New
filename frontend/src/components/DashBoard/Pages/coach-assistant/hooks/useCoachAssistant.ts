/**
 * Orchestrates Swan Coach chat plus command-lane receipts, confirmations,
 * frontend events, transcript intake, and food-context messages.
 *   sendMessage → executeCommand (POST /api/ai-command/execute)
 *     ├─ fallback_to_chat | error  → chat lane (sendMessageWithConversation)
 *     ├─ confirmation_required     → commandMessages (renders ConfirmationCard)
 *     ├─ executed                  → commandMessages (renders ExecutionResultCard)
 *     └─ debate_started            → commandMessages (info bubble)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAIChat } from '../../../../../hooks/useAIChat';
import { isCommandLaneCandidate } from '../../../../../hooks/aiMessageLimits';
import { useCoachCommand } from '../../../../../hooks/useCoachCommand';
import { DEFAULT_RESPONSE_STYLE, WELCOME_MESSAGE } from '../SwanCoachConstants';
import type { CoachContext, ResponseStyle, CoachMessageData } from '../SwanCoachTypes';
import type { CoachRouteContext } from '../CoachRouteContext';
import { safeCommandConfirmationFailure } from '../CoachIntakeOperationalText.logic';
import { commandResultSummary } from '../utils/coachCommandResultSummary';
import { buildCommandErrorMessages } from './useCoachAssistantCommandError';
import { useCoachAssistantFoodMessages } from './useCoachAssistantFoodMessages';
import { useCoachAssistantTranscriptMessages } from './useCoachAssistantTranscriptMessages';

interface UseCoachAssistantOptions {
  defaultContext?: CoachContext;
  defaultStyle?: ResponseStyle;
  chat?: ReturnType<typeof useAIChat>;
  targetClientId?: number | null;
  routeContext?: CoachRouteContext | null;
}

function buildRouteRequestContext(routeContext: CoachRouteContext | null) {
  if (!routeContext?.scheduledSessionId) return null;
  return {
    scheduledSessionId: routeContext.scheduledSessionId,
    ...(routeContext.scheduledSessionDate ? { scheduledSessionDate: routeContext.scheduledSessionDate } : {}),
    ...(routeContext.scheduledSessionCredits ? { scheduledSessionCredits: routeContext.scheduledSessionCredits } : {}),
  };
}

export function useCoachAssistant(options?: UseCoachAssistantOptions) {
  const {
    defaultContext = 'coach_assistant',
    defaultStyle = DEFAULT_RESPONSE_STYLE,
    chat: externalChat,
    targetClientId = null,
    routeContext = null,
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
        role: m.role as CoachMessageData['role'],
        content: m.content,
        timestamp: m.timestamp,
        metadata: m.metadata as CoachMessageData['metadata'],
      }))
    : localMessages;

  const allMessages = [...chatMessages, ...commandMessages];

  const messages: CoachMessageData[] = allMessages.length > 0
    ? allMessages
    : [{
        id: 'welcome',
        role: WELCOME_MESSAGE.role as CoachMessageData['role'],
        content: WELCOME_MESSAGE.content,
        timestamp: WELCOME_MESSAGE.timestamp,
      }];

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send message (command lane first, chat lane fallback) ──
  const sendMessage = useCallback(async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || chat.sending || executingCommand) return;

    let cmdResult: Awaited<ReturnType<typeof executeCommand>> | { type: 'fallback_to_chat' };
    if (isCommandLaneCandidate(trimmedText)) {
      cmdResult = await executeCommand(trimmedText, {
        selectedClientId: targetClientId,
        routeContext: routeContext as unknown as Record<string, unknown> | null,
      });
    } else {
      cmdResult = { type: 'fallback_to_chat' };
    }

    if (cmdResult.type === 'error') {
      setCommandMessages(prev => [...prev, ...buildCommandErrorMessages(trimmedText, cmdResult.error)]);
      setLocalMessages([]);
      return cmdResult;
    }

    if (cmdResult.type === 'fallback_to_chat') {
      const backendStyle = responseStyle;
      const routeRequestContext = buildRouteRequestContext(routeContext);
      const chatResult = routeRequestContext
        ? await chat.sendMessageWithConversation(
            trimmedText,
            context as Parameters<typeof chat.sendMessageWithConversation>[1],
            'Swan Coach Session',
            targetClientId,
            backendStyle as Parameters<typeof chat.sendMessageWithConversation>[4],
            null,
            routeRequestContext,
          )
        : await chat.sendMessageWithConversation(
            trimmedText,
            context as Parameters<typeof chat.sendMessageWithConversation>[1],
            'Swan Coach Session',
            targetClientId,
            backendStyle as Parameters<typeof chat.sendMessageWithConversation>[4],
          );
      setLocalMessages([]);
      return chatResult;
    }

    const userMsg: CoachMessageData = {
      id: `cmd-user-${Date.now()}`,
      role: 'user',
      content: trimmedText,
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
      return cmdResult;
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
      return cmdResult;
    }

    if (cmdResult.type === 'frontend_dispatch') {
      const cmdMsg: CoachMessageData = {
        id: `cmd-frontend-${Date.now()}`,
        role: 'assistant',
        content: cmdResult.dispatched
          ? cmdResult.message
          : 'I understood the form action, but this page is not ready to receive it.',
        timestamp: new Date().toISOString(),
      };
      setCommandMessages(prev => [...prev, userMsg, cmdMsg]);
      setLocalMessages([]);
      return cmdResult;
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
      return cmdResult;
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
      return cmdResult;
    }
  }, [chat, context, responseStyle, targetClientId, routeContext, executeCommand, executingCommand]);

  // ── Confirm a pending destructive/confirmation command ──
  const confirmCommand = useCallback(async (operationId: string): Promise<{ success: boolean; error?: string }> => {
    const result = await execConfirm(operationId);

    if (!result.success) {
      // Leave the confirmation card in place — don't upgrade to result card
      const safeBackendReceipt = result.type === 'not_wired' && result.message.includes('No data was changed.')
        ? result.message
        : null;
      return { success: false, error: safeBackendReceipt || safeCommandConfirmationFailure() };
    }

    setCommandMessages(prev => prev.map(msg => {
      if (msg.metadata?.commandConfirmation?.operationId !== operationId) return msg;
      const confirmation = msg.metadata.commandConfirmation!;
      const summary = result.type === 'frontend_dispatch' ? (result.message || 'Confirmed action sent to the active workout surface.')
        : commandResultSummary(confirmation.command, result.result, confirmation.client);
      return {
        ...msg,
        content: summary,
        metadata: {
          ...msg.metadata,
          commandConfirmation: undefined,
          commandResult: {
            command: confirmation.command,
            result: result.result,
            client: confirmation.client,
            message: summary,
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

  const {
    appendTranscriptReview,
    updateTranscriptReview,
    transcriptReviewToResult,
    removeTranscriptMessages,
    appendTranscriptError,
    appendAudioIntakeReceipt,
  } = useCoachAssistantTranscriptMessages(setCommandMessages);

  const { sendMessageWithFood } = useCoachAssistantFoodMessages({ chat, responseStyle, targetClientId, setLocalMessages });

  const switchContext = useCallback((newContext: CoachContext) => {
    setContext(newContext);
    if (chat.activeConversation) {
      chat.newChat();
      setLocalMessages([]);
      setCommandMessages([]);
    }
  }, [chat]);

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
    lastErrorCode: chat.lastErrorCode,
    lastErrorRetryable: chat.lastErrorRetryable,
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
    // Swan-first transcript intake helpers for SwanCoachAssistantPage.
    appendTranscriptReview,
    updateTranscriptReview,
    transcriptReviewToResult,
    removeTranscriptMessages,
    appendTranscriptError,
    appendAudioIntakeReceipt,
  };
}
