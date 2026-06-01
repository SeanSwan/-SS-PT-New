import type { CoachAudioPuzzleSummary } from './coachIntakeTypes';
import type { PlaudIntakeItem, PlaudIntakeSummary } from './plaudIntakeService';

export type CoachIntakeAudioFields = {
  audioPuzzle?: CoachAudioPuzzleSummary | null;
  holdReason?: {
    label: string;
    detail?: string | null;
    candidateCount?: number | null;
    duplicateCount?: number | null;
    confidenceBand?: 'high' | 'medium' | 'low' | 'unknown' | string;
    nextAction?: string | null;
  } | null;
  latestProposalId?: string | null;
  latestProposal?: {
    id: string;
    type: string | null;
    status: string | null;
    title: string | null;
    createdAt: string | null;
  } | null;
  nextBlockingGate?: string | null;
  nextActionKey?: string | null;
  nextActionLabel?: string | null;
};

export type CoachIntakeItem =
  | (PlaudIntakeItem & CoachIntakeAudioFields)
  | (Omit<PlaudIntakeItem, 'kind' | 'source'> & CoachIntakeAudioFields & {
    kind: 'coach_intake';
    source:
      | 'voice_note'
      | 'plaud_clip'
      | 'audio_upload'
      | 'transcript_file'
      | 'pdf_transcript'
      | 'typed_note'
      | 'chat_narrative';
  });

export interface CoachIntakeResponse {
  items: CoachIntakeItem[];
  summary: PlaudIntakeSummary;
  scope: string;
  limit: number;
  schemaReady?: boolean;
}

export interface CoachIntakeHealth {
  schemaReady: boolean;
  status: 'healthy' | 'attention' | 'degraded' | 'unavailable';
  generatedAt?: string;
  counts: PlaudIntakeSummary & { stuckProcessing: number };
  oldestActionableAt?: string | null;
  oldestProcessingAt?: string | null;
  thresholds?: { processingStuckMinutes: number };
  nextOperatorAction: {
    key: string;
    label: string;
  };
}

export interface CoachIntakeRetention {
  schemaReady: boolean;
  status: 'healthy' | 'attention' | 'unavailable';
  generatedAt?: string;
  policy?: {
    appliedRawArtifactGraceHours?: number;
    failedRawArtifactGraceDays?: number;
    staleReviewQueueDays?: number;
  };
  summary: {
    totalWithRawArtifacts: number;
    purgeReady: number;
    reviewRequired: number;
    retained: number;
  };
  items?: CoachIntakeRetentionItem[];
  nextOperatorAction: {
    key: string;
    label: string;
  };
}

export interface CoachIntakeRetentionItem {
  id?: string;
  status?: string;
  sourceType?: string;
  hasRawArtifact?: boolean;
  classification?: 'purge_ready' | 'review_required' | 'retained' | string;
  reason?: string;
  recordedAt?: string | null;
  uploadedAt?: string | null;
  updatedAt?: string | null;
  archivedAt?: string | null;
}

export interface CoachIntakeRetentionPurgePlan {
  enabled: boolean;
  dryRun: boolean;
  schemaReady: boolean;
  generatedAt?: string | null;
  policy?: CoachIntakeRetention['policy'];
  summary?: CoachIntakeRetention['summary'];
  purgeReady: number;
  purged: number;
  skippedReason?: string | null;
}

export interface CreateCoachTextIntakeResponse {
  item: CoachIntakeItem;
}

export interface ConfirmCoachIntakeAudioOrderResponse {
  item: CoachIntakeItem;
}

export interface CoachIntakeEvent {
  id: string;
  actorType: string;
  eventType: string;
  summary: Record<string, string | number | boolean>;
  createdAt: string | null;
}

export interface CoachIntakeEventsResponse {
  intakeId: string;
  events: CoachIntakeEvent[];
  limit: number;
}
