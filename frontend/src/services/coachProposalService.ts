/**
 * coachProposalService.ts
 * =======================
 * Frontend wrapper for deterministic Swan Coach proposal approval.
 */
import { isAxiosError } from 'axios';
import apiService from './api.service';
import { PlaudApiError } from './plaudClipService';
import type { CoachActionProposal } from '../components/DashBoard/Pages/coach-assistant/SwanCoachTypes';

export interface CoachProposalActionResponse {
  success: boolean;
  proposal?: CoachActionProposal;
  applied?: boolean;
  partial?: boolean;
  workout?: Record<string, unknown>;
  client?: Record<string, unknown>;
  updates?: Record<string, unknown>;
  code?: string;
  error?: string;
}

export interface CoachProposalDetailResponse {
  success: boolean;
  proposal?: CoachActionProposal;
  code?: string;
  error?: string;
}

function unwrapError(err: unknown, fallbackMessage: string): never {
  if (isAxiosError(err)) {
    const data = err.response?.data as CoachProposalActionResponse | undefined;
    throw new PlaudApiError(
      data?.code || 'UNKNOWN',
      data?.error || err.message || fallbackMessage,
      err.response?.status || 0,
      data,
    );
  }
  throw new PlaudApiError('UNKNOWN', fallbackMessage, 0);
}

export async function getCoachProposal(id: string): Promise<CoachProposalDetailResponse> {
  try {
    const { data } = await apiService.get<CoachProposalDetailResponse>(`/api/coach/proposals/${encodeURIComponent(id)}`);
    return data;
  } catch (err) {
    unwrapError(err, 'Failed to load Coach proposal');
  }
}

export async function approveCoachProposal(id: string): Promise<CoachProposalActionResponse> {
  try {
    const { data } = await apiService.post<CoachProposalActionResponse>(`/api/coach/proposals/${encodeURIComponent(id)}/approve`);
    return data;
  } catch (err) {
    unwrapError(err, 'Failed to approve Coach proposal');
  }
}

export async function rejectCoachProposal(id: string): Promise<CoachProposalActionResponse> {
  try {
    const { data } = await apiService.post<CoachProposalActionResponse>(`/api/coach/proposals/${encodeURIComponent(id)}/reject`);
    return data;
  } catch (err) {
    unwrapError(err, 'Failed to reject Coach proposal');
  }
}

export default { approveCoachProposal, getCoachProposal, rejectCoachProposal };
