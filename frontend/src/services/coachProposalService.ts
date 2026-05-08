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
  splitPlan?: {
    nextAction?: string;
    splitCount?: number;
    workoutProposalCount?: number;
    workoutProposals?: CoachActionProposal[];
    skippedWorkoutProposalCount?: number;
    splits?: Array<Record<string, unknown>>;
  };
  clarificationAnswer?: string;
  code?: string;
  error?: string;
}

export interface CoachProposalDetailResponse {
  success: boolean;
  proposal?: CoachActionProposal;
  code?: string;
  error?: string;
}

function coachProposalErrorMessage(code: string | undefined, fallback: string): string {
  if (code === 'PROPOSAL_NOT_FOUND') {
    return 'Prepared draft was not found or is no longer available. Prepare an updated draft review.';
  }
  if (code === 'PROPOSAL_DETAIL_REVIEW_REQUIRED') {
    return 'Review details again before approving. The previous review window expired or changed.';
  }
  if (code === 'PROPOSAL_REVIEW_TOKEN_UNAVAILABLE') {
    return 'Proposal review is temporarily unavailable. Try again after the Coach security key is restored.';
  }
  return fallback;
}

function unwrapError(err: unknown, fallbackMessage: string): never {
  if (isAxiosError(err)) {
    const data = err.response?.data as CoachProposalActionResponse | undefined;
    const code = data?.code || 'UNKNOWN';
    throw new PlaudApiError(
      code,
      coachProposalErrorMessage(code, data?.error || err.message || fallbackMessage),
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

export async function approveCoachProposal(
  id: string,
  reviewToken?: string | null,
): Promise<CoachProposalActionResponse> {
  try {
    const { data } = await apiService.post<CoachProposalActionResponse>(
      `/api/coach/proposals/${encodeURIComponent(id)}/approve`,
      reviewToken ? { reviewToken } : {},
    );
    return data;
  } catch (err) {
    unwrapError(err, 'Failed to approve Coach proposal');
  }
}

export async function answerCoachProposalClarification(
  id: string,
  answer: string,
): Promise<CoachProposalActionResponse> {
  try {
    const { data } = await apiService.post<CoachProposalActionResponse>(
      `/api/coach/proposals/${encodeURIComponent(id)}/clarification-answer`,
      { answer },
    );
    return data;
  } catch (err) {
    unwrapError(err, 'Failed to answer Coach clarification');
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

export default {
  answerCoachProposalClarification,
  approveCoachProposal,
  getCoachProposal,
  rejectCoachProposal,
};
