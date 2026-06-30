import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Challenge } from '../../../hooks/useChallenges';
import {
  buildChallengeShareCaption,
  shareCompletedChallengeToFeed,
} from './challengeSocialShare';

const completedChallenge: Challenge = {
  id: 'challenge-1',
  title: '150-Minute Week [seed]',
  description: 'Build consistent training minutes',
  category: 'strength',
  status: 'completed',
  progress: 100,
  participants: 18,
  reward: '250 XP',
  joined: true,
  currentProgress: 150,
  maxProgress: 150,
  progressUnit: 'minutes',
  progressLabel: '150 of 150 minutes',
  targetLabel: '150 minutes target',
  participantStatus: 'completed',
  completedAt: '2026-06-29T15:30:00.000Z',
  checkInsCount: 3,
  lastWorkoutImpact: {
    progressUnit: 'minutes',
    delta: 45,
    currentProgress: 150,
  },
};

const incompleteChallenge: Challenge = {
  ...completedChallenge,
  status: 'active',
  progress: 50,
  participantStatus: 'active',
  completedAt: undefined,
};

describe('challengeSocialShare', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a share caption from real completed challenge progress', () => {
    expect(buildChallengeShareCaption(completedChallenge)).toBe([
      'Challenge complete: 150-Minute Week',
      'Completed Jun 29',
      'Progress: 150 of 150 minutes',
      'Last workout: +45 minutes',
      'Reward earned: 250 XP',
      '#ChallengeComplete #SwanStudios',
    ].join('\n'));
  });

  it('allows participant-completed rows even when the public challenge is still active', () => {
    expect(buildChallengeShareCaption({
      ...completedChallenge,
      status: 'active',
      participantStatus: 'completed',
    })).toContain('Challenge complete: 150-Minute Week');
  });

  it('does not create share copy for incomplete or unjoined challenge rows', () => {
    expect(buildChallengeShareCaption(incompleteChallenge)).toBeNull();
    expect(buildChallengeShareCaption({ ...completedChallenge, joined: false })).toBeNull();
  });

  it('posts completed challenges to the social feed as challenge posts', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const post = vi.fn().mockResolvedValue({ data: { post: { id: 'post-1' } } });

    const shared = await shareCompletedChallengeToFeed({ post }, completedChallenge);

    expect(shared).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    const [url, formData, config] = post.mock.calls[0];
    expect(url).toBe('/api/social/posts');
    expect(formData.get('type')).toBe('challenge');
    expect(formData.get('challengeId')).toBe('challenge-1');
    expect(formData.get('content')).toContain('Challenge complete: 150-Minute Week');
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'swan:social-post-created',
    }));
  });

  it('does not post incomplete challenges', async () => {
    const post = vi.fn();

    const shared = await shareCompletedChallengeToFeed({ post }, incompleteChallenge);

    expect(shared).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });
});
