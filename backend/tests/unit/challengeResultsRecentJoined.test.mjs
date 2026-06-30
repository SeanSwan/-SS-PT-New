/**
 * Regression coverage for recent-join participant visibility in managed results.
 */

import { describe, expect, it } from 'vitest';
import { getManagedChallengeResults } from '../../services/gamification/challengeResultsService.mjs';
import { makeChallenge, makeModels, makeParticipant } from './challengeResultsTestFactory.mjs';

describe('challenge results recent joined participants', () => {
  it('lists participants by newest join time for staff follow-up', async () => {
    const challenge = makeChallenge({
      participants: [
        makeParticipant({
          id: 'joined-old',
          userId: 11,
          status: 'completed',
          joinedAt: '2026-07-04T12:00:00.000Z',
          progressPercentage: 100,
          user: { id: 11, firstName: 'Avery', lastName: 'Stone', username: 'avery', photo: null },
        }),
        makeParticipant({
          id: 'joined-new',
          userId: 12,
          status: 'active',
          joinedAt: '2026-07-10T12:00:00.000Z',
          progressPercentage: 25,
          user: { id: 12, firstName: 'Blair', lastName: 'Reed', username: 'blair', photo: null },
        }),
        makeParticipant({
          id: 'joined-mid',
          userId: 13,
          status: 'quit',
          joinedAt: '2026-07-08T12:00:00.000Z',
          progressPercentage: 10,
          user: { id: 13, firstName: 'Casey', lastName: 'Drop', username: 'casey', photo: null },
        }),
        {
          ...makeParticipant({
            id: 'no-join-time',
            userId: 14,
            status: 'joined',
            progressPercentage: 0,
            user: { id: 14, firstName: 'Mika', lastName: 'Rivera', username: 'mika', photo: null },
          }).toJSON(),
          joinedAt: null,
        },
      ],
    });

    const result = await getManagedChallengeResults({
      models: makeModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 44, role: 'trainer' },
      now: new Date('2026-07-11T12:00:00.000Z'),
    });

    expect(result.recentJoinedParticipants.map((participant) => [
      participant.displayName,
      participant.status,
      participant.joinedAt,
    ])).toEqual([
      ['Blair Reed', 'active', '2026-07-10T12:00:00.000Z'],
      ['Casey Drop', 'quit', '2026-07-08T12:00:00.000Z'],
      ['Avery Stone', 'completed', '2026-07-04T12:00:00.000Z'],
    ]);
  });
});