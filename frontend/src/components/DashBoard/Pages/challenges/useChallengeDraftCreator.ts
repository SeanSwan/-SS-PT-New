/**
 * Authenticated challenge draft creator.
 * Posts governed template draft payloads to the canonical gamification API.
 */

import { useCallback, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import type { ChallengeDraftPayload } from './challengeDraftForm';

interface ChallengeCreateClient {
  post: (url: string, payload: ChallengeDraftPayload) => Promise<{ data: unknown }>;
}

interface DraftCreatorState {
  creating: boolean;
  error: string | null;
  created: unknown | null;
}

export const useChallengeDraftCreator = () => {
  const { authAxios } = useAuth() as { authAxios?: ChallengeCreateClient };
  const [state, setState] = useState<DraftCreatorState>({ creating: false, error: null, created: null });

  const createDraft = useCallback(async (payload: ChallengeDraftPayload) => {
    if (!authAxios?.post) {
      const message = 'Authenticated request client unavailable';
      setState({ creating: false, error: message, created: null });
      throw new Error(message);
    }

    setState({ creating: true, error: null, created: null });
    try {
      const response = await authAxios.post('/api/v1/gamification/challenges', payload);
      setState({ creating: false, error: null, created: response.data });
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Challenge draft could not be created';
      setState({ creating: false, error: message, created: null });
      throw error;
    }
  }, [authAxios]);

  return {
    ...state,
    createDraft,
  };
};