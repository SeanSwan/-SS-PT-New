import { vi } from 'vitest';

const toRow = (value) => ({
  ...value,
  toJSON: () => value,
});

export const makeParticipant = (overrides = {}) => toRow({
  id: overrides.id ?? `participant-${overrides.userId ?? 1}`,
  userId: overrides.userId ?? 1,
  status: overrides.status ?? 'active',
  teamId: overrides.teamId ?? null,
  currentProgress: overrides.currentProgress ?? 0,
  progressPercentage: overrides.progressPercentage ?? 0,
  score: overrides.score ?? 0,
  rank: overrides.rank ?? null,
  xpEarned: overrides.xpEarned ?? 0,
  bonusXpEarned: overrides.bonusXpEarned ?? 0,
  checkInsCount: overrides.checkInsCount ?? 0,
  startedAt: overrides.startedAt ?? null,
  lastProgressUpdate: overrides.lastProgressUpdate ?? null,
  updatedAt: overrides.updatedAt ?? null,
  progressHistory: overrides.progressHistory ?? [],
  joinedAt: overrides.joinedAt ?? '2026-07-01T10:00:00.000Z',
  completedAt: overrides.completedAt ?? null,
  user: overrides.user ?? {
    id: overrides.userId ?? 1,
    firstName: `Client${overrides.userId ?? 1}`,
    lastName: 'Training',
    username: `client${overrides.userId ?? 1}`,
    photo: null,
  },
});

export const makeChallenge = (overrides = {}) => toRow({
  id: overrides.id ?? 'challenge-1',
  title: overrides.title ?? 'July Squad Spark',
  description: overrides.description ?? 'Complete training sessions together.',
  challengeType: overrides.challengeType ?? 'weekly',
  category: overrides.category ?? 'fitness',
  difficulty: overrides.difficulty ?? 3,
  xpReward: overrides.xpReward ?? 250,
  maxProgress: overrides.maxProgress ?? 12,
  progressUnit: overrides.progressUnit ?? 'sessions',
  startDate: overrides.startDate ?? '2026-07-01T00:00:00.000Z',
  endDate: overrides.endDate ?? '2026-07-31T23:59:59.000Z',
  createdBy: overrides.createdBy ?? 44,
  status: overrides.status ?? 'active',
  isPublic: overrides.isPublic ?? false,
  viewCount: overrides.viewCount ?? 0,
  currentParticipants: overrides.currentParticipants ?? 99,
  maxParticipants: overrides.maxParticipants ?? 0,
  completionRate: overrides.completionRate ?? 0,
  averageProgress: overrides.averageProgress ?? 0,
  engagementScore: overrides.engagementScore ?? 0,
  participants: overrides.participants ?? [],
});

export const makeModels = (challenge, submissions = []) => ({
  Challenge: {
    findByPk: vi.fn(async () => challenge),
  },
  ChallengeSubmission: {
    findAll: vi.fn(async () => submissions.map(toRow)),
  },
  ChallengeParticipant: { name: 'ChallengeParticipant' },
  User: { name: 'User' },
});
