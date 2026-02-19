/**
 * useYouTubeImport — React Query hooks for YouTube import endpoints
 * =================================================================
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/v2/admin/youtube';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || body.message || `HTTP ${res.status}`), { status: res.status, body });
  }
  const json = await res.json();
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

export interface YouTubeImportData {
  url: string;
  visibility?: 'public' | 'unlisted';
  accessTier?: 'free' | 'member';
  contentType?: string;
  ctaStrategy?: string;
}

export function useImportYouTubeVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: YouTubeImportData) =>
      apiFetch(`${API_BASE}/import`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-videos'] }),
  });
}

export function useImportPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { playlistUrl: string; defaultVisibility?: string; defaultCtaStrategy?: string }) =>
      apiFetch(`${API_BASE}/import-playlist`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-videos'] });
      qc.invalidateQueries({ queryKey: ['video-jobs'] });
    },
  });
}

export function useSyncYouTubeMetadata() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) =>
      apiFetch(`${API_BASE}/sync/${videoId}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-videos'] }),
  });
}
