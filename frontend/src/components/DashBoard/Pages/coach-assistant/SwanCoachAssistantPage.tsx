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
 * │ [+ New Coach Thread] │ ☰  Swan Coach Assistant  [📖] │ BookOpen     │
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

import React, { useEffect, useMemo, lazy, Suspense } from 'react';
import { MessageCircle, PanelLeftOpen, BookOpen } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAIChat } from '../../../../hooks/useAIChat';
import { useAuth } from '../../../../hooks/useAuth';
import { useCoachAssistant } from './hooks/useCoachAssistant';
import { useConversationSidebar } from './hooks/useConversationSidebar';
import { useScrollLock } from './hooks/useScrollLock';
import { useCoachTeachMode } from './hooks/useCoachTeachMode';
import { useCoachIntakeQueue } from '../../../../hooks/useCoachIntakeQueue';
import { ContextChipBar } from './ContextChipBar';
import ConversationSidebar from './ConversationSidebar';
import ClientPicker from '../../../AIAssistant/ClientPicker';
import VoiceRecordingOverlay from './VoiceRecordingOverlay';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import SwanCoachMessagesPanel from './SwanCoachMessagesPanel';
import SwanCoachComposerPanel from './SwanCoachComposerPanel';
import { useFileAttachment } from './hooks/useFileAttachment';
import { useCoachSuggestionChips } from './hooks/useCoachSuggestionChips';
import { useSwanCoachClientSelection } from './hooks/useSwanCoachClientSelection';
import { useSwanCoachVoiceControls } from './hooks/useSwanCoachVoiceControls';
import { useSwanCoachTranscriptReview } from './hooks/useSwanCoachTranscriptReview';
import { useSwanCoachSendRouting } from './hooks/useSwanCoachSendRouting';
import { useSwanCoachPendingFoodQuery } from './hooks/useSwanCoachPendingFoodQuery';
import { useSwanCoachAudioIntakeNavigation } from './hooks/useSwanCoachAudioIntakeNavigation';
import { useSwanCoachConversationActions } from './hooks/useSwanCoachConversationActions';
import { useSwanCoachRoutePrompt } from './hooks/useSwanCoachRoutePrompt';
import { buildCoachRouteContext } from './CoachRouteContext';
import { buildSwanCoachWorkoutLoggerRoute } from './SwanCoachWorkoutLoggerRoute';
import {
  CoachHeader,
  CoachTitle,
  CoachHeaderIcon,
} from './SwanCoachStyles';
import {
  MainPanel,
  PageShell,
  SidebarToggle,
  TeachModeToggle,
} from './SwanCoachAssistantPage.styles';

const CoachTeachModePanel = lazy(() => import('./CoachTeachModePanel'));

const SwanCoachAssistantPage: React.FC = () => {
  const chat = useAIChat();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const userRole = (authUser?.role ?? 'admin') as 'admin' | 'trainer' | 'client';
  const { adoptClient, searchParams, selectedClient } = useSwanCoachClientSelection(userRole);
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
  const coachRouteContext = useMemo(
    () => buildCoachRouteContext(location.pathname, location.search),
    [location.pathname, location.search],
  );
  const workoutLoggerRoute = useMemo(
    () => buildSwanCoachWorkoutLoggerRoute({
      userRole,
      selectedClientId: selectedClient?.id ?? null,
      searchParams,
    }),
    [userRole, selectedClient?.id, searchParams],
  );
  const selectedClientName = selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}`.trim() : null;
  const workoutLoggerScopeLabel = selectedClientName || (userRole === 'client' ? 'My training' : 'My workout log');
  const coach = useCoachAssistant({
    chat,
    targetClientId: selectedClient?.id ?? null,
    routeContext: coachRouteContext,
  });
  const {
    handleCloseVoiceOverlay,
    handleOpenVoiceOverlay,
    handleReadAloud,
    handleVoiceEditTranscript,
    handleVoiceTranscribed,
    injectInputText,
    pendingVoiceEdit,
    tts,
    voiceOverlayOpen,
  } = useSwanCoachVoiceControls({ coach });
  useSwanCoachRoutePrompt({ searchParams, routeState: location.state, injectInputText });
  const teachMode = useCoachTeachMode();
  const attachments = useFileAttachment();
  const {
    handleCancelTranscript,
    handleConfirmTranscript,
    handleTranscriptDateChange,
    intake,
    registerTranscriptError,
    registerTranscriptReview,
    setTranscriptProcessing,
    transcriptProcessing,
  } = useSwanCoachTranscriptReview({ coach });
  const { handleSend, lastAttempt } = useSwanCoachSendRouting({
    attachments,
    coach,
    coachIntakeQueue,
    injectInputText,
    intake,
    registerTranscriptError,
    registerTranscriptReview,
    selectedClient,
    setTranscriptProcessing,
  });
  useSwanCoachPendingFoodQuery(coach.sendMessageWithFood);
  const {
    audioReviewNextPending,
    handleAudioIntakeReviewNext,
    handleIntakeCommand,
  } = useSwanCoachAudioIntakeNavigation({
    coachIntakeItems,
    coachIntakeScope,
    refreshCoachIntakeQueue,
    sendMessage: coach.sendMessage,
    userRole,
  });
  const {
    handleCreateIntakeDraft,
    handleNeuralLink,
    handleNewChat,
    handleSelectConversation,
    macroLinkActive,
  } = useSwanCoachConversationActions({
    chat,
    coach,
    coachIntakeQueue,
    selectedClient,
  });
  const suggestionChips = useCoachSuggestionChips({
    userRole,
    messages: coach.messages,
    sending: coach.sending,
    selectedClientFirstName: selectedClient?.firstName ?? null,
  });

  useEffect(() => {
    chat.listConversations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sidebar = useConversationSidebar({
    conversations: chat.conversations,
  });

  useScrollLock(sidebar.isOpen);

  return (
    <PageShell>
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

      <MainPanel>
        <CoachHeader>
          <SidebarToggle type="button" onClick={sidebar.toggle} aria-label="Toggle conversation history">
            <PanelLeftOpen size={20} />
          </SidebarToggle>
          <CoachHeaderIcon>
            <MessageCircle size={20} />
          </CoachHeaderIcon>
          <CoachTitle>Swan Coach Assistant</CoachTitle>
          <TeachModeToggle
            type="button"
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

        <ContextChipBar userRole={userRole} />

        <CoachIntakeWorkspace
          userRole={userRole}
          activeIntakeId={searchParams.get('intake')}
          selectedClientName={selectedClientName}
          onCommandPrompt={handleIntakeCommand}
          queue={coachIntakeQueue}
        />

        <SwanCoachMessagesPanel
          audioReviewNextPending={audioReviewNextPending}
          context={coach.context}
          error={coach.error}
          lastAttempt={lastAttempt}
          lastErrorRetryable={coach.lastErrorRetryable}
          messages={coach.messages}
          messagesEndRef={coach.messagesEndRef}
          onAudioIntakeReviewNext={handleAudioIntakeReviewNext}
          onCancelCommand={coach.cancelCommand}
          onCancelTranscript={handleCancelTranscript}
          onClearError={coach.clearError}
          onConfirmCommand={coach.confirmCommand}
          onConfirmTranscript={handleConfirmTranscript}
          onReadAloud={handleReadAloud}
          onSend={handleSend}
          onTranscriptDateChange={handleTranscriptDateChange}
          responseStyle={coach.responseStyle}
          sending={coach.sending}
          suggestionChips={suggestionChips.chips}
          suggestionChipsVisible={suggestionChips.visible}
          transcriptProcessing={transcriptProcessing}
          workoutLoggerRoute={workoutLoggerRoute}
          workoutLoggerScopeLabel={workoutLoggerScopeLabel}
        />

        <SwanCoachComposerPanel
          attachments={attachments}
          macroLinkActive={macroLinkActive}
          onCreateIntakeDraft={handleCreateIntakeDraft}
          onNeuralLink={handleNeuralLink}
          onOpenVoiceOverlay={handleOpenVoiceOverlay}
          onSend={handleSend}
          pendingVoiceEdit={pendingVoiceEdit}
          responseStyle={coach.responseStyle}
          sending={coach.sending}
          setResponseStyle={coach.setResponseStyle}
          transcriptProcessing={transcriptProcessing}
          tts={tts}
        />
      </MainPanel>

      <Suspense fallback={null}>
        <CoachTeachModePanel teachMode={teachMode} />
      </Suspense>

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
