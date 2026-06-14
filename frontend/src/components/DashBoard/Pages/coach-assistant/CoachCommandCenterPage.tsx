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
import { useSearchParams } from 'react-router-dom';

import { PlaudMergeWorkspace } from '../../../PlaudClipMerge/PlaudMergeWorkspace';
import { CommandBridgeShell } from './CoachCommandCenter.bridgeStyles';
import { useCoachCommandCenterController } from './CoachCommandCenter.controller';
import { getConversationTitle } from './CoachCommandCenter.logic';
import CoachChatTranscript from './CoachChatTranscript';
import CoachClientBar, { type RecentCoachClient } from './CoachClientBar';
import CoachCommandLeftRail from './CoachCommandLeftRail';
import CoachCommandOpsRail from './CoachCommandOpsRail';
import CoachCommandTabBar, { type CoachTab } from './CoachCommandTabBar';
import CoachConsoleDock, { type CoachQuickIntent } from './CoachConsoleDock';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import { useCoachCommandCenterDrawerEffects } from './useCoachCommandCenterDrawerEffects';

const QUICK_INTENTS: CoachQuickIntent[] = [
  { label: 'Log workout', prompt: 'Log a workout for the selected client: ' },
  { label: 'Onboard client', prompt: 'Onboard a new client: ' },
  { label: 'Update log', prompt: 'Update the workout log for the selected client: ' },
  { label: 'Recall', prompt: 'Summarize what we covered for the selected client last session.' },
];

const RECENT_CLIENT_LIMIT = 12;

const CoachCommandCenterPage: React.FC = () => {
  const commandCenter = useCoachCommandCenterController();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<CoachTab>(() =>
    searchParams.get('workspace') === 'plaud' ||
    searchParams.get('mergeRequestId') ||
    searchParams.get('review') === 'next'
      ? 'plaud'
      : 'chat',
  );
  const [plaudUploadRequest, setPlaudUploadRequest] = useState(0);
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
    commandCenter.coachQueue.health?.nextOperatorAction?.label || 'Review next intake';
  const intakeCount = commandCenter.summary.actionable;
  const plaudCount = commandCenter.summary.readyReview;

  const handleSelectClient = (id: number) => {
    const thread = commandCenter.coachThreads.find((item) => item.id === id);
    if (thread) commandCenter.handleThreadSelect(thread);
  };

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

  return (
    <CommandBridgeShell ref={commandCenter.shellRef}>
      <button
        type="button"
        className={`drawer-scrim ${commandCenter.drawer ? 'is-open' : ''}`}
        aria-label="Close operator tools"
        onClick={() => commandCenter.closeDrawer()}
      />

      <div className="bridge-shell">
        <CoachClientBar
          selectedClientLabel={commandCenter.selectedClientLabel}
          recentClients={recentClients}
          opsOpen={commandCenter.drawer === 'right'}
          onSelectClient={handleSelectClient}
          onNewConversation={commandCenter.handleNewThread}
          onOpenOps={(event) => commandCenter.openDrawer('right', event)}
        />

        <CoachCommandTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          intakeCount={intakeCount}
          plaudCount={plaudCount}
        />

        <div className="tab-content">
          {activeTab === 'chat' ? (
            <CoachChatTranscript
              logs={commandCenter.logs}
              onCancelCommand={commandCenter.handleCancelCommand}
              onConfirmCommand={commandCenter.handleConfirmCommand}
              onReset={commandCenter.resetLogs}
            />
          ) : null}

          {activeTab === 'intake' ? (
            <div className="tab-scroll">
              <CoachIntakeWorkspace
                userRole="admin"
                selectedClientName={commandCenter.selectedClientLabel}
                onCommandPrompt={commandCenter.handleWorkflowSelect}
                queue={commandCenter.coachQueue}
                activeIntakeId={commandCenter.activeIntakeId}
              />
            </div>
          ) : null}

          {activeTab === 'plaud' ? (
            <div className="tab-scroll">
              <article
                className="panel plaud-review-panel"
                ref={commandCenter.plaudReviewRef}
                tabIndex={-1}
                aria-label="PLAUD audio merge review"
              >
                <PlaudMergeWorkspace
                  embedded
                  initialReviewMergeRequestId={commandCenter.initialReviewMergeRequestId}
                />
              </article>
            </div>
          ) : null}

          {activeTab === 'history' ? (
            <div className="tab-scroll">
              <CoachCommandLeftRail
                activeThreadId={commandCenter.activeThreadId}
                clientContextTiles={commandCenter.clientContextTiles}
                coachThreads={commandCenter.coachThreads}
                drawer={null}
                railRef={commandCenter.leftRailRef}
                selectedClientLabel={commandCenter.selectedClientLabel}
                threadSearch={commandCenter.threadSearch}
                onNewThread={commandCenter.handleNewThread}
                onThreadSearchChange={commandCenter.setThreadSearch}
                onThreadSelect={commandCenter.handleThreadSelect}
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
            quickIntents={QUICK_INTENTS}
            selectedStatus={commandCenter.selectedStatus}
            voiceActive={commandCenter.voiceActive}
            voiceSupported={commandCenter.voiceSupported}
            workflowReturnLabel={commandCenter.workflowReturnLabel}
            workflowReturnTo={commandCenter.workflowReturnTo}
            onCommandTextChange={commandCenter.setCommandText}
            onStageNextAction={() => commandCenter.handleWorkflowSelect(nextActionLabel)}
            onQuickIntent={commandCenter.handleWorkflowSelect}
            onAttach={commandCenter.handleAttach}
            onStartPlaudUpload={handleStartPlaudUpload}
            onReadback={commandCenter.handleReadback}
            onSubmit={commandCenter.handleSubmit}
            onVoice={commandCenter.handleVoice}
          />
        ) : null}

        <CoachCommandOpsRail
          drawer={commandCenter.drawer}
          quickClientBusy={commandCenter.quickClientBusy}
          quickClientError={commandCenter.quickClientError}
          quickClientMessage={commandCenter.quickClientMessage}
          quickClientName={commandCenter.quickClientName}
          quickClientSource={commandCenter.quickClientSource}
          queueHealthRows={commandCenter.queueHealthRows}
          railRef={commandCenter.rightRailRef}
          rightRailItems={commandCenter.rightRailItems}
          teachMode={commandCenter.teachMode}
          onQuickClientNameChange={commandCenter.setQuickClientName}
          onQuickClientSourceChange={commandCenter.setQuickClientSource}
          onQuickClientSubmit={commandCenter.handleQuickClientSubmit}
          onTeachModeToggle={commandCenter.toggleTeachMode}
        />
      </div>
    </CommandBridgeShell>
  );
};

export default CoachCommandCenterPage;
