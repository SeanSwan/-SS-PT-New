import { describe, expect, it } from 'vitest';
import type { Challenge } from '../../../hooks/useChallenges';
import {
  emptyChallengeCopy,
  emptyChallengeTitle,
  filterChallenges,
  formatChallengeCompletionDate,
  formatChallengeJoinImpact,
  formatChallengeWorkoutImpact,
  formatChallengeWorkoutSyncFallback,
  nextChallengeTab,
  sortChallengesForUser,
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
  currentProgress: 0,
  maxProgress: 10,
  progressUnit: 'sessions',
  progressLabel: '0 of 10 sessions',
  targetLabel: '10 sessions target',
  checkInsCount: 0,
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

  it('keeps empty-state copy status-specific, actionable, and workout-first', () => {
    expect(emptyChallengeTitle('active')).toBe('No live challenges');
    expect(emptyChallengeTitle('upcoming')).toBe('No upcoming challenges');
    expect(emptyChallengeTitle('completed')).toBe('No completed challenges');
    expect(emptyChallengeCopy('active')).toContain('Log your next workout');
    expect(emptyChallengeCopy('upcoming')).toContain('Log your next workout');
    expect(emptyChallengeCopy('completed')).toContain("Log today's workout");
    expect(emptyChallengeCopy('upcoming')).not.toMatch(/check back soon|get started/i);
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

  it('orders joined and in-progress challenges before public joinable cards', () => {
    const challenges: Challenge[] = [
      {
        ...baseChallenge,
        id: 'public-open',
        joined: false,
        progress: 0,
        participants: 8,
      },
      {
        ...baseChallenge,
        id: 'joined-started',
        joined: true,
        progress: 35,
        participants: 4,
      },
      {
        ...baseChallenge,
        id: 'joined-not-started',
        joined: true,
        progress: 0,
        participants: 2,
      },
    ];

    expect(sortChallengesForUser(challenges).map((item) => item.id)).toEqual([
      'joined-started',
      'joined-not-started',
      'public-open',
    ]);
  });

  it('keeps public ordering deterministic when days-left data is missing', () => {
    const challenges: Challenge[] = [
      {
        ...baseChallenge,
        id: 'smaller-public-card',
        title: 'Beta Sprint',
        joined: false,
        progress: 0,
        participants: 3,
      },
      {
        ...baseChallenge,
        id: 'larger-public-card',
        title: 'Alpha Sprint',
        joined: false,
        progress: 0,
        participants: 12,
      },
    ];

    expect(sortChallengesForUser(challenges).map((item) => item.id)).toEqual([
      'larger-public-card',
      'smaller-public-card',
    ]);
  });

  it('formats latest workout challenge impact without inventing missing movement', () => {
    expect(formatChallengeWorkoutImpact({
      delta: 45,
      progressUnit: 'minutes',
      currentProgress: 90,
    })).toBe('Last workout: +45 minutes');

    expect(formatChallengeWorkoutImpact({
      delta: 1,
      progressUnit: 'sessions',
    })).toBe('Last workout: +1 session');

    expect(formatChallengeWorkoutImpact({ delta: 0, progressUnit: 'minutes' })).toBeNull();
    expect(formatChallengeWorkoutImpact(null)).toBeNull();
  });

  it('explains what the next logged workout can sync for joined active challenges', () => {
    expect(formatChallengeWorkoutSyncFallback({
      ...baseChallenge,
      progressUnit: 'minutes',
      targetLabel: '150 minutes target',
    })).toBe('Next logged workout will sync completed workout minutes toward 150 minutes target.');

    expect(formatChallengeWorkoutSyncFallback({
      ...baseChallenge,
      progressUnit: 'sessions',
      targetLabel: '3 sessions target',
    })).toBe('Next logged workout will count toward 3 sessions target.');

    expect(formatChallengeWorkoutSyncFallback({
      ...baseChallenge,
      progressUnit: 'custom',
      targetLabel: '1 custom target',
    })).toBe('Next logged workout can update 1 custom target when challenge rules match.');
  });

  it('explains what joining will sync before a public challenge is joined', () => {
    expect(formatChallengeJoinImpact({
      ...baseChallenge,
      progressUnit: 'minutes',
      targetLabel: '150 minutes target',
    })).toBe('Join to sync completed workout minutes toward 150 minutes target.');

    expect(formatChallengeJoinImpact({
      ...baseChallenge,
      progressUnit: 'sessions',
      targetLabel: '3 sessions target',
    })).toBe('Join to turn completed workouts into 3 sessions target.');

    expect(formatChallengeJoinImpact({
      ...baseChallenge,
      progressUnit: 'custom',
      targetLabel: '1 custom target',
    })).toBe('Join to track 1 custom target from verified challenge activity.');
  });

  it('formats completed challenge dates without guessing invalid timestamps', () => {
    expect(formatChallengeCompletionDate('2026-06-29T15:30:00.000Z')).toBe('Completed Jun 29');
    expect(formatChallengeCompletionDate('not-a-date')).toBeNull();
    expect(formatChallengeCompletionDate(undefined)).toBeNull();
  });
});
