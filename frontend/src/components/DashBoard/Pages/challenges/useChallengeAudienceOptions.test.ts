import { describe, expect, it } from 'vitest';
import {
  resolveChallengeAudienceSource,
  toChallengeAudienceOptions,
} from './useChallengeAudienceOptions';

describe('useChallengeAudienceOptions helpers', () => {
  it('resolves admin and trainer audience sources without inventing a client source', () => {
    expect(resolveChallengeAudienceSource({ id: 1, role: 'admin' })).toMatchObject({
      sourceLabel: 'Admin roster',
      path: '/api/admin/clients',
      config: { params: { limit: expect.any(Number) } },
    });

    expect(resolveChallengeAudienceSource({ id: 77, role: 'trainer' })).toMatchObject({
      sourceLabel: 'Assigned clients',
      path: '/api/client-trainer-assignments/trainer/77',
      config: undefined,
    });

    expect(resolveChallengeAudienceSource({ id: 5, role: 'client' })).toBeNull();
  });

  it('normalizes admin roster payloads into audience options without exposing email in labels', () => {
    const options = toChallengeAudienceOptions({
      data: {
        clients: [
          {
            id: 101,
            firstName: 'Avery',
            lastName: 'Stone',
            email: 'avery@example.test',
            clientSource: 'swanstudios',
            membershipLevel: 'premium',
            totalWorkouts: 18,
          },
        ],
      },
    }, 'admin');

    expect(options).toEqual([
      {
        id: '101',
        name: 'Avery Stone',
        source: 'swanstudios',
        membership: 'premium',
        workouts: 18,
        lastWorkoutDate: undefined,
        nextSessionDate: undefined,
      },
    ]);
    expect(JSON.stringify(options)).not.toContain('avery@example.test');
  });

  it('normalizes trainer assignment payloads into assigned client options', () => {
    const options = toChallengeAudienceOptions({
      assignments: [
        {
          client: {
            id: 202,
            firstName: 'Mika',
            lastName: 'Rivera',
            clientSource: 'move_fitness',
            totalWorkouts: 7,
            nextSessionDate: '2026-07-01T12:00:00.000Z',
          },
        },
      ],
    }, 'trainer');

    expect(options).toEqual([
      {
        id: '202',
        name: 'Mika Rivera',
        source: 'move_fitness',
        membership: undefined,
        workouts: 7,
        lastWorkoutDate: undefined,
        nextSessionDate: '2026-07-01T12:00:00.000Z',
      },
    ]);
  });
});