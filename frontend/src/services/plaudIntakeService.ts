/**
 * plaudIntakeService.ts
 * ======================
 * Frontend wrapper for the unified /api/plaud/intake read model.
 */
import { isAxiosError, type AxiosError } from 'axios';
import apiService from './api.service';
import { PlaudApiError } from './plaudClipService';

export interface PlaudIntakeItem {
  id: string;
  entityId: string;
  kind: 'clip' | 'merge_request';
  source: 'manual_upload' | 'applaud_webhook' | 'applaud_local_sync' | 'plaud_official_sync' | 'plaud_merge';
  sourceLabel: string;
  queueStatus:
    | 'unprocessed'
    | 'processing'
    | 'ready_review'
    | 'needs_clarification'
    | 'duplicate_hold'
    | 'failed'
    | 'archived';
  title: string;
  clientId: number | null;
  clientName: string | null;
  needsClient: boolean;
  clipCount: number | null;
  parsedExerciseCount: number | null;
  canReview: boolean;
  errorCode: string | null;
  status: string;
  createdAt: string;
  timelineAt?: string | null;
  timelineAtSource?: 'recorded_at' | 'uploaded_at' | 'created_at';
  recordedAt?: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  durationSec?: number | null;
  sizeBytes?: number | null;
  mirrorStatus?: string | null;
  r2MirrorStatus?: string | null;
  mimetype?: string | null;
  playbackReady?: boolean;
  playbackPath?: string | null;
  cipherPurged?: boolean;
}

export interface PlaudIntakeSummary {
  total: number;
  actionable: number;
  today: number;
  unprocessed: number;
  processing: number;
  readyReview: number;
  needsClarification?: number;
  duplicateHold?: number;
  failed: number;
  needsClient: number;
  preparedDrafts?: number;
  pendingDrafts?: number;
  applyingDrafts?: number;
  approvedDrafts?: number;
  appliedDrafts?: number;
  rejectedDrafts?: number;
  failedDrafts?: number;
}

export interface PlaudIntakeResponse {
  items: PlaudIntakeItem[];
  summary: PlaudIntakeSummary;
  scope: string;
  limit: number;
}

function emptyPlaudIntakeSummary(): PlaudIntakeSummary {
  return {
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
  };
}

interface PlaudErrorMeta {
  code?: string;
  data?: { error?: { code?: string; message?: string } };
  message?: string;
  status: number;
}

type PlaudAxiosError = AxiosError<PlaudErrorMeta['data']>;

function fallbackText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

function fallbackValue<T>(value: T | undefined | null, fallback: T): T {
  return value || fallback;
}

function axiosErrorOrNull(err: unknown): PlaudAxiosError | null {
  return isAxiosError(err) ? err : null;
}

function responseData(err: PlaudAxiosError): PlaudErrorMeta['data'] | undefined {
  return err.response?.data;
}

function responseStatus(err: PlaudAxiosError): number {
  return err.response?.status || 0;
}

function responseError(data: PlaudErrorMeta['data']) {
  return data?.error;
}

function errorCode(error: NonNullable<PlaudErrorMeta['data']>['error']) {
  return error ? error.code : undefined;
}

function errorMessage(error: NonNullable<PlaudErrorMeta['data']>['error'], fallback: string) {
  return fallbackText(error ? error.message : undefined, fallback);
}

function axiosPlaudErrorMeta(err: PlaudAxiosError): PlaudErrorMeta {
  const data = responseData(err);
  const error = responseError(data);
  return {
    code: errorCode(error),
    data,
    message: errorMessage(error, err.message),
    status: responseStatus(err),
  };
}

function plaudErrorMeta(err: unknown): PlaudErrorMeta {
  const axiosError = axiosErrorOrNull(err);
  return axiosError ? axiosPlaudErrorMeta(axiosError) : { status: 0 };
}

function buildAxiosPlaudError(err: unknown, fallbackMessage: string): PlaudApiError {
  const meta = plaudErrorMeta(err);
  return new PlaudApiError(
    fallbackText(meta.code, 'UNKNOWN'),
    fallbackText(meta.message, fallbackMessage),
    meta.status,
    meta.data,
  );
}

function unwrapError(err: unknown, fallbackMessage: string): never {
  throw buildAxiosPlaudError(err, fallbackMessage);
}

function normalizePlaudIntakeResponse(
  data: ({ success: boolean } & PlaudIntakeResponse),
  fallbackScope: string,
  fallbackLimit: number,
): PlaudIntakeResponse {
  return {
    items: fallbackValue(data.items, []),
    summary: fallbackValue(data.summary, emptyPlaudIntakeSummary()),
    scope: fallbackText(data.scope, fallbackScope),
    limit: fallbackValue(data.limit, fallbackLimit),
  };
}

export async function listPlaudIntakeItems({
  scope = 'actionable',
  limit = 30,
}: {
  scope?: string;
  limit?: number;
} = {}): Promise<PlaudIntakeResponse> {
  try {
    const { data } = await apiService.get<{ success: boolean } & PlaudIntakeResponse>('/api/plaud/intake', {
      params: { scope, limit },
    });
    return normalizePlaudIntakeResponse(data, scope, limit);
  } catch (err) {
    unwrapError(err, 'Failed to list PLAUD intake queue');
  }
}
