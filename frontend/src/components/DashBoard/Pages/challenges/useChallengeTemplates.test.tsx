import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const authGet = vi.fn();

  return {
    authGet,
    authAxios: { get: authGet },
  };
});

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mocks.authAxios }),
}));

import { useChallengeTemplates } from './useChallengeTemplates';

const governance = {
  creatorRoles: ['admin', 'trainer'],
  clientCreation: 'disabled_by_default',
  clientCreationControls: [{
    key: 'content_filtering',
    label: 'Content filtering',
    value: 'Required before public release',
    enabled: false,
    detail: 'Shared challenge names, descriptions, and media need connected filtering before public discovery.',
  }],
  requiresModerationForClientPublish: true,
  publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
};

const catalogResponse = {
  data: {
    success: true,
    templates: [{
      id: 'challenge-template:session-three-planned-sessions',
      archetype: 'session_completion',
      title: 'Three Planned Sessions',
      description: 'Finish three assigned training sessions in a week.',
      challengeType: 'weekly',
      category: 'fitness',
      difficulty: 3,
      xpReward: 120,
      maxProgress: 3,
      progressUnit: 'sessions',
      requirements: ['Complete assigned sessions from the trainer plan or workout logger.'],
      tags: ['assigned-session'],
      rule: {
        source: 'canonical_workout_event',
        metric: 'assigned_sessions_completed',
        validation: 'Count completed assigned sessions from saved workout logs.',
      },
      governance,
    }],
    archetypes: ['session_completion'],
    governance,
  },
};

describe('useChallengeTemplates', () => {
  beforeEach(() => {
    mocks.authGet.mockReset();
    mocks.authGet.mockResolvedValue(catalogResponse);
  });

  it('loads governed challenge templates from the backend catalog endpoint', async () => {
    const { result } = renderHook(() => useChallengeTemplates());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.authGet).toHaveBeenCalledWith('/api/v1/gamification/challenge-templates');
    expect(result.current.error).toBeNull();
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.archetypes).toEqual(['session_completion']);
    expect(result.current.governance?.clientCreationControls?.[0]?.key).toBe('content_filtering');
  });

  it('rejects governance policies that omit client creation controls', async () => {
    const { clientCreationControls: _controls, ...governanceWithoutControls } = governance;
    mocks.authGet.mockResolvedValueOnce({
      data: {
        ...catalogResponse.data,
        governance: governanceWithoutControls,
      },
    });

    const { result } = renderHook(() => useChallengeTemplates());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Unexpected challenge template response');
    expect(result.current.governance).toBeNull();
  });
  it('rejects successful catalog responses that omit governance policy truth', async () => {
    mocks.authGet.mockResolvedValueOnce({
      data: {
        success: true,
        templates: [],
        archetypes: [],
      },
    });

    const { result } = renderHook(() => useChallengeTemplates());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Unexpected challenge template response');
    expect(result.current.templates).toEqual([]);
    expect(result.current.archetypes).toEqual([]);
    expect(result.current.governance).toBeNull();
  });
});