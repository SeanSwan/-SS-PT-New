/**
 * useVideoCatalog — React Query hooks for Video Catalog CRUD
 * ===========================================================
 * Admin + public data fetching hooks for video catalog endpoints.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/v2';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || body.message || `HTTP ${res.status}`), {
      status: res.status,
      body,
    });
  }
  const json = await res.json();
  // Backend wraps responses in { success, data } envelope — unwrap transparently
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

/* ─── Types ─────────────────────────────────────────────────────── */

export interface VideoCatalogItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  longDescription?: string;
  contentType?: string;
  source: 'upload' | 'youtube';
  visibility: 'public' | 'members_only' | 'unlisted';
  accessTier: 'free' | 'member' | 'premium';
  status: 'draft' | 'published' | 'archived';
  youtubeVideoId?: string;
  youtubeChannelId?: string;
  youtubeCtaStrategy?: string;
  hostedKey?: string;
  thumbnailUrl?: string;
  signedThumbnailUrl?: string;
  signedUrl?: string;
  captionsUrl?: string;
  durationSeconds?: number;
  tags?: string[];
  chapters?: Array<{ time: number; title: string }>;
  viewCount: number;
  likeCount: number;
  exerciseId?: string;
  creatorId: number;
  publishedAt?: string;
  featured: boolean;
  sortOrder: number;
  metadataCompleted: boolean;
  uploadMode?: 'A' | 'B';
  fileChecksumSha256?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoListResponse {
  videos: VideoCatalogItem[];
  total: number;
  page: number;
  limit: number;
}

export interface VideoFilters {
  page?: number;
  limit?: number;
  source?: string;
  status?: string;
  visibility?: string;
  accessTier?: string;
  contentType?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/* ─── Admin Hooks ───────────────────────────────────────────────── */

export function useAdminVideos(filters: VideoFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  return useQuery<VideoListResponse>({
    queryKey: ['admin-videos', filters],
    queryFn: () => apiFetch(`${API_BASE}/admin/videos?${params}`),
  });
}

export function useAdminVideo(id: string | undefined) {
  return useQuery<{ video: VideoCatalogItem }>({
    queryKey: ['admin-video', id],
    queryFn: () => apiFetch(`${API_BASE}/admin/videos/${id}`),
    enabled: !!id,
  });
}

export function useCreateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<VideoCatalogItem>) =>
      apiFetch<{ video: VideoCatalogItem }>(`${API_BASE}/admin/videos`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-videos'] }),
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<VideoCatalogItem>) =>
      apiFetch<{ video: VideoCatalogItem }>(`${API_BASE}/admin/videos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-videos'] });
      qc.invalidateQueries({ queryKey: ['admin-video', vars.id] });
    },
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`${API_BASE}/admin/videos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-videos'] }),
  });
}

export function usePublishVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      apiFetch(`${API_BASE}/admin/videos/${id}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({ publish }),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-videos'] });
      qc.invalidateQueries({ queryKey: ['admin-video', vars.id] });
    },
  });
}

/* ─── Public Hooks ──────────────────────────────────────────────── */

export function usePublicVideos(filters: VideoFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  return useQuery<VideoListResponse>({
    queryKey: ['public-videos', filters],
    queryFn: () => apiFetch(`${API_BASE}/videos?${params}`),
  });
}

export function useWatchVideo(slug: string | undefined) {
  return useQuery<{
    video: VideoCatalogItem;
    signedUrl?: string;
    captionsUrl?: string;
    youtubeVideoId?: string;
  }>({
    queryKey: ['watch-video', slug],
    queryFn: () => apiFetch(`${API_BASE}/videos/watch/${slug}`),
    enabled: !!slug,
    retry: false,
  });
}

export function useRefreshUrl() {
  return useMutation({
    mutationFn: (videoId: string) =>
      apiFetch<{ signedUrl: string }>(`${API_BASE}/videos/${videoId}/refresh-url`, {
        method: 'POST',
      }),
  });
}

/* ─── Member Hooks ──────────────────────────────────────────────── */

export function useMemberVideos(filters: VideoFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  return useQuery<VideoListResponse>({
    queryKey: ['member-videos', filters],
    queryFn: () => apiFetch(`${API_BASE}/videos/members?${params}`),
  });
}

export function useWatchHistory() {
  return useQuery<{ history: Array<{ video: VideoCatalogItem; progressSeconds: number; completionPct: number; lastWatchedAt: string }> }>({
    queryKey: ['watch-history'],
    queryFn: () => apiFetch(`${API_BASE}/videos/history`),
  });
}

export function useSaveProgress() {
  return useMutation({
    mutationFn: ({ videoId, progressSeconds, durationSeconds }: { videoId: string; progressSeconds: number; durationSeconds: number }) =>
      apiFetch(`${API_BASE}/videos/${videoId}/progress`, {
        method: 'POST',
        body: JSON.stringify({ progressSeconds, durationSeconds }),
      }),
  });
}

export function useTrackView() {
  return useMutation({
    mutationFn: (videoId: string) =>
      apiFetch(`${API_BASE}/videos/${videoId}/track`, { method: 'POST' }),
  });
}

export function useTrackOutboundClick() {
  return useMutation({
    mutationFn: ({ videoId, clickType, sessionId }: { videoId: string; clickType: string; sessionId?: string }) =>
      apiFetch(`${API_BASE}/videos/${videoId}/outbound-click`, {
        method: 'POST',
        body: JSON.stringify({ clickType, sessionId }),
      }),
  });
}

/* ─── Collection Hooks ──────────────────────────────────────────── */

export function usePublicCollections() {
  return useQuery<{ collections: any[] }>({
    queryKey: ['public-collections'],
    queryFn: () => apiFetch(`${API_BASE}/videos/collections`),
  });
}

export function usePublicCollection(slug: string | undefined) {
  return useQuery<{ collection: any; videos: VideoCatalogItem[] }>({
    queryKey: ['public-collection', slug],
    queryFn: () => apiFetch(`${API_BASE}/videos/collections/${slug}`),
    enabled: !!slug,
  });
}

/* ─── Admin Collection Hooks ────────────────────────────────────── */

export function useAdminCollections() {
  return useQuery<{ collections: any[] }>({
    queryKey: ['admin-collections'],
    queryFn: () => apiFetch(`${API_BASE}/admin/collections`),
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; type?: string; visibility?: string; accessTier?: string }) =>
      apiFetch(`${API_BASE}/admin/collections`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-collections'] }),
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string; visibility?: string; accessTier?: string }) =>
      apiFetch(`${API_BASE}/admin/collections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-collections'] }),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`${API_BASE}/admin/collections/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-collections'] }),
  });
}

export function useAddVideosToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, videoIds }: { collectionId: string; videoIds: string[] }) =>
      apiFetch(`${API_BASE}/admin/collections/${collectionId}/videos`, {
        method: 'POST',
        body: JSON.stringify({ videoIds }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-collections'] }),
  });
}

export function useRemoveVideoFromCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, videoId }: { collectionId: string; videoId: string }) =>
      apiFetch(`${API_BASE}/admin/collections/${collectionId}/videos/${videoId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-collections'] }),
  });
}

export function useReorderCollectionVideos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, orderedVideoIds }: { collectionId: string; orderedVideoIds: string[] }) =>
      apiFetch(`${API_BASE}/admin/collections/${collectionId}/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ videoIds: orderedVideoIds }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-collections'] }),
  });
}

/* ─── Analytics Hooks ───────────────────────────────────────────── */

export function useVideoAnalyticsOverview() {
  return useQuery<any>({
    queryKey: ['video-analytics-overview'],
    queryFn: () => apiFetch(`${API_BASE}/admin/video-analytics/overview`),
  });
}

export function useTopVideoContent(metric: 'views' | 'completions' = 'views', limit = 10) {
  return useQuery<any>({
    queryKey: ['video-analytics-top', metric, limit],
    queryFn: () => apiFetch(`${API_BASE}/admin/video-analytics/top?metric=${metric}&limit=${limit}`),
  });
}

export function useOutboundReport(days = 30) {
  return useQuery<any>({
    queryKey: ['video-analytics-outbound', days],
    queryFn: () => apiFetch(`${API_BASE}/admin/video-analytics/outbound?days=${days}`),
  });
}

export function useVideoJobs(filters: { page?: number; limit?: number; status?: string; jobType?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  return useQuery<any>({
    queryKey: ['video-jobs', filters],
    queryFn: () => apiFetch(`${API_BASE}/admin/video-analytics/jobs?${params}`),
    refetchInterval: 10000, // Poll every 10s for job status updates
  });
}
