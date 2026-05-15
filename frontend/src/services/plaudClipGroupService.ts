/**
 * plaudClipGroupService.ts
 * =========================
 * Frontend wrapper for read-only PLAUD/APPLAUD group suggestions.
 */
import { isAxiosError } from 'axios';
import apiService from './api.service';
import { PlaudApiError } from './plaudClipService';

export interface PlaudClipGroupClip {
  clipId: string;
  durationSec: number | null;
  sizeBytes: number | null;
  clipSource: string;
  sourceLabel: string;
  recordedAt: string | null;
  uploadedAt: string | null;
  timelineAt: string;
  timelineSource: 'recorded_at' | 'uploaded_at' | string;
}

export interface PlaudClipGroupCandidate {
  groupId: string;
  title: string;
  clipIds: string[];
  clipCount: number;
  startedAt: string;
  endedAt: string;
  spanMinutes: number;
  maxGapMinutes: number;
  timelineAtSource: 'recorded_at' | 'uploaded_at' | 'mixed' | string;
  confidence: 'high' | 'medium' | 'low' | string;
  sourceMix: string[];
  clips: PlaudClipGroupClip[];
}

export interface PlaudClipGroupResponse {
  groups: PlaudClipGroupCandidate[];
  limit: number;
  maxGapMinutes: number;
}

function unwrapError(err: unknown): never {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: { code?: string; message?: string } } | undefined;
    const code = data?.error?.code || 'UNKNOWN';
    const message = data?.error?.message || err.message || 'Failed to load PLAUD groups';
    throw new PlaudApiError(code, message, err.response?.status || 0, data);
  }
  throw new PlaudApiError('UNKNOWN', 'Failed to load PLAUD groups', 0);
}

export async function listPlaudClipGroups({
  limit = 8,
  maxGapMinutes = 90,
}: { limit?: number; maxGapMinutes?: number } = {}): Promise<PlaudClipGroupResponse> {
  try {
    const { data } = await apiService.get<{ success: boolean } & PlaudClipGroupResponse>('/api/plaud/intake/groups', {
      params: { limit, maxGapMinutes },
    });
    return {
      groups: Array.isArray(data.groups) ? data.groups : [],
      limit: data.limit || limit,
      maxGapMinutes: data.maxGapMinutes || maxGapMinutes,
    };
  } catch (err) {
    unwrapError(err);
  }
}

export default { listPlaudClipGroups };
