/**
 * FILE: CoachCommandCenterPage.tsx
 * PURPOSE: Admin Swan Coach terminal — chat-first "Command Bridge" layout.
 *
 * Floor-first redesign (2026-06-13): the default view is a ChatGPT-style coach
 * conversation with a persistent, fast client switcher (the focal point), a big
 * voice-forward command dock, and a slim next-best-action. The heavy operator
 * surfaces — unified intake queue, PLAUD merge review, operator controls — move
 * off the default screen into tabs + a slide-in Ops drawer.
 *
 * No data rewire: the controller, command execution, voice, intake, and PLAUD
 * wiring are reused exactly; this file only reshapes the presentation.
 * Review-gated: Swan Coach prepares operator drafts; final writes need approval.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { PlaudMergeWorkspace } from '../../../PlaudClipMerge/PlaudMergeWorkspace';
import AdminAccountSwitcher from '../../../Admin/AdminAccountSwitcher';
import { CommandBridgeShell } from './CoachCommandCenter.bridgeStyles';
import { buildCoachHeaderQuickActions } from './CoachCommandHeaderActions';
import { useCoachCommandCenterController } from './CoachCommandCenter.controller';
import { getConversationTitle } from './CoachCommandCenter.logic';
import CoachChatTranscript from './CoachChatTranscript';
import CoachClientBar, { type RecentCoachClient } from './CoachClientBar';
import CoachCommandLeftRail from './CoachCommandLeftRail';
import CoachCommandOpsRail from './CoachCommandOpsRail';
import CoachCommandTabBar, { type CoachTab } from './CoachCommandTabBar';
import CoachConsoleDock from './CoachConsoleDock';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import { useCoachCommandCenterDrawerEffects } from './useCoachCommandCenterDrawerEffects';
import { buildSwanCoachWorkoutLoggerRoute } from './SwanCoachWorkoutLoggerRoute';
import { buildSwanCoachWorkoutPlannerRoute } from './SwanCoachWorkoutPlannerRoute';
import {
  CLIENT_NEXT_ACTION_LABEL,
  CLIENT_WORKOUTS_ROUTE,
  coachTabsForRole,
  coerceCoachTabForRole,
  isClientCoachRole,
  normalizeCoachCommandRole,
  routeForcedTabForRole,
} from './CoachCommandCenter.roleConfig';

const RECENT_CLIENT_LIMIT = 12;
const CoachCommandCenterPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const userRole = normalizeCoachCommandRole(authUser?.role);
  const location = useLocation();
  const commandCenter = useCoachCommandCenterController({ userRole });
  const [searchParams] = useSearchParams();
  const isClientMode = isClientCoachRole(userRole);
  const routeForcedTab = routeForcedTabForRole(searchParams, userRole);
  const [activeTab, setActiveTab] = useState<CoachTab>(() => routeForcedTab || 'chat');
  const [plaudUploadRequest, setPlaudUploadRequest] = useState(0);
  const handledPlaudUploadRequestRef = useRef(0);
  const showAdminAccountSwitcher = userRole === 'admin'
    && location.pathname.startsWith('/dashboard/admin/coach-assistant');

  useCoachCommandCenterDrawerEffects({
    commandFormRef: commandCenter.commandFormRef,
    commandText: commandCenter.commandText,
    drawer: commandCenter.drawer,
    leftRailRef: commandCenter.leftRailRef,
    onCloseDrawer: commandCenter.closeDrawer,
    rightRailRef: commandCenter.rightRailRef,
    shellRef: commandCenter.shellRef,
  });

  const recentClients: RecentCoachClient[] = useMemo(
    () =>
      commandCenter.coachThreads.slice(0, RECENT_CLIENT_LIMIT).map((thread) => ({
        id: thread.id,
        label: getConversationTitle(thread),
        active: thread.id === commandCenter.activeThreadId,
      })),
    [commandCenter.activeThreadId, commandCenter.coachThreads],
  );

  const nextActionLabel =
    isClientMode ? CLIENT_NEXT_ACTION_LABEL : commandCenter.coachQueue.health?.nextOperatorAction?.label || 'Review next intake';
  const intakeCount = isClientMode ? 0 : commandCenter.summary.actionable;
  const plaudCount = isClientMode ? 0 : commandCenter.summary.readyReview;
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
  const clientPickerRoute = userRole === 'trainer' ? '/dashboard/trainer/clients?intent=log_workout' : '/dashboard/admin/client-management?intent=log_workout';

  const handleOpenThread = (thread: (typeof commandCenter.coachThreads)[number]) => {
    commandCenter.handleThreadSelect(thread);
    setActiveTab('chat');
  };
  const handleSelectClient = (id: number) => {
    const thread = commandCenter.coachThreads.find((item) => item.id === id);
    if (thread) handleOpenThread(thread);
  };
  useEffect(() => {
    if (routeForcedTab) setActiveTab(routeForcedTab);
    else setActiveTab((current) => coerceCoachTabForRole(current, userRole));
  }, [routeForcedTab, userRole]);

  useEffect(() => {
    if (
      activeTab !== 'plaud' ||
      plaudUploadRequest === 0 ||
      handledPlaudUploadRequestRef.current === plaudUploadRequest
    ) return;
    handledPlaudUploadRequestRef.current = plaudUploadRequest;
    commandCenter.handleStartPlaudUpload();
  }, [activeTab, commandCenter, plaudUploadRequest]);

  const handleStartPlaudUpload = () => {
    setActiveTab('plaud');
    setPlaudUploadRequest((count) => count + 1);
  };

  const handleOpenIntakeFromOps = () => {
    setActiveTab('intake');
    commandCenter.closeDrawer(false);
  };
  const headerQuickActions = buildCoachHeaderQuickActions({
    clientPickerRoute,
    isClientMode,
    onOpenIntake: handleOpenIntakeFromOps,
    onOpenPlaud: handleStartPlaudUpload,
    scopeLabel: workoutLoggerScopeLabel,
    workoutLoggerRoute,
    workoutPlannerRoute,
  });

  return (
    <CommandBridgeShell ref={commandCenter.shellRef}>
      <div className="bridge-shell">
        {isClientMode ? null : (
          <button
            type="button"
            className={`drawer-scrim ${commandCenter.drawer ? 'is-open' : ''}`}
            aria-label="Close operator tools"
            onClick={() => commandCenter.closeDrawer()}
          />
        )}

        {showAdminAccountSwitcher ? <AdminAccountSwitcher /> : null}

        <CoachClientBar
          selectedClientLabel={selectedDisplayLabel}
          recentClients={recentClients}
          quickActions={headerQuickActions}
          opsOpen={commandCenter.drawer === 'right'}
          showOps={!isClientMode}
          contextLabel={isClientMode ? 'Your coach terminal' : 'Now coaching'}
          newConversationLabel={isClientMode ? 'New coach chat' : 'New client / conversation'}
          recentLabel={isClientMode ? 'Recent coach chats' : 'Recent client conversations'}
          onSelectClient={handleSelectClient}
          onNewConversation={commandCenter.handleNewThread}
          onOpenOps={(event) => commandCenter.openDrawer('right', event)}
        />

        <CoachCommandTabBar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(coerceCoachTabForRole(tab, userRole))}
          tabs={availableTabs}
          intakeCount={intakeCount}
          plaudCount={plaudCount}
        />

        <div className="tab-content">
          {activeTab === 'chat' ? (
            <div className="chat-panel" id="coach-tabpanel-chat" role="tabpanel" aria-labelledby="coach-tab-chat">
              <CoachChatTranscript
                logs={commandCenter.logs}
                onCancelCommand={commandCenter.handleCancelCommand}
                onConfirmCommand={commandCenter.handleConfirmCommand}
                onReset={commandCenter.resetLogs}
                workoutLoggerRoute={workoutLoggerRoute}
                workoutLoggerScopeLabel={workoutLoggerScopeLabel}
              />
            </div>
          ) : null}

          {!isClientMode && activeTab === 'intake' ? (
            <div className="tab-scroll" id="coach-tabpanel-intake" role="tabpanel" aria-labelledby="coach-tab-intake">
              <CoachIntakeWorkspace
                userRole={userRole}
                selectedClientName={selectedDisplayLabel}
                onCommandPrompt={commandCenter.handleWorkflowSelect}
                queue={commandCenter.coachQueue}
                activeIntakeId={commandCenter.activeIntakeId}
              />
            </div>
          ) : null}

          {!isClientMode && activeTab === 'plaud' ? (
            <div className="tab-scroll" id="coach-tabpanel-plaud" role="tabpanel" aria-labelledby="coach-tab-plaud">
              <article
                className="panel plaud-review-panel"
                ref={commandCenter.plaudReviewRef}
                tabIndex={-1}
                aria-label="PLAUD audio merge review"
              >
                <PlaudMergeWorkspace embedded initialReviewMergeRequestId={commandCenter.initialReviewMergeRequestId} />
              </article>
            </div>
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

        {activeTab === 'chat' ? (
          <CoachConsoleDock
            commandFormRef={commandCenter.commandFormRef}
            commandText={commandCenter.commandText}
            commandTextRef={commandCenter.commandTextRef}
            nextActionLabel={nextActionLabel}
            selectedStatus={commandCenter.selectedStatus}
            voiceActive={commandCenter.voiceActive}
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
            onVoice={commandCenter.handleVoice}
          />
        ) : null}

        {!isClientMode ? (
          <CoachCommandOpsRail
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
            onClose={commandCenter.closeDrawer}
            onOpenIntake={handleOpenIntakeFromOps}
            onOpenPlaud={handleStartPlaudUpload}
            onQuickClientNameChange={commandCenter.setQuickClientName}
            onQuickClientSourceChange={commandCenter.setQuickClientSource}
            onQuickClientSubmit={commandCenter.handleQuickClientSubmit}
            onStageWorkoutLog={() => commandCenter.handleWorkflowSelect('Log a workout for the selected client: ')}
            onTeachModeToggle={commandCenter.toggleTeachMode}
          />
        ) : null}
      </div>
    </CommandBridgeShell>
  );
};

export default CoachCommandCenterPage;
