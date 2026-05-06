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
import axios, { type AxiosInstance } from 'axios';
import { PlaudApiError } from './plaudClipService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

function makeClient(path: string): AxiosInstance {
  const client = axios.create({ baseURL: `${API_BASE_URL}/api/plaud/${path}` });
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return client;
}

const mergeApi = makeClient('merge');
const mergeRequestsApi = makeClient('merge-requests');

function unwrapError(err: unknown, fallbackMessage: string): never {
  if (axios.isAxiosError(err)) {
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
  clipTimeline?: MergeClipTimelineItem[];
}

export async function submitMerge(args: {
  clipIds: string[];
  clientId: number;
  date?: string;
  orderMode?: 'provided' | 'uploaded_at_asc';
}): Promise<MergeResponse> {
  if (!Array.isArray(args.clipIds) || args.clipIds.length < 2) {
    throw new PlaudApiError('TOO_FEW_CLIPS', 'merge requires at least 2 clipIds', 400);
  }
  if (args.clipIds.length > 5) {
    throw new PlaudApiError('TOO_MANY_FILES', 'merge accepts at most 5 clipIds', 400);
  }
  if (!Number.isInteger(args.clientId) || args.clientId <= 0) {
    throw new PlaudApiError('INVALID_CLIENT_ID', 'clientId required', 400);
  }
  try {
    const { data } = await mergeApi.post<{ success: boolean } & MergeResponse>('/', args);
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
    const { data } = await mergeRequestsApi.get<{ success: boolean; mergeRequests: MergeRequestSummary[] }>('/', {
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
    const { data } = await mergeRequestsApi.get<{ success: boolean; mergeRequest: MergeRequestDetail }>(`/${encodeURIComponent(mergeRequestId)}`);
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
    await mergeRequestsApi.post(`/${encodeURIComponent(mergeRequestId)}/discard`);
  } catch (err) {
    unwrapError(err, 'Failed to discard merge request');
  }
}

export async function approveMergeRequest(mergeRequestId: string): Promise<void> {
  if (!/^[0-9a-fA-F-]{36}$/.test(mergeRequestId)) {
    throw new PlaudApiError('INVALID_MERGE_REQUEST_ID', 'Invalid mergeRequestId format', 400);
  }
  try {
    await mergeRequestsApi.post(`/${encodeURIComponent(mergeRequestId)}/approve`);
  } catch (err) {
    unwrapError(err, 'Failed to approve merge request');
  }
}

export default { submitMerge, listMergeRequests, getMergeRequest, discardMergeRequest, approveMergeRequest };
