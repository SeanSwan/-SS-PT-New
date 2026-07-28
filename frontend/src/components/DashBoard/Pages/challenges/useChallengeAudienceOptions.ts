/**
 * Role-aware challenge audience options.
 * Uses existing Admin/Trainer client sources without persisting challenge audience rows.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import {
  ADMIN_CLIENT_LIST_LIMIT,
  normalizeClientListResponse,
  type ActiveClient,
} from '../../../../context/GlobalClientContext';

interface AudienceClient {
  get: (url: string, config?: { params?: Record<string, string | number> }) => Promise<{ data: unknown }>;
}

interface AudienceUser {
  id?: number | string;
  role?: string;
}

export interface ChallengeAudienceOption {
  id: string;
  name: string;
  source?: string;
  membership?: string;
  workouts?: number;
  lastWorkoutDate?: string;
  nextSessionDate?: string;
}

interface AudienceState {
  options: ChallengeAudienceOption[];
  sourceLabel: string;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: AudienceState = {
  options: [],
  sourceLabel: 'Eligible clients',
  loading: true,
  error: null,
};

const displayNameFor = (client: ActiveClient) => {
  const fullName = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim();
  return fullName || `Client ${client.id}`;
};

const toAudienceOption = (client: ActiveClient): ChallengeAudienceOption => ({
  id: String(client.id),
  name: displayNameFor(client),
  source: client.clientSource,
  membership: client.membershipLevel,
  workouts: client.totalWorkouts,
  lastWorkoutDate: client.lastWorkoutDate,
  nextSessionDate: client.nextSessionDate,
});

export const toChallengeAudienceOptions = (payload: unknown, role: string) => (
  normalizeClientListResponse(payload, role).map(toAudienceOption)
);

export const resolveChallengeAudienceSource = (user?: AudienceUser | null) => {
  const role = user?.role === 'user' ? 'client' : user?.role;

  if (role === 'admin') {
    return {
      role,
      sourceLabel: 'Admin roster',
      path: '/api/admin/clients',
      config: { params: { limit: ADMIN_CLIENT_LIST_LIMIT } },
    };
  }

  if (role === 'trainer' && user?.id) {
    return {
      role,
      sourceLabel: 'Assigned clients',
      path: `/api/client-trainer-assignments/trainer/${user.id}`,
      config: undefined,
    };
  }

  return null;
};

export const useChallengeAudienceOptions = () => {
  const { authAxios, user } = useAuth() as { authAxios?: AudienceClient; user?: AudienceUser | null };
  const [state, setState] = useState<AudienceState>(INITIAL_STATE);

  const loadAudienceOptions = useCallback(async () => {
    if (!authAxios?.get) {
      setState((current) => ({ ...current, loading: false, error: 'Authenticated request client unavailable' }));
      return;
    }

    const source = resolveChallengeAudienceSource(user);
    if (!source) {
      setState({ options: [], sourceLabel: 'Eligible clients', loading: false, error: 'Audience scoping is for admin and trainer roles.' });
      return;
    }

    setState((current) => ({ ...current, sourceLabel: source.sourceLabel, loading: true, error: null }));

    try {
      const response = await authAxios.get(source.path, source.config);
      const options = toChallengeAudienceOptions(response.data, source.role);
      setState({ options, sourceLabel: source.sourceLabel, loading: false, error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'Audience clients unavailable',
      }));
    }
  }, [authAxios, user?.id, user?.role]);

  useEffect(() => {
    void loadAudienceOptions();
  }, [loadAudienceOptions]);

  return {
    ...state,
    reload: loadAudienceOptions,
  };
};