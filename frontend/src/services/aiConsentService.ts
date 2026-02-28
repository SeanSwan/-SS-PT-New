/**
 * AI Consent Service
 * ==================
 * Frontend API layer for AI privacy consent endpoints.
 * Uses the production apiService (token refresh, auth headers, production URL).
 *
 * Phase 1 — Privacy Foundation (Smart Workout Logger)
 */

import apiService from './api.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConsentProfile {
  userId: number;
  aiEnabled: boolean;
  consentVersion: string;
  consentedAt: string | null;
  withdrawnAt: string | null;
}

export interface WaiverEligibility {
  isCurrent: boolean;
  reasonCode: string | null;
  requiresReconsent: boolean;
}

export interface ConsentStatusResponse {
  success: boolean;
  consentGranted: boolean;
  profile: ConsentProfile | null;
  waiverEligibility: WaiverEligibility | null;
}

export interface ConsentActionResponse {
  success: boolean;
  message: string;
  profile: Partial<ConsentProfile>;
}

// ── API Methods ──────────────────────────────────────────────────────────────

/**
 * GET /api/ai/consent/status
 * Returns current user's AI consent status.
 */
export async function getConsentStatus(): Promise<ConsentStatusResponse> {
  const res = await apiService.get<ConsentStatusResponse>('/api/ai/consent/status');
  return res.data;
}

/**
 * POST /api/ai/consent/grant
 * Grants AI consent for the current user.
 */
export async function grantConsent(consentVersion?: string): Promise<ConsentActionResponse> {
  const res = await apiService.post<ConsentActionResponse>(
    '/api/ai/consent/grant',
    consentVersion ? { consentVersion } : {},
  );
  return res.data;
}

/**
 * POST /api/ai/consent/withdraw
 * Withdraws AI consent for the current user.
 */
export async function withdrawConsent(): Promise<ConsentActionResponse> {
  const res = await apiService.post<ConsentActionResponse>('/api/ai/consent/withdraw', {});
  return res.data;
}
