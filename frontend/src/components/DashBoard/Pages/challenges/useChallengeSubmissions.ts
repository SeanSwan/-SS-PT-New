/**
 * Authenticated Admin/Trainer challenge submission queue hook.
 *
 * Staff can review queued client challenge submissions, but public publishing
 * stays closed: approval creates only a private staff-owned draft challenge.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import type { ChallengeGovernancePolicy } from './useChallengeTemplates';

export type ChallengeSubmissionModerationAction = 'start_review' | 'request_changes' | 'reject' | 'approve_as_draft';

type ChallengeSubmissionModerationPayload = {
  action: ChallengeSubmissionModerationAction;
  reviewNotes?: string;
};

interface ChallengeSubmissionClient {
  get: (url: string) => Promise<{ data: unknown }>;
  patch?: (url: string, payload: ChallengeSubmissionModerationPayload) => Promise<{ data: unknown }>;
}

export interface ChallengeSubmissionRecord {
  id: string | number;
  title: string;
  description?: string;
  challengeType?: string;
  archetype?: string;
  status: string;
  moderationStatus?: string;
  requestedVisibility?: string;
  submittedAt?: string;
  submittedBy?: string;
}

export interface ChallengeSubmissionQueueResponse {
  success: boolean;
  submissions: ChallengeSubmissionRecord[];
  queueStatus: string;
  message: string;
  policy: ChallengeGovernancePolicy;
}

interface ChallengeSubmissionModerationResponse {
  success: true;
  action: ChallengeSubmissionModerationAction;
  submission: ChallengeSubmissionRecord;
  challenge?: { id?: string | number; title?: string; status?: string; isPublic?: boolean } | null;
}

interface ChallengeSubmissionState {
  submissions: ChallengeSubmissionRecord[];
  queueStatus: string | null;
  message: string | null;
  governance: ChallengeGovernancePolicy | null;
  loading: boolean;
  error: string | null;
  moderatingId: string | null;
  actionMessage: string | null;
  actionError: string | null;
}

export interface ChallengeSubmissionQueueState extends ChallengeSubmissionState {
  reload: () => Promise<boolean>;
  moderateSubmission: (id: string | number, action: ChallengeSubmissionModerationAction, reviewNotes?: string) => Promise<boolean>;
}

const EMPTY_STATE: ChallengeSubmissionState = {
  submissions: [],
  queueStatus: null,
  message: null,
  governance: null,
  loading: true,
  error: null,
  moderatingId: null,
  actionMessage: null,
  actionError: null,
};

const isGovernancePolicy = (value: unknown): value is ChallengeGovernancePolicy => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChallengeGovernancePolicy>;
  return (
    Array.isArray(candidate.creatorRoles)
    && typeof candidate.clientCreation === 'string'
    && typeof candidate.requiresModerationForClientPublish === 'boolean'
    && typeof candidate.publishModel === 'string'
  );
};

const isOptionalString = (value: unknown) => typeof value === 'undefined' || typeof value === 'string';

const isSubmissionRecord = (value: unknown): value is ChallengeSubmissionRecord => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChallengeSubmissionRecord>;
  return (
    (typeof candidate.id === 'string' || typeof candidate.id === 'number')
    && typeof candidate.title === 'string'
    && isOptionalString(candidate.description)
    && isOptionalString(candidate.challengeType)
    && isOptionalString(candidate.archetype)
    && typeof candidate.status === 'string'
  );
};

const isQueueResponse = (value: unknown): value is ChallengeSubmissionQueueResponse => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChallengeSubmissionQueueResponse>;
  return (
    candidate.success === true
    && Array.isArray(candidate.submissions)
    && candidate.submissions.every(isSubmissionRecord)
    && typeof candidate.queueStatus === 'string'
    && typeof candidate.message === 'string'
    && isGovernancePolicy(candidate.policy)
  );
};

const isModerationAction = (value: unknown): value is ChallengeSubmissionModerationAction => (
  value === 'start_review' || value === 'request_changes' || value === 'reject' || value === 'approve_as_draft'
);

const isModerationResponse = (value: unknown): value is ChallengeSubmissionModerationResponse => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChallengeSubmissionModerationResponse>;
  return candidate.success === true && isModerationAction(candidate.action) && isSubmissionRecord(candidate.submission);
};

const REJECTION_NOTES_REQUIRED_MESSAGE = 'Review notes are required when rejecting a client challenge submission.';
const REQUEST_CHANGES_NOTES_REQUIRED_MESSAGE = 'Review notes are required when requesting changes to a client challenge submission.';

const moderationNotice = (action: ChallengeSubmissionModerationAction) => {
  if (action === 'start_review') return 'Challenge submission moved into review.';
  if (action === 'request_changes') return 'Challenge submission returned for changes with review notes.';
  if (action === 'reject') return 'Challenge submission rejected with review notes.';
  return 'Challenge submission approved into a private draft.';
};

const moderationPayload = (action: ChallengeSubmissionModerationAction, reviewNotes?: string): ChallengeSubmissionModerationPayload => {
  const notes = typeof reviewNotes === 'string' ? reviewNotes.trim() : '';
  return notes ? { action, reviewNotes: notes } : { action };
};

export const useChallengeSubmissions = (): ChallengeSubmissionQueueState => {
  const { authAxios } = useAuth() as { authAxios?: ChallengeSubmissionClient };
  const [state, setState] = useState<ChallengeSubmissionState>(EMPTY_STATE);

  const loadSubmissions = useCallback(async () => {
    if (!authAxios?.get) {
      setState((current) => ({
        ...current,
        loading: false,
        error: 'Authenticated request client unavailable',
      }));
      return false;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await authAxios.get('/api/v1/gamification/challenge-submissions/manage');
      const payload = response.data;
      if (!isQueueResponse(payload)) {
        throw new Error('Unexpected challenge submission queue response');
      }

      setState((current) => ({
        ...current,
        submissions: payload.submissions,
        queueStatus: payload.queueStatus,
        message: payload.message,
        governance: payload.policy,
        loading: false,
        error: null,
      }));
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        submissions: [],
        queueStatus: null,
        message: null,
        governance: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Challenge submission queue unavailable',
      }));
      return false;
    }
  }, [authAxios]);

  const moderateSubmission = useCallback(async (
    id: string | number,
    action: ChallengeSubmissionModerationAction,
    reviewNotes?: string,
  ) => {
    const submissionId = String(id);
    if (!authAxios?.patch) {
      setState((current) => ({
        ...current,
        actionError: 'Authenticated request client unavailable',
        actionMessage: null,
      }));
      return false;
    }

    if ((action === 'reject' || action === 'request_changes') && (typeof reviewNotes !== 'string' || reviewNotes.trim().length === 0)) {
      setState((current) => ({
        ...current,
        actionError: action === 'request_changes' ? REQUEST_CHANGES_NOTES_REQUIRED_MESSAGE : REJECTION_NOTES_REQUIRED_MESSAGE,
        actionMessage: null,
      }));
      return false;
    }

    setState((current) => ({
      ...current,
      moderatingId: submissionId,
      actionError: null,
      actionMessage: null,
    }));

    try {
      const response = await authAxios.patch(
        `/api/v1/gamification/challenge-submissions/${encodeURIComponent(submissionId)}/moderation`,
        moderationPayload(action, reviewNotes),
      );
      if (!isModerationResponse(response.data)) {
        throw new Error('Unexpected challenge submission moderation response');
      }

      const refreshed = await loadSubmissions();
      if (!refreshed) return false;

      setState((current) => ({
        ...current,
        actionMessage: moderationNotice(action),
        actionError: null,
      }));
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        actionError: error instanceof Error ? error.message : 'Challenge submission moderation failed',
        actionMessage: null,
      }));
      return false;
    } finally {
      setState((current) => ({ ...current, moderatingId: null }));
    }
  }, [authAxios, loadSubmissions]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  return {
    ...state,
    reload: loadSubmissions,
    moderateSubmission,
  };
};




