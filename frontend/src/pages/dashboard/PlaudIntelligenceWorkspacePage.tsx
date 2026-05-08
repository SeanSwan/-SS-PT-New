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
import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Brain,
  Clock3,
  FileAudio,
  ListChecks,
} from 'lucide-react';
import { PlaudMergeWorkspace } from '../../components/PlaudClipMerge/PlaudMergeWorkspace';
import { usePlaudIntakeQueue } from '../../hooks/usePlaudIntakeQueue';
import { parsePlaudMergeRequestId } from '../../utils/plaudRouteGuards';
import { PlaudCoachHandoffPane, PlaudIntakeLanes } from './PlaudIntelligenceWorkspacePanels';
import {
  formatPlaudQueueStatus,
  formatPlaudSourceLabel,
  intakePreviewHref,
  intakePreviewLabel,
  pickReviewNextMergeRequestId,
  queueLoadErrorMessage,
  visibleIntakePreviewItems,
  type PlaudDashboardRole,
} from './PlaudIntelligenceWorkspacePage.logic';
import {
  ActionButton,
  Eyebrow,
  HeaderActions,
  HeaderCopy,
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
  IntakeRecoveryAlert,
  IntakeRecoveryLink,
  IntakeSnapshot,
  IntakeSnapshotHeader,
  IntakeStat,
  IntakeStats,
  SourceBadge,
} from './PlaudIntakeSnapshot.styles';

function useDashboardRole(): PlaudDashboardRole {
  const location = useLocation();
  return location.pathname.includes('/dashboard/trainer/') ? 'trainer' : 'admin';
}

export function PlaudIntelligenceWorkspacePage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useDashboardRole();
  const invalidReviewLinkRef = useRef<HTMLDivElement | null>(null);
  const coachPath = `/dashboard/${role}/coach-assistant`;
  const { items: intakeItems, summary, isLoading, error, refresh } = usePlaudIntakeQueue({ limit: 20 });
  const params = new URLSearchParams(location.search);
  const rawMergeRequestId = params.get('mergeRequestId');
  const directMergeRequestId = parsePlaudMergeRequestId(rawMergeRequestId);
  const hasInvalidDirectMergeRequestId = Boolean(rawMergeRequestId && !directMergeRequestId);
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

  const focusInvalidReviewLink = useCallback(() => {
    invalidReviewLinkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    invalidReviewLinkRef.current?.focus();
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

  useEffect(() => {
    if (!hasInvalidDirectMergeRequestId) return undefined;
    const timer = window.setTimeout(focusInvalidReviewLink, 120);
    return () => window.clearTimeout(timer);
  }, [focusInvalidReviewLink, hasInvalidDirectMergeRequestId]);

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
        {hasInvalidDirectMergeRequestId && (
          <IntakeRecoveryAlert
            ref={invalidReviewLinkRef}
            role="alert"
            tabIndex={-1}
            data-testid="plaud-invalid-review-link"
          >
            <AlertTriangle size={18} aria-hidden="true" />
            <span>That PLAUD review link has an invalid merge request ID.</span>
            <IntakeRecoveryLink to={`/dashboard/${role}/plaud?review=next`}>
              Review next item
            </IntakeRecoveryLink>
          </IntakeRecoveryAlert>
        )}
        <IntakePreviewList>
          {isLoading ? (
            <IntakePreviewItem><span>Loading intake queue</span><span /></IntakePreviewItem>
          ) : error ? (
            <IntakePreviewItem role="alert"><span>{queueLoadErrorMessage()}</span><span /></IntakePreviewItem>
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
                  aria-label={intakePreviewLabel(item)}
                >
                  <strong>{item.clientName || 'Client pending'}</strong>
                  {' - '}
                  {formatPlaudQueueStatus(item.queueStatus)}
                </IntakePreviewLink>
                <BadgeCluster>
                  {isDirectMergeTarget && <SourceBadge $tone="gold">Selected review</SourceBadge>}
                  <SourceBadge>{formatPlaudSourceLabel(item.source)}</SourceBadge>
                </BadgeCluster>
              </IntakePreviewItem>
            );
          })}
        </IntakePreviewList>
      </IntakeSnapshot>

      <PlaudIntakeLanes />

      <WorkspaceBody>
        <PrimaryPane aria-label="PLAUD merge and review queue">
          <PlaudMergeWorkspace
            embedded
            initialReviewMergeRequestId={initialReviewMergeRequestId || undefined}
          />
        </PrimaryPane>
        <PlaudCoachHandoffPane />
      </WorkspaceBody>
    </WorkspaceShell>
  );
}

export default PlaudIntelligenceWorkspacePage;
