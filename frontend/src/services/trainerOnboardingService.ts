/**
 * Trainer Onboarding Service — authenticated axios client for /api/trainer-onboarding.
 * ============================================================================
 * Mirrors publicWaiverService conventions (axios instance + ProductionTokenManager
 * bearer token). All endpoints require an authenticated user; approval is a separate
 * admin action (fail-closed). Stripe payout wiring is a future slice — not here.
 *
 * @module services/trainerOnboardingService
 */
import axios from 'axios';
import { ProductionTokenManager } from './api.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const trainerApi = axios.create({
  baseURL: `${API_BASE_URL}/api/trainer-onboarding`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

trainerApi.interceptors.request.use((config) => {
  const token = ProductionTokenManager.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Types ────────────────────────────────────────────────────

export interface ContractConsent {
  key: string;
  required: boolean;
  label: string;
}

export interface TrainerContract {
  version: string;
  title: string;
  body: string;
  consents: ContractConsent[];
  platformFeePercent: number;
  textHash: string;
  isDraft: boolean;
}

export type TrainerApplicationStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'suspended';

export interface TrainerApplicationSummary {
  id: number;
  status: TrainerApplicationStatus;
  contractVersion: string;
  signedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

export interface TrainerApplicationSubmission {
  fullName: string;
  email: string;
  phone?: string;
  businessName?: string;
  specialties?: string;
  bio?: string;
  yearsExperience?: number;
  primaryCertification?: string;
  certificationNumber?: string;
  certificationExpiry?: string;
  cprAedExpiry?: string;
  certificationFileKey?: string;
  insuranceCarrier?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  insuranceFileKey?: string;
  contractVersion: string;
  signatureData: string;
  consentFlags: Record<string, boolean>;
}

export interface SubmitResponse {
  success: boolean;
  message: string;
  application?: { id: number; status: TrainerApplicationStatus };
  missingConsents?: string[];
  currentVersion?: string;
}

export interface UploadResponse {
  success: boolean;
  kind: 'insurance' | 'certification';
  key: string;
}

// ── API ──────────────────────────────────────────────────────

export async function fetchTrainerContract(): Promise<TrainerContract> {
  const { data } = await trainerApi.get('/contract');
  return data.contract;
}

export async function fetchMyApplicationStatus(): Promise<TrainerApplicationSummary | null> {
  const { data } = await trainerApi.get('/status');
  return data.application ?? null;
}

export async function uploadTrainerCredential(
  file: File,
  kind: 'insurance' | 'certification',
): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  const { data } = await trainerApi.post('/credentials', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function submitTrainerApplication(
  submission: TrainerApplicationSubmission,
): Promise<SubmitResponse> {
  const { data } = await trainerApi.post('/apply', submission);
  return data;
}
