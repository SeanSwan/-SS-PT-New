/**
 * ============================================================================
 * FILE: AICommandBar.tsx
 * PURPOSE: Raycast/VS Code-style inline AI command bar for dashboard sections.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a 44px collapsed input bar with sparkles icon
 * and context badge. On focus/input it expands to show a chat panel below.
 * Ctrl+K focuses the bar from anywhere. Escape collapses it. On mobile
 * (<768px) the expanded state is a full-screen overlay.
 *
 * HOW IT FITS IN THE APP: Drop-in replacement for the floating AI FAB on
 * dashboard pages. Each dashboard tab embeds this at the top of its content
 * area with the appropriate AI context.
 *
 * KEY DECISIONS: Uses sendMessageWithConversation from useAIChat to atomically
 * create a conversation on first message (avoids race conditions). Hit area
 * expansion uses CSS pseudo-elements, not JS hooks.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: AICommandBar                                     ║
 * ║  PURPOSE: Inline AI assistant command bar for dashboard tabs  ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-25                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────────────────┐
 * │ [sparkles] Ask AI about Training Coach... (Ctrl+K) [>]  │ ← 44px collapsed
 * ├──────────────────────────────────────────────────────────┤
 * │ [user bubble]              You: Generate a leg workout   │ ← expanded panel
 * │ [ai bubble] Here's a Phase 2 leg workout...              │   max 400px
 * │ [...] (typing indicator)                                 │
 * └──────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { context, clientId, clientName, placeholder, onClose }
 * State:     { inputValue, isExpanded, isMobileOverlay }
 * API Calls: via useAIChat → POST /api/ai-chat/conversations, POST .../messages
 * Events:    Ctrl+K (global focus), Escape (collapse), Enter (send)
 * Children:  (none — self-contained)
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Input focus] → Expand panel → Show messages or empty state
 * [Enter/Send] → sendMessageWithConversation → Optimistic msg → AI response
 * [Escape] → Collapse panel → Clear focus
 * [Ctrl+K] → Focus input → Expand panel
 * [Mobile close] → Close overlay → Return to dashboard
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useAIChat } from '../../../hooks/useAIChat';
import type { AIContext } from '../../../hooks/useAIChat';
import { CONTEXT_LABELS } from './AICommandBarTypes';
import type { AICommandBarProps, AICommandContext } from './AICommandBarTypes';
import {
  CommandBarWrapper,
  InputRow,
  SparklesIcon,
  CommandBarInput,
  ContextBadge,
  KbdHint,
  SendButton,
  ExpandedPanel,
  MessageList,
  MessageBubble,
  EmptyState,
  SendingIndicator,
  ErrorBanner,
  MobileOverlay,
  MobileHeader,
  MobileCloseButton,
  MobileMessageList,
  MobileInputRow,
} from './AICommandBarStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Context Mapping
// PURPOSE: Map AICommandContext to useAIChat's AIContext type
// WHY: Command bar supports extra contexts not in the hook's union
// ─────────────────────────────────────────────────────────────

const toHookContext = (ctx: AICommandContext): AIContext => {
  const mapping: Partial<Record<AICommandContext, AIContext>> = {
    training: 'workout_generation',
    biometrics: 'progress_analysis',
    overview: 'general',
    settings: 'general',
    data_analysis: 'general',
  };
  return (mapping[ctx] ?? ctx) as AIContext;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Mobile Detection
// PURPOSE: Check if viewport is mobile width
// WHY: Determines whether to show dropdown panel or full-screen overlay
// ─────────────────────────────────────────────────────────────

const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Message Renderer
// PURPOSE: Renders the message list (shared between desktop and mobile)
// ─────────────────────────────────────────────────────────────

const MessageContent = memo(function MessageContent({
  messages,
  sending,
  error,
  contextLabel,
}: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  sending: boolean;
  error: string | null;
  contextLabel: string;
}) {
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  if (messages.length === 0 && !sending) {
    return (
      <EmptyState>
        <span style={{ fontSize: 24 }} aria-hidden="true">&#10024;</span>
        <span>Ask {contextLabel} anything. Press Enter to send.</span>
      </EmptyState>
    );
  }

  return (
    <>
      {error && <ErrorBanner role="alert">{error}</ErrorBanner>}
      {messages.map((msg, i) => (
        <MessageBubble key={i} $role={msg.role}>
          {msg.content}
        </MessageBubble>
      ))}
      {sending && (
        <SendingIndicator aria-label="AI is thinking">
          <span /><span /><span />
        </SendingIndicator>
      )}
      <div ref={listEndRef} />
    </>
  );
});

// ─────────────────────────────────────────────────────────────
// SECTION: AICommandBar Component
// PURPOSE: Main exported component
// ─────────────────────────────────────────────────────────────

const AICommandBar = memo(function AICommandBar({
  context = 'general',
  clientId,
  clientName,
  placeholder,
  onClose,
}: AICommandBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const {
    messages,
    sending,
    error,
    sendMessageWithConversation,
    clearError,
  } = useAIChat();

  const contextLabel = CONTEXT_LABELS[context];
  const displayPlaceholder =
    placeholder || `SwanStudios Assistant — ${contextLabel}...`;

  // ── Ctrl+K global shortcut ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // ── Escape to collapse ──
  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isExpanded]);

  // ── Click outside to collapse (desktop only) ──
  useEffect(() => {
    if (!isExpanded || isMobile) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isExpanded, isMobile]);

  const handleFocus = useCallback(() => {
    setIsExpanded(true);
    clearError();
  }, [clearError]);

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sending) return;

    setInputValue('');
    const hookContext = toHookContext(context);
    const title = clientName
      ? `${contextLabel} — ${clientName}`
      : contextLabel;

    await sendMessageWithConversation(
      trimmed,
      hookContext,
      title,
      clientId ?? null,
      'both'
    );
  }, [inputValue, sending, context, clientName, clientId, contextLabel, sendMessageWithConversation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleMobileClose = useCallback(() => {
    setIsExpanded(false);
    onClose?.();
  }, [onClose]);

  // ── Render: Mobile full-screen overlay ──
  if (isExpanded && isMobile) {
    return (
      <CommandBarWrapper $expanded ref={wrapperRef}>
        <InputRow $focused={false}>
          <SparklesIcon aria-hidden="true">&#10024;</SparklesIcon>
          <CommandBarInput
            ref={inputRef}
            value={inputValue}
            placeholder={displayPlaceholder}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleFocus}
            aria-label={`AI ${contextLabel} input`}
          />
          <ContextBadge>{contextLabel}</ContextBadge>
        </InputRow>
        <MobileOverlay role="dialog" aria-modal="true" aria-label={`${contextLabel} chat`}>
          <MobileHeader>
            <ContextBadge>{contextLabel}</ContextBadge>
            <MobileCloseButton onClick={handleMobileClose} aria-label="Close AI chat">
              &#10005;
            </MobileCloseButton>
          </MobileHeader>
          <MobileMessageList>
            <MessageContent
              messages={messages}
              sending={sending}
              error={error}
              contextLabel={contextLabel}
            />
          </MobileMessageList>
          <MobileInputRow>
            <CommandBarInput
              value={inputValue}
              placeholder={displayPlaceholder}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              aria-label={`Message ${contextLabel}`}
            />
            <SendButton
              $visible={inputValue.trim().length > 0}
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              aria-label="Send message"
            >
              &#9654;
            </SendButton>
          </MobileInputRow>
        </MobileOverlay>
      </CommandBarWrapper>
    );
  }

  // ── Render: Desktop (collapsed + expanded panel) ──
  return (
    <CommandBarWrapper $expanded={isExpanded} ref={wrapperRef}>
      <InputRow $focused={isExpanded}>
        <SparklesIcon aria-hidden="true">&#10024;</SparklesIcon>
        <CommandBarInput
          ref={inputRef}
          value={inputValue}
          placeholder={displayPlaceholder}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          aria-label={`AI ${contextLabel} input`}
          aria-expanded={isExpanded}
        />
        {!isExpanded && <KbdHint>Ctrl+K</KbdHint>}
        <ContextBadge>{contextLabel}</ContextBadge>
        <SendButton
          $visible={inputValue.trim().length > 0}
          onClick={handleSend}
          disabled={!inputValue.trim() || sending}
          aria-label="Send message"
        >
          &#9654;
        </SendButton>
      </InputRow>

      {isExpanded && (
        <ExpandedPanel>
          <MessageList>
            <MessageContent
              messages={messages}
              sending={sending}
              error={error}
              contextLabel={contextLabel}
            />
          </MessageList>
        </ExpandedPanel>
      )}
    </CommandBarWrapper>
  );
});

export default AICommandBar;
