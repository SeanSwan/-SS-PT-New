/**
 * CoachIntakeWorkspaceHeader.tsx
 * ==============================
 * Header actions for the Coach voice intake workspace.
 */

import { Brain, FileAudio, ListChecks, RefreshCcw } from 'lucide-react';
import type { PlaudIntakeSummary } from '../../../../services/plaudIntakeService';
import { buildCoachIntakeNextMove } from './CoachIntakeNextMove.logic';
import CoachIntakeScopeStatus from './CoachIntakeScopeStatus';
import {
  ActionButton,
  WorkspaceLink,
} from './CoachIntakeWorkspace.styles';
import {
  ActionRow,
  Eyebrow,
  FirstMoveActions,
  FirstMoveCopy,
  FirstMovePanel,
  Header,
  SecondaryActionGroup,
  TitleBlock,
} from './CoachIntakeWorkspaceHeader.styles';

interface CoachIntakeWorkspaceHeaderProps {
  clientCopy: string;
  reviewNextHref: string;
  workspaceHref: string;
  scope?: string;
  summary: PlaudIntakeSummary;
  onRefresh: () => void | Promise<unknown>;
}

export function CoachIntakeWorkspaceHeader({
  clientCopy,
  reviewNextHref,
  workspaceHref,
  scope,
  summary,
  onRefresh,
}: CoachIntakeWorkspaceHeaderProps): JSX.Element {
  const nextMove = buildCoachIntakeNextMove(summary, scope);

  return (
    <Header>
      <TitleBlock>
        <Eyebrow><Brain size={14} aria-hidden="true" /> Hive mind intake</Eyebrow>
        <h2>Voice intake command center</h2>
        <p>{clientCopy}</p>
        <CoachIntakeScopeStatus scope={scope} summary={summary} />
      </TitleBlock>
      <ActionRow aria-label="Hive mind intake actions">
        <FirstMovePanel aria-label="Next best Coach intake move">
          <FirstMoveCopy>
            <span>Next best move</span>
            <strong>{nextMove.label}</strong>
            <p>{nextMove.detail}</p>
          </FirstMoveCopy>
          <FirstMoveActions>
            <WorkspaceLink $primary to={reviewNextHref} aria-label={nextMove.label}>
              <ListChecks size={16} aria-hidden="true" />
              {nextMove.label}
            </WorkspaceLink>

          </FirstMoveActions>
        </FirstMovePanel>
        <SecondaryActionGroup role="group" aria-label="Queue tools">
          <ActionButton type="button" onClick={onRefresh}>
            <RefreshCcw size={16} aria-hidden="true" />
            Refresh queue
          </ActionButton>

          <WorkspaceLink to={workspaceHref}>
            <FileAudio size={16} aria-hidden="true" />
            Open PLAUD
          </WorkspaceLink>
        </SecondaryActionGroup>
      </ActionRow>
    </Header>
  );
}

export default CoachIntakeWorkspaceHeader;
