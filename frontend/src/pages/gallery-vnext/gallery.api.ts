/**
 * Gallery vNext — API layer. BIND-ONLY: every function calls the SAME `/api/gallery/*` path with the SAME
 * request shape, headers, and body the current GalleryPage already sends (verified against
 * GalleryPage.tsx:1246-1710). Zero money-path logic changes here — this is the shipped contract, relocated
 * so the vNext can reuse it without editing GalleryPage.tsx (which stays the flag-OFF fallback). The pure
 * shape makes these unit-testable and lets a mirrored truth test assert path/body parity with the monolith.
 */
import type {
  CreditPackage,
  EnhancementCredits,
  GalleryEventSummary,
  GalleryPhoto,
  GateSubmitInput,
  PhotoVoteData,
} from './gallery.types';

const API_BASE =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE ||
  ((import.meta as { env?: Record<string, boolean> }).env?.PROD ? '' : 'http://localhost:10000');

const jsonHeaders = { 'Content-Type': 'application/json' };
const authHeaders = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

// ── Public reads (no auth) ────────────────────────────────────────────────
export interface ListEventsResponse { success: boolean; events?: GalleryEventSummary[]; error?: string }
export async function listEvents(signal?: AbortSignal): Promise<ListEventsResponse> {
  const res = await fetch(`${API_BASE}/api/gallery/events`, { signal });
  return res.json();
}

export interface EventDetailResponse { success: boolean; event?: GalleryEventSummary; error?: string }
export async function getEventDetail(slug: string, signal?: AbortSignal): Promise<EventDetailResponse> {
  const res = await fetch(`${API_BASE}/api/gallery/events/${slug}`, { signal });
  return res.json();
}

// ── Email/password access gate — establishes the galleryToken (no Bearer on this call) ────
export interface AccessResponse {
  success: boolean;
  token?: string;
  event?: GalleryEventSummary;
  error?: string;
}
export async function accessEvent(slug: string, input: GateSubmitInput): Promise<AccessResponse> {
  const res = await fetch(`${API_BASE}/api/gallery/events/${slug}/access`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
  return res.json();
}

// ── Gated reads (Bearer galleryToken) ─────────────────────────────────────
export interface ListPhotosResponse {
  success: boolean;
  photos?: GalleryPhoto[];
  printStorefrontEnabled?: boolean;
  error?: string;
}
export async function listPhotos(
  slug: string,
  token: string,
  signal?: AbortSignal,
): Promise<ListPhotosResponse> {
  const res = await fetch(`${API_BASE}/api/gallery/events/${slug}/photos`, {
    headers: authHeaders(token),
    signal,
  });
  return res.json();
}

export interface CreditsResponse { success: boolean; credits?: EnhancementCredits; error?: string }
export async function fetchCredits(token: string): Promise<CreditsResponse> {
  const res = await fetch(`${API_BASE}/api/gallery/credits`, { headers: authHeaders(token) });
  return res.json();
}

// ── Money writes (Bearer galleryToken) ────────────────────────────────────
export interface PurchaseResponse { success: boolean; checkoutUrl?: string; error?: string }
/** POST /purchase-credits with `{ package }` — the key name is truth-test-locked (never `packageType`). */
export async function purchaseCredits(token: string, pkg: CreditPackage): Promise<PurchaseResponse> {
  const res = await fetch(`${API_BASE}/api/gallery/purchase-credits`, {
    method: 'POST',
    headers: { ...jsonHeaders, ...authHeaders(token) },
    body: JSON.stringify({ package: pkg }),
  });
  return res.json();
}

export interface EnhancementResponse { success: boolean; error?: string }
export async function requestEnhancement(token: string, photoIds: number[]): Promise<EnhancementResponse> {
  const res = await fetch(`${API_BASE}/api/gallery/enhancement-request`, {
    method: 'POST',
    headers: { ...jsonHeaders, ...authHeaders(token) },
    body: JSON.stringify({ photoIds }),
  });
  return res.json();
}

// ── Downloads ─────────────────────────────────────────────────────────────
export interface DownloadResponse { success: boolean; downloadUrl?: string; filename?: string; error?: string }
export async function getDownloadUrl(token: string, photoId: number): Promise<DownloadResponse> {
  const res = await fetch(`${API_BASE}/api/gallery/photos/${photoId}/download`, {
    headers: authHeaders(token),
  });
  return res.json();
}

/** The whole-event ZIP is a direct browser navigation; the token rides as a query param (backend accepts it). */
export function downloadAllUrl(slug: string, token: string): string {
  return `${API_BASE}/api/gallery/events/${encodeURIComponent(slug)}/download-all?token=${encodeURIComponent(token)}`;
}

// ── Photo votes (Bearer galleryToken) ─────────────────────────────────────
export interface VotesResponse {
  success: boolean;
  votes?: Record<number, PhotoVoteData>;
  error?: string;
}
export async function listVotes(slug: string, token: string, signal?: AbortSignal): Promise<VotesResponse> {
  const res = await fetch(`${API_BASE}/api/gallery/events/${slug}/votes`, {
    headers: authHeaders(token),
    signal,
  });
  return res.json();
}

export interface VoteResponse {
  success: boolean;
  thumbsUp?: number;
  thumbsDown?: number;
  userVote?: 1 | -1 | null;
  error?: string;
}
export async function castVote(token: string, photoId: number, voteType: 1 | -1): Promise<VoteResponse> {
  const res = await fetch(`${API_BASE}/api/gallery/vote`, {
    method: 'POST',
    headers: { ...jsonHeaders, ...authHeaders(token) },
    body: JSON.stringify({ photoId, voteType }),
  });
  return res.json();
}

export { API_BASE };
