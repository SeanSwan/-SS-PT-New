/**
 * CoachIntakeWorkspaceHeader.tsx
 * ==============================
 * Header actions for the Coach voice intake workspace.
 */
import React from 'react';
import { Brain, FileAudio, GitBranch, ListChecks, RefreshCcw } from 'lucide-react';
import type { PlaudIntakeSummary } from '../../../../services/plaudIntakeService';
import CoachIntakeScopeStatus from './CoachIntakeScopeStatus';
import {
  ActionButton,
  ActionRow,
  Eyebrow,
  Header,
  TitleBlock,
  WorkspaceLink,
} from './CoachIntakeWorkspace.styles';

interface CoachIntakeWorkspaceHeaderProps {
  clientCopy: string;
  reviewNextHref: string;
  workspaceHref: string;
  scope?: string;
  summary: PlaudIntakeSummary;
  onCommandPrompt: (message: string) => void;
  onRefresh: () => void | Promise<unknown>;
}

export function CoachIntakeWorkspaceHeader({
  clientCopy,
  reviewNextHref,
  workspaceHref,
  scope,
  summary,
  onCommandPrompt,
  onRefresh,
}: CoachIntakeWorkspaceHeaderProps): JSX.Element {
  return (
    <Header>
      <TitleBlock>
        <Eyebrow><Brain size={14} aria-hidden="true" /> Hive mind intake</Eyebrow>
        <h2>Voice intake command center</h2>
        <p>{clientCopy}</p>
        <CoachIntakeScopeStatus scope={scope} summary={summary} />
      </TitleBlock>
      <ActionRow>
        <WorkspaceLink $primary to={reviewNextHref}>
          <ListChecks size={16} aria-hidden="true" />
          Review next intake
        </WorkspaceLink>
        <ActionButton type="button" onClick={() => onCommandPrompt('review next Coach intake')}>
          <Brain size={16} aria-hidden="true" />
          Ask Coach
        </ActionButton>
        <ActionButton type="button" onClick={onRefresh}>
          <RefreshCcw size={16} aria-hidden="true" />
          Refresh
        </ActionButton>
        <ActionButton type="button" onClick={() => onCommandPrompt('inspect pending Coach audio pieces')}>
          <GitBranch size={16} aria-hidden="true" />
          Inspect audio pieces
        </ActionButton>
        <WorkspaceLink to={workspaceHref}>
          <FileAudio size={16} aria-hidden="true" />
          Open full PLAUD workspace
        </WorkspaceLink>
      </ActionRow>
    </Header>
  );
}

export default CoachIntakeWorkspaceHeader;
