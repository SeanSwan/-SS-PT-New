import type { ConversationSummary } from '../../../../hooks/useAIChat';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import type {
  ClientContextTile,
  CoachQueueSummaryView,
  DossierTile,
  IntakeStateTile,
  QueueHealthRow,
  QueueMetric,
} from './CoachCommandCenter.types';

const MAX_MERGE_TIME = Number.MAX_SAFE_INTEGER;
const firstText = (values: Array<string | null | undefined>): string =>
  values.find((value): value is string => Boolean(value)) ?? '';

function safeParsedTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? MAX_MERGE_TIME : parsed;
}

function reviewableMergeTime(item: CoachIntakeItem): number {
  return safeParsedTime(firstText([item.recordedAt, item.timelineAt, item.createdAt]));
}

function pickReviewNextMergeRequestId(items: CoachIntakeItem[]): string | null {
  return [...items]
    .filter((item) => item.kind === 'merge_request' && item.canReview && item.entityId)
    .sort((a, b) => reviewableMergeTime(a) - reviewableMergeTime(b))[0]?.entityId || null;
}

export function pickRouteReviewNextMergeRequestId(
  reviewNextRequested: boolean,
  plaudWorkspaceRequested: boolean,
  items: CoachIntakeItem[],
): string | null {
  return reviewNextRequested || plaudWorkspaceRequested ? pickReviewNextMergeRequestId(items) : null;
}

export function getConversationTitle(thread?: ConversationSummary | null): string {
  const title = thread?.title?.trim();
  return title || 'Untitled coach thread';
}

function hasAutoSelectBlockers(
  routeIntent: string | null,
  routeClientId: number | null,
  activeThreadId: number | null,
): boolean {
  return [Boolean(routeIntent), Boolean(routeClientId), activeThreadId !== null].some(Boolean);
}

export function pickAutoSelectedThread<T>(
  threads: T[],
  routeIntent: string | null,
  routeClientId: number | null,
  activeThreadId: number | null,
): T | null {
  if (hasAutoSelectBlockers(routeIntent, routeClientId, activeThreadId)) return null;
  return threads[0] ?? null;
}

function isCoachThread(thread: ConversationSummary): boolean {
  return !thread.context || thread.context === 'coach_assistant';
}

function threadMatchesQuery(thread: ConversationSummary, query: string): boolean {
  const title = getConversationTitle(thread).toLowerCase();
  return title.includes(query) || Boolean(thread.context?.toLowerCase().includes(query));
}

export function buildCoachThreads(
  conversations: ConversationSummary[] | undefined,
  threadSearch: string,
): ConversationSummary[] {
  const threads = Array.isArray(conversations) ? conversations : [];
  const query = threadSearch.trim().toLowerCase();
  const coachOnly = threads.filter(isCoachThread);
  return query ? coachOnly.filter((thread) => threadMatchesQuery(thread, query)) : coachOnly;
}

export function pickInitialReviewMergeRequestId(
  directMergeRequestId: string | null,
  reviewNextMergeRequestId: string | null,
): string | undefined {
  return directMergeRequestId || reviewNextMergeRequestId || undefined;
}

export function selectedClientLabel(
  routeClientLabel: string | null,
  activeThreadTitle: string,
  hasActiveThread: boolean,
): string {
  return routeClientLabel || (hasActiveThread ? activeThreadTitle : 'Selected client');
}

export function shouldScrollPlaudReview(
  plaudWorkspaceRequested: boolean,
  rawMergeRequestId: string | null,
  reviewNextRequested: boolean,
): boolean {
  return [plaudWorkspaceRequested, Boolean(rawMergeRequestId), reviewNextRequested].some(Boolean);
}

export function displaySelectedStatus(voiceStatus: string | null, selectedStatus: string): string {
  return voiceStatus || selectedStatus;
}
export function toggleBoolean(current: boolean): boolean {
  return !current;
}

function formatThreadDateLabel(dateValue?: string | null): string {
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) return 'No activity yet';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatThreadMeta(thread: ConversationSummary): string {
  const dateLabel = formatThreadDateLabel(thread.lastMessageAt || thread.createdAt);
  return `${thread.messageCount || 0} msgs - ${dateLabel} - ${thread.status || 'active'}`;
}

export function buildRouteScopedCoachPrompt(command: string, routePrompt?: string | null): string {
  const trimmedCommand = command.trim();
  const trimmedRoutePrompt = routePrompt?.trim();
  if (!trimmedRoutePrompt) return trimmedCommand;
  if (trimmedCommand.toLowerCase().includes(trimmedRoutePrompt.toLowerCase())) {
    return trimmedCommand;
  }

  return `${trimmedRoutePrompt}\n\nOperator command:\n${trimmedCommand}`;
}

export function buildQueueSummary(queueSummary: Partial<CoachQueueSummaryView> | undefined): CoachQueueSummaryView {
  const source = queueSummary || {};
  const read = (key: keyof CoachQueueSummaryView) => {
    const value = source[key];
    return typeof value === 'number' ? value : Number(value ?? 0) || 0;
  };

  return {
    total: read('total'),
    actionable: read('actionable'),
    today: read('today'),
    unprocessed: read('unprocessed'),
    processing: read('processing'),
    readyReview: read('readyReview'),
    needsClarification: read('needsClarification'),
    duplicateHold: read('duplicateHold'),
    failed: read('failed'),
    needsClient: read('needsClient'),
    preparedDrafts: read('preparedDrafts'),
    pendingDrafts: read('pendingDrafts'),
  };
}

function workoutContextValue(hasRouteClient: boolean, hasThreadContext: boolean): string {
  if (hasRouteClient) return 'ready to log';
  return hasThreadContext ? 'thread selected' : 'select client';
}

export function buildClientContextTiles(hasRouteClient: boolean, hasThreadContext: boolean): ClientContextTile[] {
  const hasAnyContext = hasRouteClient || hasThreadContext;
  return [
    {
      label: 'Workout context',
      value: workoutContextValue(hasRouteClient, hasThreadContext),
    },
    {
      label: 'Nutrition context',
      value: hasAnyContext ? 'review gated' : 'not selected',
    },
  ];
}

function queueHealthValue(healthStatus: string | undefined, isLoading: boolean): string {
  if (healthStatus) return healthStatus;
  return isLoading ? 'loading' : 'ready';
}

const readyDraftValue = (summary: CoachQueueSummaryView): string =>
  String(summary.preparedDrafts || summary.readyReview);

export function buildStatusMetrics(
  summary: CoachQueueSummaryView,
  healthStatus: string | undefined,
  isLoading: boolean,
  nextActionLabel: string | undefined,
): QueueMetric[] {
  return [
    {
      label: 'Coach intake queue',
      value: String(summary.actionable),
      note: `${summary.readyReview} ready, ${summary.needsClarification} clarification, ${summary.duplicateHold} duplicate-risk`,
      accent: 'var(--accent-primary, #60c0f0)',
    },
    {
      label: 'Queue health',
      value: queueHealthValue(healthStatus, isLoading),
      note: nextActionLabel || 'Unified audio and Coach intake queue',
      accent: 'var(--success, #47e89a)',
    },
    {
      label: 'Ready drafts',
      value: readyDraftValue(summary),
      note: 'Final writes remain blocked until operator approval',
      accent: 'var(--accent-gold, #c6a84b)',
    },
    {
      label: 'Failed intake recovery',
      value: String(summary.failed),
      note: 'Audio/transcript recovery lane stays visible',
      accent: 'var(--error, #ff6d85)',
    },
  ];
}

export function buildIntakeStates(summary: CoachQueueSummaryView): IntakeStateTile[] {
  return [
    { label: 'Client confirmation holds', value: String(summary.needsClient), tone: 'hold' },
    { label: 'Clarification holds', value: String(summary.needsClarification), tone: 'hold' },
    { label: 'Duplicate-risk holds', value: String(summary.duplicateHold), tone: 'stale' },
    { label: 'Transcript upload/parsing', value: String(summary.processing), tone: 'processing' },
  ];
}

export function buildDossierTiles(
  initialReviewMergeRequestId: string | undefined,
  selectedClientLabel: string,
  summary: CoachQueueSummaryView,
): DossierTile[] {
  return [
    {
      label: 'Active intake dossier',
      value: initialReviewMergeRequestId ? 'Audio review selected' : 'Unified queue review',
      note: initialReviewMergeRequestId
        ? 'Merge review loaded from the command route'
        : 'Next actionable item is pulled from the unified queue',
    },
    { label: 'Selected client context', value: selectedClientLabel, note: 'Client context remains operator-reviewed before draft work' },
    { label: 'Attachments', value: `${summary.unprocessed + summary.processing} queued`, note: 'Audio, transcript, and typed intake sources' },
    { label: 'Operator approval', value: 'Required', note: 'Prepared recommendations only' },
  ];
}

export function buildQueueHealthRows(summary: CoachQueueSummaryView): QueueHealthRow[] {
  return [
    { label: 'Ready drafts', value: String(summary.preparedDrafts || summary.readyReview), tone: 'ready' },
    { label: 'Client confirmation holds', value: String(summary.needsClient), tone: 'hold' },
    { label: 'Clarification holds', value: String(summary.needsClarification), tone: 'hold' },
    { label: 'Duplicate-risk holds', value: String(summary.duplicateHold), tone: 'stale' },
    { label: 'Failed intake recovery', value: String(summary.failed), tone: 'failed' },
  ];
}

export function buildRightRailItems(items: CoachIntakeItem[]): string[] {
  const liveItems = items.slice(0, 4).map((item) => {
    const queueItem = item as CoachIntakeItem & { sourceLabel?: string };
    const source = queueItem.sourceLabel || queueItem.source;
    const status = item.queueStatus ? item.queueStatus.replace(/_/g, ' ') : 'pending review';
    return `${source}: ${status}`;
  });

  return liveItems.length
    ? liveItems
    : ['No ready intake items. New audio clips, transcripts, and coach drafts will appear here.'];
}
