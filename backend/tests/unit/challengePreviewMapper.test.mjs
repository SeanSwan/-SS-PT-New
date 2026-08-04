/**
 * challengePreviewMapper — contract tests (SWA-115, 2026-08-04).
 * Locks the canonical→social adapter shape the client dashboards consume
 * (ClientObservatoryHome + ClientCommunityPage read title/description/progress/
 * daysRemaining; ChallengePreview also allows name/currentProgress/target/participants).
 */
import { describe, it, expect } from 'vitest';
import { mapChallengeToSocialPreview } from '../../routes/social/challengePreviewMapper.mjs';

const NOW = new Date('2026-08-04T00:00:00Z');

const canonicalChallenge = {
  id: 'c-1',
  title: '30-Day Consistency',
  description: 'Train 5x/week',
  category: 'fitness',
  status: 'active',
  startDate: '2026-08-01T00:00:00Z',
  endDate: '2026-08-11T12:00:00Z',
  maxProgress: 20,
  progressUnit: 'workouts',
  currentParticipants: 7,
};

describe('mapChallengeToSocialPreview', () => {
  it('maps the canonical dialect to the page shape (title AND legacy name alias)', () => {
    const p = mapChallengeToSocialPreview(canonicalChallenge, null, NOW);
    expect(p.title).toBe('30-Day Consistency');
    expect(p.name).toBe('30-Day Consistency');
    expect(p.target).toBe(20);
    expect(p.unit).toBe('workouts');
    expect(p.participants).toBe(7);
    expect(p.isParticipating).toBe(false);
    expect(p.progress).toBe(0);
  });

  it('computes daysRemaining with ceil and never negative', () => {
    expect(mapChallengeToSocialPreview(canonicalChallenge, null, NOW).daysRemaining).toBe(8);
    const past = { ...canonicalChallenge, endDate: '2026-08-01T00:00:00Z' };
    expect(mapChallengeToSocialPreview(past, null, NOW).daysRemaining).toBe(0);
    const noEnd = { ...canonicalChallenge, endDate: null };
    expect(mapChallengeToSocialPreview(noEnd, null, NOW).daysRemaining).toBe(0);
  });

  it('prefers stored progressPercentage, clamped to [0,100]', () => {
    const p = mapChallengeToSocialPreview(
      canonicalChallenge,
      { currentProgress: 4, progressPercentage: 137 },
      NOW,
    );
    expect(p.progress).toBe(100);
    expect(p.currentProgress).toBe(4);
    expect(p.isParticipating).toBe(true);
  });

  it('derives percent from currentProgress/maxProgress when percentage is absent', () => {
    const p = mapChallengeToSocialPreview(
      canonicalChallenge,
      { currentProgress: 5, progressPercentage: null },
      NOW,
    );
    expect(p.progress).toBe(25); // 5/20
  });

  it('never emits NaN for degenerate rows (maxProgress 0/undefined, junk numbers)', () => {
    const degenerate = { ...canonicalChallenge, maxProgress: 0, currentParticipants: undefined };
    const p = mapChallengeToSocialPreview(degenerate, { currentProgress: 'junk', progressPercentage: 'junk' }, NOW);
    expect(p.target).toBe(0);
    expect(p.participants).toBe(0);
    expect(p.progress).toBe(0);
    expect(p.currentProgress).toBe(0);
    expect(Number.isNaN(p.daysRemaining)).toBe(false);
  });
});
