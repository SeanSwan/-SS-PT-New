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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAIChat } from '../../../../hooks/useAIChat';
import { useAuth } from '../../../../hooks/useAuth';
import { usePaywall } from '../../../../context/PaywallContext';
import { useGlobalClient } from '../../../../context/GlobalClientContext';
import { useCoachAssistant } from './hooks/useCoachAssistant';
import { usePremiumTTS } from './hooks/usePremiumTTS';
import { useConversationSidebar } from './hooks/useConversationSidebar';
import { useScrollLock } from './hooks/useScrollLock';
import { useCoachTeachMode } from './hooks/useCoachTeachMode';
import { useCoachIntakeQueue } from '../../../../hooks/useCoachIntakeQueue';
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
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import {
  itemReviewHref,
  pickNextItem,
  queueScopedHref,
} from './CoachIntakeWorkspace.utils';
import {
  useFileAttachment,
  hasTranscriptClassFile,
  countTranscriptClassFiles,
  hasOnlyAudioTranscriptFiles,
  isTranscriptClassMime,
} from './hooks/useFileAttachment';
import { useTranscriptIntake } from './hooks/useTranscriptIntake';
import { createCoachTextIntake } from '../../../../services/coachIntakeService';
import { uploadClips } from '../../../../services/plaudClipService';
import { getLocalIsoDate } from '../../../../utils/localDate';
import {
  CoachHeader,
  CoachTitle,
  CoachHeaderIcon,
  MessagesArea,
} from './SwanCoachStyles';
import type { ResponseStyle } from './SwanCoachTypes';

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
// SECTION: Phase 13.2 transcript processing card
// PURPOSE: visible in-flight state for transcript/doc send so the user
//          sees an obvious "we accepted the file and are working on it"
//          signal between send and review card append. The existing
//          ThinkingIndicator is chat-only (driven by coach.sending) and
//          the transcript lane bypasses chat, so we need a dedicated
//          card here. Keyframes are inlined directly in the template
//          literal (no `${}` interpolation into styled-components
//          primitives — complies with CLAUDE.md rule 43).
// ─────────────────────────────────────────────────────────────

const TranscriptProcessingCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  margin: 0 12px 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, rgba(0, 32, 96, 0.4));
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-left: 3px solid var(--accent-primary, #60C0F0);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  min-height: 56px;

  @keyframes swan-processing-pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.08); }
  }
`;

const ProcessingDots = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const ProcessingDot = styled.span<{ $delay: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent-primary, #60C0F0);
  animation: swan-processing-pulse 1.4s ease-in-out infinite;
  animation-delay: ${(p) => p.$delay};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.9;
  }
`;

const ProcessingBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`;

const ProcessingStage = styled.span`
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
`;

const ProcessingFileName = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  const { user: authUser } = useAuth();
  const userRole = (authUser?.role ?? 'admin') as 'admin' | 'trainer' | 'client';
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);
  const coachIntakeQueue = useCoachIntakeQueue({
    scope: 'actionable',
    limit: 3,
    enabled: userRole === 'admin' || userRole === 'trainer',
  });
  const {
    items: coachIntakeItems,
    refresh: refreshCoachIntakeQueue,
    scope: coachIntakeScope,
  } = coachIntakeQueue;
  const coach = useCoachAssistant({
    chat,
    targetClientId: selectedClient?.id ?? null,
  });
  const tts = usePremiumTTS();
  const teachMode = useCoachTeachMode();
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [macroLinkActive, setMacroLinkActive] = useState(false);
  // SPRINT B: transcript text injected into CoachInputBar when user chooses "Edit".
  // Uses { text, seq } nonce so identical text can inject on repeated edits.
  const [pendingVoiceEdit, setPendingVoiceEdit] = useState<{ text: string; seq: number } | null>(null);
  const injectInputText = useCallback((text: string) => {
    setPendingVoiceEdit(prev => ({ text, seq: (prev?.seq ?? 0) + 1 }));
  }, []);
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
  // ── Cross-dashboard client handoff (Sprint D) ──
  const { clientList, activeClient, setActiveClient, loadingClients } = useGlobalClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
  // Four loading states:
  //   A)  !ref && !loadingClients && clientList.length === 0 → pre-load window, do nothing
  //   B)   loadingClients                                    → fetch in progress, do nothing
  //   C)    ref && !loadingClients                           → observed a load cycle, safe to act
  //   D)  !ref && !loadingClients && clientList.length > 0   → list was already populated
  //                                                            before we mounted (pre-loaded by
  //                                                            GlobalClientProvider). Implicit
  //                                                            confirmation of a completed fetch.
  //                                                            Safe to act AND flip the ref.
  //
  // Phase 9.1 hotfix 2026-04-14: Without state D, navigating into Coach
  // Assistant from another dashboard page (where a client was already
  // selected) left the picker stuck on "Select a client..." while the
  // left rail correctly showed activeClient. loadingClients never
  // transitioned to true during the mount window, so the ref never
  // flipped, and the hydration fallback was silently stranded.
  useEffect(() => {
    if (userRole !== 'admin' && userRole !== 'trainer') return;

    // State B: fetch in progress — mark as started and wait.
    if (loadingClients) {
      clientListFetchStartedRef.current = true;
      return;
    }

    // State D: list was already populated by a prior page's fetch. Treat as
    // equivalent to observing a completed load cycle.
    if (!clientListFetchStartedRef.current && clientList.length > 0) {
      clientListFetchStartedRef.current = true;
    }

    // State A: genuine pre-load window — empty list, no fetch observed yet.
    // Do NOT draw any conclusions about the URL param; the list is empty only because
    // the fetch hasn't started, not because the client truly doesn't exist.
    if (!clientListFetchStartedRef.current) return;

    // State C or D: safe to act.

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
  const handleVoiceTranscribed = useCallback(async (text: string) => {
    const result = await coach.sendMessage(text);
    if (result && typeof result === 'object' && 'failed' in result && result.failed) {
      const original = 'originalMessage' in result && typeof result.originalMessage === 'string'
        ? result.originalMessage
        : text;
      injectInputText(original);
    }
    setVoiceOverlayOpen(false);
  }, [coach, injectInputText]);
  // SPRINT B: "Edit" from preview state → drop transcript into input bar.
  // Increments seq so repeated identical transcripts still trigger injection.
  const handleVoiceEditTranscript = useCallback((text: string) => {
    injectInputText(text);
    setVoiceOverlayOpen(false);
  }, [injectInputText]);

  // ── Neural Link: set macro_logging context for next conversation ──
  const handleNeuralLink = useCallback(async () => {
    setMacroLinkActive(prev => !prev);
    if (!macroLinkActive) {
      await chat.createConversation('macro_logging', 'Macro Context Session');
    }
  }, [chat, macroLinkActive]);

  // ── Track last attempted message for retry on error ──
  const [lastAttempt, setLastAttempt] = useState<string | null>(null);

  // ── Phase 13.2 (2026-04-15) transcript processing status ──
  // Drives the visible pending card that appears above the chat while a
  // transcript/doc file is being uploaded, parsed, or the review is being
  // built. The existing `coach.sending` flag is chat-only — the transcript
  // lane bypasses that flag because it does not route through the AI chat
  // pipeline. Without this, the user sent a file and stared at a silent
  // UI until the review card appeared (or, on failure, nothing at all).
  //
  // Stages:
  //   - 'uploading' → POST /api/workout-logs/upload is in flight
  //   - 'parsing'   → upload resolved, review card is being appended
  //                   (extremely fast in practice, but useful as a stage
  //                   so the spinner never just blinks)
  //   - null        → idle
  //
  // Failures transition to null here AND route through the existing
  // `appendTranscriptError` path in useCoachAssistant, so the user gets
  // both the "we stopped processing" signal AND the scoped error card.
  const [transcriptProcessing, setTranscriptProcessing] = useState<
    | { stage: 'uploading' | 'parsing'; fileName: string }
    | null
  >(null);
  const audioReviewNextPendingRef = React.useRef(false);
  const [audioReviewNextPending, setAudioReviewNextPending] = useState(false);

  // ── Swan-first transcript intake ──
  // canonical-surface-audit 2026-04-14:
  // The intake hook owns just the two async functions (upload + apply).
  // Message lifecycle is owned by useCoachAssistant via the four
  // appendTranscriptReview/updateTranscriptReview/transcriptReviewToResult/
  // removeTranscriptMessages helpers, called from the page-level handlers
  // below. This keeps the conversation in a single source of truth
  // (commandMessages) and avoids a second message store inside the hook.
  const intake = useTranscriptIntake();

  // Map message id → backing review data (or null for error entries) +
  // user message id, so confirm/cancel handlers can look up and mutate
  // the right message without parsing back out of metadata.
  //
  // Phase 9.1 hotfix: error entries (no-client validation, upload failures)
  // store `review: null` so handleConfirmTranscript can safely no-op on
  // non-actionable entries. The Dismiss handler uses the same map.
  const transcriptReviewsRef = React.useRef<
    Map<
      string,
      {
        userMsgId: string;
        review: Parameters<typeof coach.appendTranscriptReview>[0] | null;
      }
    >
  >(new Map());

  // ── Confirm a transcript review — apply parsed workout to the log ──
  // Error entries store `review: null`, so this handler is a safe no-op
  // for those; the error card never exposes an Apply button anyway, but
  // defense-in-depth matters for the ref map.
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
        // Phase 13: propagate failure kind so CoachMessage can render a
        // duplicate-date / future-date hint in the editable date control.
        coach.updateTranscriptReview(reviewMsgId, {
          applying: false,
          applyError: apply.failure.error,
          applyErrorKind:
            apply.failure.kind === 'duplicate_date'
              ? 'duplicate_date'
              : apply.failure.kind === 'future_date'
                ? 'future_date'
                : apply.failure.kind === 'validation'
                  ? 'validation'
                  : apply.failure.kind === 'network'
                    ? 'network'
                    : apply.failure.kind === 'server'
                      ? 'server'
                      : 'other',
        });
      }
    },
    [coach, intake],
  );

  // ── Phase 13: user-edited workout date on a transcript review card ──
  // Mutates the ref-held review (so applyParsedWorkout picks up the new
  // value at confirm time) and also patches the message metadata (so the
  // visible date input reflects the edit on every re-render). Clears any
  // stale duplicate-date/future-date error so the user gets a clean retry.
  const handleTranscriptDateChange = useCallback(
    (reviewMsgId: string, nextDate: string) => {
      const entry = transcriptReviewsRef.current.get(reviewMsgId);
      if (entry && entry.review) {
        entry.review.targetWorkoutDate = nextDate;
      }
      coach.updateTranscriptReview(reviewMsgId, {
        targetWorkoutDate: nextDate,
        applyError: undefined,
        applyErrorKind: undefined,
      });
    },
    [coach],
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
  //   1. Send audio without a selected client to PLAUD intake first.
  //   2. Send one audio/text/PDF transcript directly to review when a
  //      client is selected; send multi-audio batches to PLAUD intake for
  //      merge/order review.
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
        const routeAudioFilesToPlaudIntake = async (audioFiles: typeof files, audioLabel: string) => {
          setTranscriptProcessing({ stage: 'uploading', fileName: audioLabel });
          try {
            const upload = await uploadClips(audioFiles.map((f) => f.file));
            setTranscriptProcessing(null);
            if (upload.clips.length > 0) {
              coach.appendAudioIntakeReceipt({
                fileName: audioLabel,
                acceptedCount: upload.clips.length,
                rejectedCount: upload.rejected.length,
                fileSize: upload.clips.reduce((sum, clip) => sum + clip.size, 0),
                nextActionLabel: 'Review next intake',
                rejectedSummary: upload.rejected.length > 0
                  ? upload.rejected.map((r) => `${r.filename}: ${r.message}`).join('; ')
                  : undefined,
              });
              attachments.clearFiles();
              void coachIntakeQueue.refresh();
              return;
            }

            const reason = upload.rejected.length > 0
              ? upload.rejected.map((r) => `${r.filename}: ${r.message}`).join('; ')
              : 'No audio clips were accepted into PLAUD intake.';
            const { userMsgId, errorMsgId } = coach.appendTranscriptError({
              kind: 'upload_failed',
              fileName: audioLabel,
              fileSize: audioFiles.reduce((sum, f) => sum + f.size, 0),
              reason,
            });
            if (errorMsgId) {
              transcriptReviewsRef.current.set(errorMsgId, { userMsgId, review: null });
            }
          } catch (err) {
            setTranscriptProcessing(null);
            const reason = err instanceof Error
              ? err.message
              : 'Audio upload failed before it reached PLAUD intake.';
            const { userMsgId, errorMsgId } = coach.appendTranscriptError({
              kind: 'upload_failed',
              fileName: audioLabel,
              fileSize: audioFiles.reduce((sum, f) => sum + f.size, 0),
              reason,
            });
            if (errorMsgId) {
              transcriptReviewsRef.current.set(errorMsgId, { userMsgId, review: null });
            }
          }
        };

        if (hasOnlyAudioTranscriptFiles(files) && files.length > 1) {
          await routeAudioFilesToPlaudIntake(files, `${files.length} audio pieces`);
          return;
        }

        // Defense-in-depth: useFileAttachment already enforces single-
        // transcript-per-send, but re-check at send time so a future
        // change to the picker can't slip through.
        if (countTranscriptClassFiles(files) > 1) {
          coach.clearError();
          // Surface via the lastAttempt + error path — keeping it minimal.
          // The picker error already showed when the second file was added.
          return;
        }

        const transcriptFile = files.find((f) => isTranscriptClassMime(f.type))!;
        const hasSelectedClient = Boolean(selectedClient?.id);
        const isSingleUnresolvedAudio = hasOnlyAudioTranscriptFiles(files)
          && files.length === 1
          && !hasSelectedClient;

        if (isSingleUnresolvedAudio) {
          await routeAudioFilesToPlaudIntake(files, transcriptFile.name);
          return;
        }

        // Selected client is mandatory for transcript intake.
        // Phase 9.1 hotfix: use the dedicated transcriptError card instead
        // of a fake review card, and register the ids in the same ref map
        // so Dismiss actually removes the message (prior bug: Cancel was
        // a no-op because the validation path never captured the ids).
        //
        // Phase 9.1.1 polish 2026-04-14: do NOT clear attachments here.
        // The user needs to select a client and hit send again — forcing
        // a re-pick of the file after every mis-click is hostile UX. The
        // attachment preview's own Remove button lets the user discard
        // manually if they change their mind.
        if (!selectedClient?.id) {
          const { userMsgId, errorMsgId } = coach.appendTranscriptError({
            kind: 'no_client',
            fileName: transcriptFile.name,
            fileSize: transcriptFile.size,
            reason: 'Select a client at the top of the page before uploading a transcript.',
          });
          if (errorMsgId) {
            transcriptReviewsRef.current.set(errorMsgId, { userMsgId, review: null });
          }
          return;
        }

        // Phase 13.2: mark the transcript processing state BEFORE awaiting
        // the upload so the user sees a visible spinner/stage card as soon
        // as they hit send. Cleared on all exit paths (success / upload
        // failure / exception) so we never strand the pending card on
        // screen.
        setTranscriptProcessing({ stage: 'uploading', fileName: transcriptFile.name });

        const upload = await intake.uploadTranscript(
          transcriptFile.file,
          selectedClient.id,
          `${selectedClient.firstName} ${selectedClient.lastName}`.trim(),
        );

        if (upload.ok) {
          // Advance the stage briefly so the user sees the transition from
          // upload to review-building. The append is synchronous but the
          // stage flip gives the indicator a non-flash moment of "parsing".
          setTranscriptProcessing({ stage: 'parsing', fileName: transcriptFile.name });
          // Phase 13: seed targetWorkoutDate so the editable date input has
          // a stable initial value. Priority: parser-extracted date > today.
          // The review object in the ref and the metadata are the same
          // reference at this point — mutating here sets it in both places.
          // Phase 13.1 (2026-04-15): use LOCAL calendar day, not UTC. Prior
          // shortcut seeded tomorrow as the "today" default for PDT users
          // after ~5pm, which then needed an edit before the user even
          // noticed it was wrong.
          const seededDate =
            (upload.review.parsedWorkout.date && upload.review.parsedWorkout.date.trim()) ||
            getLocalIsoDate();
          upload.review.targetWorkoutDate = seededDate;

          const { userMsgId, reviewMsgId } = coach.appendTranscriptReview(upload.review);
          if (reviewMsgId) {
            transcriptReviewsRef.current.set(reviewMsgId, {
              userMsgId,
              review: upload.review,
            });
          }
          attachments.clearFiles();
          // Happy path done — clear the pending card. The visible review
          // card now carries all subsequent state (confirm / error / retry).
          setTranscriptProcessing(null);
          return;
        }

        // Upload resolved with an error outcome — clear the pending card
        // before we inject the transcriptError row so the user sees a
        // clean handoff from "processing…" to the scoped error card.
        setTranscriptProcessing(null);

        // Upload-stage failure — inject a transcriptError card (dismissible,
        // NO fake Apply button). The Phase 9 regression was that this path
        // reused appendTranscriptReview and the discarded return value left
        // Dismiss as a no-op.
        //
        // Phase 9.1.1 polish 2026-04-14: do NOT clear attachments here
        // either. Most upload-failure kinds are retryable with the same
        // file (rate limit, network blip, transient 5xx). The few that
        // are not (unsupported format, oversize) can be discarded
        // manually via the attachment preview's Remove button. Clearing
        // unconditionally was hostile to retry flows.
        const { userMsgId, errorMsgId } = coach.appendTranscriptError({
          kind: 'upload_failed',
          fileName: transcriptFile.name,
          fileSize: transcriptFile.size,
          reason: upload.failure.error,
        });
        if (errorMsgId) {
          transcriptReviewsRef.current.set(errorMsgId, { userMsgId, review: null });
        }
        return;
      }

      // Existing flow — text-only or non-transcript attachments.
      setLastAttempt(text);
      const result = await coach.sendMessage(text);
      if (result && typeof result === 'object' && 'failed' in result && result.failed) {
        const original = 'originalMessage' in result && typeof result.originalMessage === 'string'
          ? result.originalMessage
          : text;
        injectInputText(original);
        return;
      }
      attachments.clearFiles();
    },
    [coach, attachments, coachIntakeQueue, intake, selectedClient, injectInputText],
  );

  const handleIntakeCommand = useCallback((message: string) => {
    void coach.sendMessage(message);
  }, [coach]);

  const handleAudioIntakeReviewNext = useCallback(() => {
    if (audioReviewNextPendingRef.current) return;
    audioReviewNextPendingRef.current = true;
    setAudioReviewNextPending(true);
    const coachWorkspaceHref = `/dashboard/${userRole}/coach-assistant`;
    void (async () => {
      try {
        let sourceItems = coachIntakeItems;
        const refreshedItems = await refreshCoachIntakeQueue();
        if (Array.isArray(refreshedItems)) sourceItems = refreshedItems;
        const nextItem = pickNextItem(sourceItems);
        if (nextItem) {
          navigate(queueScopedHref(itemReviewHref(nextItem, coachWorkspaceHref), coachIntakeScope));
          return;
        }
        handleIntakeCommand('review next coach intake');
      } catch {
        const nextItem = pickNextItem(coachIntakeItems);
        if (nextItem) {
          navigate(queueScopedHref(itemReviewHref(nextItem, coachWorkspaceHref), coachIntakeScope));
          return;
        }
        handleIntakeCommand('review next coach intake');
      } finally {
        audioReviewNextPendingRef.current = false;
        setAudioReviewNextPending(false);
      }
    })();
  }, [
    coachIntakeItems,
    coachIntakeScope,
    handleIntakeCommand,
    navigate,
    refreshCoachIntakeQueue,
    userRole,
  ]);

  const handleCreateIntakeDraft = useCallback(async (text: string) => {
    try {
      await createCoachTextIntake({
        text,
        clientId: selectedClient?.id ?? null,
        trigger: 'oversized_chat',
      });
      await coachIntakeQueue.refresh();
      return {
        ok: true,
        message: 'Saved as an encrypted Coach intake draft. Use Review next intake to continue.',
      };
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Could not create Coach intake draft.';
      return { ok: false, message };
    }
  }, [coachIntakeQueue, selectedClient?.id]);

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

        {/* Client Picker — trainer/admin only, routes AI data to selected client.
            Phase 12 hotfix: client list now comes from GlobalClientContext,
            so the `userRole` prop is no longer consumed by the picker. Kept
            off the call site to reduce noise. */}
        {(userRole === 'trainer' || userRole === 'admin') && (
          <ClientPicker
            selectedClient={selectedClient}
            onSelectClient={adoptClient}
          />
        )}

        {/* Capability Taxonomy (informational) */}
        <ContextChipBar userRole={userRole} />

        <CoachIntakeWorkspace
          userRole={userRole}
          activeIntakeId={searchParams.get('intake')}
          selectedClientName={
            selectedClient
              ? `${selectedClient.firstName} ${selectedClient.lastName}`.trim()
              : null
          }
          onCommandPrompt={handleIntakeCommand}
          queue={coachIntakeQueue}
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
              onAudioIntakeReviewNext={handleAudioIntakeReviewNext}
              audioIntakeReviewNextPending={audioReviewNextPending}
              onTranscriptDateChange={handleTranscriptDateChange}
            />
          ))}

          {/* Thinking indicator replaces old TypingDots */}
          <ThinkingIndicator isThinking={coach.sending} />

          {/* Phase 13.2: transcript/doc processing card. Visible whenever
              a transcript-class file is in flight (upload + parse). Scoped
              to the transcript lane — does NOT overlap with the normal
              chat ThinkingIndicator above. On success it clears and the
              review card takes over; on failure it clears and the
              transcriptError card takes over via useCoachAssistant. */}
          {transcriptProcessing && (
            <TranscriptProcessingCard
              data-testid="transcript-processing-card"
              role="status"
              aria-live="polite"
            >
              <ProcessingDots aria-hidden="true">
                <ProcessingDot $delay="0s" />
                <ProcessingDot $delay="0.2s" />
                <ProcessingDot $delay="0.4s" />
              </ProcessingDots>
              <ProcessingBody>
                <ProcessingStage data-testid="transcript-processing-stage">
                  {transcriptProcessing.stage === 'uploading'
                    ? 'Uploading and transcribing…'
                    : 'Parsing workout and building review…'}
                </ProcessingStage>
                <ProcessingFileName>{transcriptProcessing.fileName}</ProcessingFileName>
              </ProcessingBody>
            </TranscriptProcessingCard>
          )}

          {/* Error banner — surfaces errors that were previously silent */}
          {coach.error && !coach.sending && (
            <ErrorBanner>
              <span>{coach.error}</span>
              {coach.lastErrorRetryable && lastAttempt && (
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
        {/* Phase 13.2: `hasAttachment` unlocks file-only send when a
            transcript-class file is staged, so users can drop a document
            and hit send without typing. While a transcript is processing,
            we also disable the composer so double-fire is impossible. */}
        <CoachInputBar
          onSend={handleSend}
          sending={coach.sending || transcriptProcessing !== null}
          ttsEnabled={tts.enabled}
          ttsSupported={tts.supported}
          onTtsToggle={tts.toggleEnabled}
          onVoiceOverlay={handleOpenVoiceOverlay}
          onCreateIntakeDraft={handleCreateIntakeDraft}
          externalText={pendingVoiceEdit}
          hasAttachment={
            attachments.files.length > 0 && hasTranscriptClassFile(attachments.files)
          }
          attachButton={
            <FileAttachmentButton
              onFilesSelected={attachments.addFiles}
              inputRef={attachments.inputRef}
              disabled={coach.sending || transcriptProcessing !== null}
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
