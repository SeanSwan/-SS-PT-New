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

// ─────────────────────────────────────────────────────────────
// SECTION: Main Page Component
// ─────────────────────────────────────────────────────────────
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
  const coach = useCoachAssistant({ chat });
  const tts = usePremiumTTS();
  const teachMode = useCoachTeachMode();
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const attachments = useFileAttachment();

  // Load conversation list on mount
  useEffect(() => {
    chat.listConversations();
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
  const lastMsgRef = React.useRef<string>('');
  React.useEffect(() => {
    if (!tts.enabled || !coach.messages.length) return;
    const lastMsg = coach.messages[coach.messages.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.id !== lastMsgRef.current) {
      lastMsgRef.current = lastMsg.id;
      tts.speak(lastMsg.content);
    }
  }, [coach.messages, tts]);

  // ── Voice overlay handlers ──
  const handleOpenVoiceOverlay = useCallback(() => setVoiceOverlayOpen(true), []);
  const handleCloseVoiceOverlay = useCallback(() => setVoiceOverlayOpen(false), []);
  const handleVoiceTranscribed = useCallback((text: string) => {
    coach.sendMessage(text);
    setVoiceOverlayOpen(false);
  }, [coach]);

  // ── Wrap send to clear attachments after sending ──
  const handleSend = useCallback((text: string) => {
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
