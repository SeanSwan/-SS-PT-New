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

import React, { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { MessageCircle, PanelLeftOpen, BookOpen } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAIChat } from '../../../../hooks/useAIChat';
import { useAuth } from '../../../../hooks/useAuth';
import { usePaywall } from '../../../../context/PaywallContext';
import { useGlobalClient } from '../../../../context/GlobalClientContext';
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
import {
  useFileAttachment,
  hasTranscriptClassFile,
  countTranscriptClassFiles,
  isTranscriptClassMime,
} from './hooks/useFileAttachment';
import { useTranscriptIntake } from './hooks/useTranscriptIntake';
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
  width: 44px;
  height: 44px;
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
  width: 44px;
  height: 44px;
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
  const { showPaywall } = usePaywall();
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);
  const coach = useCoachAssistant({ chat, targetClientId: selectedClient?.id ?? null });
  const tts = usePremiumTTS();
  const teachMode = useCoachTeachMode();
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [macroLinkActive, setMacroLinkActive] = useState(false);
  // SPRINT B: transcript text injected into CoachInputBar when user chooses "Edit".
  // Uses { text, seq } nonce so identical text can inject on repeated edits.
  const [pendingVoiceEdit, setPendingVoiceEdit] = useState<{ text: string; seq: number } | null>(null);
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
        const result = await coach.sendMessageWithFood(message, foodContext);
        if (cancelled) return;
        if (result?.paywallRequired) {
          // Free-tier user — surface the paywall overlay so they can upgrade
          showPaywall('Swan Coach', {
            requiredTier: (result as any).requiredTier ?? 'pro',
            message: (result as any).message,
            code: (result as any).code,
            upgradeUrl: (result as any).upgradeUrl,
          });
          // Keep storage so the query survives a successful upgrade + re-navigation
          return;
        }
        // Only clear storage on confirmed success
        const succeeded = result && !result.failed && result.role === 'assistant';
        if (succeeded) sessionStorage.removeItem('swan:pending-coach-food');
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

  // ── Get user role from Redux auth store (replaces stale localStorage read) ──
  const { user: authUser } = useAuth();
  const userRole = (authUser?.role ?? 'admin') as 'admin' | 'trainer' | 'client';

  // ── Cross-dashboard client handoff (Sprint D) ──
  const { clientList, activeClient, setActiveClient, loadingClients } = useGlobalClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientIdNumber = (() => {
    const raw = searchParams.get('clientId');
    const n = raw ? parseInt(raw, 10) : NaN;
    return isNaN(n) ? null : n;
  })();

  // ── Canonical handler: keeps local state + GlobalClientContext + URL param in sync ──
  // Every code path that selects or clears a client goes through this one function.
  // setSelectedClient is a stable useState dispatch — included in deps to satisfy exhaustive-deps.
  const adoptClient = useCallback((client: ClientInfo | null) => {
    setSelectedClient(client);
    setActiveClient(
      client
        ? {
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            photo: client.profileImageUrl,
          }
        : null,
    );
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (client) {
          next.set('clientId', String(client.id));
        } else {
          next.delete('clientId');
        }
        return next;
      },
      { replace: true },
    );
  }, [setSelectedClient, setActiveClient, setSearchParams]);

  // Tracks whether GlobalClientProvider has positively started its first fetch cycle.
  // loadingClients starts as false (GlobalClientContext.tsx:65) — we cannot distinguish
  // "not yet started" from "finished loading" using loadingClients alone on the first render.
  // This ref flips to true the first time we observe loadingClients=true, confirming a real
  // fetch cycle has begun. After that, loadingClients=false means the cycle is complete.
  const clientListFetchStartedRef = React.useRef(false);

  // ── URL-param hydration + GlobalClientContext fallback ──
  // Precedence: (1) valid URL param wins, (2) keep manual selection, (3) fallback from activeClient.
  //
  // Three loading states:
  //   A) !clientListFetchStartedRef.current && !loadingClients → pre-load window, do nothing
  //   B)  loadingClients                                        → fetch in progress, do nothing
  //   C)  clientListFetchStartedRef.current && !loadingClients → load cycle complete, safe to act
  useEffect(() => {
    if (userRole !== 'admin' && userRole !== 'trainer') return;

    // State B: fetch in progress — mark as started and wait.
    if (loadingClients) {
      clientListFetchStartedRef.current = true;
      return;
    }

    // State A: pre-load window — GlobalClientProvider's useEffect hasn't fired yet.
    // Do NOT draw any conclusions about the URL param; the list is empty only because
    // the fetch hasn't started, not because the client truly doesn't exist.
    if (!clientListFetchStartedRef.current) return;

    // State C: load cycle has completed at least once. Now safe to act.

    if (clientIdNumber !== null) {
      const found = clientList.find(c => c.id === clientIdNumber);

      if (found) {
        // Already showing this exact client — skip redundant dispatch
        if (selectedClient?.id === clientIdNumber) return;
        adoptClient({
          id: found.id,
          firstName: found.firstName,
          lastName: found.lastName,
          email: found.email,
          profileImageUrl: found.photo,
        });
        return;
      }

      // List loaded, param present, client not found → URL is invalid.
      // Clear everything so the page is honest: no stale previous client under a mismatched URL.
      // (Handles legitimate zero-client admin correctly — clientList.length===0 after load.)
      adoptClient(null);
      return;
    }

    // No URL param: hydrate from activeClient only if no manual selection is active.
    // setSelectedClient only — activeClient is already in global context, and we must
    // not add ?clientId= when this page was opened without one.
    if (!selectedClient && activeClient) {
      setSelectedClient({
        id: activeClient.id,
        firstName: activeClient.firstName,
        lastName: activeClient.lastName,
        email: activeClient.email,
        profileImageUrl: activeClient.photo,
      });
    }
  }, [clientIdNumber, clientList, loadingClients, activeClient, userRole, selectedClient, adoptClient]);

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
  // SPRINT B: "Send to Swan Coach" from preview state → command/chat routing
  const handleVoiceTranscribed = useCallback((text: string) => {
    coach.sendMessage(text);
    setVoiceOverlayOpen(false);
  }, [coach]);
  // SPRINT B: "Edit" from preview state → drop transcript into input bar.
  // Increments seq so repeated identical transcripts still trigger injection.
  const handleVoiceEditTranscript = useCallback((text: string) => {
    setPendingVoiceEdit(prev => ({ text, seq: (prev?.seq ?? 0) + 1 }));
    setVoiceOverlayOpen(false);
  }, []);

  // ── Neural Link: set macro_logging context for next conversation ──
  const handleNeuralLink = useCallback(async () => {
    setMacroLinkActive(prev => !prev);
    if (!macroLinkActive) {
      await chat.createConversation('macro_logging', 'Macro Context Session');
    }
  }, [chat, macroLinkActive]);

  // ── Track last attempted message for retry on error ──
  const [lastAttempt, setLastAttempt] = useState<string | null>(null);

  // ── Swan-first transcript intake ──
  // canonical-surface-audit 2026-04-14:
  // The intake hook owns just the two async functions (upload + apply).
  // Message lifecycle is owned by useCoachAssistant via the four
  // appendTranscriptReview/updateTranscriptReview/transcriptReviewToResult/
  // removeTranscriptMessages helpers, called from the page-level handlers
  // below. This keeps the conversation in a single source of truth
  // (commandMessages) and avoids a second message store inside the hook.
  const intake = useTranscriptIntake();

  // Map review message id → backing review data + user message id, so
  // confirm/cancel handlers can look up and mutate the right message
  // without parsing back out of metadata.
  const transcriptReviewsRef = React.useRef<
    Map<
      string,
      {
        userMsgId: string;
        review: Parameters<typeof coach.appendTranscriptReview>[0];
      }
    >
  >(new Map());

  // ── Confirm a transcript review — apply parsed workout to the log ──
  const handleConfirmTranscript = useCallback(
    async (reviewMsgId: string) => {
      const entry = transcriptReviewsRef.current.get(reviewMsgId);
      if (!entry || !entry.review) return;
      // Mark applying — keeps the review card visible with a spinner
      coach.updateTranscriptReview(reviewMsgId, { applying: true, applyError: undefined });
      const apply = await intake.applyParsedWorkout(entry.review);
      if (apply.ok) {
        coach.transcriptReviewToResult(reviewMsgId, {
          clientId: entry.review.clientId,
          clientName: entry.review.clientName,
          exerciseCount: apply.result.exerciseCount,
          totalSets: apply.result.totalSets,
          workoutId: apply.result.workoutId,
          xpAwarded: apply.result.xpAwarded,
          streakDays: apply.result.streakDays,
          fileName: entry.review.fileName,
        });
        transcriptReviewsRef.current.delete(reviewMsgId);
      } else {
        // Failure path: keep the review card visible so the user can retry.
        coach.updateTranscriptReview(reviewMsgId, {
          applying: false,
          applyError: apply.failure.error,
        });
      }
    },
    [coach, intake],
  );

  // ── Cancel/discard a transcript review — removes both messages ──
  const handleCancelTranscript = useCallback(
    (reviewMsgId: string) => {
      const entry = transcriptReviewsRef.current.get(reviewMsgId);
      if (!entry) return;
      coach.removeTranscriptMessages(entry.userMsgId, reviewMsgId);
      transcriptReviewsRef.current.delete(reviewMsgId);
    },
    [coach],
  );

  // ── Wrap send to route by attachment type ──
  // Transcript-class attachments take a different path than chat:
  //   1. Require a selected client (block with clear error if missing)
  //   2. Allow exactly one transcript-class file (multi-file already
  //      blocked by useFileAttachment, but defense-in-depth here)
  //   3. Upload via /api/workout-logs/upload
  //   4. Inject a review card into the conversation
  //   5. Clear attachments
  // Text-only sends and chat-image sends still use the existing flow
  // unchanged — only the transcript-class branch is new.
  const handleSend = useCallback(
    async (text: string) => {
      coach.clearError();
      const files = attachments.files;

      // Only intercept if at least one attached file is transcript-class.
      // Other attachments + plain text continue to use the existing flow.
      if (files.length > 0 && hasTranscriptClassFile(files)) {
        // Defense-in-depth: useFileAttachment already enforces single-
        // transcript-per-send, but re-check at send time so a future
        // change to the picker can't slip through.
        if (countTranscriptClassFiles(files) > 1) {
          coach.clearError();
          // Surface via the lastAttempt + error path — keeping it minimal.
          // The picker error already showed when the second file was added.
          return;
        }

        // Selected client is mandatory for transcript intake.
        if (!selectedClient?.id) {
          coach.clearError();
          coach.appendTranscriptReview({
            transcript: '',
            parsedWorkout: { exercises: [] },
            fileName: files.find((f) => isTranscriptClassMime(f.type))!.name,
            fileSize: files.find((f) => isTranscriptClassMime(f.type))!.size,
            fileMimeType: files.find((f) => isTranscriptClassMime(f.type))!.type,
            clientId: 0,
            applyError:
              'Select a client at the top of the page before uploading a transcript.',
          });
          return;
        }

        const transcriptFile = files.find((f) => isTranscriptClassMime(f.type))!;
        const upload = await intake.uploadTranscript(
          transcriptFile.file,
          selectedClient.id,
          `${selectedClient.firstName} ${selectedClient.lastName}`.trim(),
        );

        if (upload.ok) {
          const { userMsgId, reviewMsgId } = coach.appendTranscriptReview(upload.review);
          if (reviewMsgId) {
            transcriptReviewsRef.current.set(reviewMsgId, {
              userMsgId,
              review: upload.review,
            });
          }
          attachments.clearFiles();
          return;
        }

        // Upload failure — inject an error-only review card so the user
        // sees what went wrong but does not lose other inputs.
        coach.appendTranscriptReview({
          transcript: '',
          parsedWorkout: { exercises: [] },
          fileName: transcriptFile.name,
          fileSize: transcriptFile.size,
          fileMimeType: transcriptFile.type,
          clientId: selectedClient.id,
          clientName: `${selectedClient.firstName} ${selectedClient.lastName}`.trim(),
          applyError: upload.failure.error,
        });
        attachments.clearFiles();
        return;
      }

      // Existing flow — text-only or non-transcript attachments.
      setLastAttempt(text);
      coach.sendMessage(text);
      attachments.clearFiles();
    },
    [coach, attachments, intake, selectedClient],
  );

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
            onSelectClient={adoptClient}
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
              onConfirmCommand={coach.confirmCommand}
              onCancelCommand={coach.cancelCommand}
              onConfirmTranscript={handleConfirmTranscript}
              onCancelTranscript={handleCancelTranscript}
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
          externalText={pendingVoiceEdit}
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
        onEditTranscript={handleVoiceEditTranscript}
      />
    </PageShell>
  );
};

export default SwanCoachAssistantPage;
