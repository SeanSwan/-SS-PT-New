/**
 * PlaudIntelligenceWorkspacePage.tsx
 * ==================================
 *
 * WHAT THIS FILE DOES:
 * Canonical role-dashboard surface for PLAUD intake. It keeps the existing
 * manual merge workflow live while moving it into a top-level Training
 * workspace.
 *
 * HOW IT FITS IN THE APP:
 * UniversalDashboardLayout mounts this page for admin and trainer roles at
 * /dashboard/{role}/plaud. The current live engine remains PlaudMergeWorkspace.
 *
 * KEY DECISION:
 * Swan Coach/Hive Mind actions are named here as the next backend contract,
 * not represented as already-automated behavior. The UI must not imply that
 * clip ordering, splitting, or auto-log actions are live before those actions
 * exist in commandDispatcher and the PLAUD backend.
 */
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { PlaudMergeWorkspace } from '../../components/PlaudClipMerge/PlaudMergeWorkspace';
import { usePlaudIntakeQueue } from '../../hooks/usePlaudIntakeQueue';
import {
  ActionButton,
  ActionItem,
  ActionList,
  ActionStatus,
  CoachPane,
  CommandRail,
  CommandTile,
  Eyebrow,
  HeaderActions,
  HeaderCopy,
  PaneTitle,
  PrimaryPane,
  WorkspaceBody,
  WorkspaceHeader,
  WorkspaceShell,
} from './PlaudIntelligenceWorkspacePage.styles';
import {
  IntakePreviewItem,
  IntakePreviewList,
  IntakeSnapshot,
  IntakeSnapshotHeader,
  IntakeStat,
  IntakeStats,
  SourceBadge,
} from './PlaudIntakeSnapshot.styles';

function useDashboardRole(): 'admin' | 'trainer' {
  const location = useLocation();
  return location.pathname.includes('/dashboard/trainer/') ? 'trainer' : 'admin';
}

function formatQueueStatus(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function PlaudIntelligenceWorkspacePage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useDashboardRole();
  const coachPath = `/dashboard/${role}/coach-assistant`;
  const { items: intakeItems, summary, isLoading, error, refresh } = usePlaudIntakeQueue();

  const focusQueue = useCallback(() => {
    const queue = document.querySelector('[data-testid="plaud-pending-reviews"]');
    if (queue instanceof HTMLElement) {
      queue.scrollIntoView({ behavior: 'smooth', block: 'start' });
      queue.focus?.();
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('review') !== 'next') return;
    const timer = window.setTimeout(focusQueue, 120);
    return () => window.clearTimeout(timer);
  }, [focusQueue, location.search]);

  return (
    <WorkspaceShell data-testid="plaud-intelligence-workspace">
      <WorkspaceHeader>
        <HeaderCopy>
          <Eyebrow>
            <FileAudio size={16} aria-hidden="true" />
            Training intake
          </Eyebrow>
          <h1>PLAUD Intelligence Workspace</h1>
          <p>
            One Training workspace for captured audio, merge review, client selection,
            and approved workout logs.
          </p>
        </HeaderCopy>
        <HeaderActions>
          <ActionButton type="button" $primary onClick={focusQueue}>
            <ListChecks size={17} aria-hidden="true" />
            Review queue
          </ActionButton>
          <ActionButton type="button" onClick={() => navigate(coachPath)}>
            <Brain size={17} aria-hidden="true" />
            Open Coach
          </ActionButton>
        </HeaderActions>
      </WorkspaceHeader>

      <IntakeSnapshot aria-label="Unified PLAUD intake queue">
        <IntakeSnapshotHeader>
          <h2>Unified intake queue</h2>
          <ActionButton type="button" onClick={refresh}>
            <Clock3 size={17} aria-hidden="true" />
            Refresh
          </ActionButton>
        </IntakeSnapshotHeader>
        <IntakeStats>
          <IntakeStat>
            <dt>Actionable</dt>
            <dd>{summary.actionable}</dd>
          </IntakeStat>
          <IntakeStat>
            <dt>Unprocessed</dt>
            <dd>{summary.unprocessed}</dd>
          </IntakeStat>
          <IntakeStat>
            <dt>Ready review</dt>
            <dd>{summary.readyReview}</dd>
          </IntakeStat>
          <IntakeStat>
            <dt>Needs client</dt>
            <dd>{summary.needsClient}</dd>
          </IntakeStat>
        </IntakeStats>
        <IntakePreviewList>
          {isLoading ? (
            <IntakePreviewItem><span>Loading intake queue</span><span /></IntakePreviewItem>
          ) : error ? (
            <IntakePreviewItem role="alert"><span>{error.message}</span><span /></IntakePreviewItem>
          ) : intakeItems.length === 0 ? (
            <IntakePreviewItem><span>No current intake items</span><span /></IntakePreviewItem>
          ) : intakeItems.map((item) => (
            <IntakePreviewItem key={item.id}>
              <span>
                <strong>{item.clientName || 'Client pending'}</strong>
                {' - '}
                {formatQueueStatus(item.queueStatus)}
              </span>
              <SourceBadge>{item.sourceLabel}</SourceBadge>
            </IntakePreviewItem>
          ))}
        </IntakePreviewList>
      </IntakeSnapshot>

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

      <WorkspaceBody>
        <PrimaryPane aria-label="PLAUD merge and review queue">
          <PlaudMergeWorkspace
            embedded
          />
        </PrimaryPane>
        <CoachPane aria-label="Swan Coach action contract">
          <PaneTitle>
            <Workflow size={18} aria-hidden="true" />
            Swan Coach handoff
          </PaneTitle>
          <ActionList>
            <ActionItem>
              <GitBranch size={16} aria-hidden="true" />
              <span><strong>Order clips</strong><ActionStatus>Next slice</ActionStatus>Group nearby recordings and flag gaps before merge.</span>
            </ActionItem>
            <ActionItem>
              <ListChecks size={16} aria-hidden="true" />
              <span><strong>Split workouts</strong><ActionStatus>Next slice</ActionStatus>Create review cards by date, time, and transcript boundary.</span>
            </ActionItem>
            <ActionItem>
              <Brain size={16} aria-hidden="true" />
              <span><strong>Resolve meaning</strong><ActionStatus>Next slice</ActionStatus>Extract exercises, sets, reps, pain notes, and form cues.</span>
            </ActionItem>
            <ActionItem>
              <CheckCircle2 size={16} aria-hidden="true" />
              <span><strong>Prepare logs</strong><ActionStatus>Next slice</ActionStatus>Hand approved cards to the shared workout-log mapper.</span>
            </ActionItem>
          </ActionList>
        </CoachPane>
      </WorkspaceBody>
    </WorkspaceShell>
  );
}

export default PlaudIntelligenceWorkspacePage;
