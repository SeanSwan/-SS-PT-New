/**
 * Hook for the client challenge idea gate.
 * Loads backend policy truth and refuses local submissions while entitlement is closed.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import type { ChallengeGovernancePolicy } from '../challenges/useChallengeTemplates';

type SubmissionGateClient = {
  get: (url: string) => Promise<{ data: unknown }>;
  post?: (url: string, payload: ClientChallengeIdeaDraft) => Promise<{ data: unknown }>;
};

export type ClientChallengeIdeaVisibility = 'private' | 'trainer_visible';
export type ClientChallengeIdeaType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ClientChallengeIdeaArchetype = 'consistency' | 'session_completion' | 'time_activity' | 'exercise_family' | 'improvement' | 'team';

export interface ClientChallengeIdeaDraft {
  title: string;
  description: string;
  requestedVisibility?: ClientChallengeIdeaVisibility | string;
  challengeType?: ClientChallengeIdeaType | string;
  archetype?: ClientChallengeIdeaArchetype | string;
}

export interface ClientChallengeSubmissionGateState {
  canSubmit: boolean;
  queueStatus: string | null;
  requiredEntitlement: string | null;
  message: string | null;
  nextSteps: string[];
  policy: ChallengeGovernancePolicy | null;
  loading: boolean;
  error: string | null;
  actionError: string | null;
  actionMessage: string | null;
  reload: () => Promise<boolean>;
  submitChallengeIdea: (draft: ClientChallengeIdeaDraft) => Promise<boolean>;
}

interface PolicyResponse {
  success: true;
  canSubmit: boolean;
  queueStatus: string;
  requiredEntitlement: string;
  message: string;
  nextSteps: string[];
  policy: ChallengeGovernancePolicy;
}

const CLOSED_MESSAGE = 'Challenge idea submissions are closed until an admin grants client challenge creation entitlement.';
const CHALLENGE_TYPES = new Set<ClientChallengeIdeaType>(['daily', 'weekly', 'monthly', 'custom']);
const CHALLENGE_ARCHETYPES = new Set<ClientChallengeIdeaArchetype>(['consistency', 'session_completion', 'time_activity', 'exercise_family', 'improvement', 'team']);

const normalizeRequestedVisibility = (value: ClientChallengeIdeaDraft['requestedVisibility']): ClientChallengeIdeaVisibility => (
  value === 'private' ? 'private' : 'trainer_visible'
);
const normalizeChallengeType = (value: ClientChallengeIdeaDraft['challengeType']): ClientChallengeIdeaType => {
  const type = String(value || '').trim() as ClientChallengeIdeaType;
  return CHALLENGE_TYPES.has(type) ? type : 'weekly';
};
const normalizeChallengeArchetype = (value: ClientChallengeIdeaDraft['archetype']): ClientChallengeIdeaArchetype => {
  const archetype = String(value || '').trim() as ClientChallengeIdeaArchetype;
  return CHALLENGE_ARCHETYPES.has(archetype) ? archetype : 'consistency';
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

const isPolicyResponse = (value: unknown): value is PolicyResponse => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PolicyResponse>;
  return (
    candidate.success === true
    && typeof candidate.canSubmit === 'boolean'
    && typeof candidate.queueStatus === 'string'
    && typeof candidate.requiredEntitlement === 'string'
    && typeof candidate.message === 'string'
    && Array.isArray(candidate.nextSteps)
    && candidate.nextSteps.every((item) => typeof item === 'string')
    && isGovernancePolicy(candidate.policy)
  );
};

export const useClientChallengeSubmissionGate = (): ClientChallengeSubmissionGateState => {
  const { authAxios } = useAuth() as { authAxios?: SubmissionGateClient };
  const [canSubmit, setCanSubmit] = useState(false);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [requiredEntitlement, setRequiredEntitlement] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [policy, setPolicy] = useState<ChallengeGovernancePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadPolicy = useCallback(async () => {
    if (!authAxios?.get) {
      setLoading(false);
      setError('Authenticated request client unavailable');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authAxios.get('/api/v1/gamification/challenge-submissions/policy');
      if (!isPolicyResponse(response.data)) throw new Error('Unexpected challenge submission policy response');

      setCanSubmit(response.data.canSubmit);
      setQueueStatus(response.data.queueStatus);
      setRequiredEntitlement(response.data.requiredEntitlement);
      setMessage(response.data.message);
      setNextSteps(response.data.nextSteps);
      setPolicy(response.data.policy);
      setLoading(false);
      return true;
    } catch (policyError) {
      setCanSubmit(false);
      setQueueStatus(null);
      setRequiredEntitlement(null);
      setMessage(null);
      setNextSteps([]);
      setPolicy(null);
      setLoading(false);
      setError(policyError instanceof Error ? policyError.message : 'Challenge idea access unavailable');
      return false;
    }
  }, [authAxios]);

  const submitChallengeIdea = useCallback(async (draft: ClientChallengeIdeaDraft) => {
    if (!canSubmit) {
      setActionError(message || CLOSED_MESSAGE);
      setActionMessage(null);
      return false;
    }

    if (!authAxios?.post) {
      setActionError('Authenticated request client unavailable');
      setActionMessage(null);
      return false;
    }

    const normalizedDraft: ClientChallengeIdeaDraft = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      requestedVisibility: normalizeRequestedVisibility(draft.requestedVisibility),
      challengeType: normalizeChallengeType(draft.challengeType),
      archetype: normalizeChallengeArchetype(draft.archetype),
    };

    if (!normalizedDraft.title || !normalizedDraft.description) {
      setActionError('Challenge idea title and description are required.');
      setActionMessage(null);
      return false;
    }

    try {
      const response = await authAxios.post('/api/v1/gamification/challenge-submissions', normalizedDraft);
      if (!(response.data && typeof response.data === 'object' && (response.data as { success?: unknown }).success === true)) {
        throw new Error('Unexpected challenge submission response');
      }
      setActionMessage(normalizedDraft.requestedVisibility === 'private'
        ? 'Private challenge idea submitted for staff review.'
        : 'Challenge idea submitted for trainer review.');
      setActionError(null);
      await loadPolicy();
      return true;
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : 'Challenge idea submission failed');
      setActionMessage(null);
      return false;
    }
  }, [authAxios, canSubmit, loadPolicy, message]);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  return {
    canSubmit,
    queueStatus,
    requiredEntitlement,
    message,
    nextSteps,
    policy,
    loading,
    error,
    actionError,
    actionMessage,
    reload: loadPolicy,
    submitChallengeIdea,
  };
};

export default useClientChallengeSubmissionGate;