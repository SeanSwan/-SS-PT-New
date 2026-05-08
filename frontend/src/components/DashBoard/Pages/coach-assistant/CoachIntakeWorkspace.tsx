/**
 * CoachIntakeWorkspace.tsx
 * ========================
 * Compact intake bridge for the live Swan Coach Assistant surface.
 *
 * The full PLAUD workspace remains mounted at /dashboard/{role}/plaud. This
 * panel gives trainer/admin users queue state and command hooks inside Coach
 * without duplicating backend write logic or implying auto-apply.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Brain,
  Clock3,
  FileAudio,
  GitBranch,
  ListChecks,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react';
import type { CoachIntakeQueueState } from '../../../../hooks/useCoachIntakeQueue';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import type { CoachActionProposal } from './SwanCoachTypes';
import CoachIntakeActiveDossier from './CoachIntakeActiveDossier';
import CoachIntakePreparedDraftPanel from './CoachIntakePreparedDraftPanel';
import { useCoachIntakeAudioOrderConfirmation } from './hooks/useCoachIntakeAudioOrderConfirmation';
import {
  AudioPuzzleLabel,
  AudioPuzzleRow,
} from './CoachIntakeWorkspaceAudio.styles';
import {
  ActionButton,
  ActionRow,
  ChipColumn,
  Eyebrow,
  Grid,
  Header,
  Helper,
  HelperRail,
  ItemCard,
  ItemList,
  ItemTitle,
  Panel,
  SourceChip,
  Stat,
  StatGrid,
  TitleBlock,
  WorkspaceLink,
} from './CoachIntakeWorkspace.styles';
import {
  activeAudioPrompt,
  activeDraftReviewPrompt,
  activeItemPrompt,
  actionableItemsAfter,
  isActiveItem,
  itemEntityId,
  itemMeta,
  itemReviewHref,
  orderedQueueItems,
  pickNextItem,
  plural,
  shouldAdvanceAfterProposalAction,
  statusLabel,
  visibleAudioPuzzle,
} from './CoachIntakeWorkspace.utils';

type CoachRole = 'admin' | 'trainer' | 'client';

interface CoachIntakeWorkspaceProps {
  userRole: CoachRole;
  selectedClientName: string | null;
  onCommandPrompt: (message: string) => void;
  queue: CoachIntakeQueueState;
  activeIntakeId?: string | null;
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
  const audioOrderConfirmation = useCoachIntakeAudioOrderConfirmation(refresh);
  const [reviewingProposalId, setReviewingProposalId] = React.useState<string | null>(null);

  const workspaceHref = `/dashboard/${userRole}/plaud`;
  const coachWorkspaceHref = `/dashboard/${userRole}/coach-assistant`;
  const orderedItems = React.useMemo(() => orderedQueueItems(items), [items]);
  const nextItem = pickNextItem(orderedItems);
  const activeItem = orderedItems.find((item) => isActiveItem(item, activeIntakeId)) || null;
  const activeItemKey = activeItem?.id || null;
  const reviewNextHref = itemReviewHref(nextItem, coachWorkspaceHref);
  const clientCopy = selectedClientName
    ? `Drafts can still target ${selectedClientName}, but queue review can resolve unknown clients.`
    : 'No client has to be selected first; unknown-client intake stays in review.';

  React.useEffect(() => {
    setReviewingProposalId(null);
  }, [activeItemKey]);

  React.useEffect(() => {
    if (!isTrainerSurface || !activeIntakeId || activeItem || isLoading || error) return;
    navigate(itemReviewHref(nextItem, coachWorkspaceHref), { replace: true });
  }, [activeIntakeId, activeItem, coachWorkspaceHref, error, isLoading, isTrainerSurface, navigate, nextItem]);

  const handleProposalAction = React.useCallback((proposal: CoachActionProposal) => {
    if (!shouldAdvanceAfterProposalAction(proposal)) {
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
      navigate(itemReviewHref(nextItemAfterAction, coachWorkspaceHref));
    })();
  }, [activeIntakeId, activeItem, coachWorkspaceHref, navigate, orderedItems, refresh]);

  if (!isTrainerSurface) return null;

  return (
    <Panel aria-label="Swan Coach voice intake workspace">
      <Header>
        <TitleBlock>
          <Eyebrow><Brain size={14} aria-hidden="true" /> Hive mind intake</Eyebrow>
          <h2>Voice intake command center</h2>
          <p>{clientCopy}</p>
        </TitleBlock>
        <ActionRow>
          <WorkspaceLink $primary to={reviewNextHref}>
            <ListChecks size={16} aria-hidden="true" />
            Review next intake
          </WorkspaceLink>
          <ActionButton
            type="button"
            onClick={() => onCommandPrompt('review next Coach intake')}
          >
            <Brain size={16} aria-hidden="true" />
            Ask Coach
          </ActionButton>
          <ActionButton type="button" onClick={refresh}>
            <RefreshCcw size={16} aria-hidden="true" />
            Refresh
          </ActionButton>
          <ActionButton
            type="button"
            onClick={() => onCommandPrompt('inspect pending Coach audio pieces')}
          >
            <GitBranch size={16} aria-hidden="true" />
            Inspect audio pieces
          </ActionButton>
          <WorkspaceLink to={workspaceHref}>
            <FileAudio size={16} aria-hidden="true" />
            Open full PLAUD workspace
          </WorkspaceLink>
        </ActionRow>
      </Header>

      {activeItem && (
        <CoachIntakeActiveDossier
          item={activeItem}
          statusText={statusLabel(activeItem.queueStatus)}
          reviewHref={itemReviewHref(activeItem, coachWorkspaceHref)}
          onAskCoach={() => onCommandPrompt(activeItemPrompt(activeItem))}
          onInspectAudio={() => onCommandPrompt(activeAudioPrompt(activeItem))}
          onConfirmAudioOrder={() => audioOrderConfirmation.confirmAudioOrder(itemEntityId(activeItem))}
          onPrepareDraftReview={() => onCommandPrompt(activeDraftReviewPrompt(activeItem))}
          onReviewPreparedDraft={() => setReviewingProposalId(activeItem.latestProposalId || null)}
          confirmAudioOrderStatus={audioOrderConfirmation.statusFor(itemEntityId(activeItem))}
          isConfirmingAudioOrder={audioOrderConfirmation.confirmingId === itemEntityId(activeItem)}
        />
      )}
      {reviewingProposalId ? (
        <CoachIntakePreparedDraftPanel
          proposalId={reviewingProposalId}
          onClose={() => setReviewingProposalId(null)}
          onProposalAction={handleProposalAction}
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
          {isLoading ? (
            <ItemCard><ItemTitle><strong>Loading intake queue</strong><span>Checking Coach, PLAUD, and voice work items.</span></ItemTitle></ItemCard>
          ) : error ? (
            <ItemCard role="alert">
              <ItemTitle><strong>Queue unavailable</strong><span>{error.message}</span></ItemTitle>
              <SourceChip><AlertTriangle size={12} aria-hidden="true" /> Check</SourceChip>
            </ItemCard>
          ) : orderedItems.length === 0 ? (
            <ItemCard>
              <ItemTitle><strong>No active intake items</strong><span>Attach audio, transcript, or PLAUD clips to start a review.</span></ItemTitle>
              <SourceChip>Clear</SourceChip>
            </ItemCard>
          ) : orderedItems.map((item) => {
            const active = isActiveItem(item, activeIntakeId);
            const audioPuzzle = visibleAudioPuzzle(item.audioPuzzle);
            return (
            <ItemCard key={item.id} $active={active} aria-current={active ? 'true' : undefined}>
              <ItemTitle>
                <strong>{item.title}</strong>
                <span>{itemMeta(item)}</span>
              </ItemTitle>
              <ChipColumn>
                <SourceChip>{item.sourceLabel}</SourceChip>
                {active && <SourceChip $tone="gold">Review target</SourceChip>}
              </ChipColumn>
              {audioPuzzle && (
                <AudioPuzzleRow aria-label={`Audio puzzle ${plural(audioPuzzle.pieceCount, 'piece')}`}>
                  <GitBranch size={13} aria-hidden="true" />
                  <AudioPuzzleLabel>Audio puzzle</AudioPuzzleLabel>
                  <SourceChip $tone="purple">{plural(audioPuzzle.pieceCount, 'piece')}</SourceChip>
                  <SourceChip>{plural(audioPuzzle.bundleCount, 'bundle')}</SourceChip>
                  <span>{audioPuzzle.confidence} confidence</span>
                  {audioPuzzle.needsOrderingReview && <SourceChip $tone="gold">order review</SourceChip>}
                </AudioPuzzleRow>
              )}
            </ItemCard>
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
