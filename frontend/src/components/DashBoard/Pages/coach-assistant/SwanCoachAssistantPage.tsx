/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: SwanCoachAssistantPage                           ║
 * ║  PURPOSE: Swan Studios Coach Assistant — AI training terminal ║
 * ║  OWNER: Claude Opus 4.6 (CEO)                                ║
 * ║  LAST VALIDATED: 2026-03-30 (14-brain AI Village consensus)  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME (Desktop 1024px+):
 * ┌──────────────┬───────────────────────────────┬──────────────┐
 * │ [+ New Chat] │ ☰  Swan Coach Assistant  [📖] │ BookOpen     │
 * │ [Search...]  ├───────────────────────────────┤ Teach Mode   │
 * │              │ [🏋️] [📋] [👥] [📅] [📊] [💪] │ [🔍 Search]  │
 * │ Today        ├───────────────────────────────┤ Exercise Name│
 * │ > Leg Day    │  AI + User message bubbles    │ [HowTo][Ph]  │
 * │ > Diet Q     │  (16px text, max 900px)       │ Instructions │
 * │              ├───────────────────────────────┤ Cues, Safety │
 * │ Yesterday    │ ⚖️ Balanced ▾                  │ Muscles      │
 * │ > Form Check ├───────────────────────────────┤ Biomechanics │
 * │              │ [Input...] 🎤 📤               │              │
 * └──────────────┴───────────────────────────────┴──────────────┘
 *
 * DATA FLOW:
 * Props In:  (none — page-level component)
 * State:     useCoachAssistant + useAIChat + useConversationSidebar + useCoachTeachMode
 * API Calls: GET/POST/PATCH/DELETE /api/ai-chat/conversations, GET /api/exercises/:id/teach-mode
 * Children:  ConversationSidebar, ContextChipBar, CoachMessage,
 *            ResponseStyleSelector, CoachInputBar, CoachTeachModePanel
 */

import React, { useCallback, useMemo, useEffect, useState, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { MessageCircle, PanelLeftOpen, BookOpen } from 'lucide-react';
import { useAIChat } from '../../../../hooks/useAIChat';
import { useCoachAssistant } from './hooks/useCoachAssistant';
import { usePremiumTTS } from './hooks/usePremiumTTS';
import { useConversationSidebar } from './hooks/useConversationSidebar';
import { useScrollLock } from './hooks/useScrollLock';
import { useCoachTeachMode } from './hooks/useCoachTeachMode';
import { ContextChipBar } from './ContextChipBar';
import { CoachMessage } from './CoachMessage';
import { ResponseStyleSelector } from './ResponseStyleSelector';
import { CoachInputBar } from './CoachInputBar';
import ConversationSidebar from './ConversationSidebar';
import ClientPicker from '../../../AIAssistant/ClientPicker';
import type { ClientInfo } from '../../../AIAssistant/ClientPicker';
import ThinkingIndicator from './ThinkingIndicator';
import SuggestedPrompts from './SuggestedPrompts';
import VoiceRecordingOverlay from './VoiceRecordingOverlay';
import FileAttachmentButton from './FileAttachmentButton';
import AttachmentPreview from './AttachmentPreview';
import VoiceSettingsBar from './VoiceSettingsBar';
import { useFileAttachment } from './hooks/useFileAttachment';
import {
  CoachHeader,
  CoachTitle,
  CoachHeaderIcon,
  MessagesArea,
} from './SwanCoachStyles';
import type { CoachContext, ResponseStyle } from './SwanCoachTypes';

const CoachTeachModePanel = lazy(() => import('./CoachTeachModePanel'));

// ─────────────────────────────────────────────────────────────
// SECTION: Layout Wrappers (sidebar + main panel)
// ─────────────────────────────────────────────────────────────
const PageShell = styled.div`
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  overflow: hidden;
`;

const MainPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
`;

const SidebarToggle = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s ease;

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  margin: 0 12px 8px;
  border-radius: 8px;
  background: rgba(201, 42, 84, 0.1);
  border: 1px solid rgba(201, 42, 84, 0.3);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  min-height: 44px;

  button {
    margin-left: auto;
    padding: 6px 14px;
    min-height: 36px;
    border-radius: 6px;
    border: 1px solid rgba(201, 42, 84, 0.4);
    background: transparent;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    &:hover { background: rgba(201, 42, 84, 0.15); }
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Main Page Component
// ─────────────────────────────────────────────────────────────
const NeuralLinkPill = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  margin: 0 16px 8px;
  align-self: flex-start;
  border-radius: 20px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--ice-wing, #60C0F0)' : 'rgba(96,192,240,0.3)'};
  background: ${({ $active }) =>
    $active ? 'var(--ice-wing, #60C0F0)' : 'rgba(0,32,96,0.4)'};
  color: ${({ $active }) => $active ? '#030712' : 'var(--ice-wing, #60C0F0)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 32px;

  &:hover {
    background: ${({ $active }) =>
      $active ? 'var(--ice-wing, #60C0F0)' : 'rgba(96,192,240,0.15)'};
    box-shadow: 0 0 12px rgba(96,192,240,0.3);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const TeachModeToggle = styled.button<{ $active?: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)'
    : 'transparent'};
  color: ${({ $active }) => $active
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'var(--text-muted, rgba(224, 236, 244, 0.4))'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-left: auto;
  transition: color 0.2s ease, background 0.2s ease;

  &:hover {
    color: var(--accent-secondary, #8B5CF6);
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const SwanCoachAssistantPage: React.FC = () => {
  const chat = useAIChat();
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);
  const coach = useCoachAssistant({ chat, targetClientId: selectedClient?.id ?? null });
  const tts = usePremiumTTS();
  const teachMode = useCoachTeachMode();
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [macroLinkActive, setMacroLinkActive] = useState(false);
  const attachments = useFileAttachment();

  // Load conversation list on mount
  useEffect(() => {
    chat.listConversations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-send pending food query from RestaurantTab "Ask Coach" ──
  // sessionStorage cleared AFTER send resolves to prevent silent data loss on early failure.
  useEffect(() => {
    const pending = sessionStorage.getItem('swan:pending-coach-food');
    if (!pending) return;
    let cancelled = false;
    try {
      const { message, foodContext } = JSON.parse(pending) as {
        message: string;
        foodContext: Record<string, unknown>;
      };
      (async () => {
        if (cancelled) return;
        await coach.sendMessageWithFood(message, foodContext);
        if (!cancelled) sessionStorage.removeItem('swan:pending-coach-food');
      })();
    } catch {
      // Malformed entry — clear it so it doesn't persist
      sessionStorage.removeItem('swan:pending-coach-food');
    }
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sidebar = useConversationSidebar({
    conversations: chat.conversations,
  });

  // Lock background scroll when sidebar overlay is open (iOS fix)
  useScrollLock(sidebar.isOpen);

  // ── Get user role from localStorage ──
  const userRole = useMemo(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        return (parsed.role || 'admin') as 'admin' | 'trainer' | 'client';
      }
    } catch { /* fallback */ }
    return 'admin' as const;
  }, []);

  // ── Handle read aloud ──
  const handleReadAloud = useCallback((text: string) => {
    tts.speak(text);
  }, [tts]);

  // ── Load a conversation from sidebar ──
  const handleSelectConversation = useCallback(async (id: number) => {
    await chat.loadConversation(id);
  }, [chat]);

  // ── New chat from sidebar ──
  const handleNewChat = useCallback(() => {
    coach.clearConversation();
    // Force-refresh conversation list so the sidebar is up to date
    chat.listConversations('active', true);
  }, [coach, chat]);

  // ── Auto-read new AI messages when TTS enabled ──
  // Skip welcome message and don't read during voice recording
  const lastMsgRef = React.useRef<string>('');
  React.useEffect(() => {
    if (!tts.enabled || !coach.messages.length || voiceOverlayOpen) return;
    const lastMsg = coach.messages[coach.messages.length - 1];
    // Skip welcome message and only read real AI responses
    if (lastMsg.role === 'assistant' && lastMsg.id !== lastMsgRef.current && lastMsg.id !== 'welcome') {
      lastMsgRef.current = lastMsg.id;
      tts.speak(lastMsg.content);
    }
  }, [coach.messages, tts, voiceOverlayOpen]);

  // ── Voice overlay handlers ──
  const handleOpenVoiceOverlay = useCallback(() => setVoiceOverlayOpen(true), []);
  const handleCloseVoiceOverlay = useCallback(() => setVoiceOverlayOpen(false), []);
  const handleVoiceTranscribed = useCallback((text: string) => {
    coach.sendMessage(text);
    setVoiceOverlayOpen(false);
  }, [coach]);

  // ── Neural Link: set macro_logging context for next conversation ──
  const handleNeuralLink = useCallback(async () => {
    setMacroLinkActive(prev => !prev);
    if (!macroLinkActive) {
      await chat.createConversation('macro_logging', 'Macro Context Session');
    }
  }, [chat, macroLinkActive]);

  // ── Track last attempted message for retry on error ──
  const [lastAttempt, setLastAttempt] = useState<string | null>(null);

  // ── Wrap send to clear attachments after sending ──
  const handleSend = useCallback((text: string) => {
    setLastAttempt(text);
    coach.clearError();
    coach.sendMessage(text);
    attachments.clearFiles();
  }, [coach, attachments]);

  // ── Cleanup TTS on unmount ──
  React.useEffect(() => () => tts.stop(), [tts]);

  return (
    <PageShell>
      {/* Conversation History Sidebar */}
      <ConversationSidebar
        isOpen={sidebar.isOpen}
        conversations={chat.conversations}
        groupedConversations={sidebar.groupedConversations}
        activeConversationId={chat.activeConversation?.id ?? null}
        searchQuery={sidebar.searchQuery}
        onSearchChange={sidebar.setSearchQuery}
        onClose={sidebar.close}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={chat.deleteConversation}
        onRenameConversation={chat.renameConversation}
      />

      {/* Main Chat Panel */}
      <MainPanel>
        {/* Header */}
        <CoachHeader>
          <SidebarToggle onClick={sidebar.toggle} aria-label="Toggle conversation history">
            <PanelLeftOpen size={20} />
          </SidebarToggle>
          <CoachHeaderIcon>
            <MessageCircle size={20} />
          </CoachHeaderIcon>
          <CoachTitle>Swan Coach Assistant</CoachTitle>
          <TeachModeToggle
            onClick={teachMode.toggle}
            $active={teachMode.isOpen}
            aria-label="Toggle Teach Mode panel"
            title="Teach Mode — exercise encyclopedia"
          >
            <BookOpen size={18} />
          </TeachModeToggle>
        </CoachHeader>

        {/* Client Picker — trainer/admin only, routes AI data to selected client */}
        {(userRole === 'trainer' || userRole === 'admin') && (
          <ClientPicker
            selectedClient={selectedClient}
            onSelectClient={setSelectedClient}
            userRole={userRole}
          />
        )}

        {/* Context Chips */}
        <ContextChipBar
          activeContext={coach.context}
          onContextChange={coach.switchContext as (ctx: CoachContext) => void}
          userRole={userRole}
        />

        {/* Messages */}
        <MessagesArea role="log" aria-live="polite" aria-label="Conversation">
          {/* Suggested prompts when chat is empty */}
          <SuggestedPrompts
            context={coach.context}
            onSelect={coach.sendMessage}
            visible={coach.messages.length === 0 && !coach.sending}
          />

          {coach.messages.map(msg => (
            <CoachMessage
              key={msg.id}
              message={msg}
              onReadAloud={msg.role === 'assistant' ? handleReadAloud : undefined}
            />
          ))}

          {/* Thinking indicator replaces old TypingDots */}
          <ThinkingIndicator isThinking={coach.sending} />

          {/* Error banner — surfaces errors that were previously silent */}
          {coach.error && !coach.sending && (
            <ErrorBanner>
              <span>{coach.error}</span>
              {lastAttempt && (
                <button onClick={() => handleSend(lastAttempt)}>Retry</button>
              )}
              <button onClick={coach.clearError}>Dismiss</button>
            </ErrorBanner>
          )}

          <div ref={coach.messagesEndRef} />
        </MessagesArea>

        {/* Response Style */}
        <ResponseStyleSelector
          activeStyle={coach.responseStyle}
          onStyleChange={coach.setResponseStyle as (s: ResponseStyle) => void}
        />

        {/* Voice Settings — Gemini TTS toggle + voice picker */}
        <VoiceSettingsBar
          enabled={tts.enabled}
          speaking={tts.speaking}
          voice={tts.voice}
          voiceOptions={tts.voiceOptions}
          onToggle={tts.toggleEnabled}
          onVoiceChange={tts.setVoice}
        />

        {/* Attachment Preview */}
        <AttachmentPreview files={attachments.files} onRemove={attachments.removeFile} />

        {/* Neural Link pill — pre-loads macro nutrition context */}
        <NeuralLinkPill
          type="button"
          $active={macroLinkActive}
          onClick={handleNeuralLink}
          title="Pre-load macro nutrition context for AI responses"
        >
          ⚡ Neural Link: Macro Context
        </NeuralLinkPill>

        {/* Input Bar */}
        <CoachInputBar
          onSend={handleSend}
          sending={coach.sending}
          ttsEnabled={tts.enabled}
          ttsSupported={tts.supported}
          onTtsToggle={tts.toggleEnabled}
          onVoiceOverlay={handleOpenVoiceOverlay}
          attachButton={
            <FileAttachmentButton
              onFilesSelected={attachments.addFiles}
              inputRef={attachments.inputRef}
              disabled={coach.sending}
            />
          }
        />
      </MainPanel>

      {/* Teach Mode Panel — right-side exercise encyclopedia */}
      <Suspense fallback={null}>
        <CoachTeachModePanel teachMode={teachMode} />
      </Suspense>

      {/* Voice Recording Overlay */}
      <VoiceRecordingOverlay
        isOpen={voiceOverlayOpen}
        onClose={handleCloseVoiceOverlay}
        onTranscribed={handleVoiceTranscribed}
      />
    </PageShell>
  );
};

export default SwanCoachAssistantPage;
