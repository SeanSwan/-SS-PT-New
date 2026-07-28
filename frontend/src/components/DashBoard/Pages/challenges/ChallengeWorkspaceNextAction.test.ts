import { describe, expect, it } from 'vitest';
import { buildChallengeWorkspaceNextAction } from './ChallengeWorkspaceNextAction';

const baseChallenge = {
  id: 'challenge-1',
  title: 'July Squad Spark',
  description: 'Draft campaign',
  challengeType: 'weekly',
  category: 'fitness',
  difficulty: 3,
  xpReward: 120,
  maxProgress: 3,
  progressUnit: 'sessions',
  startDate: '2026-07-06T12:00:00.000Z',
  endDate: '2026-07-13T12:00:00.000Z',
  status: 'draft',
  currentParticipants: 0,
  maxParticipants: 16,
  participants: [],
};

describe('buildChallengeWorkspaceNextAction', () => {
  it('sends staff to templates when no campaign exists yet', () => {
    expect(buildChallengeWorkspaceNextAction({
      templateCount: 6,
      challenges: [],
      submissionCount: 0,
    })).toMatchObject({
      title: 'Create the first challenge draft',
      targetTab: 'templates',
      actionLabel: 'Open Templates',
    });
  });

  it('prioritizes draft campaigns that still need a saved audience', () => {
    expect(buildChallengeWorkspaceNextAction({
      templateCount: 6,
      challenges: [baseChallenge],
      submissionCount: 0,
    })).toMatchObject({
      title: 'Add an audience before publishing',
      targetTab: 'audience',
      actionLabel: 'Open Audience',
      focusLabel: 'July Squad Spark',
    });
  });

  it('moves reviewable client submissions ahead of normal live monitoring', () => {
    expect(buildChallengeWorkspaceNextAction({
      templateCount: 6,
      challenges: [{ ...baseChallenge, status: 'active', currentParticipants: 4 }],
      submissionCount: 2,
    })).toMatchObject({
      title: 'Review client challenge submissions',
      targetTab: 'submissions',
      actionLabel: 'Open Submissions',
    });
  });

  it('waits for the client submission queue before sending staff to live impact', () => {
    expect(buildChallengeWorkspaceNextAction({
      templateCount: 6,
      challenges: [{ ...baseChallenge, status: 'active', startDate: '2000-01-01T12:00:00.000Z', currentParticipants: 4 }],
      submissionCount: 0,
      submissionsLoading: true,
    })).toMatchObject({
      title: 'Syncing client submission queue',
      targetTab: 'submissions',
      actionLabel: 'Open Submissions',
      disabled: true,
    });
  });
  it('points live campaigns to results once setup blockers are clear', () => {
    expect(buildChallengeWorkspaceNextAction({
      templateCount: 6,
      challenges: [{ ...baseChallenge, status: 'active', startDate: '2000-01-01T12:00:00.000Z', currentParticipants: 4 }],
      submissionCount: 0,
    })).toMatchObject({
      title: 'Inspect live challenge impact',
      targetTab: 'results',
      actionLabel: 'Open Results',
      focusLabel: 'July Squad Spark',
    });
  });

  it('keeps future-start active campaigns in scheduled launch monitoring', () => {
    expect(buildChallengeWorkspaceNextAction({
      templateCount: 6,
      challenges: [{ ...baseChallenge, status: 'active', startDate: '2999-01-01T12:00:00.000Z', currentParticipants: 4 }],
      submissionCount: 0,
    })).toMatchObject({
      title: 'Monitor scheduled challenge launch',
      targetTab: 'live',
      actionLabel: 'Open Live Challenges',
      focusLabel: 'July Squad Spark',
    });
  });
});