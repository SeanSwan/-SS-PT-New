/**
 * coachProposalService.ts
 * =======================
 * Frontend wrapper for deterministic Swan Coach proposal approval.
 */
import { isAxiosError } from 'axios';
import apiService from './api.service';
import { PlaudApiError } from './plaudClipService';
import type { CoachActionProposal } from '../components/DashBoard/Pages/coach-assistant/SwanCoachTypes';

export interface CoachAccessHandoff {
  credentialMode?: string;
  claimCode?: string | null;
  claimUrl?: string | null;
  claimExpiresAt?: string | null;
  resetEmailSent?: boolean;
  resetUrl?: string | null;
  resetExpiresAt?: string | null;
  credentialIssue?: string | null;
}

export interface CoachProposalActionResponse {
  success: boolean;
  proposal?: CoachActionProposal;
  applied?: boolean;
  partial?: boolean;
  workout?: Record<string, unknown>;
  client?: Record<string, unknown>;
  updates?: Record<string, unknown>;
  profileCoverageUpdate?: Record<string, unknown>;
  accessHandoff?: CoachAccessHandoff;
  onboardingFieldLedger?: Record<string, unknown>;
  onboardingMissingFields?: Array<Record<string, unknown>>;
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

const SAFE_PROPOSAL_ERROR_MESSAGES: Record<string, string> = {
  PROPOSAL_NOT_FOUND: 'Prepared draft was not found or is no longer available. Prepare an updated draft review.',
  PROPOSAL_DETAIL_REVIEW_REQUIRED: 'Review details again before approving. The previous review window expired or changed.',
  PROPOSAL_REVIEW_TOKEN_UNAVAILABLE: 'Proposal review is temporarily unavailable. Try again after the Coach security key is restored.',
  PROPOSAL_NOT_PENDING: 'Prepared draft is no longer pending. Refresh the review queue before acting again.',
  PROPOSAL_INVALID_CLIENT_ID: 'Coach proposal client ID is invalid. Prepare a new draft review.',
  CLIENT_ACCESS_DENIED: 'You do not have access to that client. Open the correct client context and prepare a new draft.',
  DUPLICATE_DATE: 'A workout session already exists for this client on this date.',
  VALIDATION_ERROR: 'Workout log data is invalid. Check the workout details and try again.',
  WORKOUT_APPLY_FAILED: 'Workout log proposal could not be applied.',
  SPLIT_PLAN_APPROVAL_FAILED: 'Split-plan proposal could not be approved. Refresh the draft and try again.',
  ONBOARDING_REQUIRED_FIELDS_MISSING: 'Client onboarding draft is missing required fields.',
  ONBOARDING_FORBIDDEN: 'Only trainers and admins can approve client onboarding drafts.',
  ONBOARDING_DUPLICATE_EMAIL: 'A client already exists with that email.',
  ONBOARDING_APPLY_FAILED: 'Client onboarding proposal could not be applied.',
};

const SAFE_PROPOSAL_ERROR_CODES = new Set(Object.keys(SAFE_PROPOSAL_ERROR_MESSAGES));

function safeCoachProposalErrorCode(code: unknown): string {
  return typeof code === 'string' && SAFE_PROPOSAL_ERROR_CODES.has(code)
    ? code
    : 'COACH_PROPOSAL_ERROR';
}

function coachProposalErrorMessage(code: string, fallback: string): string {
  return SAFE_PROPOSAL_ERROR_MESSAGES[code] || fallback;
}
function unwrapError(err: unknown, fallbackMessage: string): never {
  if (isAxiosError(err)) {
    const data = err.response?.data as CoachProposalActionResponse | undefined;
    const code = safeCoachProposalErrorCode(data?.code);
    throw new PlaudApiError(
      code,
      coachProposalErrorMessage(code, fallbackMessage),
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
