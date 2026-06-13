/**
 * FILE: CoachCommandCenterPage.tsx
 * PURPOSE: Admin-only Swan Coach review-gated command workspace.
 *
 * The page stays review-gated: Swan Coach prepares operator drafts,
 * blockers, and recommendations, while final writes remain an operator action.
 */

import React from 'react';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import CoachCommandComposer from './CoachCommandComposer';
import { useCoachCommandCenterController } from './CoachCommandCenter.controller';
import { CommandCenterShell } from './CoachCommandCenter.styles';
import CoachCommandLeftRail from './CoachCommandLeftRail';
import CoachCommandLogPanel from './CoachCommandLogPanel';
import CoachCommandOpsRail from './CoachCommandOpsRail';
import CoachCommandOverview from './CoachCommandOverview';
import { useCoachCommandCenterDrawerEffects } from './useCoachCommandCenterDrawerEffects';

const CoachCommandCenterPage: React.FC = () => {
  const commandCenter = useCoachCommandCenterController();

  useCoachCommandCenterDrawerEffects({
    commandFormRef: commandCenter.commandFormRef,
    commandText: commandCenter.commandText,
    drawer: commandCenter.drawer,
    leftRailRef: commandCenter.leftRailRef,
    onCloseDrawer: commandCenter.closeDrawer,
    rightRailRef: commandCenter.rightRailRef,
    shellRef: commandCenter.shellRef,
  });

  return (
    <CommandCenterShell ref={commandCenter.shellRef}>
      <button
        type="button"
        className={`drawer-scrim ${commandCenter.drawer ? 'is-open' : ''}`}
        aria-label="Close command drawers"
        onClick={() => commandCenter.closeDrawer()}
      />

      <div className="app-shell">
        <CoachCommandLeftRail
          activeThreadId={commandCenter.activeThreadId}
          clientContextTiles={commandCenter.clientContextTiles}
          coachThreads={commandCenter.coachThreads}
          drawer={commandCenter.drawer}
          railRef={commandCenter.leftRailRef}
          selectedClientLabel={commandCenter.selectedClientLabel}
          threadSearch={commandCenter.threadSearch}
          onNewThread={commandCenter.handleNewThread}
          onThreadSearchChange={commandCenter.setThreadSearch}
          onThreadSelect={commandCenter.handleThreadSelect}
        />

        <main className="main-stage" aria-label="Swan Coach command workspace">
          <div className="mobile-topbar">
            <button
              type="button"
              className="mobile-drawer-button"
              aria-label="Open coach threads"
              aria-controls="coach-command-threads"
              aria-expanded={commandCenter.drawer === 'left'}
              onClick={(event) => commandCenter.openDrawer('left', event)}
            >
              <PanelLeftOpen size={18} aria-hidden="true" />
            </button>
            <div className="mobile-topbar-title">
              <h1>Swan Coach Command Center</h1>
              <p>{commandCenter.selectedStatus}</p>
            </div>
            <button
              type="button"
              className="mobile-drawer-button"
              aria-label="Open operations rail"
              aria-controls="coach-command-ops"
              aria-expanded={commandCenter.drawer === 'right'}
              onClick={(event) => commandCenter.openDrawer('right', event)}
            >
              <PanelRightOpen size={18} aria-hidden="true" />
            </button>
          </div>

          <CoachCommandComposer
            commandFormRef={commandCenter.commandFormRef}
            commandText={commandCenter.commandText}
            commandTextRef={commandCenter.commandTextRef}
            drawer={commandCenter.drawer}
            selectedStatus={commandCenter.selectedStatus}
            voiceActive={commandCenter.voiceActive}
            voiceSupported={commandCenter.voiceSupported}
            workflowReturnLabel={commandCenter.workflowReturnLabel}
            workflowReturnTo={commandCenter.workflowReturnTo}
            onAttach={commandCenter.handleAttach}
            onCommandTextChange={commandCenter.setCommandText}
            onOpenDrawer={commandCenter.openDrawer}
            onReadback={commandCenter.handleReadback}
            onStartPlaudUpload={commandCenter.handleStartPlaudUpload}
            onSubmit={commandCenter.handleSubmit}
            onVoice={commandCenter.handleVoice}
          />

          <CoachCommandLogPanel
            logs={commandCenter.logs}
            onCancelCommand={commandCenter.handleCancelCommand}
            onConfirmCommand={commandCenter.handleConfirmCommand}
            onReset={commandCenter.resetLogs}
          />

          <CoachCommandOverview
            activeIntakeId={commandCenter.activeIntakeId}
            coachQueue={commandCenter.coachQueue}
            dossierTiles={commandCenter.dossierTiles}
            initialReviewMergeRequestId={commandCenter.initialReviewMergeRequestId}
            intakeStates={commandCenter.intakeStates}
            plaudReviewRef={commandCenter.plaudReviewRef}
            selectedClientLabel={commandCenter.selectedClientLabel}
            statusMetrics={commandCenter.statusMetrics}
            summary={commandCenter.summary}
            onCommandPrompt={commandCenter.handleWorkflowSelect}
            onReadback={commandCenter.handleReadback}
            onToggleTeachMode={commandCenter.toggleTeachMode}
          />
        </main>

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
    </CommandCenterShell>
  );
};

export default CoachCommandCenterPage;
