/**
 * Public Waiver Service — Phase 5W-G, hardened SWA-140
 * =====================================================
 * Dedicated axios client for public waiver endpoints.
 * No auth interceptor — optionally attaches token if present (for optionalAuth linking).
 *
 * Contract: WAIVER-CONSENT-QR-FLOW-CONTRACT.md §5, §10.1
 */
import axios from 'axios';
import { ProductionTokenManager } from './api.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const publicWaiverApi = axios.create({
  baseURL: `${API_BASE_URL}/api/public/waivers`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Optionally attach auth token if present (enables optionalAuth linking for logged-in users)
publicWaiverApi.interceptors.request.use((config) => {
  const token = ProductionTokenManager.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Types ────────────────────────────────────────────────────

export type ActivityType = 'HOME_GYM_PT' | 'PARK_TRAINING' | 'SWIMMING_LESSONS';
export type WaiverSource = 'qr' | 'header_waiver';
export type SignatureMethod = 'drawn' | 'typed';

export interface WaiverVersionInfo {
  id: number;
  waiverType: string;
  activityType: string | null;
  version?: string;
  title: string;
  displayText: string | null;
  textHash: string;
  effectiveAt?: string | null;
  /** Plain-language "what changed" — shown when re-signing. */
  changeSummary?: string | null;
}

export interface WaiverVersionsResponse {
  versions: WaiverVersionInfo[];
  /** Identity of the document set as displayed; echoed on submit. */
  bundleHash: string | null;
}

export interface PublicWaiverSubmission {
  fullName: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
  activityTypes: ActivityType[];
  signatureData: string;
  liabilityAccepted: boolean;
  aiConsentAccepted: boolean;
  mediaConsentAccepted: boolean;
  source: WaiverSource;
  submittedByGuardian?: boolean;
  guardianName?: string;
  guardianTypedSignature?: string;
  /** Minor flow — the participant's own acknowledgement (not a signature). */
  minorAssentName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  /** Generated once per page load; makes a double-tap replay, not duplicate. */
  idempotencyKey?: string;
  /** Proves the documents did not change between display and signature. */
  bundleHash?: string | null;
}

export interface SignedDocumentSummary {
  id: number;
  title: string;
  version?: string;
  waiverType: string;
  activityType: string | null;
}

export interface WaiverSubmitResponse {
  success: boolean;
  waiverRecordId?: number;
  status?: string;
  message?: string;
  error?: string;
  code?: string;
  /** True when a repeat submit replayed the original record. */
  replayed?: boolean;
  signedAt?: string;
  signedSummary?: SignedDocumentSummary[];
  /** Self-contained record of exactly what was signed — the signer's copy. */
  artifactHtml?: string;
  artifactSha256?: string;
}

// ── API Methods ──────────────────────────────────────────────

export async function fetchCurrentWaiverVersions(): Promise<WaiverVersionsResponse> {
  const { data } = await publicWaiverApi.get('/versions/current');
  return {
    versions: data.versions || [],
    bundleHash: data.bundleHash ?? null,
  };
}

export async function submitPublicWaiver(
  submission: PublicWaiverSubmission,
): Promise<WaiverSubmitResponse> {
  const { data } = await publicWaiverApi.post('/submit', submission);
  return data;
}

/**
 * Turns any submit failure into copy a person can act on.
 * The page used to render the raw server string, so whatever the backend
 * happened to say became the user-facing message (SWA-140).
 */
export function describeWaiverError(err: unknown): { title: string; detail: string; retryable: boolean } {
  const anyErr = err as { response?: { status?: number; data?: { code?: string; error?: string } }; code?: string };
  const status = anyErr?.response?.status;
  const code = anyErr?.response?.data?.code;

  if (code === 'WAIVER_BUNDLE_STALE' || status === 409) {
    return {
      title: 'The agreement was updated while this page was open',
      detail: 'Nothing was submitted. We have loaded the current version — please review it and sign again.',
      retryable: true,
    };
  }
  if (status === 429) {
    return {
      title: 'Too many attempts',
      detail: 'Please wait a few minutes and try again. If someone else is signing on this same device or network, give it a moment.',
      retryable: true,
    };
  }
  if (code === 'WAIVER_GUARDIAN_REQUIRED') {
    return {
      title: 'A parent or guardian needs to sign this',
      detail: 'For participants under 18, a parent or legal guardian signs the agreement. Switch on the guardian section above to continue.',
      retryable: false,
    };
  }
  if (code === 'WAIVER_VERSION_UNAVAILABLE' || code === 'WAIVER_TEXT_UNAVAILABLE') {
    return {
      title: "We couldn't load the agreement documents",
      detail: 'Nothing was submitted. Please try again in a moment, or ask your trainer to help you finish signing.',
      retryable: true,
    };
  }
  if (status === 400) {
    return {
      title: 'Something in the form needs another look',
      detail: anyErr?.response?.data?.error || 'Please check the highlighted fields and try again.',
      retryable: false,
    };
  }
  if (!anyErr?.response) {
    return {
      title: "We couldn't reach SwanStudios",
      detail: 'Nothing was submitted and your answers are still here. Check your connection and try again.',
      retryable: true,
    };
  }
  return {
    title: "Your signature didn't save",
    detail: 'Nothing was submitted. Please try again — if it keeps happening, your trainer can help you finish.',
    retryable: true,
  };
}

/** Stable per-page-load key so retries replay instead of duplicating. */
export function createIdempotencyKey(): string {
  const raw =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return raw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
}
