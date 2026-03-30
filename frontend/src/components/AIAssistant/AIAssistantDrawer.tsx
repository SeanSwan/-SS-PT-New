/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: AIAssistantDrawer (Orchestrator)                 ║
 * ║  PURPOSE: Slide-in AI chat drawer — orchestrates sub-parts   ║
 * ║  OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-21        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────── 420px (100vw mobile) ─┐
 * │ [← Back] SwanStudios AI          [+] [📜] [✕] │ DrawerHeader
 * │ [Client Picker] ← trainer/admin only           │ ClientPicker
 * │ [Quick Actions] ← when client selected         │ QuickActions
 * │ [Error banner] ← on API error                  │ ErrorBanner
 * │ ┌─────────────── VIEW ROUTER ───────────────┐  │
 * │ │ LIST: conversation history                 │  │
 * │ │ SELECTOR: context pills + welcome          │  │
 * │ │ CHAT: messages + typing indicator          │  │
 * │ └───────────────────────────────────────────┘  │
 * │ [🎤] [📎] [Type a message...         ] [➤]    │ InputArea
 * └────────────────────────────────────────────────┘
 *
 * Sub-components:
 *   AIDrawerStyles.ts — All styled components
 *   ChatMessage.tsx — Memoized bubble with action parsing
 *   AIContextSelector.tsx — Context pills + style bar + welcome
 *   ClientPicker.tsx — Searchable client dropdown
 *   QuickActions.tsx — One-tap action chips
 *   DictationOrb.tsx — Voice input
 *   VoiceUpload.tsx — Audio file transcription
 */

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import {
  X, Send, Plus, Sparkles, MessageSquare,
  ChevronLeft, Trash2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAIChat, type AIContext, type ResponseStyle } from '../../hooks/useAIChat';
import { CS } from '../../styles/crystallineSwanTheme';

// Sub-components
import DictationOrb from './DictationOrb';
import ClientPicker, { type ClientInfo } from './ClientPicker';
import QuickActions from './QuickActions';
import ChatMessage from './ChatMessage';
import AIContextSelector, { CONTEXTS, RESPONSE_STYLES } from './AIContextSelector';
const VoiceUpload = React.lazy(() => import('./VoiceUpload'));

// Styled components
import {
  Overlay, DrawerPanel, DrawerHeader, HeaderTitle, HeaderActions,
  IconBtn, ContextBar, ContextPill, ResponseStyleIndicator,
  ConversationList, ConvItem, ConvTitle, ConvMeta,
  MessagesArea, TypingIndicator, Dot,
  InputArea, ChatInput, SendBtn, Spinner,
  EmptyState, EmptyIcon, WelcomeText, ErrorBanner,
  AutoSendBadge,
} from './AIDrawerStyles';

// ── Component ──────────────────────────────────────────────

interface AIAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  userRole: 'client' | 'trainer' | 'admin';
  defaultContext?: AIContext;
}

const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  open,
  onClose,
  userRole,
  defaultContext = 'general',
}) => {
  const {
    conversations, activeConversation, messages,
    loading, sending, error,
    createConversation, listConversations, loadConversation,
    sendMessage, deleteConversation, newChat, clearError,
  } = useAIChat();

  const [inputValue, setInputValue] = useState('');
  const [selectedContext, setSelectedContext] = useState<AIContext>(defaultContext);
  const [selectedResponseStyle, setSelectedResponseStyle] = useState<ResponseStyle>('both');
  const [view, setView] = useState<'chat' | 'list'>('chat');
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);
  const [autoSendFlash, setAutoSendFlash] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Ref-based send to avoid stale closure in auto-send callback
  const sendMessageRef = useRef(sendMessage);
  const createConversationRef = useRef(createConversation);
  const selectedContextRef = useRef(selectedContext);
  const selectedResponseStyleRef = useRef(selectedResponseStyle);
  const getTargetClientIdRef = useRef<() => string | null>(() => null);
  const activeConversationRef = useRef(activeConversation);

  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);
  useEffect(() => { createConversationRef.current = createConversation; }, [createConversation]);
  useEffect(() => { selectedContextRef.current = selectedContext; }, [selectedContext]);
  useEffect(() => { selectedResponseStyleRef.current = selectedResponseStyle; }, [selectedResponseStyle]);
  useEffect(() => { activeConversationRef.current = activeConversation; }, [activeConversation]);

  // ── Effects ──

  useEffect(() => { if (open) listConversations(); }, [open, listConversations]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (activeConversation && inputRef.current) inputRef.current.focus(); }, [activeConversation]);

  // Focus trap
  useEffect(() => {
    if (!open || !drawerRef.current) return;
    const drawer = drawerRef.current;
    const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = drawer.querySelectorAll<HTMLElement>(sel);
      if (els.length === 0) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    requestAnimationFrame(() => {
      if (inputRef.current && activeConversation) inputRef.current.focus();
      else drawer.querySelector<HTMLElement>(sel)?.focus();
    });

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open, activeConversation]);

  // ── Swipe-to-close ──

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = Math.abs(t.clientY - touchStartRef.current.y);
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;
    if (dx > 80 && dy < dx * 0.5 && dt < 500) onClose();
  }, [onClose]);

  // ── Handlers ──

  const getTargetClientId = useCallback(() => {
    if (userRole !== 'admin' && userRole !== 'trainer') return null;
    return selectedClient ? String(selectedClient.id) : null;
  }, [userRole, selectedClient]);

  // Keep ref in sync for auto-send closure
  useEffect(() => { getTargetClientIdRef.current = getTargetClientId; }, [getTargetClientId]);

  // ── Auto-Send Handler ──
  // Called by DictationOrb when speech ends and autoSend is enabled.
  // Directly sends the full transcribed text without requiring manual interaction.
  const handleAutoSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    // Flash the auto-send badge so user sees it was voice-triggered
    setAutoSendFlash(true);
    setTimeout(() => setAutoSendFlash(false), 1400);

    // Ensure a conversation exists before sending
    if (!activeConversationRef.current) {
      const conv = await createConversationRef.current(
        selectedContextRef.current,
        undefined,
        getTargetClientIdRef.current(),
        selectedResponseStyleRef.current,
      );
      if (!conv) {
        // Conversation creation failed — put text in input so user can retry manually
        setInputValue(trimmed);
        return;
      }
    }

    // Clear input (it may have interim/final text from onTranscript) and send
    setInputValue('');
    const result = await sendMessageRef.current(trimmed);
    if (result?.failed) {
      // Put the text back so user can retry manually
      setInputValue(result.originalMessage || trimmed);
    }
  }, [sending]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending || text.length > 4000) return;
    setInputValue('');

    if (!activeConversation) {
      const conv = await createConversation(selectedContext, undefined, getTargetClientId(), selectedResponseStyle);
      if (!conv) { setInputValue(text); return; }
    }

    const result = await sendMessage(text);
    if (result?.failed) setInputValue(result.originalMessage || text);
  }, [inputValue, sending, activeConversation, selectedContext, selectedResponseStyle, createConversation, sendMessage, getTargetClientId]);

  const handleStartChat = useCallback(async (context: AIContext) => {
    setSelectedContext(context);
    const conv = await createConversation(context, undefined, getTargetClientId(), selectedResponseStyle);
    if (conv) setView('chat');
  }, [createConversation, getTargetClientId, selectedResponseStyle]);

  const handleQuickAction = useCallback(async (context: AIContext, prompt: string) => {
    setSelectedContext(context);
    const conv = await createConversation(context, undefined, getTargetClientId(), selectedResponseStyle);
    if (conv) { setView('chat'); await sendMessage(prompt); }
  }, [createConversation, getTargetClientId, selectedResponseStyle, sendMessage]);

  const handleDictation = useCallback((text: string) => {
    setInputValue(prev => prev + (prev ? ' ' : '') + text);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!open) return null;

  const hasInput = inputValue.trim().length > 0;
  const isTrainerOrAdmin = userRole === 'trainer' || userRole === 'admin';

  // ── Render ──

  return (
    <>
      <Overlay onClick={onClose} />
      <DrawerPanel ref={drawerRef} role="dialog" aria-modal="true" aria-label="AI Assistant" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Header */}
        <DrawerHeader>
          <HeaderTitle>
            {view === 'list' || !activeConversation ? (
              <><Sparkles size={20} /> SwanStudios AI</>
            ) : (
              <>
                <IconBtn onClick={() => { newChat(); setView('list'); }} aria-label="Back to conversations">
                  <ChevronLeft size={20} />
                </IconBtn>
                <span style={{ fontSize: '0.9rem' }}>
                  {activeConversation.title || CONTEXTS[activeConversation.context as AIContext]?.label || 'Chat'}
                </span>
              </>
            )}
          </HeaderTitle>
          <HeaderActions>
            {activeConversation && (
              <IconBtn onClick={() => { newChat(); setView('chat'); }} aria-label="New chat" title="New chat">
                <Plus size={18} />
              </IconBtn>
            )}
            <IconBtn onClick={() => setView(view === 'list' ? 'chat' : 'list')} aria-label="Conversation history" title="History">
              <MessageSquare size={18} />
            </IconBtn>
            <IconBtn onClick={onClose} aria-label="Close AI Assistant">
              <X size={20} />
            </IconBtn>
          </HeaderActions>
        </DrawerHeader>

        {/* Client Picker — trainer/admin only */}
        {isTrainerOrAdmin && (
          <ClientPicker selectedClient={selectedClient} onSelectClient={setSelectedClient} userRole={userRole} />
        )}

        {/* Quick Actions — when client selected + no active conversation */}
        {selectedClient && !activeConversation && isTrainerOrAdmin && view === 'chat' && (
          <QuickActions
            clientName={`${selectedClient.firstName} ${selectedClient.lastName}`}
            onAction={handleQuickAction}
            userRole={userRole}
          />
        )}

        {/* Error */}
        {error && (
          <ErrorBanner>
            <span>{error}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <IconBtn onClick={() => { clearError(); handleSend(); }} aria-label="Retry" title="Retry">
                <Send size={14} />
              </IconBtn>
              <IconBtn onClick={clearError} aria-label="Dismiss error">
                <X size={14} />
              </IconBtn>
            </div>
          </ErrorBanner>
        )}

        {/* View Router */}
        {view === 'list' ? (
          <ConversationList>
            {loading ? (
              <EmptyState><Spinner size={24} /></EmptyState>
            ) : conversations.length === 0 ? (
              <EmptyState>
                <EmptyIcon><MessageSquare size={28} /></EmptyIcon>
                <WelcomeText>No conversations yet. Start a new chat!</WelcomeText>
              </EmptyState>
            ) : (
              conversations.map(conv => (
                <ConvItem key={conv.id} onClick={() => { loadConversation(conv.id); setView('chat'); }}>
                  <MessageSquare size={16} style={{ color: CS.textMuted, flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <ConvTitle>{conv.title || 'Untitled'}</ConvTitle>
                    <ConvMeta>{conv.messageCount} messages</ConvMeta>
                  </div>
                  <IconBtn onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }} aria-label="Delete conversation">
                    <Trash2 size={14} />
                  </IconBtn>
                </ConvItem>
              ))
            )}
          </ConversationList>
        ) : !activeConversation ? (
          <AIContextSelector
            userRole={userRole}
            selectedContext={selectedContext}
            onContextChange={setSelectedContext}
            selectedStyle={selectedResponseStyle}
            onStyleChange={setSelectedResponseStyle}
            onStartChat={handleStartChat}
          />
        ) : (
          <>
            {/* Active Chat: locked context pills */}
            <ContextBar>
              {Object.entries(CONTEXTS)
                .filter(([, cfg]) => cfg.roles.includes(userRole))
                .map(([ctx, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = activeConversation.context === ctx;
                  return (
                    <ContextPill key={ctx} $active={isActive} onClick={() => {}} aria-pressed={isActive}
                      style={{ color: isActive ? '#E0ECF4' : '#4070C0', cursor: 'default' }}>
                      <Icon size={14} />
                      {cfg.label}
                    </ContextPill>
                  );
                })}
            </ContextBar>

            {/* Response style indicator */}
            <ResponseStyleIndicator>
              Style: <strong style={{ color: CS.iceWing }}>
                {RESPONSE_STYLES.find(s => s.key === selectedResponseStyle)?.emoji}{' '}
                {RESPONSE_STYLES.find(s => s.key === selectedResponseStyle)?.label || 'Both'}
              </strong>
            </ResponseStyleIndicator>

            {/* Messages */}
            <MessagesArea>
              {messages.length === 0 && (
                <EmptyState style={{ gap: 10 }}>
                  <WelcomeText>
                    {CONTEXTS[activeConversation.context as AIContext]?.description || 'How can I help you today?'}
                  </WelcomeText>
                </EmptyState>
              )}
              {messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))}
              <div aria-live="polite" aria-atomic="true">
                {sending && (
                  <TypingIndicator role="status">
                    <Dot $delay={0} />
                    <Dot $delay={0.15} />
                    <Dot $delay={0.3} />
                    <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
                      AI is thinking...
                    </span>
                  </TypingIndicator>
                )}
              </div>
              <div ref={messagesEndRef} />
            </MessagesArea>

            {/* Input */}
            <InputArea style={{ position: 'relative' }}>
              {/* Auto-send visual indicator — flashes when voice message is being sent */}
              <AutoSendBadge $visible={autoSendFlash} aria-live="polite">
                Sending voice message...
              </AutoSendBadge>
              <DictationOrb
                onTranscript={handleDictation}
                onInterimTranscript={() => {}}
                disabled={sending}
                autoSend={true}
                onAutoSend={handleAutoSend}
              />
              <Suspense fallback={null}>
                <VoiceUpload onTranscript={handleDictation} disabled={sending} />
              </Suspense>
              <ChatInput
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message\u2026"
                aria-label="Type your message"
                rows={1}
                maxLength={4000}
                disabled={sending}
              />
              <SendBtn $active={hasInput && !sending} onClick={handleSend} aria-label="Send message">
                {sending ? <Spinner size={18} /> : <Send size={18} />}
              </SendBtn>
            </InputArea>
          </>
        )}
      </DrawerPanel>
    </>
  );
};

export default AIAssistantDrawer;
