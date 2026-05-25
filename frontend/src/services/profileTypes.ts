/**
 * profileTypes
 * ============
 * Shared user profile, social feed, achievement, and follow-stat contracts for
 * the profile API client and dashboard consumers.
 */

import type {
  BannerCollageLayout,
  BannerObjectFit,
  BannerObjectPosition,
  BannerPreset,
} from './profileBannerComposition';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone?: string;
  photo?: string;
  role: 'user' | 'client' | 'trainer' | 'admin';
  dateOfBirth?: string;
  gender?: string;
  weight?: number;
  height?: number;
  fitnessGoal?: string;
  trainingExperience?: string;
  healthConcerns?: string;
  emergencyContact?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  preferences?: string;
  bannerPhoto?: string;
  bannerObjectPosition?: BannerObjectPosition;
  bannerObjectFit?: BannerObjectFit;
  bannerImageScale?: number;
  bannerFrameHeight?: number;
  bannerCollagePhotos?: string[];
  bannerCollageLayout?: BannerCollageLayout;
  bannerStickyCarousel?: boolean;
  bannerPresets?: BannerPreset[];
  bio?: string;
  city?: string;
  state?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  chartVisibility?: Record<string, boolean>;
  points?: number;
  level?: number;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  streakDays?: number;
  totalWorkouts?: number;
  totalExercises?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  posts: number;
  followers: number;
  following: number;
  workouts: number;
  streak: number;
  points: number;
  level: number;
  tier: string;
}

export interface SocialPost {
  id: string;
  userId: string;
  content: string;
  type: 'general' | 'workout' | 'achievement' | 'challenge' | 'milestone';
  visibility: 'public' | 'friends' | 'private';
  mediaUrl?: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photo?: string;
    role: string;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: string;
  earnedAt: string;
}

export interface FollowStats {
  followers: {
    count: number;
    list: Array<{
      id: string;
      firstName: string;
      lastName: string;
      username: string;
      photo?: string;
      role: string;
      followedAt: string;
      friendshipId: string;
    }>;
  };
  following: {
    count: number;
    list: Array<{
      id: string;
      firstName: string;
      lastName: string;
      username: string;
      photo?: string;
      role: string;
      followedAt: string;
      friendshipId: string;
    }>;
  };
  ratio: number;
}
