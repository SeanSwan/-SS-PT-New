/**
 * FILE: CoachCommandCenterPage.tsx
 * PURPOSE: Mounted Swan Coach Floor Mode shell for talk-first coaching, review, history, and More tools.
 * Review-gated: Swan Coach prepares operator drafts; final writes need approval.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { CommandBridgeShell } from './CoachCommandCenter.bridgeStyles';
import { useCoachCommandCenterController } from './CoachCommandCenter.controller';
import CoachChatTranscript from './CoachChatTranscript';
import CoachClientBar from './CoachClientBar';
import CoachCommandLeftRail from './CoachCommandLeftRail';
import CoachCommandOpsSurface from './CoachCommandOpsSurface';
import CoachCommandTabBar, { type CoachTab } from './CoachCommandTabBar';
import CoachCommandCenterReviewPanel from './CoachCommandCenterReviewPanelLazy';
import CoachConsoleDock from './CoachConsoleDock';
import CoachIntentBar from '../../../CoachIntentBar/CoachIntentBar';
import { useCoachCommandCatalog } from '../../../../hooks/useCoachCommandCatalog';
import { resolveCoachPresenceState } from './coachPresenceState';
import { recentClientIds } from './coachRecentClients';
import ConsoleAtmosphere from '../../../ConsoleOS/ConsoleAtmosphere';
import { useCoachCommandCenterDrawerEffects } from './useCoachCommandCenterDrawerEffects';
import { useCoachKeyboardInset } from './hooks/useCoachKeyboardInset';
import { useSwanCoachPendingFoodQuery } from './hooks/useSwanCoachPendingFoodQuery';
import { buildSwanCoachWorkoutLoggerRoute } from './SwanCoachWorkoutLoggerRoute';
import { buildSwanCoachWorkoutPlannerRoute } from './SwanCoachWorkoutPlannerRoute';
import { CANONICAL_SURFACES } from '../../../../config/canonical-surface-names';
import {
  CLIENT_NEXT_ACTION_LABEL,
  CLIENT_WORKOUTS_ROUTE,
  type CoachReviewSection,
  coachTabsForRole,
  coerceCoachTabForRole,
  hasCoachOperatorRouteContext,
  isClientCoachRole,
  normalizeCoachCommandRole,
  resolveCoachCommandDashboardRole,
  reviewSectionFromRoute,
  routeForcedTabForRole,
} from './CoachCommandCenter.roleConfig';

const CoachCommandCenterPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const authenticatedRole = normalizeCoachCommandRole(authUser?.role);
  const userRole = resolveCoachCommandDashboardRole(useLocation().pathname, authenticatedRole);
  const commandCenter = useCoachCommandCenterController({ actorId: authUser?.id, userRole });
  const commandCatalog = useCoachCommandCatalog(true);
  useSwanCoachPendingFoodQuery(commandCenter.sendMessageWithFood);
  const [searchParams, setSearchParams] = useSearchParams();
  const isClientMode = isClientCoachRole(userRole);
  const routeForcedTab = routeForcedTabForRole(searchParams, userRole);
  const routeReviewSection = reviewSectionFromRoute(searchParams);
  const hasOperatorRouteContext = hasCoachOperatorRouteContext(searchParams);
  const initialTab = routeForcedTab || 'talk';
  const [activeTab, setActiveTab] = useState<CoachTab>(() => coerceCoachTabForRole(initialTab, userRole));
  const [activeReviewSection, setActiveReviewSection] = useState<CoachReviewSection | null>(() => routeReviewSection);
  const [plaudUploadRequest, setPlaudUploadRequest] = useState(0);
  const [accountControlsOpen, setAccountControlsOpen] = useState(false);
  const handledPlaudUploadRequestRef = useRef(0);
  const pendingReviewFocusRef = useRef(false);
  useCoachCommandCenterDrawerEffects({
    commandFormRef: commandCenter.commandFormRef,
    commandText: commandCenter.commandText,
    drawer: commandCenter.drawer,
    leftRailRef: commandCenter.leftRailRef,
    onCloseDrawer: commandCenter.closeDrawer,
    rightRailRef: commandCenter.rightRailRef,
    shellRef: commandCenter.shellRef,
  });
  useCoachKeyboardInset(commandCenter.shellRef);
  const nextActionLabel = isClientMode ? CLIENT_NEXT_ACTION_LABEL : commandCenter.coachQueue.health?.nextOperatorAction?.label || 'Review next intake';
  const intakeCount = isClientMode ? 0 : commandCenter.summary.actionable;
  const plaudCount = isClientMode ? 0 : commandCenter.summary.readyReview;
  const draftCount = isClientMode ? 0 : commandCenter.summary.pendingDrafts;
  const availableTabs = coachTabsForRole(userRole);
  const selectedDisplayLabel = isClientMode ? 'My training' : commandCenter.selectedClientLabel;
  const workoutLoggerRoute = useMemo(
    () => buildSwanCoachWorkoutLoggerRoute({ userRole, selectedClientId: commandCenter.routeClientId, searchParams }),
    [commandCenter.routeClientId, searchParams, userRole],
  );
  const workoutPlannerRoute = useMemo(
    () => {
      if (isClientMode) return CLIENT_WORKOUTS_ROUTE;
      return buildSwanCoachWorkoutPlannerRoute({
        userRole,
        selectedClientId: commandCenter.routeClientId,
        workflowReturnTo: commandCenter.workflowReturnTo,
        searchParams,
      });
    },
    [commandCenter.routeClientId, commandCenter.workflowReturnTo, isClientMode, searchParams, userRole],
  );
  const workoutLoggerScopeLabel = commandCenter.routeClientId ? selectedDisplayLabel : 'My workout log';
  const workoutLoggerLabel = isClientMode ? 'Log Today' : commandCenter.routeClientId ? 'Logger' : 'My Logger';
  const clientPickerRoute = userRole === 'trainer' ? '/dashboard/trainer/clients?intent=log_workout' : '/dashboard/admin/client-management?intent=log_workout';

  const requestReviewWorkspaceFocus = () => { pendingReviewFocusRef.current = true; };
  const handleSuggestedPrompt = (prompt: string) => {
    commandCenter.setCommandText(prompt);
    commandCenter.commandTextRef.current?.focus({ preventScroll: true });
  };
  const handleIntentSubmit = (text: string) => {
    commandCenter.setCommandText(text);
    window.setTimeout(() => commandCenter.commandFormRef.current?.requestSubmit(), 0);
  };
  const handleOpenThread = (thread: (typeof commandCenter.coachThreads)[number]) => { commandCenter.handleThreadSelect(thread); setActiveTab('talk'); };
  useEffect(() => {
    if (routeForcedTab) {
      setActiveTab(routeForcedTab);
      if (routeForcedTab === 'review') setActiveReviewSection(routeReviewSection);
      return;
    }

    setActiveTab((current) => coerceCoachTabForRole(current, userRole));
  }, [hasOperatorRouteContext, isClientMode, routeForcedTab, routeReviewSection, userRole]);
  useEffect(() => {
    if (userRole !== 'admin' && accountControlsOpen) setAccountControlsOpen(false);
  }, [accountControlsOpen, userRole]);

  useEffect(() => {
    if (activeTab !== 'review' || activeReviewSection !== 'audio' || plaudUploadRequest === 0 || handledPlaudUploadRequestRef.current === plaudUploadRequest) return;
    handledPlaudUploadRequestRef.current = plaudUploadRequest;
    commandCenter.handleStartPlaudUpload();
  }, [activeReviewSection, activeTab, commandCenter, plaudUploadRequest]);

  useEffect(() => {
    if (activeTab !== 'review' || !pendingReviewFocusRef.current) return;
    pendingReviewFocusRef.current = false;
    document.getElementById('coach-tabpanel-review')?.focus({ preventScroll: true });
  }, [activeReviewSection, activeTab]);
  const handleStartPlaudUpload = () => { setActiveTab('review'); setActiveReviewSection('audio'); setPlaudUploadRequest((count) => count + 1); requestReviewWorkspaceFocus(); };
  const openIntakeReview = () => { setActiveTab('review'); setActiveReviewSection('intake'); requestReviewWorkspaceFocus(); };
  const handleReviewIntakeFromDock = () => { openIntakeReview(); commandCenter.handleReviewIntake(); };

  const handleAccountControlsToggle = () => setAccountControlsOpen((current) => !current);

  const handleOpenIntakeFromOps = () => { openIntakeReview(); commandCenter.closeDrawer(false); };
  const handleTabChange = (tab: CoachTab) => setActiveTab(coerceCoachTabForRole(tab, userRole));
  return (
    <CommandBridgeShell
      ref={commandCenter.shellRef}
      data-console-root
      data-voice-state={resolveCoachPresenceState(commandCenter)}
    >
      <ConsoleAtmosphere />
      <div className={`bridge-shell ${activeTab === 'talk' ? 'is-chat-tab' : 'is-workspace-tab'}`}>
        <CoachClientBar
          selectedClientLabel={selectedDisplayLabel}
          clientPin={commandCenter.clientPin}
          recentIds={isClientMode ? undefined : recentClientIds(commandCenter.allCoachThreads, commandCenter.clientPin.selectedClientId, 3, commandCenter.clientPin.clients.map((client) => client.id))}
          opsOpen={commandCenter.drawer === 'right'}
          showOps={!isClientMode}
          contextLabel={isClientMode ? 'Your coach terminal' : 'Now coaching'}
          newConversationLabel={isClientMode ? 'New coach chat' : 'New chat'}
          onNewConversation={commandCenter.handleNewThread}
          onOpenOps={(event) => commandCenter.openDrawer('right', event)}
        />
        <div className="coach-presence-line" aria-hidden="true" />

        <CoachCommandTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabs={availableTabs}
          intakeCount={intakeCount}
          plaudCount={plaudCount}
          draftCount={draftCount}
        />

        <div className="tab-content">
          {activeTab === 'talk' ? (
            <div className="chat-panel" id="coach-tabpanel-talk" role="tabpanel" aria-labelledby="coach-tab-talk">
              <CoachIntentBar
                commands={commandCatalog.commands}
                lockedClientId={commandCenter.routeClientId}
                pendingCount={commandCenter.summary.pendingDrafts}
                listening={commandCenter.voiceActive}
                onSubmit={handleIntentSubmit}
                onVoice={commandCenter.handleVoice}
              />
              <CoachChatTranscript
                activeThread={commandCenter.activeThread}
                busy={commandCenter.commandBusy}
                clientFacing={isClientMode}
                logs={commandCenter.logs}
                nextActionLabel={nextActionLabel}
                onCancelCommand={commandCenter.handleCancelCommand}
                onConfirmCommand={commandCenter.handleConfirmCommand}
                onRetryMessage={commandCenter.handleRetryMessage}
                onSpeak={commandCenter.speakText}
                onSuggestedPrompt={handleSuggestedPrompt}
                threadLoading={commandCenter.chatLoading}
                workoutLoggerRoute={workoutLoggerRoute}
                workoutLoggerScopeLabel={workoutLoggerScopeLabel}
              />
            </div>
          ) : null}

          {!isClientMode && activeTab === 'review' ? (
            <CoachCommandCenterReviewPanel
              activeReviewSection={activeReviewSection}
              commandCenter={commandCenter}
              draftCount={draftCount}
              intakeCount={intakeCount}
              nextActionLabel={nextActionLabel}
              plaudCount={plaudCount}
              searchParams={searchParams}
              selectedDisplayLabel={selectedDisplayLabel}
              setActiveReviewSection={setActiveReviewSection}
              setSearchParams={setSearchParams}
              userRole={userRole}
            />
          ) : null}

          {activeTab === 'history' ? (
            <div className="tab-scroll" id="coach-tabpanel-history" role="tabpanel" aria-labelledby="coach-tab-history">
              <CoachCommandLeftRail activeThreadId={commandCenter.activeThreadId} userRole={userRole}
                clientContextTiles={commandCenter.clientContextTiles}
                coachThreads={commandCenter.coachThreads}
                drawer={null}
                railRef={commandCenter.leftRailRef}
                selectedClientLabel={selectedDisplayLabel}
                threadSearch={commandCenter.threadSearch}
                onNewThread={commandCenter.handleNewThread}
                onThreadSearchChange={commandCenter.setThreadSearch}
                onThreadSelect={handleOpenThread}
              />
            </div>
          ) : null}
        </div>

        {activeTab === 'talk' ? (
          <CoachConsoleDock
            commandBusy={commandCenter.commandBusy}
            commandFormRef={commandCenter.commandFormRef}
            commandText={commandCenter.commandText}
            commandTextRef={commandCenter.commandTextRef}
            notebook={commandCenter.notebook}
            selectedStatus={commandCenter.selectedStatus}
            voiceActive={commandCenter.voiceActive}
            voiceCaptureMode={commandCenter.voiceCaptureMode}
            voiceOverlay={commandCenter.voiceOverlay}
            voiceReplyEnabled={commandCenter.voiceReplyEnabled}
            voiceReplySpeaking={commandCenter.voiceReplySpeaking}
            voiceSupported={commandCenter.voiceSupported}
            workoutLoggerRoute={workoutLoggerRoute}
            workoutLoggerLabel={workoutLoggerLabel}
            workoutLoggerAriaLabel="Open workout logger"
            workoutPlannerRoute={workoutPlannerRoute}
            workoutPlannerLabel={isClientMode ? CANONICAL_SURFACES.myWorkouts.name : CANONICAL_SURFACES.workoutPlanner.name}
            workoutPlannerAriaLabel={isClientMode ? CANONICAL_SURFACES.myWorkouts.ariaLabel : CANONICAL_SURFACES.workoutPlanner.ariaLabel}
            showPlaudAction={!isClientMode}
            workflowReturnLabel={commandCenter.workflowReturnLabel}
            workflowReturnTo={commandCenter.workflowReturnTo}
            onCommandTextChange={commandCenter.setCommandText}
            onReviewIntake={isClientMode ? undefined : handleReviewIntakeFromDock}
            onStartPlaudUpload={handleStartPlaudUpload}
            onSubmit={commandCenter.handleSubmit}
            onToggleVoiceReplies={commandCenter.toggleVoiceReplies}
            onVoice={commandCenter.handleVoice}
          />
        ) : null}

        {!isClientMode ? (
          <CoachCommandOpsSurface
            accountControlsOpen={accountControlsOpen}
            clientPickerRoute={clientPickerRoute}
            drawer={commandCenter.drawer}
            quickClientBusy={commandCenter.quickClientBusy}
            quickClientError={commandCenter.quickClientError}
            quickClientMessage={commandCenter.quickClientMessage}
            quickClientName={commandCenter.quickClientName}
            quickClientSource={commandCenter.quickClientSource}
            queueHealthRows={commandCenter.queueHealthRows}
            railRef={commandCenter.rightRailRef}
            rightRailItems={commandCenter.rightRailItems}
            selectedClientLabel={selectedDisplayLabel}
            teachMode={commandCenter.teachMode}
            workoutLoggerRoute={workoutLoggerRoute}
            workoutLoggerScopeLabel={workoutLoggerScopeLabel}
            workoutPlannerRoute={workoutPlannerRoute}
            workflowReturnLabel={commandCenter.workflowReturnLabel}
            workflowReturnTo={commandCenter.workflowReturnTo}
            showAccountControls={userRole === 'admin'}
            onAccountControlsToggle={handleAccountControlsToggle}
            onClose={commandCenter.closeDrawer}
            onOpenIntake={handleOpenIntakeFromOps}
            onOpenPlaud={handleStartPlaudUpload}
            onQuickClientNameChange={commandCenter.setQuickClientName}
            onQuickClientSourceChange={commandCenter.setQuickClientSource}
            onQuickClientSubmit={commandCenter.handleQuickClientSubmit}
            onTeachModeToggle={commandCenter.toggleTeachMode}
          />
        ) : null}
      </div>
    </CommandBridgeShell>
  );
};
export default CoachCommandCenterPage;
