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
import { DEFAULT_RESPONSE_STYLE } from '../SwanCoachConstants';
import type { CoachContext, ResponseStyle, CoachMessageData } from '../SwanCoachTypes';
import type { CoachRouteContext } from '../CoachRouteContext';
import { safeCommandConfirmationFailure } from '../CoachIntakeOperationalText.logic';
import { commandResultSummary } from '../utils/coachCommandResultSummary';
import { buildCommandErrorMessages } from './useCoachAssistantCommandError';
import { useCoachAssistantFoodMessages } from './useCoachAssistantFoodMessages';
import {
  appendPendingEcho,
  buildCoachAssistantMessages,
  buildCommandLaneMessages,
  buildRouteRequestContext,
} from './useCoachAssistantMessageUtils';
import { useCoachAssistantTranscriptMessages } from './useCoachAssistantTranscriptMessages';

interface UseCoachAssistantOptions {
  defaultContext?: CoachContext;
  defaultStyle?: ResponseStyle;
  chat?: ReturnType<typeof useAIChat>;
  targetClientId?: number | null;
  routeContext?: CoachRouteContext | null;
}

function positiveTargetClientId(value?: number | string | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
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
  const selectedTargetClientId = positiveTargetClientId(targetClientId);
  const activeThreadTargetClientId = positiveTargetClientId(chat.activeConversation?.targetUserId);
  const effectiveTargetClientId = selectedTargetClientId ?? activeThreadTargetClientId;
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
  // B1a: in-flight user message echoed instantly. The command lane only
  // appends the user bubble after executeCommand resolves, and the chat
  // lane's new-conversation path echoes only after the create POST — both
  // left a dead gap where the user's words were invisible.
  const [pendingEcho, setPendingEcho] = useState<CoachMessageData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ── Merge chat-lane messages with command-lane messages ──
  const messages = appendPendingEcho(
    buildCoachAssistantMessages(chat, localMessages, commandMessages),
    pendingEcho,
  );

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    if (messages.length === 1 && messages[0]?.id === 'welcome') return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messages.length]);

  // ── Send message (command lane first, chat lane fallback) ──
  const sendMessage = useCallback(async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || chat.sending || executingCommand) return;

    // B1a: echo the user's words instantly (<100ms acknowledgement);
    // cleared in finally once the real user message has landed in the
    // command lane or chat lane (appendPendingEcho dedups the overlap).
    setPendingEcho({
      id: `pending-echo-${Date.now()}`,
      role: 'user',
      content: trimmedText,
      timestamp: new Date().toISOString(),
    });

    try {
      let cmdResult: Awaited<ReturnType<typeof executeCommand>> | { type: 'fallback_to_chat' };
      if (isCommandLaneCandidate(trimmedText)) {
        cmdResult = await executeCommand(trimmedText, {
          selectedClientId: effectiveTargetClientId,
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
              effectiveTargetClientId,
              backendStyle as Parameters<typeof chat.sendMessageWithConversation>[4],
              null,
              routeRequestContext,
            )
          : await chat.sendMessageWithConversation(
              trimmedText,
              context as Parameters<typeof chat.sendMessageWithConversation>[1],
              'Swan Coach Session',
              effectiveTargetClientId,
              backendStyle as Parameters<typeof chat.sendMessageWithConversation>[4],
            );
        setLocalMessages([]);
        return chatResult;
      }

      // Confirmation / executed / frontend_dispatch / debate / not_wired:
      // shared [userMsg, reply] mapping lives in the message utils.
      const laneMessages = buildCommandLaneMessages(trimmedText, cmdResult);
      if (laneMessages) {
        setCommandMessages(prev => [...prev, ...laneMessages]);
        setLocalMessages([]);
        return cmdResult;
      }
    } finally {
      setPendingEcho(null);
    }
  }, [chat, context, responseStyle, effectiveTargetClientId, routeContext, executeCommand, executingCommand]);

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
        : result.type === 'debate_started' ? (result.message || 'Workout plan debate started.')
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

  const { sendMessageWithFood } = useCoachAssistantFoodMessages({
    chat,
    responseStyle,
    targetClientId: effectiveTargetClientId,
    setLocalMessages,
  });

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
