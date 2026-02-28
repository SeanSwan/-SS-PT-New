/**
 * Public Waiver Service — Phase 5W-G
 * ====================================
 * Dedicated axios client for public waiver endpoints.
 * No auth interceptor — optionally attaches token if present (for optionalAuth linking).
 *
 * Contract: WAIVER-CONSENT-QR-FLOW-CONTRACT.md §5, §10.1
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const publicWaiverApi = axios.create({
  baseURL: `${API_BASE_URL}/api/public/waivers`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Optionally attach auth token if present (enables optionalAuth linking for logged-in users)
publicWaiverApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Types ────────────────────────────────────────────────────

export type ActivityType = 'HOME_GYM_PT' | 'PARK_TRAINING' | 'SWIMMING_LESSONS';
export type WaiverSource = 'qr' | 'header_waiver';

export interface WaiverVersionInfo {
  id: number;
  waiverType: string;
  activityType: string | null;
  title: string;
  displayText: string | null;
  textHash: string;
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
}

export interface WaiverSubmitResponse {
  success: boolean;
  waiverRecordId?: number;
  status?: string;
  message?: string;
  error?: string;
  code?: string;
}

// ── API Methods ──────────────────────────────────────────────

export async function fetchCurrentWaiverVersions(): Promise<WaiverVersionInfo[]> {
  const { data } = await publicWaiverApi.get('/versions/current');
  return data.versions || [];
}

export async function submitPublicWaiver(
  submission: PublicWaiverSubmission,
): Promise<WaiverSubmitResponse> {
  const { data } = await publicWaiverApi.post('/submit', submission);
  return data;
}
