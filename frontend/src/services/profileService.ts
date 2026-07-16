import productionApiService from './api.service';
import type { AxiosResponse } from 'axios';
import type { FollowStats, SocialPost, UserProfile, UserStats } from './profileTypes';
import {
  normalizeFollowStats,
  profileServiceError,
  type BannerPhotoEnvelope,
  type FollowStatsEnvelope,
  type ProfileAchievementsEnvelope,
  type ProfileAchievementsPayload,
  type ProfilePhotoEnvelope,
  type UserPostsEnvelope,
  type UserProfileEnvelope,
  type UserStatsEnvelope,
} from './profileService.contracts';
export * from './profileBannerComposition';
export * from './profileTypes';

class ProfileService {
  async getCurrentProfile(): Promise<UserProfile> {
    try {
      const response: AxiosResponse<UserProfileEnvelope> = await productionApiService.get('/api/profile');
      
      if (response.data.success && response.data.user) {
        return response.data.user;
      }
      throw new Error(response.data.message || 'Failed to fetch profile');
    } catch (error: unknown) {
      throw profileServiceError('ProfileService: Error fetching current profile', error, 'Failed to fetch profile');
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const response: AxiosResponse<UserProfileEnvelope> = await productionApiService.get(`/api/profile/${userId}`);
      
      if (response.data.success && response.data.user) {
        return response.data.user;
      }
      throw new Error(response.data.message || 'Failed to fetch user profile');
    } catch (error: unknown) {
      throw profileServiceError('ProfileService: Error fetching user profile', error, 'Failed to fetch user profile');
    }
  }

  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response: AxiosResponse<UserProfileEnvelope> = await productionApiService.put('/api/profile', profileData);
      
      if (response.data.success && response.data.user) {
        return response.data.user;
      }
      throw new Error(response.data.message || 'Failed to update profile');
    } catch (error: unknown) {
      throw profileServiceError('ProfileService: Error updating profile', error, 'Failed to update profile');
    }
  }

  async uploadProfilePhoto(file: File): Promise<{ photoUrl: string; user: UserProfile }> {
    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);

      const response: AxiosResponse<ProfilePhotoEnvelope> = await productionApiService.post(
        '/api/profile/upload-profile-photo',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success && response.data.photoUrl && response.data.user) {
        return {
          photoUrl: response.data.photoUrl,
          user: response.data.user,
        };
      }
      throw new Error(response.data.message || 'Failed to upload profile photo');
    } catch (error: unknown) {
      throw profileServiceError('ProfileService: Error uploading profile photo', error, 'Failed to upload profile photo');
    }
  }

  async uploadBannerPhoto(file: File): Promise<{ bannerPhoto: string; user?: UserProfile }> {
    try {
      const formData = new FormData();
      formData.append('bannerPhoto', file);

      const response: AxiosResponse<BannerPhotoEnvelope> = await productionApiService.post(
        '/api/profile/upload-banner-photo',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const bannerPhoto = response.data.data?.bannerPhoto || response.data.bannerPhoto;
      const user = response.data.user || response.data.data?.user;
      if (response.data.success && bannerPhoto) {
        return { bannerPhoto, ...(user ? { user } : {}) };
      }
      throw new Error(response.data.message || 'Failed to upload banner photo');
    } catch (error: unknown) {
      throw profileServiceError('ProfileService: Error uploading banner photo', error, 'Failed to upload banner photo');
    }
  }

  async uploadBannerCollagePhoto(file: File): Promise<{ bannerPhoto: string }> {
    try {
      const formData = new FormData();
      formData.append('bannerPhoto', file);

      const response: AxiosResponse<BannerPhotoEnvelope> = await productionApiService.post(
        '/api/profile/upload-banner-collage-photo',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const bannerPhoto = response.data.data?.bannerPhoto || response.data.bannerPhoto;
      if (response.data.success && bannerPhoto) {
        return { bannerPhoto };
      }
      throw new Error(response.data.message || 'Failed to upload collage photo');
    } catch (error: unknown) {
      throw profileServiceError('ProfileService: Error uploading collage photo', error, 'Failed to upload collage photo');
    }
  }

  async getUserStats(): Promise<UserStats> {
    try {
      const response: AxiosResponse<UserStatsEnvelope> = await productionApiService.get('/api/profile/stats');
      
      if (response.data.success && response.data.stats) {
        return response.data.stats;
      }
      throw new Error(response.data.message || 'Failed to fetch user stats');
    } catch (error: unknown) {
      throw profileServiceError('ProfileService: Error fetching user stats', error, 'Failed to fetch user stats');
    }
  }

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
      const response: AxiosResponse<UserPostsEnvelope> = await productionApiService.get(url, {
        params: { limit, offset }
      });
      
      if (response.data.success && Array.isArray(response.data.posts) && response.data.pagination) {
        return {
          posts: response.data.posts,
          pagination: response.data.pagination
        };
      }
      throw new Error(response.data.message || 'Failed to fetch user posts');
    } catch (error: unknown) {
      throw profileServiceError('ProfileService: Error fetching user posts', error, 'Failed to fetch user posts');
    }
  }

  async getUserAchievements(): Promise<ProfileAchievementsPayload> {
    try {
      const response: AxiosResponse<ProfileAchievementsEnvelope> = await productionApiService.get('/api/profile/achievements');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch user achievements');
    } catch (error: unknown) {
      throw profileServiceError('ProfileService: Error fetching user achievements', error, 'Failed to fetch user achievements');
    }
  }

  async getFollowStats(): Promise<FollowStats> {
    try {
      const response: AxiosResponse<FollowStatsEnvelope> = await productionApiService.get('/api/profile/follow-stats');
      
      if (response.data.success && response.data.data) {
        return normalizeFollowStats(response.data.data);
      }
      throw new Error(response.data.message || 'Failed to fetch follow stats');
    } catch (error: unknown) {
      throw profileServiceError('ProfileService: Error fetching follow stats', error, 'Failed to fetch follow stats');
    }
  }

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

  getUsernameForDisplay(user: Partial<UserProfile>): string {
    if (user?.username && user.username !== user?.email && !user.username.includes('@')) {
      return user.username.toLowerCase();
    }
    
    if (user?.email && user.email.includes('@')) {
      return user.email.split('@')[0].toLowerCase();
    }
    
    return (user?.username || 'user').toLowerCase();
  }

  getUserInitials(user: Partial<UserProfile>): string {
    const name = this.getDisplayName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
}

const profileService = new ProfileService();
export default profileService;
