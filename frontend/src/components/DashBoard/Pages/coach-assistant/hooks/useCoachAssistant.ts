/**
 * ============================================================================
 * FILE: useCoachAssistant.ts
 * PURPOSE: Orchestration hook for Swan Studios Coach Assistant
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * AI VILLAGE VALIDATED: 2026-03-30
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Wraps useAIChat with Coach Assistant-specific logic:
 * context switching, response style management, voice I/O coordination,
 * and auto-scrolling.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAIChat } from '../../../../../hooks/useAIChat';
import { DEFAULT_RESPONSE_STYLE, WELCOME_MESSAGE } from '../SwanCoachConstants';
import type { CoachContext, ResponseStyle, CoachMessageData } from '../SwanCoachTypes';

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
  const [context, setContext] = useState<CoachContext>(defaultContext);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>(defaultStyle);
  const [localMessages, setLocalMessages] = useState<CoachMessageData[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasInitRef = useRef(false);

  // ── Sync messages from useAIChat ──
  const messages: CoachMessageData[] = chat.activeConversation?.messages?.length
    ? chat.activeConversation.messages.map((m, i) => ({
        id: `${chat.activeConversation!.id}-${i}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        metadata: m.metadata,
      }))
    : localMessages.length
      ? localMessages
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

  // ── Send message ──
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || chat.sending) return;

    // Map 'balanced' to 'both' for backend compatibility
    const backendStyle = responseStyle === 'balanced' ? 'both' : responseStyle;

    // Use sendMessageWithConversation which atomically creates + sends
    // This avoids the stale closure bug where createConversation sets
    // activeConversation but sendMessage still sees null from its closure
    await chat.sendMessageWithConversation(
      text.trim(),
      context as Parameters<typeof chat.sendMessageWithConversation>[1],
      'Swan Coach Session',
      targetClientId,
      backendStyle as Parameters<typeof chat.sendMessageWithConversation>[4]
    );

    // Clear local messages once real ones come in
    setLocalMessages([]);
  }, [chat, context, responseStyle, targetClientId]);

  // ── Switch context ──
  const switchContext = useCallback((newContext: CoachContext) => {
    setContext(newContext);
    // Start a new conversation with the new context on next message
    if (chat.activeConversation) {
      chat.newChat();
      setLocalMessages([]);
    }
  }, [chat]);

  // ── Clear conversation ──
  const clearConversation = useCallback(() => {
    chat.newChat();
    setLocalMessages([]);
  }, [chat]);

  return {
    messages,
    sending: chat.sending,
    loading: chat.loading,
    error: chat.error,
    context,
    responseStyle,
    setResponseStyle,
    switchContext,
    sendMessage,
    clearConversation,
    clearError: chat.clearError,
    messagesEndRef,
  };
}
