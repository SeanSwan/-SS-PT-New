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
}

export function useCoachAssistant(options?: UseCoachAssistantOptions) {
  const {
    defaultContext = 'coach_assistant',
    defaultStyle = DEFAULT_RESPONSE_STYLE,
  } = options || {};

  const chat = useAIChat();
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

    // Optimistic user message
    const userMsg: CoachMessageData = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setLocalMessages(prev => [...prev, userMsg]);

    try {
      // Create conversation if needed
      if (!chat.activeConversation) {
        // Map 'balanced' to 'both' for backend compatibility until backend supports 'balanced'
        const backendStyle = responseStyle === 'balanced' ? 'both' : responseStyle;
        await chat.createConversation(
          context as Parameters<typeof chat.createConversation>[0],
          'Swan Coach Session',
          null,
          backendStyle as Parameters<typeof chat.createConversation>[3]
        );
      }

      // Send the message
      const backendStyle = responseStyle === 'balanced' ? 'both' : responseStyle;
      await chat.sendMessage(text.trim(), backendStyle as Parameters<typeof chat.sendMessage>[1]);

      // Clear local messages once real ones come in
      setLocalMessages([]);
    } catch {
      // Error is handled by useAIChat
    }
  }, [chat, context, responseStyle]);

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
