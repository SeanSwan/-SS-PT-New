/**
 * PlaudIntelligenceWorkspacePage.logic.ts
 * ======================================
 *
 * Pure helpers for the top-level PLAUD workspace. These keep API-provided
 * queue metadata from becoming arbitrary operator-visible text.
 */
import type { PlaudIntakeItem } from '../../services/plaudIntakeService';

export type PlaudDashboardRole = 'admin' | 'trainer';

const QUEUE_STATUS_LABELS: Record<PlaudIntakeItem['queueStatus'], string> = {
  archived: 'Archived',
  duplicate_hold: 'Duplicate hold',
  failed: 'Failed',
  needs_clarification: 'Needs clarification',
  processing: 'Processing',
  ready_review: 'Ready review',
  unprocessed: 'Unprocessed',
};

const SOURCE_LABELS: Record<PlaudIntakeItem['source'], string> = {
  applaud_local_sync: 'APPLAUD sync',
  applaud_webhook: 'Applaud',
  manual_upload: 'Manual upload',
  plaud_merge: 'PLAUD merge',
};

export function formatPlaudQueueStatus(status: unknown): string {
  if (typeof status !== 'string') return 'Status pending';
  return QUEUE_STATUS_LABELS[status as PlaudIntakeItem['queueStatus']] || 'Status pending';
}

export function formatPlaudSourceLabel(source: unknown): string {
  if (typeof source !== 'string') return 'PLAUD intake';
  return SOURCE_LABELS[source as PlaudIntakeItem['source']] || 'PLAUD intake';
}

export function queueLoadErrorMessage(): string {
  return 'Unable to load PLAUD intake queue.';
}

export function intakePreviewClientLabel(item: PlaudIntakeItem): string {
  return item.needsClient || item.clientId == null ? 'Client pending' : 'Selected client';
}

export function intakePreviewLabel(item: PlaudIntakeItem): string {
  const clientLabel = intakePreviewClientLabel(item).toLowerCase();
  return `Review ${formatPlaudSourceLabel(item.source)} intake, ${clientLabel}, ${formatPlaudQueueStatus(item.queueStatus)}`;
}

function parseSortableTime(value?: string | null): number {
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function reviewableMergeTime(item: PlaudIntakeItem): number {
  return parseSortableTime([item.recordedAt, item.timelineAt, item.createdAt].find(Boolean));
}

export function pickReviewNextMergeRequestId(items: PlaudIntakeItem[]): string | null {
  return [...items]
    .filter((item) => item.kind === 'merge_request' && item.canReview)
    .sort((a, b) => reviewableMergeTime(a) - reviewableMergeTime(b))[0]?.entityId || null;
}

export function visibleIntakePreviewItems(
  items: PlaudIntakeItem[],
  selectedMergeRequestId: string | null,
): PlaudIntakeItem[] {
  const firstItems = items.slice(0, 6);
  const isSelectedMergeRequest = (item: PlaudIntakeItem) => (
    item.kind === 'merge_request' && item.entityId === selectedMergeRequestId
  );
  if (!selectedMergeRequestId || firstItems.some(isSelectedMergeRequest)) return firstItems;
  const selectedItem = items.find(isSelectedMergeRequest);
  return selectedItem ? [selectedItem, ...firstItems.slice(0, 5)] : firstItems;
}

function withParams(baseHref: string, params: Record<string, string>): string {
  const url = new URL(baseHref, 'https://swanstudios.local');
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return `${url.pathname}${url.search}`;
}

export function plaudWorkspaceHref(role: PlaudDashboardRole, params: Record<string, string> = {}): string {
  const baseHref = role === 'admin'
    ? '/dashboard/admin/coach-assistant?workspace=plaud'
    : '/dashboard/trainer/plaud';
  return withParams(baseHref, params);
}

function mergePreviewHref(item: PlaudIntakeItem, role: PlaudDashboardRole): string {
  return item.entityId
    ? plaudWorkspaceHref(role, { mergeRequestId: item.entityId })
    : plaudWorkspaceHref(role, { review: 'next' });
}

function coachPreviewHref(item: PlaudIntakeItem, role: PlaudDashboardRole): string {
  const intakeId = String(item.entityId || item.id || '').replace(/^coach:/, '');
  return intakeId
    ? `/dashboard/${role}/coach-assistant?intake=${encodeURIComponent(intakeId)}`
    : `/dashboard/${role}/coach-assistant`;
}

export function intakePreviewHref(item: PlaudIntakeItem, role: PlaudDashboardRole): string {
  return item.kind === 'merge_request'
    ? mergePreviewHref(item, role)
    : coachPreviewHref(item, role);
}
