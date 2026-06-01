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

export function reviewableMergeTime(item: CoachIntakeItem): number {
  const value = item.recordedAt || item.timelineAt || item.createdAt;
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export function pickReviewNextMergeRequestId(items: CoachIntakeItem[]): string | null {
  return [...items]
    .filter((item) => item.kind === 'merge_request' && item.canReview && item.entityId)
    .sort((a, b) => reviewableMergeTime(a) - reviewableMergeTime(b))[0]?.entityId || null;
}

export function getConversationTitle(thread?: ConversationSummary | null): string {
  const title = thread?.title?.trim();
  return title || 'Untitled coach thread';
}

export function formatThreadMeta(thread: ConversationSummary): string {
  const dateValue = thread.lastMessageAt || thread.createdAt;
  const date = dateValue ? new Date(dateValue) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'No activity yet';
  return `${thread.messageCount || 0} msgs - ${dateLabel} - ${thread.status || 'active'}`;
}

export function parseRouteClientId(rawClientId: string | null): number | null {
  const trimmedClientId = rawClientId?.trim();
  if (!trimmedClientId || !/^[1-9]\d*$/.test(trimmedClientId)) {
    return null;
  }

  const parsed = Number(trimmedClientId);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function buildRouteContext(routeIntent: string | null, routeClientLabel: string | null) {
  if (routeIntent === 'client_onboarding') {
    return {
      prompt: [
        'New client onboarding intake.',
        'Ask me for the client name, contact details, SwanStudios, Move Fitness, or External source, training goal, limitations, pain notes, equipment access, availability, and first-session priorities.',
        'Prepare a review-gated client_onboarding proposal only after I confirm the details.',
        'Do not create the client or write profile records without operator approval.',
      ].join(' '),
      status: 'New client onboarding context loaded',
    };
  }

  if (routeClientLabel && routeIntent === 'log_workout') {
    return {
      prompt: `${routeClientLabel} daily workout log. Ask me for dictated exercises, sets, reps, load, pain, and session notes. Prepare a review-gated workout_log proposal only after I confirm the details.`,
      status: `${routeClientLabel} daily log context loaded`,
    };
  }

  return { prompt: null, status: null };
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
  };
}

export function buildClientContextTiles(hasRouteClient: boolean, hasThreadContext: boolean): ClientContextTile[] {
  return [
    {
      label: 'Workout context',
      value: hasRouteClient ? 'ready to log' : hasThreadContext ? 'thread selected' : 'select client',
    },
    {
      label: 'Nutrition context',
      value: hasRouteClient || hasThreadContext ? 'review gated' : 'not selected',
    },
  ];
}

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
      value: healthStatus || (isLoading ? 'loading' : 'ready'),
      note: nextActionLabel || 'Unified PLAUD and Coach intake queue',
      accent: 'var(--success, #47e89a)',
    },
    {
      label: 'Ready drafts',
      value: String(summary.preparedDrafts || summary.readyReview),
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
      value: initialReviewMergeRequestId ? 'PLAUD review selected' : 'Unified queue review',
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
    : ['No ready intake items. New PLAUD clips, transcripts, and coach drafts will appear here.'];
}
