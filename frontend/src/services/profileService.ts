/**
 * Profile Service
 * ================
 * Service for user profile management and social features
 * Connects to SwanStudios backend PostgreSQL database
 */

import productionApiService from './api.service';
import { AxiosResponse } from 'axios';

// Types for profile data
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

/**
 * Profile Service Class
 */
class ProfileService {
  /**
   * Get current user profile
   */
  async getCurrentProfile(): Promise<UserProfile> {
    try {
      const response: AxiosResponse = await productionApiService.get('/api/profile');
      
      if (response.data.success) {
        return response.data.user;
      } else {
        throw new Error(response.data.message || 'Failed to fetch profile');
      }
    } catch (error: any) {
      console.error('ProfileService: Error fetching current profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch profile');
    }
  }

  /**
   * Get specific user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const response: AxiosResponse = await productionApiService.get(`/api/profile/${userId}`);
      
      if (response.data.success) {
        return response.data.user;
      } else {
        throw new Error(response.data.message || 'Failed to fetch user profile');
      }
    } catch (error: any) {
      console.error('ProfileService: Error fetching user profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch user profile');
    }
  }

  /**
   * Update current user profile
   */
  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response: AxiosResponse = await productionApiService.put('/api/profile', profileData);
      
      if (response.data.success) {
        return response.data.user;
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('ProfileService: Error updating profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(file: File): Promise<{ photoUrl: string; user: UserProfile }> {
    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);

      const response: AxiosResponse = await productionApiService.post(
        '/api/profile/upload-profile-photo',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        return {
          photoUrl: response.data.photoUrl,
          user: response.data.user,
        };
      } else {
        throw new Error(response.data.message || 'Failed to upload photo');
      }
    } catch (error: any) {
      console.error('ProfileService: Error uploading profile photo:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload profile photo');
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const response: AxiosResponse = await productionApiService.get('/api/profile/stats');
      
      if (response.data.success) {
        return response.data.stats;
      } else {
        throw new Error(response.data.message || 'Failed to fetch user stats');
      }
    } catch (error: any) {
      console.error('ProfileService: Error fetching user stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch user stats');
    }
  }

  /**
   * Get user posts
   */
  async getUserPosts(userId?: string, limit: number = 20, offset: number = 0): Promise<{
    posts: SocialPost[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  }> {
    try {
      const url = userId ? `/api/profile/${userId}/posts` : '/api/profile/posts';
      const response: AxiosResponse = await productionApiService.get(url, {
        params: { limit, offset }
      });
      
      if (response.data.success) {
        return {
          posts: response.data.posts,
          pagination: response.data.pagination
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch user posts');
      }
    } catch (error: any) {
      console.error('ProfileService: Error fetching user posts:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch user posts');
    }
  }

  /**
   * Get user achievements and gamification data
   */
  async getUserAchievements(): Promise<{
    user: {
      points: number;
      level: number;
      tier: string;
      streakDays: number;
      lastActivityDate: string;
      totalWorkouts: number;
      totalExercises: number;
      exercisesCompleted: any;
    };
    achievements: Achievement[];
    stats: {
      totalAchievements: number;
      achievementsByRarity: Record<string, number>;
      currentStreak: number;
      totalPoints: number;
      currentLevel: number;
      currentTier: string;
    };
  }> {
    try {
      const response: AxiosResponse = await productionApiService.get('/api/profile/achievements');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch user achievements');
      }
    } catch (error: any) {
      console.error('ProfileService: Error fetching user achievements:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch user achievements');
    }
  }

  /**
   * Get user follow statistics
   */
  async getFollowStats(): Promise<FollowStats> {
    try {
      const response: AxiosResponse = await productionApiService.get('/api/profile/follow-stats');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch follow stats');
      }
    } catch (error: any) {
      console.error('ProfileService: Error fetching follow stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch follow stats');
    }
  }

  /**
   * Upload general image (for posts, background, etc.)
   */
  async uploadImage(file: File, type: 'profile' | 'background' | 'post' = 'post'): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);

      const response: AxiosResponse = await productionApiService.post(
        '/api/upload/image',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        return response.data.imageUrl;
      } else {
        throw new Error(response.data.message || 'Failed to upload image');
      }
    } catch (error: any) {
      console.error('ProfileService: Error uploading image:', error);
      
      // For development, return a placeholder
      if (process.env.NODE_ENV === 'development') {
        return URL.createObjectURL(file);
      }
      
      throw new Error(error.response?.data?.message || 'Failed to upload image');
    }
  }

  /**
   * Get display name from user data
   */
  getDisplayName(user: Partial<UserProfile>): string {
    if (user?.firstName && user?.lastName && 
        user.firstName.trim() !== '' && user.lastName.trim() !== '') {
      return `${user.firstName.trim()} ${user.lastName.trim()}`;
    }
    
    if (user?.username && user.username !== user?.email && 
        user.username.trim() !== '' && !user.username.includes('@')) {
      return user.username.trim();
    }
    
    if (user?.email && user.email.includes('@')) {
      return user.email.split('@')[0];
    }
    
    return user?.username || 'User';
  }

  /**
   * Get username for display
   */
  getUsernameForDisplay(user: Partial<UserProfile>): string {
    if (user?.username && user.username !== user?.email && !user.username.includes('@')) {
      return user.username.toLowerCase();
    }
    
    if (user?.email && user.email.includes('@')) {
      return user.email.split('@')[0].toLowerCase();
    }
    
    return (user?.username || 'user').toLowerCase();
  }

  /**
   * Get user initials
   */
  getUserInitials(user: Partial<UserProfile>): string {
    const name = this.getDisplayName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
}

// Create and export singleton instance
const profileService = new ProfileService();
export default profileService;

// Export for compatibility
export { ProfileService };
