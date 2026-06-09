/**
 * Pure message helpers for useCoachAssistant.
 *
 * Keeps the main hook focused on orchestration while preserving the existing
 * chat-lane, command-lane, welcome-message, and scheduled-session contracts.
 */

import { WELCOME_MESSAGE } from '../SwanCoachConstants';
import type { CoachMessageData } from '../SwanCoachTypes';
import type { CoachRouteContext } from '../CoachRouteContext';

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
  if (!routeContext?.scheduledSessionId) return null;
  return {
    scheduledSessionId: routeContext.scheduledSessionId,
    ...(routeContext.scheduledSessionDate ? { scheduledSessionDate: routeContext.scheduledSessionDate } : {}),
    ...(routeContext.scheduledSessionCredits ? { scheduledSessionCredits: routeContext.scheduledSessionCredits } : {}),
  };
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
