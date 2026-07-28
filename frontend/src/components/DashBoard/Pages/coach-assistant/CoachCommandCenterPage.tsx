/**
 * FILE: CoachCommandCenterPage.tsx
 * PURPOSE: Mounted Swan Coach Floor Mode shell for talk-first coaching, review, history, and More tools.
 * Review-gated: Swan Coach prepares operator drafts; final writes need approval.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { CommandBridgeShell } from './CoachCommandCenter.bridgeStyles';
import { useCoachCommandCenterController } from './CoachCommandCenter.controller';
import CoachChatTranscript from './CoachChatTranscript';
import CoachClientBar from './CoachClientBar';
import CoachCommandLeftRail from './CoachCommandLeftRail';
import CoachCommandOpsRail from './CoachCommandOpsRail';
import CoachCommandTabBar, { type CoachTab } from './CoachCommandTabBar';
import CoachCommandCenterReviewPanel from './CoachCommandCenterReviewPanel';
import CoachConsoleDock from './CoachConsoleDock';
import { useCoachCommandCenterDrawerEffects } from './useCoachCommandCenterDrawerEffects';
import { buildSwanCoachWorkoutLoggerRoute } from './SwanCoachWorkoutLoggerRoute';
import { buildSwanCoachWorkoutPlannerRoute } from './SwanCoachWorkoutPlannerRoute';
import {
  CLIENT_NEXT_ACTION_LABEL,
  CLIENT_WORKOUTS_ROUTE,
  type CoachReviewSection,
  coachTabsForRole,
  coerceCoachTabForRole,
  hasCoachOperatorRouteContext,
  isClientCoachRole,
  normalizeCoachCommandRole,
  reviewSectionFromRoute,
  routeForcedTabForRole,
} from './CoachCommandCenter.roleConfig';

const CoachCommandCenterPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const userRole = normalizeCoachCommandRole(authUser?.role);
  const commandCenter = useCoachCommandCenterController({ userRole });
  const [searchParams, setSearchParams] = useSearchParams();
  const isClientMode = isClientCoachRole(userRole);
  const routeForcedTab = routeForcedTabForRole(searchParams, userRole);
  const routeReviewSection = reviewSectionFromRoute(searchParams);
  const hasOperatorRouteContext = hasCoachOperatorRouteContext(searchParams);
  const initialTab = routeForcedTab || 'talk';
  const [activeTab, setActiveTab] = useState<CoachTab>(() => coerceCoachTabForRole(initialTab, userRole));
  const [, setOperatorTouchedTab] = useState(false);
  const [activeReviewSection, setActiveReviewSection] = useState<CoachReviewSection | null>(() => routeReviewSection);
  const [plaudUploadRequest, setPlaudUploadRequest] = useState(0);
  const [accountControlsOpen, setAccountControlsOpen] = useState(false);
  const handledPlaudUploadRequestRef = useRef(0);

  useCoachCommandCenterDrawerEffects({
    commandFormRef: commandCenter.commandFormRef,
    commandText: commandCenter.commandText,
    drawer: commandCenter.drawer,
    leftRailRef: commandCenter.leftRailRef,
    onCloseDrawer: commandCenter.closeDrawer,
    rightRailRef: commandCenter.rightRailRef,
    shellRef: commandCenter.shellRef,
  });

  const nextActionLabel = isClientMode
    ? CLIENT_NEXT_ACTION_LABEL
    : commandCenter.coachQueue.health?.nextOperatorAction?.label || 'Review next intake';
  const intakeCount = isClientMode ? 0 : commandCenter.summary.actionable;
  const plaudCount = isClientMode ? 0 : commandCenter.summary.readyReview;
  const draftCount = isClientMode ? 0 : commandCenter.summary.preparedDrafts + commandCenter.summary.pendingDrafts;
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
      });
    },
    [commandCenter.routeClientId, commandCenter.workflowReturnTo, isClientMode, userRole],
  );
  const workoutLoggerScopeLabel = commandCenter.routeClientId ? selectedDisplayLabel : 'My workout log';
  const workoutLoggerLabel = isClientMode ? 'Log Today' : commandCenter.routeClientId ? 'Logger' : 'My Logger';
  const clientPickerRoute = userRole === 'trainer'
    ? '/dashboard/trainer/clients?intent=log_workout'
    : '/dashboard/admin/client-management?intent=log_workout';

  const handleOpenThread = (thread: (typeof commandCenter.coachThreads)[number]) => {
    commandCenter.handleThreadSelect(thread);
    setOperatorTouchedTab(true);
    setActiveTab('talk');
  };

  useEffect(() => {
    if (routeForcedTab) {
      setOperatorTouchedTab(false);
      setActiveTab(routeForcedTab);
      if (routeForcedTab === 'review') setActiveReviewSection(routeReviewSection);
      return;
    }

    setActiveTab((current) => coerceCoachTabForRole(current, userRole));
  }, [hasOperatorRouteContext, isClientMode, routeForcedTab, routeReviewSection, userRole]);

  useEffect(() => {
    if (userRole !== 'admin' && accountControlsOpen) {
      setAccountControlsOpen(false);
    }
  }, [accountControlsOpen, userRole]);

  useEffect(() => {
    if (
      activeTab !== 'review' ||
      activeReviewSection !== 'audio' ||
      plaudUploadRequest === 0 ||
      handledPlaudUploadRequestRef.current === plaudUploadRequest
    ) return;
    handledPlaudUploadRequestRef.current = plaudUploadRequest;
    commandCenter.handleStartPlaudUpload();
  }, [activeReviewSection, activeTab, commandCenter, plaudUploadRequest]);

  const handleStartPlaudUpload = () => {
    setOperatorTouchedTab(true);
    setActiveTab('review');
    setActiveReviewSection('audio');
    setPlaudUploadRequest((count) => count + 1);
  };

  const handleAccountControlsToggle = () => {
    setAccountControlsOpen((current) => !current);
  };

  const handleOpenIntakeFromOps = () => {
    setOperatorTouchedTab(true);
    setActiveTab('review');
    setActiveReviewSection('intake');
    commandCenter.closeDrawer(false);
  };

  const handleTabChange = (tab: CoachTab) => {
    setOperatorTouchedTab(true);
    setActiveTab(coerceCoachTabForRole(tab, userRole));
  };

  return (
    <CommandBridgeShell ref={commandCenter.shellRef}>
      <div className={`bridge-shell ${activeTab === 'talk' ? 'is-chat-tab' : 'is-workspace-tab'}`}>
        {isClientMode ? null : (
          <button
            type="button"
            className={`drawer-scrim ${commandCenter.drawer ? 'is-open' : ''}`}
            aria-label="Close operator tools"
            onClick={() => commandCenter.closeDrawer()}
          />
        )}

        <CoachClientBar
          selectedClientLabel={selectedDisplayLabel}
          opsOpen={commandCenter.drawer === 'right'}
          showOps={!isClientMode}
          contextLabel={isClientMode ? 'Your coach terminal' : 'Now coaching'}
          newConversationLabel={isClientMode ? 'New coach chat' : 'New chat'}
          onNewConversation={commandCenter.handleNewThread}
          onOpenOps={(event) => commandCenter.openDrawer('right', event)}
        />

        <CoachCommandTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabs={availableTabs}
          intakeCount={intakeCount}
          plaudCount={plaudCount}
        />

        <div className="tab-content">
          {activeTab === 'talk' ? (
            <div className="chat-panel" id="coach-tabpanel-talk" role="tabpanel" aria-labelledby="coach-tab-talk">
              <CoachChatTranscript
                activeThread={commandCenter.activeThread}
                logs={commandCenter.logs}
                onCancelCommand={commandCenter.handleCancelCommand}
                onConfirmCommand={commandCenter.handleConfirmCommand}
                onReset={commandCenter.resetLogs}
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
              <CoachCommandLeftRail
                activeThreadId={commandCenter.activeThreadId}
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
            commandFormRef={commandCenter.commandFormRef}
            commandText={commandCenter.commandText}
            commandTextRef={commandCenter.commandTextRef}
            nextActionLabel={nextActionLabel}
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
            workoutPlannerLabel={isClientMode ? 'My Workouts' : commandCenter.routeClientId ? 'Planner' : 'My Planner'}
            showPlaudAction={!isClientMode}
            workflowReturnLabel={commandCenter.workflowReturnLabel}
            workflowReturnTo={commandCenter.workflowReturnTo}
            onCommandTextChange={commandCenter.setCommandText}
            onAttach={commandCenter.handleAttach}
            onStartPlaudUpload={handleStartPlaudUpload}
            onReadback={commandCenter.handleReadback}
            onSubmit={commandCenter.handleSubmit}
            onToggleVoiceReplies={commandCenter.toggleVoiceReplies}
            onVoice={commandCenter.handleVoice}
          />
        ) : null}

        {!isClientMode ? (
          <CoachCommandOpsRail
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
