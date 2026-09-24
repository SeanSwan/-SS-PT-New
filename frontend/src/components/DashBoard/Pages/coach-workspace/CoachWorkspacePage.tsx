/**
 * Blueprint: CoachWorkspacePage (brain-v4 — "the one and only" Swan Coach surface)
 * Mounted at /dashboard/{admin|trainer|client}/coach-assistant through
 * CoachSurfaceRoute. Parent of: WorkspaceHeader, ThreadSidebar,
 * ConversationColumn | TodayView | FloorView | WorkspaceReviewView, InspectorPanel,
 * WorkspaceOpsDrawer, CoachProgressPdf, CoachSelectionDecisionGate.
 * Unified design (Sean 2026-09-23): Chat · Today · Floor are one header click
 * apart and share ONE conversation and ONE composer.
 *
 * Design: Codex / Claude Code reading model — threads left, one conversation
 * column with a single composer, context right — worn in the header Swan Style
 * Lens: the lens picks the layout template (coachWorkspaceLayout.ts), the theme
 * changer and lens world pick every colour (workspaceTokens.ts).
 * Brain: the same controller as the legacy page (one send path, plan-55
 * admission binding, approval sheet for every write). Nothing here writes data.
 */
import React from 'react';
import CoachWorkspaceLensFrame from './CoachWorkspaceLensFrame';
import { WorkspaceShell } from './CoachWorkspace.styles';
import WorkspaceHeader from './WorkspaceHeader';
import ThreadSidebar from './ThreadSidebar';
import ConversationColumn from './ConversationColumn';
import WorkspaceReviewView from './WorkspaceReviewView';
import TodayView from './TodayView';
import FloorView from './FloorView';
import InspectorPanel from './InspectorPanel';
import WorkspaceOpsDrawer from './WorkspaceOpsDrawer';
import CoachSelectionDecisionGate from '../coach-assistant/CoachSelectionDecision';
import { useCoachWorkspaceModel } from './useCoachWorkspaceModel';
import { CoachClientNamesProvider } from '../coach-assistant/coachClientNames';
import CoachProgressPdf from './CoachProgressPdf';

const VIEW_LABEL = { chat: 'Conversation', review: 'Review', today: 'Today', floor: 'Live session' } as const;

const CoachWorkspacePage: React.FC = () => {
  const model = useCoachWorkspaceModel();
  const { controller, panels } = model;

  return (
    <CoachWorkspaceLensFrame>
      {/* Names on screen, IDs to the coach: the roster joins names back on (coachClientNames.tsx). */}
      <CoachClientNamesProvider clients={controller.clientPin.clients}>
      <WorkspaceShell ref={controller.shellRef} data-coach-workspace="v4" data-ws-view={model.view} {...panels.shellAttributes}>
        <WorkspaceHeader model={model} />
        <ThreadSidebar model={model} />
        <div className="ws-main" role="region" aria-label={VIEW_LABEL[model.view]}>
          {model.view === 'review' && !model.isClientMode ? <WorkspaceReviewView model={model} />
            : model.view === 'today' ? <TodayView model={model} />
              : model.view === 'floor' ? <FloorView model={model} />
                : <ConversationColumn model={model} />}
        </div>
        <InspectorPanel model={model} />
        <button type="button" className="ws-scrim" aria-label="Close panel" tabIndex={-1} onClick={panels.closeSheets} />
      </WorkspaceShell>
      <WorkspaceOpsDrawer model={model} />
      {/* "Make me a PDF": built here from first-party records; nothing goes to the coach. */}
      <CoachProgressPdf key={model.pdfRequest?.nonce ?? 0} request={model.pdfRequest} onClose={model.closePdf} onStatus={model.notify} />
      </CoachClientNamesProvider>
      {/* Plan 55 §3 C3 — the dirty cross-target decision; the private surface stays masked until acknowledged. */}
      <CoachSelectionDecisionGate selection={controller.selection} currentLabel={controller.selectedClientLabel} />
    </CoachWorkspaceLensFrame>
  );
};

export default CoachWorkspacePage;
