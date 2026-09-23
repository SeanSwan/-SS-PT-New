/**
 * Blueprint: WorkspaceHeader
 * Parent: CoachWorkspacePage. One quiet bar: threads toggle (only when the list
 * is a sheet), the Swan Coach mark, the thread title, the brain's live state,
 * then Review / Context / More. Every control is a 44px target; on phones the
 * labels collapse to icons with aria-labels (brain-v4 J12, "≤ 6 header controls").
 */
import React from 'react';
import { Feather, Inbox, MoreHorizontal, PanelLeft, PanelRight } from 'lucide-react';
import { WorkspaceHeaderBar } from './CoachWorkspace.styles';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel };

type BrainState = 'ready' | 'busy' | 'degraded';

const PHASE_STATE: Partial<Record<string, { state: BrainState; label: string }>> = {
  unadmitted: { state: 'busy', label: 'Connecting' },
  checking: { state: 'busy', label: 'Connecting' },
  committing: { state: 'busy', label: 'Switching client' },
  decision: { state: 'degraded', label: 'Needs your choice' },
  invalid: { state: 'degraded', label: 'Not connected' },
  denied: { state: 'degraded', label: 'No access' },
  unavailable: { state: 'degraded', label: 'Not connected' },
  'blocked-return': { state: 'degraded', label: 'Not connected' },
};

/** Truthful status: the send path refuses while admission is not ready, so "Ready" must not show then. */
export function brainState(model: Pick<CoachWorkspaceModel, 'controller' | 'catalog'>): { state: BrainState; label: string } {
  const { controller, catalog } = model;
  if (controller.commandBusy) return { state: 'busy', label: 'Thinking' };
  const phase = PHASE_STATE[controller.selectionPhase];
  if (phase) return phase;
  if (controller.chatLoading) return { state: 'busy', label: 'Loading thread' };
  if (catalog.failed) return { state: 'degraded', label: 'Commands offline' };
  return { state: 'ready', label: 'Ready' };
}

const WorkspaceHeader: React.FC<Props> = ({ model }) => {
  const { controller, panels, isClientMode } = model;
  const title = controller.activeThread?.title?.trim() || (model.view === 'review' ? 'Review' : 'New conversation');
  const brain = brainState(model);

  return (
    <WorkspaceHeaderBar>
      {!panels.docking.sidebarDocked ? (
        <button
          type="button"
          className="ws-icon-btn"
          aria-label="Conversations"
          aria-expanded={panels.sidebarVisible}
          aria-controls="ws-sidebar"
          onClick={(event) => panels.toggleSidebar(event)}
        >
          <PanelLeft size={18} aria-hidden="true" />
        </button>
      ) : null}
      <span className="ws-mark">
        <Feather size={18} aria-hidden="true" />
        <span className="ws-mark-label">Swan Coach</span>
      </span>
      <span className="ws-divider" aria-hidden="true" />
      <span className="ws-thread-title" title={title}>{title}</span>
      <span className="ws-spacer" />
      {/* Not a live region: the composer's status line is the one place that announces. */}
      <span className="ws-brain" data-state={brain.state} role="img" aria-label={`Swan Coach: ${brain.label}`}>
        <span className="ws-brain-dot" aria-hidden="true" />
        <span className="ws-brain-label">{brain.label}</span>
      </span>
      {!isClientMode ? (
        <button
          type="button"
          className="ws-icon-btn"
          aria-pressed={model.view === 'review'}
          aria-label={model.reviewTotal ? `Review, ${model.reviewTotal} waiting` : 'Review'}
          {...(model.reviewTotal ? { 'data-badge': String(model.reviewTotal) } : {})}
          onClick={() => (model.view === 'review' ? model.backToChat() : model.openReview('intake'))}
        >
          <Inbox size={18} aria-hidden="true" />
          <span className="ws-btn-label">Review</span>
        </button>
      ) : null}
      <button
        type="button"
        className="ws-icon-btn"
        aria-label="Context and schedule"
        aria-pressed={panels.inspectorVisible}
        aria-controls="ws-inspector"
        onClick={(event) => panels.toggleInspector(event)}
      >
        <PanelRight size={18} aria-hidden="true" />
        <span className="ws-btn-label">Context</span>
      </button>
      {!isClientMode ? (
        <button
          type="button"
          className="ws-icon-btn"
          aria-label="More coach tools"
          aria-haspopup="dialog"
          aria-expanded={controller.drawer === 'right'}
          onClick={(event) => controller.openDrawer('right', event)}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      ) : null}
    </WorkspaceHeaderBar>
  );
};

export default WorkspaceHeader;
