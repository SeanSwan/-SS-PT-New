/**
 * plaudClipService.ts
 * ====================
 * Frontend wrapper for /api/plaud/clips/* endpoints.
 *
 * Phase 3 Slice 3.10 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §5.1-5.3.
 *
 * Public API:
 *   uploadClips(files) -> { clips, rejected }
 *   listClips({ limit?, cursor? }) -> { clips, nextCursor, hasMore }
 *   deleteClip(clipId) -> { success }
 *
 * Errors are surfaced as PlaudApiError with the structured error code
 * from the backend response (PLAUD_DISABLED, RATE_LIMITED,
 * UPLOAD_TOO_LARGE, etc.).
 */
import { isAxiosError } from 'axios';
import apiService from './api.service';

export class PlaudApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'PlaudApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface PlaudClip {
  clipId: string;
  filename: string;
  mimetype: string;
  size: number;
  durationSec: number | null;
  r2MirrorStatus?: string;
  status: string;
  uploadedAt: string;
  expiresAt: string;
}

export interface PlaudUploadRejection {
  filename: string;
  code: string;
  message: string;
}

export interface PlaudUploadResponse {
  clips: PlaudClip[];
  rejected: PlaudUploadRejection[];
}

export interface PlaudListResponse {
  clips: PlaudClip[];
  nextCursor: string | null;
  hasMore: boolean;
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

export async function uploadClips(files: File[]): Promise<PlaudUploadResponse> {
  if (!Array.isArray(files) || files.length === 0) {
    throw new PlaudApiError('NO_FILES', 'No files provided', 400);
  }
  if (files.length > 5) {
    throw new PlaudApiError('TOO_MANY_FILES', 'At most 5 files per upload', 400);
  }
  const form = new FormData();
  for (const f of files) form.append('files', f);
  try {
    const { data } = await apiService.post<{ success: boolean } & PlaudUploadResponse>('/api/plaud/clips/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { clips: data.clips || [], rejected: data.rejected || [] };
  } catch (err) {
    unwrapError(err, 'Failed to upload clips');
  }
}

export async function listClips({ limit, cursor }: { limit?: number; cursor?: string } = {}): Promise<PlaudListResponse> {
  try {
    const { data } = await apiService.get<{ success: boolean } & PlaudListResponse>('/api/plaud/clips', {
      params: { limit, cursor },
    });
    return {
      clips: data.clips || [],
      nextCursor: data.nextCursor || null,
      hasMore: !!data.hasMore,
    };
  } catch (err) {
    unwrapError(err, 'Failed to list clips');
  }
}

export async function deleteClip(clipId: string): Promise<void> {
  if (!/^[0-9a-fA-F-]{36}$/.test(clipId)) {
    throw new PlaudApiError('INVALID_CLIP_ID', 'Invalid clipId format', 400);
  }
  try {
    await apiService.delete(`/api/plaud/clips/${encodeURIComponent(clipId)}`);
  } catch (err) {
    unwrapError(err, 'Failed to delete clip');
  }
}

export default { uploadClips, listClips, deleteClip, PlaudApiError };
