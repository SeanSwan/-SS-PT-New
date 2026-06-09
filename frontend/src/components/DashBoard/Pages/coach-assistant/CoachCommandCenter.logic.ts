import type { ConversationSummary } from '../../../../hooks/useAIChat';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import type {
  ClientContextTile,
  CoachCommandRouteContext,
  CoachQueueSummaryView,
  CoachScheduledSessionRouteContext,
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

function parsePositiveIntegerString(rawValue: string | null): string | null {
  const trimmed = rawValue?.trim();
  if (!trimmed || !/^[1-9]\d*$/.test(trimmed)) return null;
  return Number.isSafeInteger(Number(trimmed)) ? trimmed : null;
}

function parseIsoDate(rawValue: string | null): string | null {
  const trimmed = rawValue?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return null;
  const dateOnly = trimmed.slice(0, 10);
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : dateOnly;
}

function parseScheduledCredits(rawValue: string | null): number | undefined {
  const trimmed = rawValue?.trim();
  if (!trimmed || !/^[1-9]\d*$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function getScheduledSessionRouteContextFromSearchParams(
  searchParams: URLSearchParams,
): CoachScheduledSessionRouteContext | null {
  const scheduledSessionId = parsePositiveIntegerString(searchParams.get('sessionId'));
  if (!scheduledSessionId) return null;

  const scheduledSessionDate = parseIsoDate(searchParams.get('sessionDate'));
  const scheduledSessionCredits = parseScheduledCredits(searchParams.get('sessionCredits'));
  return {
    scheduledSessionId,
    ...(scheduledSessionDate ? { scheduledSessionDate } : {}),
    ...(scheduledSessionCredits ? { scheduledSessionCredits } : {}),
  };
}

export function buildCommandRouteContext(
  routeIntent: string | null,
  scheduledSession: CoachScheduledSessionRouteContext | null,
): CoachCommandRouteContext {
  return {
    source: 'coach-command-center',
    intent: routeIntent,
    ...(scheduledSession || {}),
  };
}

export function normalizeCommandCenterReturnTo(rawReturnTo: string | null): string | null {
  const hasUnsafeCharacters = Boolean(rawReturnTo && /[\r\n\t\\]/.test(rawReturnTo));
  if (
    !rawReturnTo
    || rawReturnTo.startsWith('//')
    || hasUnsafeCharacters
    || !rawReturnTo.startsWith('/dashboard/')
  ) {
    return null;
  }

  return rawReturnTo;
}

export function commandCenterReturnLabel(source: string | null): string {
  if (source === 'clients-team') return 'Back to Client Hub';
  if (source === 'master-schedule') return 'Back to Schedule';
  return 'Back to Dashboard';
}

export function buildRouteContext(
  routeIntent: string | null,
  routeClientLabel: string | null,
  scheduledSession: CoachScheduledSessionRouteContext | null = null,
) {
  if (routeIntent === 'client_onboarding') {
    if (routeClientLabel) {
      return {
        prompt: [
          'Selected paid client onboarding activation.',
          'Use the selectedClientId route context and ask me only for missing onboarding fields: source policy, training goal, limitations, pain notes, equipment access, availability, and first-session priorities.',
          'Prepare a review-gated client_onboarding proposal only after I confirm the details.',
          'Do not create duplicate clients or write profile records without operator approval.',
        ].join(' '),
        status: `${routeClientLabel} onboarding context loaded`,
      };
    }

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
    const scheduleCopy = scheduledSession
      ? ` This is booked session #${scheduledSession.scheduledSessionId}${scheduledSession.scheduledSessionDate ? ` on ${scheduledSession.scheduledSessionDate}` : ''}. Include scheduledSessionId ${scheduledSession.scheduledSessionId} in the review-gated workout_log proposal and do not invent any other session id.`
      : '';
    return {
      prompt: `${routeClientLabel} daily workout log.${scheduleCopy} Ask me for dictated exercises, sets, reps, load, pain, and session notes. Prepare a review-gated workout_log proposal only after I confirm the details.`,
      status: scheduledSession
        ? `${routeClientLabel} booked session #${scheduledSession.scheduledSessionId} log context loaded`
        : `${routeClientLabel} daily log context loaded`,
    };
  }

  return { prompt: null, status: null };
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
