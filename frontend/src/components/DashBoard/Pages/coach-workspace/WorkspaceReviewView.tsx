/**
 * Blueprint: WorkspaceReviewView
 * Parent: CoachWorkspacePage. Review (intake · audio · drafts) opens in the main
 * column with a one-tap way back to the conversation. It renders the SAME
 * CoachCommandCenterReviewPanel the legacy page mounts — the review-gated
 * workspaces, Plaud merge, and approval paths are reused, not rebuilt — inside
 * CommandBridgeShell so their class-based styles apply.
 */
import React from 'react';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import { CommandBridgeShell } from '../coach-assistant/CoachCommandCenter.bridgeStyles';
import CoachCommandCenterReviewPanel from '../coach-assistant/CoachCommandCenterReviewPanelLazy';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

const ReviewRoot = styled.section`
  flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column;
  .ws-review-bar {
    flex: none; display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    border-bottom: 1px solid var(--ws-line); background: color-mix(in srgb, var(--ws-panel) 70%, transparent);
  }
  .ws-back {
    display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 12px; cursor: pointer;
    border-radius: var(--ws-radius-sm); border: 1px solid var(--ws-line); background: transparent; color: var(--ws-text); font-size: 13px;
  }
  .ws-review-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 12px clamp(8px, 2vw, 20px) 24px; }
  /* The legacy desktop rule turns .is-workspace-tab into content + 336px rail columns;
     the workspace has no rail there (the inspector is the rail), so one column. */
  .ws-review-scroll .bridge-shell.is-workspace-tab {
    display: flex; flex-direction: column; min-height: 0; max-width: 1040px; grid-template-columns: none;
  }
`;

type Props = { model: CoachWorkspaceModel };

const WorkspaceReviewView: React.FC<Props> = ({ model }) => (
  <ReviewRoot aria-label="Review">
    <div className="ws-review-bar">
      <button type="button" className="ws-back" onClick={model.backToChat}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to chat
      </button>
    </div>
    <div className="ws-review-scroll">
      <CommandBridgeShell>
        <div className="bridge-shell is-workspace-tab">
          <div className="tab-content">
            <CoachCommandCenterReviewPanel
              activeReviewSection={model.reviewSection}
              commandCenter={model.controller}
              draftCount={model.counts.drafts}
              intakeCount={model.counts.intake}
              nextActionLabel={model.nextActionLabel}
              plaudCount={model.counts.audio}
              searchParams={model.searchParams}
              selectedDisplayLabel={model.scopeLabel}
              setActiveReviewSection={model.setReviewSection}
              setSearchParams={model.setSearchParams}
              userRole={model.userRole}
            />
          </div>
        </div>
      </CommandBridgeShell>
    </div>
  </ReviewRoot>
);

export default WorkspaceReviewView;
