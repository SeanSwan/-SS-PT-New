/**
 * Pure message helpers for useCoachAssistant.
 *
 * Keeps the main hook focused on orchestration while preserving the existing
 * chat-lane, command-lane, welcome-message, and scheduled-session contracts.
 */

import { WELCOME_MESSAGE } from '../SwanCoachConstants';
import type { CoachMessageData } from '../SwanCoachTypes';
import type { CoachRouteContext } from '../CoachRouteContext';
import type { CommandResponse } from '../../../../../hooks/useCoachCommand';
import { commandResultSummary } from '../utils/coachCommandResultSummary';

interface CoachAssistantChatSnapshot {
  activeConversation?: {
    id: string | number;
    messages?: Array<{
      role: string;
      content: string;
      timestamp: string;
      metadata?: unknown;
    }>;
  } | null;
}

export function buildRouteRequestContext(routeContext: CoachRouteContext | null) {
  if (!routeContext) return null;
  const requestContext = {
    ...(routeContext.source ? { source: routeContext.source } : {}),
    ...(routeContext.intent ? { intent: routeContext.intent } : {}),
    ...(routeContext.workoutDate ? { workoutDate: routeContext.workoutDate } : {}),
    ...(routeContext.scheduledSessionId ? { scheduledSessionId: routeContext.scheduledSessionId } : {}),
    ...(routeContext.scheduledSessionDate ? { scheduledSessionDate: routeContext.scheduledSessionDate } : {}),
    ...(routeContext.scheduledSessionCredits ? { scheduledSessionCredits: routeContext.scheduledSessionCredits } : {}),
  };
  return Object.keys(requestContext).length ? requestContext : null;
}

export function buildCoachAssistantMessages(
  chat: CoachAssistantChatSnapshot,
  localMessages: CoachMessageData[],
  commandMessages: CoachMessageData[],
): CoachMessageData[] {
  const chatMessages: CoachMessageData[] = chat.activeConversation?.messages?.length
    ? chat.activeConversation.messages.map((message, index) => ({
      id: `${chat.activeConversation!.id}-${index}`,
      role: message.role as CoachMessageData['role'],
      content: message.content,
      timestamp: message.timestamp,
      metadata: message.metadata as CoachMessageData['metadata'],
    }))
    : localMessages;

  const allMessages = [...chatMessages, ...commandMessages];
  return allMessages.length > 0 ? allMessages : [{
    id: 'welcome',
    role: WELCOME_MESSAGE.role as CoachMessageData['role'],
    content: WELCOME_MESSAGE.content,
    timestamp: WELCOME_MESSAGE.timestamp,
  }];
}

/**
 * Maps a resolved command-lane result to the [user message, coach reply]
 * pair appended to commandMessages. Returns null for lanes the caller
 * handles itself (fallback_to_chat, error). Extracted from
 * useCoachAssistant.sendMessage (rule 4 file-size cap, B1a 2026-06-10) —
 * the message shapes are unchanged.
 */
export function buildCommandLaneMessages(
  trimmedText: string,
  cmdResult: CommandResponse,
): CoachMessageData[] | null {
  if (cmdResult.type === 'fallback_to_chat' || cmdResult.type === 'error') return null;

  const userMsg: CoachMessageData = {
    id: `cmd-user-${Date.now()}`,
    role: 'user',
    content: trimmedText,
    timestamp: new Date().toISOString(),
  };

  if (cmdResult.type === 'confirmation_required') {
    return [userMsg, {
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
    }];
  }

  if (cmdResult.type === 'executed') {
    return [userMsg, {
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
    }];
  }

  if (cmdResult.type === 'frontend_dispatch') {
    return [userMsg, {
      id: `cmd-frontend-${Date.now()}`,
      role: 'assistant',
      content: cmdResult.dispatched
        ? cmdResult.message
        : 'I understood the form action, but this page is not ready to receive it.',
      timestamp: new Date().toISOString(),
    }];
  }

  if (cmdResult.type === 'debate_started') {
    return [userMsg, {
      id: `cmd-debate-${Date.now()}`,
      role: 'assistant',
      content: cmdResult.message,
      timestamp: new Date().toISOString(),
    }];
  }

  if (cmdResult.type === 'not_wired') {
    return [userMsg, {
      id: `cmd-notwired-${Date.now()}`,
      role: 'assistant',
      content: cmdResult.message,
      timestamp: new Date().toISOString(),
    }];
  }

  return null;
}

/**
 * B1a optimistic echo: append the in-flight user message unless an
 * equivalent echo already landed. The chat lane adds its own optimistic
 * user message once the conversation exists, and the lane merge places
 * chat messages BEFORE command messages — so the landed echo may sit
 * mid-list, not last. Dedup therefore matches any user message with the
 * same content stamped at/after the pending echo (older identical sends
 * have earlier timestamps and never suppress a fresh echo).
 */
export function appendPendingEcho(
  messages: CoachMessageData[],
  pendingEcho: CoachMessageData | null,
): CoachMessageData[] {
  if (!pendingEcho) return messages;
  const echoAlreadyLanded = messages.some(
    (m) =>
      m.role === 'user' &&
      m.content === pendingEcho.content &&
      m.timestamp >= pendingEcho.timestamp,
  );
  if (echoAlreadyLanded) return messages;
  return [...messages, pendingEcho];
}
