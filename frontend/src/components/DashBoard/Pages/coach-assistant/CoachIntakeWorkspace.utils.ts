/**
 * CoachIntakeWorkspace.utils.ts
 * =============================
 * Small pure helpers for the Coach intake workspace queue and routing.
 */
import type {
  CoachAudioPuzzleSummary,
  CoachIntakeItem,
  CoachIntakeQueueScope,
} from '../../../../services/coachIntakeService';
import type { CoachActionProposal } from './SwanCoachTypes';
import { safeCoachIntakeSourceLabel } from './CoachIntakeOperationalText.logic';

const COACH_QUEUE_SCOPES = new Set<CoachIntakeQueueScope>([
  'actionable',
  'ready_review',
  'needs_client',
  'needs_clarification',
  'duplicate_hold',
  'unprocessed',
  'processing',
  'failed',
]);

export function statusLabel(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function itemClientStatusLabel(item: CoachIntakeItem): string {
  if (item.needsClient) return 'Client needs confirmation';
  return item.clientId == null ? 'Client pending' : 'Selected client';
}

export function itemSourceLabel(item: CoachIntakeItem): string {
  const sourceLabel = safeCoachIntakeSourceLabel(item.source);
  if (sourceLabel !== 'Coach intake') return sourceLabel;
  if (item.kind === 'merge_request') return 'PLAUD merge';
  if (item.kind === 'clip') return 'Manual upload';
  return sourceLabel;
}

export function itemDisplayTitle(item: CoachIntakeItem): string {
  const sourceLabel = itemSourceLabel(item);
  return sourceLabel === 'Coach intake' ? 'Coach intake item' : sourceLabel;
}

export function itemMeta(item: CoachIntakeItem): string {
  const pieces = [
    itemClientStatusLabel(item),
    statusLabel(item.queueStatus),
  ];
  if (typeof item.clipCount === 'number' && item.clipCount > 0) {
    pieces.push(`${item.clipCount} clip${item.clipCount === 1 ? '' : 's'}`);
  }
  return pieces.join(' - ');
}

export function plural(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

export function visibleAudioPuzzle(puzzle?: CoachAudioPuzzleSummary | null): CoachAudioPuzzleSummary | null {
  if (!puzzle) return null;
  const pieceCount = Number(puzzle.pieceCount || 0);
  if (pieceCount > 1 || puzzle.needsOrderingReview || puzzle.confidence !== 'single') {
    return { ...puzzle, pieceCount };
  }
  return null;
}

function queuePriority(item: CoachIntakeItem): number {
  if (item.canReview) return -1;
  const priorities: Record<string, number> = {
    ready_review: 0,
    needs_client: 1,
    needs_clarification: 2,
    duplicate_hold: 3,
    unprocessed: 4,
    processing: 5,
    failed: 6,
  };
  return priorities[item.queueStatus] ?? 99;
}

function queueAgeTime(item: CoachIntakeItem): number {
  const value = item.recordedAt || item.timelineAt || item.createdAt || null;
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export function orderedQueueItems(items: CoachIntakeItem[]): CoachIntakeItem[] {
  return [...items].sort((a, b) => {
    const priority = queuePriority(a) - queuePriority(b);
    if (priority !== 0) return priority;
    return queueAgeTime(a) - queueAgeTime(b);
  });
}

export function pickNextItem(items: CoachIntakeItem[]): CoachIntakeItem | null {
  return orderedQueueItems(items).filter((item) => item.queueStatus !== 'archived')[0] || null;
}

export function actionableItemsAfter(
  items: CoachIntakeItem[],
  currentId?: string | null,
): CoachIntakeItem[] {
  const cleanCurrent = String(currentId || '').replace(/^coach:/, '');
  return orderedQueueItems(items).filter((item) => {
    if (item.queueStatus === 'archived') return false;
    if (!cleanCurrent) return true;
    return itemEntityId(item) !== cleanCurrent && item.id !== currentId;
  });
}

export function shouldAdvanceAfterProposalAction(
  proposal: Pick<CoachActionProposal, 'status' | 'type'>,
): boolean {
  const status = String(proposal.status || '').toUpperCase();
  return status === 'APPLIED'
    || status === 'REJECTED'
    || (proposal.type === 'clarification' && status === 'APPROVED');
}

export function itemEntityId(item: CoachIntakeItem): string {
  return String(item.entityId || item.id || '').replace(/^coach:/, '');
}

function routeWithParams(baseHref: string, params: Record<string, string>): string {
  const [path, search = ''] = baseHref.split('?');
  const searchParams = new URLSearchParams(search);
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function plaudReviewBaseHref(workspaceHref: string): string {
  const path = workspaceHref.split('?')[0];
  if (path === '/dashboard/admin/coach-assistant') {
    return '/dashboard/admin/coach-assistant?workspace=plaud';
  }
  return path.replace('/coach-assistant', '/plaud');
}

export function itemReviewHref(item: CoachIntakeItem | null, workspaceHref: string): string {
  if (!item) return workspaceHref;
  if (item.kind === 'merge_request' && item.canReview) {
    const entityId = String(item.entityId || '').trim();
    const plaudHref = plaudReviewBaseHref(workspaceHref);
    return entityId
      ? routeWithParams(plaudHref, { mergeRequestId: entityId })
      : routeWithParams(plaudHref, { review: 'next' });
  }
  const entityId = itemEntityId(item);
  return entityId ? `${workspaceHref}?intake=${encodeURIComponent(entityId)}` : workspaceHref;
}

export function itemProposalReviewHref(item: CoachIntakeItem, workspaceHref: string, proposalId?: string | null): string {
  const reviewHref = itemReviewHref(item, workspaceHref);
  const cleanProposalId = String(proposalId || '').trim();
  if (!cleanProposalId || !reviewHref.includes('?intake=')) return reviewHref;
  return `${reviewHref}&proposal=${encodeURIComponent(cleanProposalId)}`;
}

export function queueScopedHref(href: string, scope?: string | null): string {
  if (!scope || !COACH_QUEUE_SCOPES.has(scope as CoachIntakeQueueScope) || !href.includes('/coach-assistant')) return href;
  const [pathWithSearch, hash] = href.split('#');
  const [path, search = ''] = pathWithSearch.split('?');
  const params = new URLSearchParams(search);
  params.set('scope', scope);
  return `${path}?${params.toString()}${hash ? `#${hash}` : ''}`;
}

export function isActiveItem(item: CoachIntakeItem, activeIntakeId?: string | null): boolean {
  if (!activeIntakeId) return false;
  const clean = activeIntakeId.replace(/^coach:/, '');
  return itemEntityId(item) === clean || item.id === activeIntakeId;
}
