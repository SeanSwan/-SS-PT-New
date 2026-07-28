import type { ConversationSummary } from '../../../../hooks/useAIChat';

export type DrawerSide = 'left' | 'right';

export type QueueMetric = {
  label: string;
  value: string;
  note: string;
  accent: string;
};

export type IntakeStateTile = {
  label: string;
  value: string;
  tone: 'hold' | 'stale' | 'processing' | 'ready' | 'failed';
};

export type QueueHealthRow = {
  label: string;
  value: string;
  tone: IntakeStateTile['tone'];
};

export type DossierTile = {
  label: string;
  value: string;
  note: string;
};

export type ClientContextTile = {
  label: string;
  value: string;
};

export type CoachScheduledSessionRouteContext = {
  workoutDate?: string;
  scheduledSessionId?: string;
  scheduledSessionDate?: string;
  scheduledSessionCredits?: number;
};

export type CoachMessageActionRouteContext = {
  threadId?: string;
  sourceMessageId?: string;
};

export type CoachCommandRouteContext = {
  source: 'coach-command-center';
  intent: string | null;
} & Partial<CoachScheduledSessionRouteContext> & CoachMessageActionRouteContext;

export type CoachQueueSummaryView = {
  total: number;
  actionable: number;
  today: number;
  unprocessed: number;
  processing: number;
  readyReview: number;
  needsClarification: number;
  duplicateHold: number;
  failed: number;
  needsClient: number;
  preparedDrafts: number;
  pendingDrafts: number;
};

export type CoachThreadSummary = ConversationSummary;
