/**
 * CoachIntakeWorkspace.tsx
 * ========================
 * Compact intake bridge for the live Swan Coach Assistant surface.
 *
 * The full trainer PLAUD workspace remains mounted at /dashboard/trainer/plaud.
 * Admin PLAUD work is unified inside the Coach Command Center so queue review
 * and merge approval do not split across duplicate tabs.
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock3,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import type { CoachIntakeQueueState } from '../../../../hooks/useCoachIntakeQueue';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import type { CoachActionProposal } from './SwanCoachTypes';
import CoachIntakeEventTrail from './CoachIntakeEventTrail';
import CoachIntakeHealthStrip from './CoachIntakeHealthStrip';
import CoachIntakeOutcomeReceipt, { outcomeFromProposal, type CoachIntakeOutcome } from './CoachIntakeOutcomeReceipt';
import CoachIntakePreparedDraftPanel from './CoachIntakePreparedDraftPanel';
import CoachIntakeQueueEmptyState from './CoachIntakeQueueEmptyState';
import CoachIntakeQueueItemCard from './CoachIntakeQueueItemCard';
import CoachIntakeQueueScopeTabs from './CoachIntakeQueueScopeTabs';
import CoachIntakeWorkspaceHeader from './CoachIntakeWorkspaceHeader';
import CoachIntakeWorkspaceActiveTarget from './CoachIntakeWorkspaceActiveTarget';
import { useCoachIntakeAudioOrderConfirmation } from './hooks/useCoachIntakeAudioOrderConfirmation';
import { useCoachIntakeScopeUrlSync } from './hooks/useCoachIntakeScopeUrlSync';
import {
  Grid,
  ItemCard,
  ItemList,
  ItemTitle,
  Panel,
  SourceChip,
  Stat,
  StatGrid,
} from './CoachIntakeWorkspace.styles';
import { Helper, HelperRail } from './CoachIntakeWorkspaceHelper.styles';
import {
  activeAudioPrompt,
  activeCoachActionPrompt,
  activeDraftReviewPrompt,
  actionableItemsAfter,
  isActiveItem,
  itemEntityId,
  itemDisplayTitle,
  itemProposalReviewHref,
  itemReviewHref,
  orderedQueueItems,
  pickNextItem,
  queueScopedHref,
  shouldAdvanceAfterProposalAction,
  statusLabel,
} from './CoachIntakeWorkspace.utils';
import { safeQueueLoadFailure } from './CoachIntakeOperationalText.logic';

type CoachRole = 'admin' | 'trainer' | 'client';

interface CoachIntakeWorkspaceProps {
  userRole: CoachRole;
  selectedClientName: string | null;
  onCommandPrompt: (message: string) => void;
  queue: CoachIntakeQueueState;
  activeIntakeId?: string | null;
}

interface ReviewOutcomeState {
  activeTargetId: string | null;
  activeTargetLabel: string | null;
  outcome: CoachIntakeOutcome;
}

export function CoachIntakeWorkspace({
  userRole,
  selectedClientName,
  onCommandPrompt,
  queue,
  activeIntakeId = null,
}: CoachIntakeWorkspaceProps): JSX.Element | null {
  const isTrainerSurface = userRole === 'admin' || userRole === 'trainer';
  const { items, summary, isLoading, error, refresh } = queue;
  const navigate = useNavigate();
  const location = useLocation();
  const audioOrderConfirmation = useCoachIntakeAudioOrderConfirmation(refresh);
  const [reviewingProposalId, setReviewingProposalId] = React.useState<string | null>(null);
  const [reviewOutcome, setReviewOutcome] = React.useState<ReviewOutcomeState | null>(null);
  const activeDossierRef = React.useRef<HTMLElement | null>(null);
  const focusedActiveDossierRef = React.useRef<string | null>(null);
  const handleScopeChange = useCoachIntakeScopeUrlSync({
    activeScope: queue.scope,
    setScope: queue.setScope,
  });

  const workspaceHref = userRole === 'admin'
    ? '/dashboard/admin/coach-assistant?workspace=plaud'
    : `/dashboard/${userRole}/plaud`;
  const coachWorkspaceHref = `/dashboard/${userRole}/coach-assistant`;
  const orderedItems = React.useMemo(() => orderedQueueItems(items), [items]);
  const nextItem = pickNextItem(orderedItems);
  const activeItem = orderedItems.find((item) => isActiveItem(item, activeIntakeId)) || null;
  const activeItemKey = activeItem?.id || null;
  const activeReviewTargetId = activeItem ? itemEntityId(activeItem) || activeItem.id : null;
  const activeProposalId = React.useMemo(() => new URLSearchParams(location.search).get('proposal'), [location.search]);
  const hasStaleProposalLink = Boolean(activeProposalId && activeItem && activeProposalId !== activeItem.latestProposalId);
  const reviewNextHref = queueScopedHref(itemReviewHref(nextItem, coachWorkspaceHref), queue.scope);
  const clientCopy = selectedClientName
    ? `Drafts can still target ${selectedClientName}, but queue review can resolve unknown clients.`
    : 'No client has to be selected first; unknown-client intake stays in review.';
  const visibleReviewOutcome = reviewOutcome?.activeTargetId === activeReviewTargetId
    ? reviewOutcome.outcome
    : null;

  React.useEffect(() => {
    setReviewingProposalId(null);
    setReviewOutcome((current) => {
      if (!current) return current;
      return current.activeTargetId === activeReviewTargetId ? current : null;
    });
  }, [activeItemKey, activeReviewTargetId]);

  React.useEffect(() => {
    if (!activeProposalId) return;
    if (activeItem && activeProposalId !== activeItem.latestProposalId) return;
    setReviewingProposalId(activeProposalId);
  }, [activeProposalId, activeItem]);

  React.useEffect(() => {
    if (!activeIntakeId || !activeReviewTargetId || focusedActiveDossierRef.current === activeReviewTargetId) return undefined;
    focusedActiveDossierRef.current = activeReviewTargetId;
    const panel = activeDossierRef.current;
    if (!panel) return undefined;
    const timer = window.setTimeout(() => {
      if (typeof panel.scrollIntoView === 'function') {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (typeof panel.focus === 'function') {
        panel.focus({ preventScroll: true });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [activeIntakeId, activeReviewTargetId]);

  React.useEffect(() => {
    if (!isTrainerSurface || !activeIntakeId || activeItem || isLoading || error) return;
    navigate(queueScopedHref(itemReviewHref(nextItem, coachWorkspaceHref), queue.scope), { replace: true });
  }, [activeIntakeId, activeItem, coachWorkspaceHref, error, isLoading, isTrainerSurface, navigate, nextItem]);

  const handleProposalAction = React.useCallback((proposal: CoachActionProposal) => {
    const shouldAdvance = shouldAdvanceAfterProposalAction(proposal);
    if (!shouldAdvance) {
      setReviewOutcome({
        activeTargetId: activeReviewTargetId,
        activeTargetLabel: activeItem ? itemDisplayTitle(activeItem) : null,
        outcome: outcomeFromProposal(proposal, false),
      });
      void refresh();
      return;
    }
    setReviewingProposalId(null);
    const currentId = activeItem ? itemEntityId(activeItem) || activeItem.id : activeIntakeId;
    void (async () => {
      let sourceItems = orderedItems;
      try {
        const refreshResult = await refresh();
        if (Array.isArray(refreshResult)) sourceItems = refreshResult;
      } catch {
        sourceItems = orderedItems;
      }
      const nextItemAfterAction = actionableItemsAfter(sourceItems, currentId)[0] || null;
      setReviewOutcome({
        activeTargetId: nextItemAfterAction
          ? itemEntityId(nextItemAfterAction) || nextItemAfterAction.id
          : activeReviewTargetId,
        activeTargetLabel: nextItemAfterAction
          ? itemDisplayTitle(nextItemAfterAction)
          : activeItem
            ? itemDisplayTitle(activeItem)
            : null,
        outcome: outcomeFromProposal(proposal, !!nextItemAfterAction),
      });
      navigate(queueScopedHref(itemReviewHref(nextItemAfterAction, coachWorkspaceHref), queue.scope));
    })();
  }, [activeIntakeId, activeItem, activeReviewTargetId, coachWorkspaceHref, navigate, orderedItems, refresh]);

  if (!isTrainerSurface) return null;

  return (
    <Panel aria-label="Swan Coach voice intake workspace">
      <CoachIntakeWorkspaceHeader
        clientCopy={clientCopy}
        reviewNextHref={reviewNextHref}
        workspaceHref={workspaceHref}
        scope={queue.scope}
        summary={summary}
        onCommandPrompt={onCommandPrompt}
        onRefresh={refresh}
      />

      <CoachIntakeHealthStrip
        health={queue.health}
        retention={queue.retention}
        retentionPurgePlan={queue.retentionPurgePlan}
        onCommandPrompt={onCommandPrompt}
        onScopeChange={handleScopeChange}
      />

      {activeItem && (
        <CoachIntakeWorkspaceActiveTarget
          focusRef={activeDossierRef}
          item={activeItem}
          statusText={statusLabel(activeItem.queueStatus)}
          reviewHref={queueScopedHref(itemReviewHref(activeItem, coachWorkspaceHref), queue.scope)}
          onAskCoach={() => onCommandPrompt(activeCoachActionPrompt(activeItem))}
          onInspectAudio={() => onCommandPrompt(activeAudioPrompt(activeItem))}
          onConfirmAudioOrder={() => audioOrderConfirmation.confirmAudioOrder(itemEntityId(activeItem))}
          onPrepareDraftReview={() => onCommandPrompt(activeDraftReviewPrompt(activeItem))}
          onReviewPreparedDraft={() => {
            const proposalId = activeItem.latestProposalId || null;
            setReviewingProposalId(proposalId);
            if (proposalId) navigate(queueScopedHref(itemProposalReviewHref(activeItem, coachWorkspaceHref, proposalId), queue.scope), { replace: true });
          }}
          confirmAudioOrderStatus={audioOrderConfirmation.statusFor(itemEntityId(activeItem))}
          isConfirmingAudioOrder={audioOrderConfirmation.confirmingId === itemEntityId(activeItem)}
          showStaleProposalLink={hasStaleProposalLink}
        />
      )}
      {activeItem?.kind === 'coach_intake' ? (
        <CoachIntakeEventTrail intakeId={activeReviewTargetId} />
      ) : null}
      {reviewingProposalId ? (
        <CoachIntakePreparedDraftPanel
          proposalId={reviewingProposalId}
          onClose={() => setReviewingProposalId(null)}
          onProposalAction={handleProposalAction}
        />
      ) : null}
      {visibleReviewOutcome ? (
        <CoachIntakeOutcomeReceipt
          outcome={visibleReviewOutcome}
          activeTargetLabel={reviewOutcome?.activeTargetLabel}
          onDismiss={() => setReviewOutcome(null)}
        />
      ) : null}

      <Grid>
        <StatGrid aria-label="Coach intake summary">
          <Stat><dt>Actionable</dt><dd>{summary.actionable}</dd></Stat>
          <Stat><dt>Ready</dt><dd>{summary.readyReview}</dd></Stat>
          <Stat><dt>Needs client</dt><dd>{summary.needsClient}</dd></Stat>
          <Stat><dt>Failed</dt><dd>{summary.failed}</dd></Stat>
        </StatGrid>

        <ItemList aria-live="polite">
          <CoachIntakeQueueScopeTabs
            activeScope={queue.scope}
            summary={summary}
            onScopeChange={handleScopeChange}
          />
          {isLoading ? (
            <ItemCard><ItemTitle><strong>Loading intake queue</strong><span>Checking Coach, PLAUD, and voice work items.</span></ItemTitle></ItemCard>
          ) : error ? (
            <ItemCard role="alert">
              <ItemTitle><strong>Queue unavailable</strong><span>{safeQueueLoadFailure()}</span></ItemTitle>
              <SourceChip><AlertTriangle size={12} aria-hidden="true" /> Check</SourceChip>
            </ItemCard>
          ) : orderedItems.length === 0 ? (
            <CoachIntakeQueueEmptyState scope={queue.scope} />
          ) : orderedItems.map((item) => {
            const active = isActiveItem(item, activeIntakeId);
            return (
              <CoachIntakeQueueItemCard
                key={item.id}
                item={item}
                active={active}
                coachWorkspaceHref={coachWorkspaceHref}
                onCommandPrompt={onCommandPrompt}
                queueScope={queue.scope}
              />
            );
          })}
        </ItemList>
      </Grid>

      <HelperRail>
        <Helper><Clock3 size={16} aria-hidden="true" /> Clips stay ordered by recording time first, upload order second.</Helper>
        <Helper><GitBranch size={16} aria-hidden="true" /> Coach commands can inspect pieces before the final merge decision.</Helper>
        <Helper><ShieldCheck size={16} aria-hidden="true" /> Client, date, duplicate, and final log writes stay approval-gated.</Helper>
      </HelperRail>
    </Panel>
  );
}

export default CoachIntakeWorkspace;
