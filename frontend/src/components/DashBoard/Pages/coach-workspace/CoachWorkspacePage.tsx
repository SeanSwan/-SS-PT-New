/**
 * Blueprint: CoachWorkspacePage (brain-v4 — "the one and only" Swan Coach surface)
 * Mounted at /dashboard/{admin|trainer|client}/coach-assistant through
 * CoachSurfaceRoute. Parent of: WorkspaceHeader, ThreadSidebar,
 * ConversationColumn | WorkspaceReviewView, InspectorPanel, WorkspaceOpsDrawer,
 * CoachSelectionDecisionGate.
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
import InspectorPanel from './InspectorPanel';
import WorkspaceOpsDrawer from './WorkspaceOpsDrawer';
import CoachSelectionDecisionGate from '../coach-assistant/CoachSelectionDecision';
import { useCoachWorkspaceModel } from './useCoachWorkspaceModel';

const CoachWorkspacePage: React.FC = () => {
  const model = useCoachWorkspaceModel();
  const { controller, panels } = model;

  return (
    <CoachWorkspaceLensFrame>
      <WorkspaceShell ref={controller.shellRef} data-coach-workspace="v4" {...panels.shellAttributes}>
        <WorkspaceHeader model={model} />
        <ThreadSidebar model={model} />
        <div className="ws-main" role="region" aria-label={model.view === 'review' ? 'Review' : 'Conversation'}>
          {model.view === 'review' && !model.isClientMode ? <WorkspaceReviewView model={model} /> : <ConversationColumn model={model} />}
        </div>
        <InspectorPanel model={model} />
        <button type="button" className="ws-scrim" aria-label="Close panel" tabIndex={-1} onClick={panels.closeSheets} />
      </WorkspaceShell>
      <WorkspaceOpsDrawer model={model} />
      {/* Plan 55 §3 C3 — the dirty cross-target decision; the private surface stays masked until acknowledged. */}
      <CoachSelectionDecisionGate selection={controller.selection} currentLabel={controller.selectedClientLabel} />
    </CoachWorkspaceLensFrame>
  );
};

export default CoachWorkspacePage;
