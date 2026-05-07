/**
 * coachIntakeService.ts
 * =====================
 * Frontend wrapper for the canonical Swan Coach intake queue API.
 */
import { isAxiosError } from 'axios';
import apiService from './api.service';
import { PlaudApiError } from './plaudClipService';
import type { PlaudIntakeItem, PlaudIntakeSummary } from './plaudIntakeService';

export type CoachIntakeItem = PlaudIntakeItem | (Omit<PlaudIntakeItem, 'kind' | 'source'> & {
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

export interface CreateCoachTextIntakeResponse {
  item: CoachIntakeItem;
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
        failed: 0,
        needsClient: 0,
      },
      scope: data.scope || scope,
      limit: data.limit || limit,
      schemaReady: data.schemaReady,
    };
  } catch (err) {
    unwrapError(err, 'Failed to list Coach intake queue');
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

export default { createCoachTextIntake, listCoachIntakeItems };
