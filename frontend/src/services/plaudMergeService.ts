/**
 * plaudMergeService.ts
 * =====================
 * Frontend wrapper for /api/plaud/merge + /api/plaud/merge-requests/* endpoints.
 *
 * Phase 3 Slice 3.10 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §5.4-5.6.
 *
 * Public API:
 *   submitMerge({ clipIds, clientId, date?, orderMode? }) -> { mergeRequestId, transcript, parsedWorkout, boundaryWarning }
 *   listMergeRequests({ status?, limit? }) -> { mergeRequests }
 *   getMergeRequest(mergeRequestId) -> { mergeRequest }
 *   approveMergeRequest(mergeRequestId) -> { success }
 *   discardMergeRequest(mergeRequestId) -> { success }
 */
import { isAxiosError } from 'axios';
import apiService from './api.service';
import { PlaudApiError } from './plaudClipService';

function unwrapError(err: unknown, fallbackMessage: string): never {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: { code?: string; message?: string }; transcriptHash?: string } | undefined;
    const code = data?.error?.code || 'UNKNOWN';
    const message = data?.error?.message || err.message || fallbackMessage;
    throw new PlaudApiError(code, message, err.response?.status || 0, data);
  }
  throw new PlaudApiError('UNKNOWN', fallbackMessage, 0);
}

export interface ParsedWorkoutExercise {
  name?: string;
  exerciseName?: string;
  sets?: Array<{ reps?: number | string; weight?: number; rpe?: number; tempo?: string; rest?: number }>;
  notes?: string;
}

export interface ParsedWorkout {
  date?: string;
  exercises?: ParsedWorkoutExercise[];
  [k: string]: unknown;
}

export interface BoundaryWarning {
  warning: boolean;
  confidence: 'low' | 'medium';
  detectedNames: Array<{ id: number; firstName: string; lastName: string; mentions: number }>;
}

export interface MergeClipTimelineItem {
  mergeStep: number;
  clipId: string;
  filename: string;
  uploadedAt: string;
  durationSec: number | null;
  source: string;
  orderMode: string;
}

export interface PlaudDateSplitSegment {
  segmentId: string;
  segmentIndex: number;
  date: string;
  dateSource: string;
  dateConfidence: 'high' | 'low' | 'blocked_future' | 'invalid_date' | string;
  needsDateConfirmation: boolean;
  futureDateBlocked: boolean;
  evidence: string | null;
  referenceDate: string;
  referenceSource: string;
  timeZone: string;
  startLine: number | null;
  endLine: number | null;
  text: string;
}

export interface PlaudDateSplitCandidates {
  referenceDate: string;
  timeZone: string;
  referenceSource: string;
  segmentCount: number;
  needsDateReviewCount: number;
  futureDateBlockedCount: number;
  segments: PlaudDateSplitSegment[];
}

export interface MergeResponse {
  mergeRequestId: string;
  transcript: string;
  parsedWorkout: ParsedWorkout;
  clipTimeline?: MergeClipTimelineItem[];
  boundaryWarning: BoundaryWarning | null;
}

export interface MergeRequestSummary {
  mergeRequestId: string;
  status: 'processing' | 'completed' | 'failed' | 'approved' | 'discarded' | 'expired';
  clientId: number;
  clientName: string | null;
  clipCount: number | null;
  parsedExerciseCount: number | null;
  boundaryWarning: BoundaryWarning | null;
  hasCipher: boolean;
  cipherPurged: boolean;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string;
}

export interface MergeRequestDetail extends MergeRequestSummary {
  clipIds: string[];
  transcriptHash: string;
  transcript: string;
  parsedWorkout: ParsedWorkout;
  dateSplitCandidates?: PlaudDateSplitCandidates;
  clipTimeline?: MergeClipTimelineItem[];
}

export interface PlaudParsedSegmentResponse {
  mergeRequestId: string;
  segmentId: string;
  date: string;
  parsedWorkout: ParsedWorkout;
}

export async function submitMerge(args: {
  clipIds: string[];
  clientId: number;
  date?: string;
  orderMode?: 'provided' | 'uploaded_at_asc';
}): Promise<MergeResponse> {
  if (!Array.isArray(args.clipIds) || args.clipIds.length < 1) {
    throw new PlaudApiError('TOO_FEW_CLIPS', 'merge requires at least 1 clipId', 400);
  }
  if (args.clipIds.length > 5) {
    throw new PlaudApiError('TOO_MANY_FILES', 'merge accepts at most 5 clipIds', 400);
  }
  if (!Number.isInteger(args.clientId) || args.clientId <= 0) {
    throw new PlaudApiError('INVALID_CLIENT_ID', 'clientId required', 400);
  }
  try {
    const { data } = await apiService.post<{ success: boolean } & MergeResponse>('/api/plaud/merge', args);
    return {
      mergeRequestId: data.mergeRequestId,
      transcript: data.transcript,
      parsedWorkout: data.parsedWorkout,
      clipTimeline: data.clipTimeline || [],
      boundaryWarning: data.boundaryWarning,
    };
  } catch (err) {
    unwrapError(err, 'Failed to submit merge');
  }
}

export async function listMergeRequests({
  status,
  limit,
}: {
  status?: string;
  limit?: number;
} = {}): Promise<{ mergeRequests: MergeRequestSummary[] }> {
  try {
    const { data } = await apiService.get<{ success: boolean; mergeRequests: MergeRequestSummary[] }>('/api/plaud/merge-requests', {
      params: { status, limit },
    });
    return { mergeRequests: data.mergeRequests || [] };
  } catch (err) {
    unwrapError(err, 'Failed to list merge requests');
  }
}

export async function getMergeRequest(mergeRequestId: string): Promise<{ mergeRequest: MergeRequestDetail }> {
  if (!/^[0-9a-fA-F-]{36}$/.test(mergeRequestId)) {
    throw new PlaudApiError('INVALID_MERGE_REQUEST_ID', 'Invalid mergeRequestId format', 400);
  }
  try {
    const { data } = await apiService.get<{ success: boolean; mergeRequest: MergeRequestDetail }>(
      `/api/plaud/merge-requests/${encodeURIComponent(mergeRequestId)}`,
    );
    return { mergeRequest: data.mergeRequest };
  } catch (err) {
    unwrapError(err, 'Failed to load merge request');
  }
}

export async function discardMergeRequest(mergeRequestId: string): Promise<void> {
  if (!/^[0-9a-fA-F-]{36}$/.test(mergeRequestId)) {
    throw new PlaudApiError('INVALID_MERGE_REQUEST_ID', 'Invalid mergeRequestId format', 400);
  }
  try {
    await apiService.post(`/api/plaud/merge-requests/${encodeURIComponent(mergeRequestId)}/discard`);
  } catch (err) {
    unwrapError(err, 'Failed to discard merge request');
  }
}

export async function approveMergeRequest(mergeRequestId: string): Promise<void> {
  if (!/^[0-9a-fA-F-]{36}$/.test(mergeRequestId)) {
    throw new PlaudApiError('INVALID_MERGE_REQUEST_ID', 'Invalid mergeRequestId format', 400);
  }
  try {
    await apiService.post(`/api/plaud/merge-requests/${encodeURIComponent(mergeRequestId)}/approve`);
  } catch (err) {
    unwrapError(err, 'Failed to approve merge request');
  }
}

export async function parseMergeRequestSegment(args: {
  mergeRequestId: string;
  segmentId: string;
  dateOverride?: string;
  timeZone?: string;
}): Promise<PlaudParsedSegmentResponse> {
  if (!/^[0-9a-fA-F-]{36}$/.test(args.mergeRequestId)) {
    throw new PlaudApiError('INVALID_MERGE_REQUEST_ID', 'Invalid mergeRequestId format', 400);
  }
  if (!/^segment-\d+$/.test(args.segmentId)) {
    throw new PlaudApiError('INVALID_SEGMENT_ID', 'Invalid segmentId format', 400);
  }
  if (args.dateOverride && !/^\d{4}-\d{2}-\d{2}$/.test(args.dateOverride)) {
    throw new PlaudApiError('INVALID_DATE_OVERRIDE', 'Invalid date override format', 400);
  }
  try {
    const { data } = await apiService.post<{ success: boolean } & PlaudParsedSegmentResponse>(
      `/api/plaud/merge-requests/${encodeURIComponent(args.mergeRequestId)}/segments/${encodeURIComponent(args.segmentId)}/parse`,
      { timeZone: args.timeZone, dateOverride: args.dateOverride },
    );
    return {
      mergeRequestId: data.mergeRequestId,
      segmentId: data.segmentId,
      date: data.date,
      parsedWorkout: data.parsedWorkout,
    };
  } catch (err) {
    unwrapError(err, 'Failed to parse PLAUD workout segment');
  }
}

export default {
  submitMerge,
  listMergeRequests,
  getMergeRequest,
  discardMergeRequest,
  approveMergeRequest,
  parseMergeRequestSegment,
};
