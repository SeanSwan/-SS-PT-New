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

type CoachRole = 'admin' | 'trainer' | 'client';

interface CoachIntakeWorkspaceProps {
  userRole: CoachRole;
  selectedClientName: string | null;
  onCommandPrompt: (message: string) => void;
  queue: CoachIntakeQueueState;
  activeIntakeId?: string | null;
}

function statusLabel(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function itemMeta(item: CoachIntakeItem): string {
  const pieces = [
    item.clientName || (item.needsClient ? 'Client needs confirmation' : 'Client pending'),
    statusLabel(item.queueStatus),
  ];
  if (typeof item.clipCount === 'number' && item.clipCount > 0) {
    pieces.push(`${item.clipCount} clip${item.clipCount === 1 ? '' : 's'}`);
  }
  return pieces.join(' - ');
}

function queuePriority(item: CoachIntakeItem): number {
  if (item.canReview) return -1;
  const priorities: Record<string, number> = {
    ready_review: 0,
    needs_client: 1,
    unprocessed: 2,
    processing: 3,
    failed: 4,
  };
  return priorities[item.queueStatus] ?? 99;
}

function queueAgeTime(item: CoachIntakeItem): number {
  const value = item.recordedAt || item.timelineAt || item.createdAt || null;
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function pickNextItem(items: CoachIntakeItem[]): CoachIntakeItem | null {
  return [...items]
    .filter((item) => item.queueStatus !== 'archived')
    .sort((a, b) => {
      const priority = queuePriority(a) - queuePriority(b);
      if (priority !== 0) return priority;
      return queueAgeTime(a) - queueAgeTime(b);
    })[0] || null;
}

function itemEntityId(item: CoachIntakeItem): string {
  return String(item.entityId || item.id || '').replace(/^coach:/, '');
}

function itemReviewHref(item: CoachIntakeItem | null, workspaceHref: string): string {
  if (!item) return workspaceHref;
  if (item.kind === 'merge_request' && item.canReview) return `${workspaceHref.replace('/coach-assistant', '/plaud')}?review=next`;
  const entityId = itemEntityId(item);
  return entityId ? `${workspaceHref}?intake=${encodeURIComponent(entityId)}` : workspaceHref;
}

function isActiveItem(item: CoachIntakeItem, activeIntakeId?: string | null): boolean {
  if (!activeIntakeId) return false;
  const clean = activeIntakeId.replace(/^coach:/, '');
  return itemEntityId(item) === clean || item.id === activeIntakeId;
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

  if (!isTrainerSurface) return null;

  const workspaceHref = `/dashboard/${userRole}/plaud`;
  const coachWorkspaceHref = `/dashboard/${userRole}/coach-assistant`;
  const nextItem = pickNextItem(items);
  const reviewNextHref = itemReviewHref(nextItem, coachWorkspaceHref);
  const clientCopy = selectedClientName
    ? `Drafts can still target ${selectedClientName}, but queue review can resolve unknown clients.`
    : 'No client has to be selected first; unknown-client intake stays in review.';

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
            onClick={() => onCommandPrompt('inspect pending PLAUD audio pieces')}
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
          ) : items.length === 0 ? (
            <ItemCard>
              <ItemTitle><strong>No active intake items</strong><span>Attach audio, transcript, or PLAUD clips to start a review.</span></ItemTitle>
              <SourceChip>Clear</SourceChip>
            </ItemCard>
          ) : items.map((item) => {
            const active = isActiveItem(item, activeIntakeId);
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
