/**
 * plaudIntakeService.ts
 * ======================
 * Frontend wrapper for the unified /api/plaud/intake read model.
 */
import axios, { type AxiosInstance } from 'axios';
import { PlaudApiError } from './plaudClipService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/plaud/intake`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface PlaudIntakeItem {
  id: string;
  entityId: string;
  kind: 'clip' | 'merge_request';
  source: 'manual_upload' | 'applaud_webhook' | 'plaud_merge';
  sourceLabel: string;
  queueStatus: 'unprocessed' | 'processing' | 'ready_review' | 'failed' | 'archived';
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
  completedAt: string | null;
  expiresAt: string | null;
  durationSec?: number | null;
  sizeBytes?: number | null;
  mirrorStatus?: string | null;
  cipherPurged?: boolean;
}

export interface PlaudIntakeSummary {
  total: number;
  actionable: number;
  today: number;
  unprocessed: number;
  processing: number;
  readyReview: number;
  failed: number;
  needsClient: number;
}

export interface PlaudIntakeResponse {
  items: PlaudIntakeItem[];
  summary: PlaudIntakeSummary;
  scope: string;
  limit: number;
}

function unwrapError(err: unknown, fallbackMessage: string): never {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { code?: string; message?: string } } | undefined;
    const code = data?.error?.code || 'UNKNOWN';
    const message = data?.error?.message || err.message || fallbackMessage;
    throw new PlaudApiError(code, message, err.response?.status || 0, data);
  }
  throw new PlaudApiError('UNKNOWN', fallbackMessage, 0);
}

export async function listPlaudIntakeItems({
  scope = 'actionable',
  limit = 30,
}: {
  scope?: string;
  limit?: number;
} = {}): Promise<PlaudIntakeResponse> {
  try {
    const { data } = await api.get<{ success: boolean } & PlaudIntakeResponse>('/', {
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
        failed: 0,
        needsClient: 0,
      },
      scope: data.scope || scope,
      limit: data.limit || limit,
    };
  } catch (err) {
    unwrapError(err, 'Failed to list PLAUD intake queue');
  }
}

export default { listPlaudIntakeItems };
