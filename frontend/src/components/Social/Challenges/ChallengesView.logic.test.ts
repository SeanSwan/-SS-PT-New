import { describe, expect, it } from 'vitest';
import type { Challenge } from '../../../hooks/useChallenges';
import {
  emptyChallengeCopy,
  filterChallenges,
  nextChallengeTab,
  stripSeedMarker,
} from './ChallengesView.logic';

const baseChallenge: Challenge = {
  id: 'challenge-1',
  title: 'Strength Builder',
  description: 'Complete the weekly lift target',
  category: 'strength',
  status: 'active',
  progress: 25,
  participants: 12,
  reward: '250 XP',
  joined: false,
};

describe('ChallengesView logic helpers', () => {
  it('maps challenge tab keyboard shortcuts with wrapping', () => {
    expect(nextChallengeTab('active', 'ArrowRight')).toBe('upcoming');
    expect(nextChallengeTab('upcoming', 'ArrowDown')).toBe('completed');
    expect(nextChallengeTab('completed', 'ArrowRight')).toBe('active');
    expect(nextChallengeTab('active', 'ArrowLeft')).toBe('completed');
    expect(nextChallengeTab('completed', 'Home')).toBe('active');
    expect(nextChallengeTab('active', 'End')).toBe('completed');
    expect(nextChallengeTab('active', 'Tab')).toBeNull();
  });

  it('keeps empty-state copy status-specific and strips seed markers', () => {
    expect(emptyChallengeCopy('upcoming')).toContain('New challenges');
    expect(emptyChallengeCopy('completed')).toContain("haven't completed");
    expect(stripSeedMarker('Hydration streak [seed]')).toBe('Hydration streak');
    expect(stripSeedMarker(undefined)).toBe('');
  });

  it('filters by status and selected category without adding fallback records', () => {
    const challenges: Challenge[] = [
      baseChallenge,
      { ...baseChallenge, id: 'challenge-2', category: 'cardio' },
      { ...baseChallenge, id: 'challenge-3', status: 'upcoming' },
    ];

    expect(filterChallenges(challenges, 'active', 'all').map((item) => item.id)).toEqual([
      'challenge-1',
      'challenge-2',
    ]);
    expect(filterChallenges(challenges, 'active', 'strength').map((item) => item.id)).toEqual([
      'challenge-1',
    ]);
    expect(filterChallenges(challenges, 'completed', 'all')).toEqual([]);
  });
});
