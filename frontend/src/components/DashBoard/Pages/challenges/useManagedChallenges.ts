/**
 * Authenticated Admin/Trainer challenge management list hook.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';

export type ChallengePublishVisibility = 'public' | 'private';
export type ManagedChallengeStatusAction = 'complete' | 'cancel' | 'archive';

type ChallengeStatusPatchPayload =
  | { action: 'publish'; visibility: ChallengePublishVisibility }
  | { action: ManagedChallengeStatusAction };

interface ChallengeManagementClient {
  get: (url: string, config?: { params: Record<string, string | number> }) => Promise<{ data: unknown }>;
  patch?: (url: string, payload: ChallengeStatusPatchPayload) => Promise<{ data: unknown }>;
  put?: (url: string, payload: { userIds: string[] }) => Promise<{ data: unknown }>;
}

export interface ManagedChallengeCreator {
  id: number | string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

export interface ManagedChallengeParticipantUser {
  id: number | string;
  firstName?: string;
  lastName?: string;
  username?: string;
  photo?: string | null;
}

export interface ManagedChallengeParticipant {
  id: number | string;
  userId: number | string;
  currentProgress?: number | string;
  progressPercentage?: number | string;
  status: string;
  joinedAt?: string;
  user?: ManagedChallengeParticipantUser | null;
}

export interface ManagedChallenge {
  id: string;
  title: string;
  description: string;
  challengeType: string;
  category: string;
  difficulty: number;
  xpReward: number;
  maxProgress: number;
  progressUnit: string;
  startDate: string;
  endDate: string;
  status: string;
  currentParticipants: number;
  maxParticipants?: number | null;
  completionRate?: number | string;
  allowTeams?: boolean;
  maxTeamSize?: number | null;
  creator?: ManagedChallengeCreator | null;
  participants?: ManagedChallengeParticipant[];
}

export interface ManagedChallengesResponse {
  success: boolean;
  challenges: ManagedChallenge[];
  pagination?: { total: number; page: number; limit: number; pages: number };
}

interface ManagedChallengeState {
  challenges: ManagedChallenge[];
  loading: boolean;
  error: string | null;
  notice: string | null;
  updatingId: string | null;
  audienceUpdatingId: string | null;
}

const EMPTY_STATE: ManagedChallengeState = {
  challenges: [],
  loading: true,
  error: null,
  notice: null,
  updatingId: null,
  audienceUpdatingId: null,
};

const isManagedChallengesResponse = (value: unknown): value is ManagedChallengesResponse => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ManagedChallengesResponse>;
  return candidate.success === true && Array.isArray(candidate.challenges);
};

const publishNotice = (title: string, visibility: ChallengePublishVisibility) => (
  visibility === 'private'
    ? `${title} published as a private cohort.`
    : `${title} published for public discovery.`
);

const lifecycleNotice = (title: string, action: ManagedChallengeStatusAction) => {
  switch (action) {
    case 'complete':
      return `${title} marked completed.`;
    case 'cancel':
      return `${title} cancelled and removed from discovery.`;
    case 'archive':
      return `${title} archived from operator lists.`;
    default:
      return `${title} updated.`;
  }
};

const findChallengeTitle = (challenges: ManagedChallenge[], id: string) => (
  challenges.find((challenge) => challenge.id === id)?.title ?? 'Challenge'
);

export const useManagedChallenges = () => {
  const { authAxios } = useAuth() as { authAxios?: ChallengeManagementClient };
  const [state, setState] = useState<ManagedChallengeState>(EMPTY_STATE);

  const loadChallenges = useCallback(async () => {
    if (!authAxios?.get) {
      setState((current) => ({ ...current, loading: false, error: 'Authenticated request client unavailable', notice: null }));
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      const response = await authAxios.get('/api/v1/gamification/challenges/manage', {
        params: { status: 'all', limit: 20, sortBy: 'startDate', sortOrder: 'asc' },
      });
      const payload = response.data;
      if (!isManagedChallengesResponse(payload)) {
        throw new Error('Unexpected challenge list response');
      }

      setState((current) => ({ ...current, challenges: payload.challenges, loading: false, error: null }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'Challenge campaigns unavailable',
        notice: null,
      }));
    }
  }, [authAxios]);

  const publishChallenge = useCallback(async (id: string, visibility: ChallengePublishVisibility = 'public') => {
    if (!authAxios?.patch) {
      setState((current) => ({ ...current, error: 'Authenticated request client unavailable', notice: null }));
      return;
    }

    setState((current) => ({ ...current, updatingId: id, error: null, notice: null }));
    try {
      await authAxios.patch(`/api/v1/gamification/challenges/${id}/status`, { action: 'publish', visibility });
      await loadChallenges();
      setState((current) => {
        if (current.error) return current;
        return { ...current, notice: publishNotice(findChallengeTitle(current.challenges, id), visibility) };
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Challenge could not be published',
        notice: null,
      }));
    } finally {
      setState((current) => ({ ...current, updatingId: null }));
    }
  }, [authAxios, loadChallenges]);

  const updateChallengeStatus = useCallback(async (id: string, action: ManagedChallengeStatusAction) => {
    if (!authAxios?.patch) {
      setState((current) => ({ ...current, error: 'Authenticated request client unavailable', notice: null }));
      return;
    }

    setState((current) => ({ ...current, updatingId: id, error: null, notice: null }));
    try {
      await authAxios.patch(`/api/v1/gamification/challenges/${id}/status`, { action });
      await loadChallenges();
      setState((current) => {
        if (current.error) return current;
        return { ...current, notice: lifecycleNotice(findChallengeTitle(current.challenges, id), action) };
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Challenge status could not be updated',
        notice: null,
      }));
    } finally {
      setState((current) => ({ ...current, updatingId: null }));
    }
  }, [authAxios, loadChallenges]);

  const saveChallengeAudience = useCallback(async (id: string, userIds: string[]) => {
    if (!authAxios?.put) {
      setState((current) => ({ ...current, error: 'Authenticated request client unavailable', notice: null }));
      return false;
    }

    setState((current) => ({ ...current, audienceUpdatingId: id, error: null, notice: null }));
    try {
      await authAxios.put(`/api/v1/gamification/challenges/${id}/audience`, { userIds });
      await loadChallenges();
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Challenge audience could not be saved',
        notice: null,
      }));
      return false;
    } finally {
      setState((current) => ({ ...current, audienceUpdatingId: null }));
    }
  }, [authAxios, loadChallenges]);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  return {
    ...state,
    reload: loadChallenges,
    publishChallenge,
    updateChallengeStatus,
    saveChallengeAudience,
  };
};