import { describe, expect, it } from 'vitest';
import { selectActiveChallengeSummary } from './HomeTabChallengeViewModel';

describe('HomeTabChallengeViewModel', () => {
  it('refuses demo challenge data as Home truth', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: true,
      challenges: [{ id: 'demo', title: 'Fake Challenge', status: 'active' }],
    })).toBeNull();
  });

  it('selects the joined active challenge from real challenge data', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: false,
      challenges: [
        { id: 'a', title: 'Open Challenge', status: 'active', progress: 15, daysLeft: 9, participants: 10 },
        { id: 'b', title: 'Joined Challenge', status: 'active', joined: true, progress: 67, daysLeft: 3, participants: 42, reward: '500 XP' },
      ],
    })).toEqual({
      id: 'b',
      title: 'Joined Challenge',
      progress: 67,
      daysLeft: 3,
      participants: 42,
      reward: '500 XP',
      joined: true,
    });
  });

  it('prioritizes the most actionable joined in-progress challenge for the Home rail', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: false,
      challenges: [
        {
          id: 'joined-idle',
          title: 'Joined But Idle',
          status: 'active',
          joined: true,
          progress: 0,
          daysLeft: 9,
          participants: 18,
          reward: '100 XP',
        },
        {
          id: 'joined-moving',
          title: 'Joined And Moving',
          status: 'active',
          joined: true,
          progress: 62,
          daysLeft: 2,
          participants: 12,
          reward: '300 XP',
          nextAction: 'Finish one more planned session',
        },
        {
          id: 'public-crowded',
          title: 'Crowded Public Challenge',
          status: 'active',
          progress: 84,
          daysLeft: 1,
          participants: 500,
        },
      ],
    })).toMatchObject({
      id: 'joined-moving',
      title: 'Joined And Moving',
      progress: 62,
      daysLeft: 2,
      joined: true,
      nextAction: 'Finish one more planned session',
    });
  });

  it('keeps stale completed participation rows behind active in-progress work', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: false,
      challenges: [
        {
          id: 'stale-completed-row',
          title: 'Already Completed',
          status: 'active',
          participantStatus: 'completed',
          joined: true,
          progress: 100,
          daysLeft: 1,
          participants: 20,
        },
        {
          id: 'still-training',
          title: 'Still Training',
          status: 'active',
          joined: true,
          progress: 55,
          daysLeft: 5,
          participants: 8,
        },
      ],
    })).toMatchObject({
      id: 'still-training',
      title: 'Still Training',
      progress: 55,
    });
  });

  it('does not mutate the incoming challenge order while selecting the Home card', () => {
    const challenges = [
      { id: 'z', title: 'Zeta', status: 'active', joined: true, progress: 0, daysLeft: 9 },
      { id: 'a', title: 'Alpha', status: 'active', joined: true, progress: 50, daysLeft: 1 },
    ];

    expect(selectActiveChallengeSummary({ challenges })).toMatchObject({ id: 'a' });
    expect(challenges.map((challenge) => challenge.id)).toEqual(['z', 'a']);
  });

  it('carries authoritative dashboard progress detail into the Home active challenge summary', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: false,
      challenges: [{
        id: 'minutes-week',
        title: '150-Minute Week',
        status: 'active',
        joined: true,
        progress: 0,
        daysLeft: 1,
        progressLabel: '0 of 150 minutes',
        checkInsCount: 0,
        nextAction: 'Stale top-level prompt',
        participants: 12,
        dashboardSummary: {
          progressPercentage: 30,
          progressLabel: '45 of 150 minutes',
          daysLeft: 5,
          checkInsCount: 2,
          nextAction: 'Log more workout minutes',
          lastWorkoutImpact: {
            progressUnit: 'minutes',
            delta: 45,
          },
        },
      }],
    })).toMatchObject({
      id: 'minutes-week',
      title: '150-Minute Week',
      progress: 30,
      daysLeft: 5,
      participants: 12,
      nextAction: 'Log more workout minutes',
      progressLabel: '45 of 150 minutes',
      checkInsCount: 2,
      impactLabel: 'Last workout added 45 minutes',
    });
  });

  it('summarizes latest workout active minutes, exercises, PRs, and assigned-session proof for Home', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: false,
      challenges: [{
        id: 'minutes-week',
        title: '150-Minute Week',
        status: 'active',
        joined: true,
        progress: 30,
        daysLeft: 5,
        participants: 12,
        dashboardSummary: {
          lastWorkoutImpact: {
            progressUnit: 'minutes',
            delta: 45,
            activeMinutes: 45,
            exercisesCompleted: 6,
            personalRecordCount: 1.6,
            assignedSession: true,
          },
        },
      }],
    })).toMatchObject({
      id: 'minutes-week',
      impactLabel: 'Last workout added 45 minutes | 45 active min | 6 exercises | 2 PRs | assigned session',
    });
  });

  it('keeps top-level challenge next action and latest workout impact when no dashboard summary exists', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: false,
      challenges: [{
        id: 'joined',
        title: 'Three Planned Sessions',
        status: 'active',
        joined: true,
        progress: 40,
        daysLeft: 5,
        participants: 8,
        reward: '150 XP',
        nextAction: 'Complete your next planned workout',
        lastWorkoutImpact: {
          occurredAt: '2026-06-29T15:30:00.000Z',
          progressUnit: 'sessions',
          delta: 1,
          currentProgress: 2,
        },
      }],
    })).toMatchObject({
      id: 'joined',
      title: 'Three Planned Sessions',
      progress: 40,
      daysLeft: 5,
      participants: 8,
      reward: '150 XP',
      joined: true,
      nextAction: 'Complete your next planned workout',
      impactLabel: 'Last workout added 1 session',
    });
  });

  it('derives a workout-session next action when a joined challenge has no backend prompt', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: false,
      challenges: [{
        id: 'sessions-challenge',
        title: 'Three Planned Sessions',
        status: 'active',
        joined: true,
        progress: 33,
        daysLeft: 4,
        participants: 6,
        reward: '250 XP',
        progressUnit: 'sessions',
      }],
    })).toMatchObject({
      id: 'sessions-challenge',
      nextAction: 'Complete your next planned workout to keep this challenge moving.',
    });
  });


  it('uses assigned workout next-action copy for assigned-session Home challenges', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: false,
      challenges: [{
        id: 'assigned-explicit',
        title: 'Three Assigned Sessions',
        status: 'active',
        joined: true,
        progress: 33,
        daysLeft: 4,
        participants: 6,
        reward: '250 XP',
        progressUnit: 'sessions',
        tags: ['assigned-session'],
        nextAction: 'Complete your next workout',
      }],
    })).toMatchObject({
      id: 'assigned-explicit',
      nextAction: 'Complete your next assigned workout.',
    });

    expect(selectActiveChallengeSummary({
      isDemoData: false,
      challenges: [{
        id: 'assigned-derived',
        title: 'Three Assigned Sessions',
        status: 'active',
        joined: true,
        progress: 33,
        daysLeft: 4,
        participants: 6,
        reward: '250 XP',
        progressUnit: 'assigned_sessions_completed',
      }],
    })).toMatchObject({
      id: 'assigned-derived',
      nextAction: 'Complete your next assigned workout to keep this challenge moving.',
    });
  });
  it('uses a join-oriented next action for active public challenges the client has not joined', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: false,
      challenges: [{
        id: 'public-minutes',
        title: '150-Minute Week',
        status: 'active',
        joined: false,
        progress: 0,
        daysLeft: 5,
        participants: 18,
        reward: '300 XP',
        progressUnit: 'minutes',
      }],
    })).toMatchObject({
      id: 'public-minutes',
      nextAction: 'Open Challenges to join this campaign.',
    });
  });
});
