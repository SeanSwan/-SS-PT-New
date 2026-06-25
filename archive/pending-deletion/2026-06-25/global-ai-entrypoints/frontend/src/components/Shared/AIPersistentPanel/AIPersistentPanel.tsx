/**
 * ============================================================================
 * FILE: AIPersistentPanel.tsx
 * PURPOSE: Persistent AI assistant panel — desktop right panel + mobile sheet
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-29
 * AI VILLAGE VALIDATED: 2026-03-29
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a persistent AI chat panel that is always
 * accessible. Desktop (1280px+): fixed right-side panel nested via flexbox.
 * Mobile (320px-1024px): sticky bottom sheet, 64px collapsed, 85vh expanded.
 * Includes DictationOrb for voice input and context switching.
 *
 * HOW IT FITS IN THE APP:
 *   UniversalDashboardLayout -> ContentWithPanelWrapper
 *     → DashboardScrollArea (existing routes)
 *     → AIPersistentPanel (this component)
 *
 * KEY DECISIONS:
 * - Reuses useAIChat hook (same conversation engine as AICommandBar)
 * - DictationOrb in transcript-capture mode (autoSend=false) — fills input for user review, user sends explicitly
 * - Context selector maps to dashboard tabs
 * - Theme variables from UniversalThemeContext
 *
 * DESIGN AUTHORITY: Gemini 3.1 Pro + Claude Opus 4.6 consensus (2026-03-29)
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: AIPersistentPanel                                ║
 * ║  PURPOSE: Always-visible AI assistant for admin dashboard     ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-29                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME (Desktop 1280px+):
 * ┌──────────────────────────────┬──────────────┐
 * │  Dashboard Content (flex:1)  │  AI Panel    │
 * │                              │  ┌────────┐  │
 * │                              │  │ Header │  │
 * │                              │  ├────────┤  │
 * │                              │  │Messages│  │
 * │                              │  │  ...   │  │
 * │                              │  ├────────┤  │
 * │                              │  │[Orb][__│>]│
 * │                              │  └────────┘  │
 * └──────────────────────────────┴──────────────┘
 *
 * WIREFRAME (Mobile 320px-1024px collapsed):
 * ┌──────────────────────────────────────────────┐
 * │  Dashboard Content                           │
 * │                                              │
 * ├──────────────────────────────────────────────┤
 * │ [sparkle] Ask SwanStudios AI...    [mic orb] │ ← 64px
 * └──────────────────────────────────────────────┘
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Tap collapsed sheet] → Expand to 85vh → Show messages + input
 * [Type + Enter] → sendMessageWithConversation → AI response
 * [Tap DictationOrb] → Voice input → Auto-send on speech end
 * [Context dropdown] → Change AI context → Reset conversation
 * [Close button (mobile)] → Collapse sheet to 64px
 * [Escape] → Collapse mobile sheet
 */

import React, { useState, useCallback, useRef, useEffect, memo, lazy, Suspense } from 'react';
import { useAIChat } from '../../../hooks/useAIChat';
import { Send } from 'lucide-react';
import { CONTEXT_LABELS, toHookContext } from '../AICommandBar/AICommandBarTypes';
import type { AICommandContext } from '../AICommandBar/AICommandBarTypes';
import {
  DesktopPanel,
  DesktopPanelHeader,
  PanelTitle,
  PanelSparkle,
  ContextSelector,
  ChatMessages,
  MessageBubble,
  EmptyState,
  EmptyIcon,
  TypingIndicator,
  ErrorBanner,
  InputArea,
  ChatInput,
  SendBtn,
  MobileBottomSheet,
  MobileCollapsedRow,
  MobileCollapsedInput,
  MobileCollapsedSparkle,
  MobileExpandedHeader,
  MobileCloseBtn,
  DragHandle,
  OrbWrapper,
} from './AIPersistentPanelStyles';

// Lazy-load DictationOrb (>30KB component)
const DictationOrb = lazy(() => import('../../AIAssistant/DictationOrb'));

// ─────────────────────────────────────────────────────────────
// SECTION: Context Mapping
// PURPOSE: toHookContext is now centralized in AICommandBarTypes.ts
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// SECTION: Viewport Hook
// PURPOSE: Detect desktop vs mobile for rendering correct layout
// WHY: 1280px is the breakpoint per Gemini/Claude consensus
// ─────────────────────────────────────────────────────────────

const useIsDesktop = (): boolean => {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true
  );

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1280);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isDesktop;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Available Contexts
// PURPOSE: Filtered list of contexts for the selector dropdown
// ─────────────────────────────────────────────────────────────

const PANEL_CONTEXTS: AICommandContext[] = [
  'general',
  'workout_generation',
  'client_review',
  'scheduling',
  'progress_analysis',
  'exercise_library',
  'data_analysis',
  'gamification',
  'content',
];

// ─────────────────────────────────────────────────────────────
// SECTION: Message List Sub-Component
// PURPOSE: Renders chat messages (memoized for performance)
// ─────────────────────────────────────────────────────────────

const MessageList = memo(function MessageList({
  messages,
  sending,
  error,
}: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  sending: boolean;
  error: string | null;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  return (
    <ChatMessages>
      {error && <ErrorBanner role="alert">{error}</ErrorBanner>}
      {messages.length === 0 && !sending ? (
        <EmptyState>
          <EmptyIcon aria-hidden="true">&#10024;</EmptyIcon>
          <span>Ask Swan Coach anything.</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>
            Type a message or tap the mic to speak.
          </span>
        </EmptyState>
      ) : (
        <>
          {messages.map((msg, i) => (
            <MessageBubble key={i} $role={msg.role}>
              {msg.content}
            </MessageBubble>
          ))}
          {sending && (
            <TypingIndicator aria-label="Swan Coach is thinking">
              <span /><span /><span />
            </TypingIndicator>
          )}
        </>
      )}
      <div ref={endRef} />
    </ChatMessages>
  );
});

// ─────────────────────────────────────────────────────────────
// SECTION: Input Bar Sub-Component
// PURPOSE: Text input + DictationOrb + send button
// ─────────────────────────────────────────────────────────────

interface InputBarProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  placeholder: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

const InputBar = memo(function InputBar({
  value,
  onChange,
  onSend,
  sending,
  placeholder,
  inputRef,
}: InputBarProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend]
  );

  const isActive = value.trim().length > 0 && !sending;

  return (
    <InputArea>
      <OrbWrapper>
        {/* Transcript-capture mode: autoSend=false — speech APPENDS to existing
            input text (consistent with AIAssistantDrawer behavior). User reviews
            and sends explicitly. No command lane in this shell. */}
        <Suspense fallback={<div style={{ width: 44, height: 44 }} />}>
          <DictationOrb
            onTranscript={(text) => onChange(value + (value ? ' ' : '') + text)}
            autoSend={false}
          />
        </Suspense>
      </OrbWrapper>
      <ChatInput
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Message Swan Coach"
      />
      <SendBtn
        $active={isActive}
        onClick={onSend}
        disabled={!isActive}
        aria-label="Send message"
      >
        <Send />
      </SendBtn>
    </InputArea>
  );
});

// ─────────────────────────────────────────────────────────────
// SECTION: AIPersistentPanel Component
// PURPOSE: Main exported component
// ─────────────────────────────────────────────────────────────

const AIPersistentPanel = memo(function AIPersistentPanel() {
  const [context, setContext] = useState<AICommandContext>('general');
  const [inputValue, setInputValue] = useState('');
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop();

  const {
    messages,
    sending,
    error,
    sendMessageWithConversation,
    clearError,
  } = useAIChat();

  const contextLabel = CONTEXT_LABELS[context];

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sending) return;

    setInputValue('');
    clearError();
    const hookContext = toHookContext(context);
    await sendMessageWithConversation(
      trimmed,
      hookContext,
      `${contextLabel} — Dashboard`,
      null,
      'both'
    );
  }, [inputValue, sending, context, contextLabel, sendMessageWithConversation, clearError]);

  // Escape to collapse mobile sheet
  useEffect(() => {
    if (!mobileExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileExpanded(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileExpanded]);

  const handleContextChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setContext(e.target.value as AICommandContext);
  }, []);

  const expandMobile = useCallback(() => {
    setMobileExpanded(true);
    clearError();
  }, [clearError]);

  // ── Desktop Panel ──
  if (isDesktop) {
    return (
      <DesktopPanel aria-label="Swan Coach Assistant">
        <DesktopPanelHeader>
          <PanelTitle>
            <PanelSparkle aria-hidden="true">&#10024;</PanelSparkle>
            Swan Coach
          </PanelTitle>
          <ContextSelector
            value={context}
            onChange={handleContextChange}
            aria-label="Swan Coach context"
          >
            {PANEL_CONTEXTS.map((ctx) => (
              <option key={ctx} value={ctx}>
                {CONTEXT_LABELS[ctx]}
              </option>
            ))}
          </ContextSelector>
        </DesktopPanelHeader>

        <MessageList messages={messages} sending={sending} error={error} />

        <InputBar
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          sending={sending}
          placeholder={`Ask ${contextLabel}...`}
          inputRef={inputRef}
        />
      </DesktopPanel>
    );
  }

  // ── Mobile Bottom Sheet ──
  return (
    <MobileBottomSheet
      $expanded={mobileExpanded}
      role={mobileExpanded ? 'dialog' : undefined}
      aria-modal={mobileExpanded ? true : undefined}
      aria-label="Swan Coach Assistant"
    >
      {mobileExpanded ? (
        <>
          <DragHandle />
          <MobileExpandedHeader>
            <PanelTitle>
              <PanelSparkle aria-hidden="true">&#10024;</PanelSparkle>
              Swan Coach
            </PanelTitle>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ContextSelector
                value={context}
                onChange={handleContextChange}
                aria-label="Swan Coach context"
              >
                {PANEL_CONTEXTS.map((ctx) => (
                  <option key={ctx} value={ctx}>
                    {CONTEXT_LABELS[ctx]}
                  </option>
                ))}
              </ContextSelector>
              <MobileCloseBtn
                onClick={() => setMobileExpanded(false)}
                aria-label="Close Swan Coach chat"
              >
                &#10005;
              </MobileCloseBtn>
            </div>
          </MobileExpandedHeader>

          <MessageList messages={messages} sending={sending} error={error} />

          <InputBar
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            sending={sending}
            placeholder={`Ask ${contextLabel}...`}
            inputRef={inputRef}
          />
        </>
      ) : (
        <MobileCollapsedRow onClick={expandMobile} role="button" tabIndex={0}>
          <MobileCollapsedInput>
            <MobileCollapsedSparkle aria-hidden="true">&#10024;</MobileCollapsedSparkle>
            Ask Swan Coach...
          </MobileCollapsedInput>
          <OrbWrapper>
            <Suspense fallback={<div style={{ width: 44, height: 44 }} />}>
              <DictationOrb
                onTranscript={(text) => {
                  // Append for consistency with expanded panel and drawer behavior.
                  // When collapsed, inputValue is unlikely to have content, but
                  // we append defensively so existing text is never silently dropped.
                  setInputValue(prev => prev + (prev ? ' ' : '') + text);
                  setMobileExpanded(true);
                }}
                autoSend={false}
              />
            </Suspense>
          </OrbWrapper>
        </MobileCollapsedRow>
      )}
    </MobileBottomSheet>
  );
});

export default AIPersistentPanel;
