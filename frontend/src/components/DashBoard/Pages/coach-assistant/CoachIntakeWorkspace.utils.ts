/**
 * CoachIntakeWorkspace.utils.ts
 * =============================
 * Small pure helpers for the Coach intake workspace queue and prompt wiring.
 */
import type {
  CoachAudioPuzzleSummary,
  CoachIntakeItem,
  CoachIntakeQueueScope,
} from '../../../../services/coachIntakeService';
import type { CoachActionProposal } from './SwanCoachTypes';

const COACH_INTAKE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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

export function itemMeta(item: CoachIntakeItem): string {
  const pieces = [
    item.clientName || (item.needsClient ? 'Client needs confirmation' : 'Client pending'),
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

export function itemReviewHref(item: CoachIntakeItem | null, workspaceHref: string): string {
  if (!item) return workspaceHref;
  if (item.kind === 'merge_request' && item.canReview) {
    const entityId = String(item.entityId || '').trim();
    const plaudHref = workspaceHref.replace('/coach-assistant', '/plaud');
    return entityId ? `${plaudHref}?mergeRequestId=${encodeURIComponent(entityId)}` : `${plaudHref}?review=next`;
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

export function activeItemPrompt(item: CoachIntakeItem): string {
  return `review Coach intake ${itemEntityId(item) || item.id}`;
}

export function activeCoachActionPrompt(item: CoachIntakeItem): string {
  const intakeId = itemEntityId(item) || item.id;
  if (item.nextActionKey === 'review_failed_intake' || item.queueStatus === 'failed') {
    const parts = [
      `Review failed Coach intake ${intakeId}.`,
      'Inspect only PII-safe intake metadata, event history, and artifact status.',
      'Recommend the next recovery step: retry processing, upload transcript manually, hold, or discard.',
      'Do not write, create, update, log, or submit any client or workout record.',
    ];
    if (item.errorCode) parts.splice(1, 0, `Error code: ${item.errorCode}.`);
    return parts.join(' ');
  }
  if (item.nextActionKey === 'answer_clarification' || item.queueStatus === 'needs_clarification') {
    return [
      `Answer Coach clarification for intake ${intakeId}.`,
      'Inspect only PII-safe intake metadata, pending proposal metadata, and evidence references.',
      'Ask one narrow question or summarize the exact clarification needed before draft approval.',
      'Do not write, create, update, log, or submit any client or workout record.',
    ].join(' ');
  }
  if (item.nextActionKey === 'review_duplicate_hold' || item.queueStatus === 'duplicate_hold') {
    return [
      `Review duplicate risk for intake ${intakeId}.`,
      'Inspect only PII-safe intake metadata, duplicate-risk metadata, and existing workout summary references.',
      'Recommend whether to keep holding, compare manually, discard, or proceed to explicit operator approval.',
      'Do not write, create, update, log, or submit any client or workout record.',
    ].join(' ');
  }
  return activeItemPrompt(item);
}

export function activeAudioPrompt(item: CoachIntakeItem): string {
  return `inspect Coach intake ${itemEntityId(item) || item.id} audio pieces`;
}

export function activeDraftReviewPrompt(item: CoachIntakeItem): string {
  const intakeId = itemEntityId(item) || item.id;
  const intakeLinkInstruction = COACH_INTAKE_UUID_RE.test(intakeId)
    ? `Include top-level "intake_id": "${intakeId}" in the JSON block.`
    : 'Omit intake_id unless the active intake id is a UUID.';
  return [
    `Prepare structured Coach draft review for intake ${intakeId}.`,
    intakeLinkInstruction,
    'Use only the active Coach intake context and compact evidence_refs.',
    'If client, date, or workout details are missing, return a coach_action_proposal clarification.',
    'If enough evidence exists, return a coach_action_proposal split_plan or workout_log draft.',
    'Do not write, create, update, log, or submit any client or workout record.',
  ].join(' ');
}
