/**
 * Challenge template catalog data hook.
 *
 * Pulls the authenticated Admin/Trainer challenge template catalog from the
 * gamification API. This keeps the first challenge workspace slice on the
 * same backend contract used by creation policy validation.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';

interface ChallengeAuthClient {
  get: (url: string) => Promise<{ data: unknown }>;
}

export interface ChallengeClientCreationControl {
  key: string;
  label: string;
  value: string;
  enabled: boolean;
  detail: string;
}

export interface ChallengeGovernancePolicy {
  creatorRoles: string[];
  clientCreation: string;
  clientCreationControls: ChallengeClientCreationControl[];
  requiresModerationForClientPublish: boolean;
  publishModel: string;
}

export interface ChallengeTemplateRule {
  source: string;
  metric: string;
  exerciseFamily?: string;
  assignedSessionOnly?: boolean;
  requiresAssignedSession?: boolean;
  validation: string;
}

export interface ChallengeTemplate {
  id: string;
  archetype: string;
  title: string;
  description: string;
  challengeType: string;
  category: string;
  difficulty: number;
  xpReward: number;
  maxProgress: number;
  progressUnit: string;
  requirements: string[];
  tags: string[];
  allowTeams?: boolean;
  maxTeamSize?: number;
  rule: ChallengeTemplateRule;
  governance: ChallengeGovernancePolicy;
}


export { isAssignedSessionChallengeTemplate } from './challengeTemplateRules';

export interface ChallengeTemplateCatalogResponse {
  success: boolean;
  templates: ChallengeTemplate[];
  archetypes: string[];
  governance: ChallengeGovernancePolicy;
}

interface ChallengeTemplateState {
  templates: ChallengeTemplate[];
  archetypes: string[];
  governance: ChallengeGovernancePolicy | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_STATE: ChallengeTemplateState = {
  templates: [],
  archetypes: [],
  governance: null,
  loading: true,
  error: null,
};

const isString = (value: unknown): value is string => typeof value === 'string';

const isClientCreationControl = (value: unknown): value is ChallengeClientCreationControl => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChallengeClientCreationControl>;
  return (
    isString(candidate.key)
    && isString(candidate.label)
    && isString(candidate.value)
    && typeof candidate.enabled === 'boolean'
    && isString(candidate.detail)
  );
};

const isGovernancePolicy = (value: unknown): value is ChallengeGovernancePolicy => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChallengeGovernancePolicy>;
  const controls = candidate.clientCreationControls;
  return (
    Array.isArray(candidate.creatorRoles)
    && candidate.creatorRoles.every(isString)
    && isString(candidate.clientCreation)
    && Array.isArray(controls)
    && controls.every(isClientCreationControl)
    && typeof candidate.requiresModerationForClientPublish === 'boolean'
    && isString(candidate.publishModel)
  );
};

const isCatalogResponse = (value: unknown): value is ChallengeTemplateCatalogResponse => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChallengeTemplateCatalogResponse>;
  return (
    candidate.success === true
    && Array.isArray(candidate.templates)
    && Array.isArray(candidate.archetypes)
    && candidate.archetypes.every(isString)
    && isGovernancePolicy(candidate.governance)
  );
};

export const useChallengeTemplates = () => {
  const { authAxios } = useAuth() as { authAxios?: ChallengeAuthClient };
  const [state, setState] = useState<ChallengeTemplateState>(EMPTY_STATE);

  const loadTemplates = useCallback(async () => {
    if (!authAxios?.get) {
      setState((current) => ({ ...current, loading: false, error: 'Authenticated request client unavailable' }));
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await authAxios.get('/api/v1/gamification/challenge-templates');
      if (!isCatalogResponse(response.data)) {
        throw new Error('Unexpected challenge template response');
      }

      setState({
        templates: response.data.templates,
        archetypes: response.data.archetypes,
        governance: response.data.governance,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'Challenge templates unavailable',
      }));
    }
  }, [authAxios]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  return {
    ...state,
    reload: loadTemplates,
  };
};
