/**
 * PlaudIntelligenceWorkspacePanels.tsx
 * ====================================
 *
 * Static operational panels for the PLAUD Intelligence Workspace. They keep
 * the main page focused on routing, queue state, and embedded review behavior.
 */
import {
  Brain,
  CheckCircle2,
  Clock3,
  FileAudio,
  GitBranch,
  ListChecks,
  Mic2,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import {
  ActionItem,
  ActionList,
  ActionStatus,
  CoachPane,
  CommandRail,
  CommandTile,
  PaneTitle,
} from './PlaudIntelligenceWorkspacePage.styles';

export function PlaudIntakeLanes(): JSX.Element {
  return (
    <CommandRail aria-label="PLAUD intake lanes">
      <CommandTile>
        <FileAudio size={22} aria-hidden="true" />
        <div>
          <strong>Audio pieces</strong>
          <span>Manual clips and Applaud recordings enter one queue.</span>
        </div>
      </CommandTile>
      <CommandTile>
        <Clock3 size={22} aria-hidden="true" />
        <div>
          <strong>Time grouping</strong>
          <span>Recording timestamps stay visible as the first session-order signal.</span>
        </div>
      </CommandTile>
      <CommandTile>
        <Mic2 size={22} aria-hidden="true" />
        <div>
          <strong>Dictation first</strong>
          <span>Voice intake remains routed through reviewed workout-log handoff.</span>
        </div>
      </CommandTile>
      <CommandTile>
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <strong>Human gate</strong>
          <span>Client, date, duplicate, and final log decisions stay human-confirmed.</span>
        </div>
      </CommandTile>
    </CommandRail>
  );
}

export function PlaudCoachHandoffPane(): JSX.Element {
  return (
    <CoachPane aria-label="Swan Coach action contract">
      <PaneTitle>
        <Workflow size={18} aria-hidden="true" />
        Swan Coach handoff
      </PaneTitle>
      <ActionList>
        <ActionItem>
          <GitBranch size={16} aria-hidden="true" />
          <span><strong>Order clips</strong><ActionStatus>Review-gated</ActionStatus>Group nearby recordings and flag gaps before merge.</span>
        </ActionItem>
        <ActionItem>
          <ListChecks size={16} aria-hidden="true" />
          <span><strong>Split workouts</strong><ActionStatus>Live split review</ActionStatus>Create review cards by date, time, and transcript boundary.</span>
        </ActionItem>
        <ActionItem>
          <Brain size={16} aria-hidden="true" />
          <span><strong>Resolve meaning</strong><ActionStatus>Structured proposal</ActionStatus>Turn parsed transcript evidence into a reviewable Coach draft.</span>
        </ActionItem>
        <ActionItem>
          <CheckCircle2 size={16} aria-hidden="true" />
          <span><strong>Prepare logs</strong><ActionStatus>Approval gate</ActionStatus>Hand approved cards to the shared workout-log mapper.</span>
        </ActionItem>
      </ActionList>
    </CoachPane>
  );
}
