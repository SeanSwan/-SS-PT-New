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
 * Swan Coach/Hive Mind status labels mirror review-gated capabilities. The UI
 * must not imply autonomous writes: clip ordering, splitting, and log creation
 * still require the prepared-draft and human approval gates.
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
import type { PlaudIntakeItem } from '../../services/plaudIntakeService';
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
  BadgeCluster,
  IntakePreviewItem,
  IntakePreviewLink,
  IntakePreviewList,
  IntakeSnapshot,
  IntakeSnapshotHeader,
  IntakeStat,
  IntakeStats,
  SourceBadge,
} from './PlaudIntakeSnapshot.styles';

const PLAUD_UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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

function reviewableMergeTime(item: PlaudIntakeItem): number {
  const value = item.recordedAt || item.timelineAt || item.createdAt;
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function pickReviewNextMergeRequestId(items: PlaudIntakeItem[]): string | null {
  return [...items]
    .filter((item) => item.kind === 'merge_request' && item.canReview)
    .sort((a, b) => reviewableMergeTime(a) - reviewableMergeTime(b))[0]?.entityId || null;
}

function visibleIntakePreviewItems(items: PlaudIntakeItem[], selectedMergeRequestId: string | null): PlaudIntakeItem[] {
  const firstItems = items.slice(0, 6);
  const isSelectedMergeRequest = (item: PlaudIntakeItem) => item.kind === 'merge_request' && item.entityId === selectedMergeRequestId;
  if (!selectedMergeRequestId || firstItems.some(isSelectedMergeRequest)) return firstItems;
  const selectedItem = items.find(isSelectedMergeRequest);
  return selectedItem ? [selectedItem, ...firstItems.slice(0, 5)] : firstItems;
}

function parseMergeRequestId(value: string | null): string | null {
  if (!value || !PLAUD_UUID_RE.test(value)) return null;
  return value;
}

function intakePreviewHref(item: PlaudIntakeItem, role: 'admin' | 'trainer'): string {
  if (item.kind === 'merge_request') {
    return item.entityId
      ? `/dashboard/${role}/plaud?mergeRequestId=${encodeURIComponent(item.entityId)}`
      : `/dashboard/${role}/plaud?review=next`;
  }
  const intakeId = String(item.entityId || item.id || '').replace(/^coach:/, '');
  return intakeId
    ? `/dashboard/${role}/coach-assistant?intake=${encodeURIComponent(intakeId)}`
    : `/dashboard/${role}/coach-assistant`;
}

export function PlaudIntelligenceWorkspacePage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useDashboardRole();
  const coachPath = `/dashboard/${role}/coach-assistant`;
  const { items: intakeItems, summary, isLoading, error, refresh } = usePlaudIntakeQueue({ limit: 20 });
  const params = new URLSearchParams(location.search);
  const directMergeRequestId = parseMergeRequestId(params.get('mergeRequestId'));
  const reviewNextRequested = params.get('review') === 'next';
  const reviewNextMergeRequestId = reviewNextRequested
    ? pickReviewNextMergeRequestId(intakeItems)
    : null;
  const initialReviewMergeRequestId = directMergeRequestId || reviewNextMergeRequestId;
  const selectedMergeRequestId = directMergeRequestId || reviewNextMergeRequestId;

  const focusQueue = useCallback(() => {
    const queue = document.querySelector('[data-testid="plaud-pending-reviews"]');
    if (queue instanceof HTMLElement) {
      queue.scrollIntoView({ behavior: 'smooth', block: 'start' });
      queue.focus?.();
    }
  }, []);

  const focusMergePanel = useCallback(() => {
    const panel = document.querySelector('[data-testid="plaud-merge-panel"]');
    if (panel instanceof HTMLElement) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      panel.focus?.();
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('review') !== 'next') return undefined;
    if (isLoading || reviewNextMergeRequestId) return undefined;
    const timer = window.setTimeout(focusQueue, 120);
    return () => window.clearTimeout(timer);
  }, [focusQueue, isLoading, location.search, reviewNextMergeRequestId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('pieces') === 'pending') {
      const timer = window.setTimeout(focusMergePanel, 120);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [focusMergePanel, location.search]);

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
          ) : visibleIntakePreviewItems(intakeItems, selectedMergeRequestId).map((item) => {
            const isDirectMergeTarget = Boolean(
              selectedMergeRequestId && item.kind === 'merge_request' && item.entityId === selectedMergeRequestId,
            );
            return (
              <IntakePreviewItem
                key={item.id}
                $selected={isDirectMergeTarget}
                aria-current={isDirectMergeTarget ? 'true' : undefined}
              >
                <IntakePreviewLink
                  to={intakePreviewHref(item, role)}
                  aria-label={`Review intake ${item.title || item.clientName || item.sourceLabel}`}
                >
                  <strong>{item.clientName || 'Client pending'}</strong>
                  {' - '}
                  {formatQueueStatus(item.queueStatus)}
                </IntakePreviewLink>
                <BadgeCluster>
                  {isDirectMergeTarget && <SourceBadge $tone="gold">Selected review</SourceBadge>}
                  <SourceBadge>{item.sourceLabel}</SourceBadge>
                </BadgeCluster>
              </IntakePreviewItem>
            );
          })}
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
            initialReviewMergeRequestId={initialReviewMergeRequestId || undefined}
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
      </WorkspaceBody>
    </WorkspaceShell>
  );
}

export default PlaudIntelligenceWorkspacePage;
