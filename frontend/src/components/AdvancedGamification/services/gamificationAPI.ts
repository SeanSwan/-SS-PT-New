/**
 * 🎮 GAMIFICATION API SERVICE - USER-FACING
 * ==========================================
 * API service for user-facing gamification operations:
 * challenges, achievements, leaderboards, and user progress
 */

import type {
  Challenge,
  ChallengeListResponse,
  ChallengeDetailsResponse,
  ChallengeActionResponse,
  ChallengeListFilter,
  ParticipationRecord
} from '../types/challenge.types';

import type {
  Achievement,
  UserAchievementProgress,
  UserAchievementsResponse,
  AchievementUnlockResponse
} from '../types/achievement.types';

import type {
  GamificationDashboardResponse,
  LeaderboardResponse,
  GamificationUser,
  UserStatistics,
  GamificationResponse
} from '../types/gamification.types';

// ================================================================
// API CONFIGURATION
// ================================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
const ENDPOINTS = {
  // User Dashboard
  dashboard: '/gamification/dashboard',
  userProfile: '/gamification/profile',
  userStats: '/gamification/stats',
  
  // Challenges
  challenges: '/gamification/challenges',
  challengeDetails: (id: string) => `/gamification/challenges/${id}`,
  joinChallenge: (id: string) => `/gamification/challenges/${id}/join`,
  leaveChallenge: (id: string) => `/gamification/challenges/${id}/leave`,
  updateProgress: (id: string) => `/gamification/challenges/${id}/progress`,
  challengeLeaderboard: (id: string) => `/gamification/challenges/${id}/leaderboard`,
  
  // Achievements  
  achievements: '/gamification/achievements',
  userAchievements: '/gamification/achievements/user',
  achievementProgress: '/gamification/achievements/progress',
  unlockAchievement: (id: string) => `/gamification/achievements/${id}/unlock`,
  
  // Leaderboards
  leaderboards: '/gamification/leaderboards',
  globalLeaderboard: '/gamification/leaderboards/global',
  friendsLeaderboard: '/gamification/leaderboards/friends',
  challengeLeaderboards: '/gamification/leaderboards/challenges',
  
  // Social Features
  friends: '/gamification/social/friends',
  inviteChallenge: '/gamification/social/invite',
  shareAchievement: '/gamification/social/share',
  
  // User Actions
  updatePreferences: '/gamification/preferences',
  notifications: '/gamification/notifications',
  markNotificationRead: (id: string) => `/gamification/notifications/${id}/read`
};

// ================================================================
// HTTP CLIENT CONFIGURATION
// ================================================================

class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<GamificationResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.message || 'Request failed',
            details: data.details,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    }
  }
  
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<GamificationResponse<T>> {
    const url = params ? `${endpoint}?${new URLSearchParams(params).toString()}` : endpoint;
    return this.request<T>(url);
  }
  
  async post<T>(endpoint: string, data?: any): Promise<GamificationResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }
  
  async put<T>(endpoint: string, data?: any): Promise<GamificationResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined
    });
  }
  
  async delete<T>(endpoint: string): Promise<GamificationResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE'
    });
  }
}

const apiClient = new ApiClient(API_BASE_URL);

// ================================================================
// DASHBOARD & USER PROFILE
// ================================================================

/**
 * Get user's gamification dashboard data
 */
export const getDashboardData = async (): Promise<GamificationResponse<GamificationDashboardResponse>> => {
  return apiClient.get<GamificationDashboardResponse>(ENDPOINTS.dashboard);
};

/**
 * Get user's gamification profile
 */
export const getUserProfile = async (): Promise<GamificationResponse<GamificationUser>> => {
  return apiClient.get<GamificationUser>(ENDPOINTS.userProfile);
};

/**
 * Get user's statistics for a specific period
 */
export const getUserStatistics = async (
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'weekly'
): Promise<GamificationResponse<UserStatistics>> => {
  return apiClient.get<UserStatistics>(ENDPOINTS.userStats, { period });
};

/**
 * Update user's gamification preferences
 */
export const updateUserPreferences = async (
  preferences: Partial<GamificationUser['preferences']>
): Promise<GamificationResponse<GamificationUser>> => {
  return apiClient.put<GamificationUser>(ENDPOINTS.updatePreferences, { preferences });
};

// ================================================================
// CHALLENGES API
// ================================================================

/**
 * Get filtered list of challenges
 */
export const getChallenges = async (
  filters: Partial<ChallengeListFilter> = {}
): Promise<GamificationResponse<ChallengeListResponse>> => {
  const params = {
    page: filters.offset ? Math.floor(filters.offset / (filters.limit || 10)) : 0,
    limit: filters.limit || 10,
    sortBy: filters.sortBy || 'newest',
    sortOrder: filters.sortOrder || 'desc',
    ...(filters.type && { type: filters.type.join(',') }),
    ...(filters.difficulty && { difficulty: filters.difficulty.join(',') }),
    ...(filters.category && { category: filters.category.join(',') }),
    ...(filters.status && { status: filters.status.join(',') }),
    ...(filters.searchQuery && { search: filters.searchQuery }),
    ...(filters.dateRange && {
      startDate: filters.dateRange.start,
      endDate: filters.dateRange.end
    })
  };
  
  return apiClient.get<ChallengeListResponse>(ENDPOINTS.challenges, params);
};

/**
 * Get detailed information about a specific challenge
 */
export const getChallengeDetails = async (
  challengeId: string
): Promise<GamificationResponse<ChallengeDetailsResponse>> => {
  return apiClient.get<ChallengeDetailsResponse>(ENDPOINTS.challengeDetails(challengeId));
};

/**
 * Join a challenge
 */
export const joinChallenge = async (
  challengeId: string
): Promise<GamificationResponse<ChallengeActionResponse>> => {
  return apiClient.post<ChallengeActionResponse>(ENDPOINTS.joinChallenge(challengeId));
};

/**
 * Leave a challenge
 */
export const leaveChallenge = async (
  challengeId: string
): Promise<GamificationResponse<ChallengeActionResponse>> => {
  return apiClient.delete<ChallengeActionResponse>(ENDPOINTS.leaveChallenge(challengeId));
};

/**
 * Update progress for a challenge
 */
export const updateChallengeProgress = async (
  challengeId: string,
  progressData: {
    metric: string;
    value: number;
    source?: string;
  }
): Promise<GamificationResponse<ParticipationRecord>> => {
  return apiClient.post<ParticipationRecord>(
    ENDPOINTS.updateProgress(challengeId),
    progressData
  );
};

/**
 * Get challenge leaderboard
 */
export const getChallengeLeaderboard = async (
  challengeId: string,
  limit: number = 20
): Promise<GamificationResponse<LeaderboardResponse>> => {
  return apiClient.get<LeaderboardResponse>(
    ENDPOINTS.challengeLeaderboard(challengeId),
    { limit }
  );
};

// ================================================================
// ACHIEVEMENTS API
// ================================================================

/**
 * Get all available achievements
 */
export const getAchievements = async (
  filters: {
    category?: string[];
    tier?: string[];
    unlocked?: boolean;
    search?: string;
  } = {}
): Promise<GamificationResponse<Achievement[]>> => {
  const params = {
    ...(filters.category && { category: filters.category.join(',') }),
    ...(filters.tier && { tier: filters.tier.join(',') }),
    ...(filters.unlocked !== undefined && { unlocked: filters.unlocked.toString() }),
    ...(filters.search && { search: filters.search })
  };
  
  return apiClient.get<Achievement[]>(ENDPOINTS.achievements, params);
};

/**
 * Get user's achievement progress
 */
export const getUserAchievements = async (): Promise<GamificationResponse<UserAchievementsResponse>> => {
  return apiClient.get<UserAchievementsResponse>(ENDPOINTS.userAchievements);
};

/**
 * Get user's progress for specific achievements
 */
export const getAchievementProgress = async (
  achievementIds?: string[]
): Promise<GamificationResponse<UserAchievementProgress[]>> => {
  const params = achievementIds ? { ids: achievementIds.join(',') } : {};
  return apiClient.get<UserAchievementProgress[]>(ENDPOINTS.achievementProgress, params);
};

/**
 * Manually check and unlock achievements (triggered by user actions)
 */
export const checkAchievementUnlocks = async (): Promise<GamificationResponse<AchievementUnlockResponse[]>> => {
  return apiClient.post<AchievementUnlockResponse[]>('/gamification/achievements/check-unlocks');
};

// ================================================================
// LEADERBOARDS API
// ================================================================

/**
 * Get global leaderboard
 */
export const getGlobalLeaderboard = async (
  metric: 'xp' | 'challenges_completed' | 'streak' | 'achievements' = 'xp',
  period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'weekly',
  limit: number = 20
): Promise<GamificationResponse<LeaderboardResponse>> => {
  return apiClient.get<LeaderboardResponse>(ENDPOINTS.globalLeaderboard, {
    metric,
    period,
    limit
  });
};

/**
 * Get friends leaderboard
 */
export const getFriendsLeaderboard = async (
  metric: 'xp' | 'challenges_completed' | 'streak' | 'achievements' = 'xp',
  period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'weekly'
): Promise<GamificationResponse<LeaderboardResponse>> => {
  return apiClient.get<LeaderboardResponse>(ENDPOINTS.friendsLeaderboard, {
    metric,
    period
  });
};

/**
 * Get available leaderboards
 */
export const getLeaderboards = async (): Promise<GamificationResponse<{
  global: LeaderboardResponse[];
  friends: LeaderboardResponse[];
  challenges: LeaderboardResponse[];
}>> => {
  return apiClient.get(ENDPOINTS.leaderboards);
};

// ================================================================
// SOCIAL FEATURES API
// ================================================================

/**
 * Get user's friends list
 */
export const getFriends = async (): Promise<GamificationResponse<GamificationUser[]>> => {
  return apiClient.get<GamificationUser[]>(ENDPOINTS.friends);
};

/**
 * Invite friends to a challenge
 */
export const inviteToChallenge = async (
  challengeId: string,
  friendIds: string[],
  message?: string
): Promise<GamificationResponse<{ sent: number; failed: string[] }>> => {
  return apiClient.post(ENDPOINTS.inviteChallenge, {
    challengeId,
    friendIds,
    message
  });
};

/**
 * Share an achievement
 */
export const shareAchievement = async (
  achievementId: string,
  platform: 'facebook' | 'twitter' | 'instagram' | 'copy_link',
  message?: string
): Promise<GamificationResponse<{ shareUrl: string; shareText: string }>> => {
  return apiClient.post(ENDPOINTS.shareAchievement, {
    achievementId,
    platform,
    message
  });
};

// ================================================================
// NOTIFICATIONS API
// ================================================================

/**
 * Get user notifications
 */
export const getNotifications = async (
  limit: number = 20,
  unreadOnly: boolean = false
): Promise<GamificationResponse<any[]>> => {
  return apiClient.get(ENDPOINTS.notifications, { limit, unreadOnly });
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (
  notificationId: string
): Promise<GamificationResponse<{ success: boolean }>> => {
  return apiClient.put(ENDPOINTS.markNotificationRead(notificationId));
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async (): Promise<GamificationResponse<{ count: number }>> => {
  return apiClient.put('/gamification/notifications/mark-all-read');
};

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

/**
 * Handle API errors consistently
 */
export const handleApiError = (response: GamificationResponse<any>) => {
  if (!response.success && response.error) {
    console.error('Gamification API Error:', response.error);
    
    // You can add toast notifications here
    // toast.error(response.error.message);
    
    return response.error;
  }
  return null;
};

/**
 * Check if user is authenticated for gamification features
 */
export const isGamificationAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

/**
 * Get user ID from token (simple JWT decode)
 */
export const getCurrentUserId = (): string | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.sub || null;
  } catch {
    return null;
  }
};

// ================================================================
// MOCK DATA FALLBACKS (FOR DEVELOPMENT)
// ================================================================

/**
 * Use mock data when backend is not available
 */
export const useMockData = process.env.NODE_ENV === 'development' && 
                          process.env.REACT_APP_USE_MOCK_GAMIFICATION === 'true';

if (useMockData) {
  console.warn('🎮 Using mock gamification data for development');
}

// ================================================================
// EXPORT API CLIENT AND FUNCTIONS
// ================================================================

export {
  apiClient,
  ENDPOINTS
};

export default {
  // Dashboard
  getDashboardData,
  getUserProfile, 
  getUserStatistics,
  updateUserPreferences,
  
  // Challenges
  getChallenges,
  getChallengeDetails,
  joinChallenge,
  leaveChallenge,
  updateChallengeProgress,
  getChallengeLeaderboard,
  
  // Achievements
  getAchievements,
  getUserAchievements,
  getAchievementProgress,
  checkAchievementUnlocks,
  
  // Leaderboards
  getGlobalLeaderboard,
  getFriendsLeaderboard,
  getLeaderboards,
  
  // Social
  getFriends,
  inviteToChallenge,
  shareAchievement,
  
  // Notifications
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  
  // Utilities
  handleApiError,
  isGamificationAuthenticated,
  getCurrentUserId
};
