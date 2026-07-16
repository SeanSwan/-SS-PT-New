import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import { generateChallengeRecommendations } from './gamificationHelpers';
import type { Challenge } from '../types/challenge.types';
import type { GamificationUser } from '../types/gamification.types';

const baseUser: GamificationUser = {
  userId: 'client-1',
  username: 'client1',
  displayName: 'Client 1',
  level: 12,
  xpPoints: 1000,
  xpToNextLevel: 200,
  totalXpEarned: 2500,
  challengesJoined: 0,
  challengesCompleted: 0,
  challengesWon: 0,
  completionRate: 0,
  achievementsUnlocked: 0,
  totalAchievementPoints: 0,
  prestigeLevel: 0,
  rareAchievements: 0,
  currentStreak: 0,
  longestStreak: 0,
  streakFreezesUsed: 0,
  streakFreezesRemaining: 0,
  friendsCount: 0,
  followersCount: 0,
  challengeInvitesSent: 0,
  socialShares: 0,
  subscriptionTier: 'pro',
  premiumFeatures: [],
  lastActive: '2026-01-01T00:00:00.000Z',
  joinedAt: '2026-01-01T00:00:00.000Z',
  totalSessions: 0,
  averageSessionDuration: 0,
  preferences: {
    categories: ['strength', 'cardio'],
    difficulty: 'auto',
    notifications: true,
    privacy: 'private',
    theme: 'dark',
  },
};

const makeChallenge = (id: string, overrides: Partial<Challenge> = {}): Challenge => ({
  id,
  title: id,
  description: `${id} challenge`,
  shortDescription: `${id} short`,
  type: 'weekly',
  category: 'strength',
  difficulty: 'intermediate',
  status: 'active',
  targets: [],
  prerequisites: [],
  isPublic: true,
  requiresApproval: false,
  allowLateJoin: true,
  maxParticipants: undefined,
  allowTeams: false,
  enableLeaderboard: true,
  enableComments: false,
  createdBy: 'admin-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  participationData: [],
  duration: {
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.000Z',
    durationDays: 365,
    timezone: 'UTC',
    isRecurring: false,
  },
  rewards: {
    xpPoints: 100,
    celebrationMessage: 'Complete',
    isExclusive: false,
  },
  progressData: {
    totalParticipants: 10,
    activeParticipants: 10,
    completedParticipants: 0,
    averageProgress: 0,
    completionRate: 0,
    participationTrend: [],
  },
  engagementMetrics: {
    views: 0,
    likes: 0,
    shares: 0,
    comments: 0,
  },
  version: 1,
  isTemplate: false,
  tags: [],
  searchKeywords: [],
  ...overrides,
});

describe('gamification helper deterministic recommendation scoring', () => {
  it('does not use random variety to reorder challenge recommendations', () => {
    const challenges = [
      makeChallenge('alpha', { rewards: { xpPoints: 120 }, progressData: { totalParticipants: 12 } }),
      makeChallenge('bravo', { rewards: { xpPoints: 120 }, progressData: { totalParticipants: 12 } }),
      makeChallenge('charlie', { rewards: { xpPoints: 120 }, progressData: { totalParticipants: 12 } }),
    ];

    const first = generateChallengeRecommendations(challenges, baseUser, 3).map(challenge => challenge.id);
    const second = generateChallengeRecommendations([...challenges].reverse(), baseUser, 3).map(challenge => challenge.id);

    expect(first).toEqual(second);

    const helperSource = readFileSync(resolve(__dirname, './gamificationHelpers.ts'), 'utf-8');
    expect(helperSource).not.toContain('Math.random()');
    expect(helperSource).not.toContain('Placeholder for variety score');
  });
});
