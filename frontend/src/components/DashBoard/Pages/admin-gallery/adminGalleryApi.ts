/**
 * Admin Photo Gallery Studio — typed API layer
 * ============================================
 * Thin, typed wrappers over the LIVE admin gallery API
 * (backend mounted at /api/admin/gallery — backend/core/routes.mjs:666).
 *
 * Routes every call through the shared authed axios client (apiService), which
 * injects the Bearer token from ProductionTokenManager and handles refresh/401.
 * This is the CURRENT repo convention (see components/Admin/PhotoManager.tsx) and
 * fixes the archived component's stale `localStorage.getItem('token')` bug.
 *
 * Auth: every endpoint is protect + (admin|trainer) gated on the backend.
 */

import apiService from '../../../../services/api.service';
import type {
  GalleryEvent,
  GalleryPhoto,
  GalleryStats,
  NewEventDraft,
  UploadSingleResult,
} from './types';

const BASE = '/api/admin/gallery';

/** Normalize an axios error into a human message without leaking internals. */
function messageFrom(error: unknown, fallback: string): string {
  const axiosErr = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return (
    axiosErr?.response?.data?.error ||
    axiosErr?.response?.data?.message ||
    axiosErr?.message ||
    fallback
  );
}

// ── Events ──────────────────────────────────────────────────────────────
export async function listEvents(): Promise<GalleryEvent[]> {
  const { data } = await apiService.get<{ success: boolean; events: GalleryEvent[] }>(`${BASE}/events`);
  return data?.events ?? [];
}

export async function createEvent(draft: NewEventDraft): Promise<GalleryEvent> {
  const { data } = await apiService.post<{ success: boolean; event: GalleryEvent; error?: string }>(
    `${BASE}/events`,
    {
      name: draft.name.trim(),
      sport: draft.sport.trim() || undefined,
      eventDate: draft.eventDate || undefined,
      location: draft.location.trim() || undefined,
      password: draft.password,
      description: draft.description.trim() || undefined,
      isPublished: draft.isPublished,
    },
  );
  if (!data?.success || !data.event) throw new Error(data?.error || 'Failed to create event');
  return data.event;
}

/** Patch an event. Omit fields you are not changing. Never send back passwordHash. */
export async function updateEvent(
  id: number,
  patch: Partial<Pick<GalleryEvent, 'name' | 'sport' | 'eventDate' | 'location' | 'description' | 'isPublished' | 'coverPhotoId'>> & { password?: string },
): Promise<GalleryEvent> {
  const { data } = await apiService.patch<{ success: boolean; event: GalleryEvent; error?: string }>(
    `${BASE}/events/${id}`,
    patch,
  );
  if (!data?.success) throw new Error(data?.error || 'Failed to update event');
  return data.event;
}

export async function recountEvent(id: number): Promise<GalleryEvent> {
  const { data } = await apiService.post<{ success: boolean; event: GalleryEvent }>(`${BASE}/events/${id}/recount`);
  return data.event;
}

export async function deleteEvent(id: number): Promise<void> {
  await apiService.delete(`${BASE}/events/${id}`);
}

// ── Photos ──────────────────────────────────────────────────────────────
export async function listEventPhotos(id: number): Promise<GalleryPhoto[]> {
  const { data } = await apiService.get<{ success: boolean; photos: GalleryPhoto[] }>(`${BASE}/events/${id}/photos`);
  return data?.photos ?? [];
}

/** DELETE a single photo. Returns the event's remaining photo count. */
export async function deletePhoto(photoId: number): Promise<number> {
  const { data } = await apiService.delete<{ success: boolean; remainingCount: number }>(`${BASE}/photos/${photoId}`);
  return data?.remainingCount ?? 0;
}

// ── Stats ───────────────────────────────────────────────────────────────
export async function getStats(): Promise<GalleryStats> {
  const { data } = await apiService.get<{ success: boolean; stats: GalleryStats }>(`${BASE}/stats`);
  return data.stats;
}

// ── Upload (the proven path: one file at a time, multipart, with progress) ─
export interface UploadOptions {
  watermark: boolean;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Upload ONE photo to an event via POST /events/:id/upload-single.
 * Never throws — resolves { success, photo?, error? } so a batch loop keeps
 * going on individual failures (matches the proven archived behavior).
 * axios (v1.6) auto-sets the multipart boundary from the FormData body; we do
 * NOT set Content-Type manually (setting it without a boundary corrupts uploads).
 */
export async function uploadSinglePhoto(
  eventId: number,
  file: File,
  { watermark, onProgress, signal }: UploadOptions,
): Promise<UploadSingleResult> {
  const form = new FormData();
  form.append('photo', file);
  form.append('watermark', watermark ? 'true' : 'false');

  try {
    const { data } = await apiService.post<{ success: boolean; photo?: GalleryPhoto; error?: string }>(
      `${BASE}/events/${eventId}/upload-single`,
      form,
      {
        signal,
        timeout: 600000, // 10 min — large originals + server-side watermark/R2
        onUploadProgress: (evt) => {
          if (!onProgress) return;
          const total = evt.total ?? file.size;
          const percent = total ? Math.min(100, Math.round((evt.loaded / total) * 100)) : 0;
          onProgress(percent);
        },
      },
    );
    if (data?.success && data.photo) return { success: true, photo: data.photo };
    return { success: false, error: data?.error || 'Upload rejected by server' };
  } catch (error) {
    const isCancel = (error as { code?: string; name?: string }).code === 'ERR_CANCELED'
      || (error as { name?: string }).name === 'CanceledError';
    if (isCancel) return { success: false, error: 'Cancelled' };
    return { success: false, error: messageFrom(error, 'Network error during upload') };
  }
}
