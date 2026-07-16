/**
 * FILE: profileService.contracts.ts
 * PURPOSE: Keep profile API envelope types, safe error conversion, and narrow
 * response normalization out of the runtime service implementation.
 */

import { isAxiosError } from 'axios';
import { logApiError } from '../utils/logApiError';
import type {
  Achievement,
  FollowStats,
  SocialPost,
  UserProfile,
  UserStats,
} from './profileTypes';

export interface ProfileApiEnvelope {
  success: boolean;
  message?: string;
}

export type UserProfileEnvelope = ProfileApiEnvelope & {
  user?: UserProfile;
  data?: UserProfile;
};

export type ProfilePhotoEnvelope = ProfileApiEnvelope & {
  photoUrl?: string;
  user?: UserProfile;
};

export type BannerPhotoEnvelope = ProfileApiEnvelope & {
  bannerPhoto?: string;
  user?: UserProfile;
  data?: {
    bannerPhoto?: string;
    user?: UserProfile;
  };
};

export type UserStatsEnvelope = ProfileApiEnvelope & {
  stats?: UserStats;
};

export interface UserPostsPayload {
  posts: SocialPost[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export type UserPostsEnvelope = ProfileApiEnvelope & Partial<UserPostsPayload>;

export interface ProfileAchievementUser {
  points?: number;
  level?: number;
  tier?: string;
  streakDays?: number;
  lastActivityDate?: string;
  totalWorkouts?: number;
  totalExercises?: number;
}

export interface ProfileAchievementsPayload {
  user: ProfileAchievementUser | null;
  achievements: Achievement[];
  stats: {
    totalAchievements: number;
    achievementsByRarity: Record<string, number>;
    currentStreak: number;
    totalPoints: number;
    currentLevel: number;
    currentTier: string;
  };
}

export type ProfileAchievementsEnvelope = ProfileApiEnvelope & {
  data?: ProfileAchievementsPayload;
};

export type FollowStatsEnvelope = ProfileApiEnvelope & {
  data?: Omit<FollowStats, 'ratio'> & { ratio: unknown };
};

interface ProfileErrorBody {
  message?: unknown;
}

export function profileServiceError(
  label: string,
  error: unknown,
  fallbackMessage: string,
): Error {
  logApiError(label, error);

  if (isAxiosError<ProfileErrorBody>(error)) {
    const serverMessage = error.response?.data?.message;
    if (typeof serverMessage === 'string' && serverMessage.trim()) {
      return new Error(serverMessage);
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return new Error(error.message);
  }

  return new Error(fallbackMessage);
}

export function normalizeFollowStats(
  followStats: Omit<FollowStats, 'ratio'> & { ratio: unknown },
): FollowStats {
  const ratio = Number(followStats.ratio);
  return {
    ...followStats,
    ratio: Number.isFinite(ratio) ? ratio : 0,
  };
}
