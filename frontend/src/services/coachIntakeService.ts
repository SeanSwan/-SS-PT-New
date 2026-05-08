/**
 * coachIntakeService.ts
 * =====================
 * Frontend wrapper for the canonical Swan Coach intake queue API.
 */
import { isAxiosError } from 'axios';
import apiService from './api.service';
import { PlaudApiError } from './plaudClipService';
import type { PlaudIntakeItem, PlaudIntakeSummary } from './plaudIntakeService';
import type { CoachAudioPuzzleSummary } from './coachIntakeTypes';

export type { CoachAudioPuzzleConfidence, CoachAudioPuzzleSummary, CoachIntakeQueueScope } from './coachIntakeTypes';

type CoachIntakeAudioFields = {
  audioPuzzle?: CoachAudioPuzzleSummary | null;
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

export type CoachIntakeItem = (PlaudIntakeItem & CoachIntakeAudioFields) | (Omit<PlaudIntakeItem, 'kind' | 'source'> & CoachIntakeAudioFields & {
  kind: 'coach_intake';
  source: 'voice_note' | 'plaud_clip' | 'audio_upload' | 'transcript_file' | 'pdf_transcript' | 'typed_note' | 'chat_narrative';
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

function unwrapError(err: unknown, fallbackMessage: string): never {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: { code?: string; message?: string } } | undefined;
    const code = data?.error?.code || 'UNKNOWN';
    const message = data?.error?.message || err.message || fallbackMessage;
    throw new PlaudApiError(code, message, err.response?.status || 0, data);
  }
  throw new PlaudApiError('UNKNOWN', fallbackMessage, 0);
}

function numberOrZero(value: unknown): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function sanitizeRetentionSummary(summary: Partial<CoachIntakeRetention['summary']> = {}): CoachIntakeRetention['summary'] {
  return {
    totalWithRawArtifacts: numberOrZero(summary.totalWithRawArtifacts),
    purgeReady: numberOrZero(summary.purgeReady),
    reviewRequired: numberOrZero(summary.reviewRequired),
    retained: numberOrZero(summary.retained),
  };
}

function sanitizeRetentionPurgePlan(plan: Partial<CoachIntakeRetentionPurgePlan> = {}): CoachIntakeRetentionPurgePlan {
  return {
    enabled: plan.enabled === true,
    dryRun: plan.dryRun !== false,
    schemaReady: plan.schemaReady === true,
    generatedAt: typeof plan.generatedAt === 'string' ? plan.generatedAt : null,
    policy: plan.policy || {},
    summary: sanitizeRetentionSummary(plan.summary),
    purgeReady: numberOrZero(plan.purgeReady),
    purged: numberOrZero(plan.purged),
    skippedReason: typeof plan.skippedReason === 'string' ? plan.skippedReason : null,
  };
}

export async function listCoachIntakeItems({
  scope = 'actionable',
  limit = 30,
}: {
  scope?: string;
  limit?: number;
} = {}): Promise<CoachIntakeResponse> {
  try {
    const { data } = await apiService.get<{ success: boolean } & CoachIntakeResponse>('/api/coach/intake/queue', {
      params: { scope, limit },
    });
    return {
      items: data.items || [],
      summary: data.summary || {
        total: 0,
        actionable: 0,
        today: 0,
        unprocessed: 0,
        processing: 0,
        readyReview: 0,
        needsClarification: 0,
        duplicateHold: 0,
        failed: 0,
        needsClient: 0,
        preparedDrafts: 0,
        pendingDrafts: 0,
        applyingDrafts: 0,
        approvedDrafts: 0,
        appliedDrafts: 0,
        rejectedDrafts: 0,
        failedDrafts: 0,
      },
      scope: data.scope || scope,
      limit: data.limit || limit,
      schemaReady: data.schemaReady,
    };
  } catch (err) {
    unwrapError(err, 'Failed to list Coach intake queue');
  }
}

export async function getCoachIntakeHealth(): Promise<CoachIntakeHealth> {
  try {
    const { data } = await apiService.get<{ success: boolean; health: CoachIntakeHealth }>('/api/coach/intake/health');
    return data.health;
  } catch (err) {
    unwrapError(err, 'Failed to read Coach intake health');
  }
}

export async function getCoachIntakeRetention(): Promise<CoachIntakeRetention> {
  try {
    const { data } = await apiService.get<{ success: boolean; retention: CoachIntakeRetention }>('/api/coach/intake/retention');
    return data.retention;
  } catch (err) {
    unwrapError(err, 'Failed to read Coach intake retention');
  }
}

export async function getCoachIntakeRetentionPurgePlan(): Promise<CoachIntakeRetentionPurgePlan> {
  try {
    const { data } = await apiService.get<{ success: boolean; purgePlan: CoachIntakeRetentionPurgePlan }>(
      '/api/coach/intake/retention/purge-plan',
    );
    return sanitizeRetentionPurgePlan(data.purgePlan);
  } catch (err) {
    unwrapError(err, 'Failed to read Coach intake retention purge plan');
  }
}

export async function createCoachTextIntake({
  text,
  clientId,
  trigger = 'oversized_chat',
}: {
  text: string;
  clientId?: number | null;
  trigger?: string;
}): Promise<CreateCoachTextIntakeResponse> {
  try {
    const { data } = await apiService.post<{ success: boolean } & CreateCoachTextIntakeResponse>('/api/coach/intake', {
      text,
      clientId: clientId ?? null,
      sourceType: 'chat_narrative',
      trigger,
    });
    return { item: data.item };
  } catch (err) {
    unwrapError(err, 'Failed to create Coach intake draft');
  }
}

export async function confirmCoachIntakeAudioOrder({
  intakeId,
}: {
  intakeId: string;
}): Promise<ConfirmCoachIntakeAudioOrderResponse> {
  try {
    const { data } = await apiService.post<{ success: boolean } & ConfirmCoachIntakeAudioOrderResponse>(
      `/api/coach/intake/${encodeURIComponent(intakeId)}/audio-order/confirm`,
    );
    return { item: data.item };
  } catch (err) {
    unwrapError(err, 'Failed to confirm Coach intake audio order');
  }
}

export async function listCoachIntakeEvents({
  intakeId,
  limit = 8,
}: {
  intakeId: string;
  limit?: number;
}): Promise<CoachIntakeEventsResponse> {
  try {
    const { data } = await apiService.get<{ success: boolean } & CoachIntakeEventsResponse>(
      `/api/coach/intake/${encodeURIComponent(intakeId)}/events`,
      { params: { limit } },
    );
    return { intakeId: data.intakeId, events: data.events || [], limit: data.limit || limit };
  } catch (err) {
    unwrapError(err, 'Failed to list Coach intake events');
  }
}

export default {
  confirmCoachIntakeAudioOrder,
  createCoachTextIntake,
  getCoachIntakeHealth,
  getCoachIntakeRetention,
  getCoachIntakeRetentionPurgePlan,
  listCoachIntakeEvents,
  listCoachIntakeItems,
};
