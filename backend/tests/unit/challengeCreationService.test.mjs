import { describe, expect, it } from 'vitest';
import {
  ChallengeCreationValidationError,
  buildChallengeCreatePayload,
} from '../../services/gamification/challengeCreationService.mjs';

const NOW = new Date('2026-06-28T20:00:00.000Z');
const FUTURE_DATES = {
  startDate: '2026-07-01T16:00:00.000Z',
  endDate: '2026-07-08T16:00:00.000Z',
};

describe('challenge creation service', () => {
  it('builds a governed create payload from a challenge template', () => {
    const payload = buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        templateId: 'challenge-template:team-squad-program-week',
        title: 'July Squad Program Week',
        description: 'A small team completes assigned sessions together with coach-visible accountability.',
        maxParticipants: 24,
        ...FUTURE_DATES,
      },
    });

    expect(payload).toMatchObject({
      title: 'July Squad Program Week',
      description: 'A small team completes assigned sessions together with coach-visible accountability.',
      challengeType: 'community',
      category: 'community_meetup',
      difficulty: 3,
      xpReward: 140,
      bonusXpReward: 0,
      maxParticipants: 24,
      maxProgress: 12,
      progressUnit: 'sessions',
      createdBy: 42,
      status: 'active',
      isPublic: true,
      isFeatured: false,
      isPremium: false,
      hasLeaderboard: false,
      leaderboardType: 'progress',
      allowTeams: true,
      maxTeamSize: 4,
    });
    expect(payload.requirements).toEqual([
      'Every squad member contributes completed workout sessions toward the team total.',
    ]);
    expect(payload.tags).toEqual(expect.arrayContaining(['team', 'squad', 'accountability', 'assigned-session', 'template:team']));
  });

  it('does not allow template rule fields to be overridden', () => {
    expect(() => buildChallengeCreatePayload({
      userId: 42,
      now: NOW,
      body: {
        templateId: 'challenge-template:consistency-7-day-flexibility',
        title: 'Override Attempt',
        description: 'The template rule should stay tied to the original workout signal.',
        challengeType: 'custom',
        category: 'gaming',
        progressUnit: 'points',
        maxProgress: 99,
        ...FUTURE_DATES,
      },
    })).toThrow('Template rule fields cannot be overridden');
  });

  it('preserves legacy manual creation when no template is supplied', () => {
    const payload = buildChallengeCreatePayload({
      userId: 7,
      now: NOW,
      body: {
        title: 'Three Session Draft',
        description: 'Draft a trainer-built challenge without using a template yet.',
        publishState: 'draft',
        challengeType: 'weekly',
        category: 'fitness',
        difficulty: 2,
        xpReward: 75,
        bonusXpReward: 5,
        maxProgress: 3,
        progressUnit: 'sessions',
        requirements: ['Complete three assigned sessions', 'Complete three assigned sessions'],
        tags: ['sessions', 'sessions', 'trainer'],
        isPublic: false,
        hasLeaderboard: false,
        ...FUTURE_DATES,
      },
    });

    expect(payload).toMatchObject({
      title: 'Three Session Draft',
      challengeType: 'weekly',
      category: 'fitness',
      status: 'draft',
      createdBy: 7,
      isPublic: false,
      hasLeaderboard: false,
    });
    expect(payload.requirements).toEqual(['Complete three assigned sessions']);
    expect(payload.tags).toEqual(['sessions', 'trainer']);
  });

  it('allows staff to explicitly opt into a scoped leaderboard', () => {
    const payload = buildChallengeCreatePayload({
      userId: 7,
      now: NOW,
      body: {
        title: 'Private Progress Board',
        description: 'Trainer chooses a scoreboard only for a scoped challenge that needs ranked progress.',
        publishState: 'draft',
        challengeType: 'weekly',
        category: 'fitness',
        difficulty: 2,
        xpReward: 75,
        maxProgress: 3,
        progressUnit: 'sessions',
        hasLeaderboard: true,
        leaderboardType: 'total_score',
        ...FUTURE_DATES,
      },
    });

    expect(payload).toMatchObject({
      title: 'Private Progress Board',
      status: 'draft',
      hasLeaderboard: true,
      leaderboardType: 'total_score',
    });
  });

});





