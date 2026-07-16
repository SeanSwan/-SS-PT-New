/**
 * 🔧 ADMIN GAMIFICATION API SERVICE - MANAGEMENT OPERATIONS
 * =========================================================
 * API service for admin gamification management:
 * CRUD operations for challenges, achievements, user management, and analytics
 */

import type {
  Challenge,
  CreateChallengeRequest,
  UpdateChallengeRequest,
  ChallengeTemplate,
  BulkChallengeAction,
  ChallengeAnalytics,
  ChallengeListResponse,
  ChallengeListFilter
} from '../types/challenge.types';

import type {
  Achievement,
  CreateAchievementRequest,
  UpdateAchievementRequest,
  AchievementTemplate,
  ManualAchievementGrant,
  AchievementAnalytics
} from '../types/achievement.types';

import type {
  GamificationUser,
  SystemStatistics,
  GamificationSettings,
  GamificationResponse
} from '../types/gamification.types';

// ================================================================
// ADMIN API ENDPOINTS
// ================================================================

const ADMIN_ENDPOINTS = {
  // Challenge Management
  createChallenge: '/admin/gamification/challenges',
  updateChallenge: (id: string) => `/admin/gamification/challenges/${id}`,
  deleteChallenge: (id: string) => `/admin/gamification/challenges/${id}`,
  publishChallenge: (id: string) => `/admin/gamification/challenges/${id}/publish`,
  archiveChallenge: (id: string) => `/admin/gamification/challenges/${id}/archive`,
  duplicateChallenge: (id: string) => `/admin/gamification/challenges/${id}/duplicate`,
  bulkChallengeAction: '/admin/gamification/challenges/bulk',
  
  // Challenge Templates
  challengeTemplates: '/admin/gamification/challenge-templates',
  createChallengeTemplate: '/admin/gamification/challenge-templates',
  updateChallengeTemplate: (id: string) => `/admin/gamification/challenge-templates/${id}`,
  deleteChallengeTemplate: (id: string) => `/admin/gamification/challenge-templates/${id}`,
  
  // Challenge Analytics
  challengeAnalytics: (id: string) => `/admin/gamification/challenges/${id}/analytics`,
  challengeParticipants: (id: string) => `/admin/gamification/challenges/${id}/participants`,
  challengeEngagement: (id: string) => `/admin/gamification/challenges/${id}/engagement`,
  
  // Achievement Management
  createAchievement: '/admin/gamification/achievements',
  updateAchievement: (id: string) => `/admin/gamification/achievements/${id}`,
  deleteAchievement: (id: string) => `/admin/gamification/achievements/${id}`,
  achievementTemplates: '/admin/gamification/achievement-templates',
  grantAchievement: '/admin/gamification/achievements/grant',
  revokeAchievement: '/admin/gamification/achievements/revoke',
  
  // User Management
  gamificationUsers: '/admin/gamification/users',
  userDetails: (id: string) => `/admin/gamification/users/${id}`,
  updateUserProgress: (id: string) => `/admin/gamification/users/${id}/progress`,
  resetUserProgress: (id: string) => `/admin/gamification/users/${id}/reset`,
  banUser: (id: string) => `/admin/gamification/users/${id}/ban`,
  unbanUser: (id: string) => `/admin/gamification/users/${id}/unban`,
  
  // System Management
  systemStats: '/admin/gamification/system/stats',
  systemSettings: '/admin/gamification/system/settings',
  updateSystemSettings: '/admin/gamification/system/settings',
  systemHealth: '/admin/gamification/system/health',
  
  // Analytics & Reports
  overviewAnalytics: '/admin/gamification/analytics/overview',
  userEngagementAnalytics: '/admin/gamification/analytics/engagement',
  challengePerformanceAnalytics: '/admin/gamification/analytics/challenge-performance',
  achievementAnalytics: '/admin/gamification/analytics/achievements',
  exportReport: '/admin/gamification/reports/export',
  
  // Moderation
  reportedContent: '/admin/gamification/moderation/reported',
  moderateContent: (id: string) => `/admin/gamification/moderation/${id}`,
  flaggedUsers: '/admin/gamification/moderation/users',
  
  // Content Management
  featuredChallenges: '/admin/gamification/featured-challenges',
  promotedAchievements: '/admin/gamification/promoted-achievements',
  communityHighlights: '/admin/gamification/community-highlights'
};

// ================================================================
// ADMIN API CLIENT (EXTENDS BASE CLIENT)
// ================================================================

import { apiClient } from './gamificationAPI';

class AdminApiClient {
  private baseClient = apiClient;
  
  private async adminRequest<T>(endpoint: string, options: RequestInit = {}) {
    // Ensure admin role is checked
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Admin authentication required');
    }
    
    // Add admin headers
    const adminOptions = {
      ...options,
      headers: {
        ...options.headers,
        'X-Admin-Request': 'true'
      }
    };
    
    return this.baseClient.get<T>(endpoint, adminOptions as any);
  }
  
  async get<T>(endpoint: string, params?: Record<string, any>) {
    return this.baseClient.get<T>(endpoint, params);
  }
  
  async post<T>(endpoint: string, data?: any) {
    return this.baseClient.post<T>(endpoint, data);
  }
  
  async put<T>(endpoint: string, data?: any) {
    return this.baseClient.put<T>(endpoint, data);
  }
  
  async delete<T>(endpoint: string) {
    return this.baseClient.delete<T>(endpoint);
  }
}

const adminApiClient = new AdminApiClient();

// ================================================================
// CHALLENGE MANAGEMENT API
// ================================================================

/**
 * Create a new challenge
 */
export const createChallenge = async (
  challengeData: CreateChallengeRequest
): Promise<GamificationResponse<Challenge>> => {
  return adminApiClient.post<Challenge>(ADMIN_ENDPOINTS.createChallenge, challengeData);
};

/**
 * Update an existing challenge
 */
export const updateChallenge = async (
  challengeId: string,
  updates: UpdateChallengeRequest
): Promise<GamificationResponse<Challenge>> => {
  return adminApiClient.put<Challenge>(
    ADMIN_ENDPOINTS.updateChallenge(challengeId),
    updates
  );
};

/**
 * Delete a challenge
 */
export const deleteChallenge = async (
  challengeId: string
): Promise<GamificationResponse<{ success: boolean }>> => {
  return adminApiClient.delete(ADMIN_ENDPOINTS.deleteChallenge(challengeId));
};

/**
 * Publish a draft challenge
 */
export const publishChallenge = async (
  challengeId: string
): Promise<GamificationResponse<Challenge>> => {
  return adminApiClient.post<Challenge>(ADMIN_ENDPOINTS.publishChallenge(challengeId));
};

/**
 * Archive a challenge
 */
export const archiveChallenge = async (
  challengeId: string
): Promise<GamificationResponse<Challenge>> => {
  return adminApiClient.post<Challenge>(ADMIN_ENDPOINTS.archiveChallenge(challengeId));
};

/**
 * Duplicate a challenge
 */
export const duplicateChallenge = async (
  challengeId: string,
  modifications?: Partial<CreateChallengeRequest>
): Promise<GamificationResponse<Challenge>> => {
  return adminApiClient.post<Challenge>(
    ADMIN_ENDPOINTS.duplicateChallenge(challengeId),
    { modifications }
  );
};

/**
 * Perform bulk actions on challenges
 */
export const bulkChallengeActions = async (
  action: BulkChallengeAction
): Promise<GamificationResponse<{ 
  successful: string[]; 
  failed: { id: string; error: string }[] 
}>> => {
  return adminApiClient.post(ADMIN_ENDPOINTS.bulkChallengeAction, action);
};

/**
 * Get all challenges with admin filters
 */
export const getAdminChallenges = async (
  filters: Partial<ChallengeListFilter & {
    createdBy?: string;
    status?: ('draft' | 'active' | 'paused' | 'completed' | 'archived')[];
    hasParticipants?: boolean;
    needsReview?: boolean;
  }> = {}
): Promise<GamificationResponse<ChallengeListResponse>> => {
  return adminApiClient.get<ChallengeListResponse>('/admin/gamification/challenges', filters);
};

// ================================================================
// CHALLENGE TEMPLATES API
// ================================================================

/**
 * Get all challenge templates
 */
export const getChallengeTemplates = async (): Promise<GamificationResponse<ChallengeTemplate[]>> => {
  return adminApiClient.get<ChallengeTemplate[]>(ADMIN_ENDPOINTS.challengeTemplates);
};

/**
 * Create a challenge template
 */
export const createChallengeTemplate = async (
  templateData: {
    name: string;
    description: string;
    category: string;
    difficulty: string;
    templateData: Partial<CreateChallengeRequest>;
  }
): Promise<GamificationResponse<ChallengeTemplate>> => {
  return adminApiClient.post<ChallengeTemplate>(
    ADMIN_ENDPOINTS.createChallengeTemplate,
    templateData
  );
};

/**
 * Update a challenge template
 */
export const updateChallengeTemplate = async (
  templateId: string,
  updates: Partial<ChallengeTemplate>
): Promise<GamificationResponse<ChallengeTemplate>> => {
  return adminApiClient.put<ChallengeTemplate>(
    ADMIN_ENDPOINTS.updateChallengeTemplate(templateId),
    updates
  );
};

/**
 * Delete a challenge template
 */
export const deleteChallengeTemplate = async (
  templateId: string
): Promise<GamificationResponse<{ success: boolean }>> => {
  return adminApiClient.delete(ADMIN_ENDPOINTS.deleteChallengeTemplate(templateId));
};

// ================================================================
// CHALLENGE ANALYTICS API
// ================================================================

/**
 * Get detailed analytics for a challenge
 */
export const getChallengeAnalytics = async (
  challengeId: string,
  period?: { startDate: string; endDate: string }
): Promise<GamificationResponse<ChallengeAnalytics>> => {
  return adminApiClient.get<ChallengeAnalytics>(
    ADMIN_ENDPOINTS.challengeAnalytics(challengeId),
    period
  );
};

/**
 * Get challenge participant details
 */
export const getChallengeParticipants = async (
  challengeId: string,
  filters?: {
    status?: string[];
    sortBy?: 'progress' | 'joinedAt' | 'lastActive';
    limit?: number;
    offset?: number;
  }
): Promise<GamificationResponse<{
  participants: any[];
  total: number;
  stats: {
    active: number;
    completed: number;
    abandoned: number;
  };
}>> => {
  return adminApiClient.get(ADMIN_ENDPOINTS.challengeParticipants(challengeId), filters);
};

/**
 * Get challenge engagement metrics
 */
export const getChallengeEngagement = async (
  challengeId: string
): Promise<GamificationResponse<{
  views: number;
  joinRate: number;
  completionRate: number;
  socialShares: number;
  comments: number;
  averageRating: number;
}>> => {
  return adminApiClient.get(ADMIN_ENDPOINTS.challengeEngagement(challengeId));
};

// ================================================================
// ACHIEVEMENT MANAGEMENT API
// ================================================================

/**
 * Create a new achievement
 */
export const createAchievement = async (
  achievementData: CreateAchievementRequest
): Promise<GamificationResponse<Achievement>> => {
  return adminApiClient.post<Achievement>(ADMIN_ENDPOINTS.createAchievement, achievementData);
};

/**
 * Update an existing achievement
 */
export const updateAchievement = async (
  achievementId: string,
  updates: UpdateAchievementRequest
): Promise<GamificationResponse<Achievement>> => {
  return adminApiClient.put<Achievement>(
    ADMIN_ENDPOINTS.updateAchievement(achievementId),
    updates
  );
};

/**
 * Delete an achievement
 */
export const deleteAchievement = async (
  achievementId: string
): Promise<GamificationResponse<{ success: boolean }>> => {
  return adminApiClient.delete(ADMIN_ENDPOINTS.deleteAchievement(achievementId));
};

/**
 * Get achievement templates
 */
export const getAchievementTemplates = async (): Promise<GamificationResponse<AchievementTemplate[]>> => {
  return adminApiClient.get<AchievementTemplate[]>(ADMIN_ENDPOINTS.achievementTemplates);
};

/**
 * Manually grant an achievement to a user
 */
export const grantAchievementToUser = async (
  grantData: ManualAchievementGrant
): Promise<GamificationResponse<{ success: boolean; message: string }>> => {
  return adminApiClient.post(ADMIN_ENDPOINTS.grantAchievement, grantData);
};

/**
 * Revoke an achievement from a user
 */
export const revokeAchievementFromUser = async (
  userId: string,
  achievementId: string,
  reason: string
): Promise<GamificationResponse<{ success: boolean; message: string }>> => {
  return adminApiClient.post(ADMIN_ENDPOINTS.revokeAchievement, {
    userId,
    achievementId,
    reason
  });
};

// ================================================================
// USER MANAGEMENT API
// ================================================================

/**
 * Get all gamification users with admin filters
 */
export const getGamificationUsers = async (filters: {
  search?: string;
  level?: { min: number; max: number };
  subscriptionTier?: string[];
  lastActive?: string;
  sortBy?: 'level' | 'xp' | 'joinedAt' | 'lastActive';
  limit?: number;
  offset?: number;
} = {}): Promise<GamificationResponse<{
  users: GamificationUser[];
  total: number;
  stats: {
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
    averageLevel: number;
  };
}>> => {
  return adminApiClient.get('/admin/gamification/users', filters);
};

/**
 * Get detailed user information
 */
export const getUserDetails = async (
  userId: string
): Promise<GamificationResponse<{
  user: GamificationUser;
  achievements: any[];
  challenges: any[];
  statistics: any;
  recentActivity: any[];
}>> => {
  return adminApiClient.get(ADMIN_ENDPOINTS.userDetails(userId));
};

/**
 * Update user's gamification progress
 */
export const updateUserProgress = async (
  userId: string,
  updates: {
    xpPoints?: number;
    level?: number;
    streakDays?: number;
    achievements?: string[];
  }
): Promise<GamificationResponse<GamificationUser>> => {
  return adminApiClient.put<GamificationUser>(
    ADMIN_ENDPOINTS.updateUserProgress(userId),
    updates
  );
};

/**
 * Reset user's gamification progress
 */
export const resetUserProgress = async (
  userId: string,
  options: {
    keepAchievements?: boolean;
    keepChallenges?: boolean;
    reason: string;
  }
): Promise<GamificationResponse<{ success: boolean }>> => {
  return adminApiClient.post(ADMIN_ENDPOINTS.resetUserProgress(userId), options);
};

/**
 * Ban user from gamification features
 */
export const banUserFromGamification = async (
  userId: string,
  reason: string,
  duration?: string // ISO duration or 'permanent'
): Promise<GamificationResponse<{ success: boolean }>> => {
  return adminApiClient.post(ADMIN_ENDPOINTS.banUser(userId), { reason, duration });
};

/**
 * Unban user from gamification features
 */
export const unbanUserFromGamification = async (
  userId: string,
  reason: string
): Promise<GamificationResponse<{ success: boolean }>> => {
  return adminApiClient.post(ADMIN_ENDPOINTS.unbanUser(userId), { reason });
};

// ================================================================
// SYSTEM MANAGEMENT API
// ================================================================

/**
 * Get system statistics
 */
export const getSystemStatistics = async (
  period?: { startDate: string; endDate: string }
): Promise<GamificationResponse<SystemStatistics>> => {
  return adminApiClient.get<SystemStatistics>(ADMIN_ENDPOINTS.systemStats, period);
};

/**
 * Get current system settings
 */
export const getSystemSettings = async (): Promise<GamificationResponse<GamificationSettings>> => {
  return adminApiClient.get<GamificationSettings>(ADMIN_ENDPOINTS.systemSettings);
};

/**
 * Update system settings
 */
export const updateSystemSettings = async (
  settings: Partial<GamificationSettings>
): Promise<GamificationResponse<GamificationSettings>> => {
  return adminApiClient.put<GamificationSettings>(
    ADMIN_ENDPOINTS.updateSystemSettings,
    settings
  );
};

/**
 * Get system health status
 */
export const getSystemHealth = async (): Promise<GamificationResponse<{
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    database: boolean;
    cache: boolean;
    queue: boolean;
    storage: boolean;
  };
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeUsers: number;
  };
}>> => {
  return adminApiClient.get(ADMIN_ENDPOINTS.systemHealth);
};

// ================================================================
// ANALYTICS & REPORTS API
// ================================================================

/**
 * Get overview analytics
 */
export const getOverviewAnalytics = async (
  period: { startDate: string; endDate: string }
): Promise<GamificationResponse<{
  users: { total: number; active: number; new: number };
  challenges: { total: number; active: number; completed: number };
  achievements: { unlocked: number; rare: number; popular: Achievement };
  engagement: { averageSession: number; retention: number; satisfaction: number };
}>> => {
  return adminApiClient.get(ADMIN_ENDPOINTS.overviewAnalytics, period);
};

/**
 * Get user engagement analytics
 */
export const getUserEngagementAnalytics = async (
  period: { startDate: string; endDate: string }
): Promise<GamificationResponse<{
  dailyActive: { date: string; count: number }[];
  retention: { day: number; rate: number }[];
  sessionDuration: { average: number; distribution: any };
  features: { feature: string; usage: number }[];
}>> => {
  return adminApiClient.get(ADMIN_ENDPOINTS.userEngagementAnalytics, period);
};

/**
 * Get challenge performance analytics
 */
export const getChallengePerformanceAnalytics = async (
  period: { startDate: string; endDate: string }
): Promise<GamificationResponse<{
  topPerforming: Challenge[];
  completionRates: { category: string; rate: number }[];
  participation: { month: string; challenges: number; participants: number }[];
  trends: { metric: string; trend: 'up' | 'down' | 'stable'; change: number }[];
}>> => {
  return adminApiClient.get(ADMIN_ENDPOINTS.challengePerformanceAnalytics, period);
};

/**
 * Export analytics report
 */
export const exportAnalyticsReport = async (
  type: 'users' | 'challenges' | 'achievements' | 'overview',
  period: { startDate: string; endDate: string },
  format: 'csv' | 'excel' | 'pdf' = 'csv'
): Promise<GamificationResponse<{ downloadUrl: string; filename: string }>> => {
  return adminApiClient.post(ADMIN_ENDPOINTS.exportReport, {
    type,
    period,
    format
  });
};

// ================================================================
// CONTENT MODERATION API
// ================================================================

/**
 * Get reported content
 */
export const getReportedContent = async (
  filters: {
    type?: 'challenge' | 'achievement' | 'comment' | 'profile';
    status?: 'pending' | 'reviewed' | 'resolved';
    severity?: 'low' | 'medium' | 'high';
  } = {}
): Promise<GamificationResponse<any[]>> => {
  return adminApiClient.get(ADMIN_ENDPOINTS.reportedContent, filters);
};

/**
 * Moderate reported content
 */
export const moderateContent = async (
  contentId: string,
  action: 'approve' | 'remove' | 'edit' | 'warn',
  reason: string,
  modifications?: any
): Promise<GamificationResponse<{ success: boolean }>> => {
  return adminApiClient.post(ADMIN_ENDPOINTS.moderateContent(contentId), {
    action,
    reason,
    modifications
  });
};

/**
 * Get flagged users
 */
export const getFlaggedUsers = async (): Promise<GamificationResponse<any[]>> => {
  return adminApiClient.get(ADMIN_ENDPOINTS.flaggedUsers);
};

// ================================================================
// CONTENT MANAGEMENT API
// ================================================================

/**
 * Manage featured challenges
 */
export const updateFeaturedChallenges = async (
  challengeIds: string[]
): Promise<GamificationResponse<{ success: boolean }>> => {
  return adminApiClient.put(ADMIN_ENDPOINTS.featuredChallenges, { challengeIds });
};

/**
 * Manage promoted achievements
 */
export const updatePromotedAchievements = async (
  achievementIds: string[]
): Promise<GamificationResponse<{ success: boolean }>> => {
  return adminApiClient.put(ADMIN_ENDPOINTS.promotedAchievements, { achievementIds });
};

/**
 * Manage community highlights
 */
export const updateCommunityHighlights = async (
  highlights: {
    type: 'user' | 'challenge' | 'achievement';
    id: string;
    message: string;
    featured: boolean;
  }[]
): Promise<GamificationResponse<{ success: boolean }>> => {
  return adminApiClient.put(ADMIN_ENDPOINTS.communityHighlights, { highlights });
};

// ================================================================
// UTILITY FUNCTIONS FOR ADMIN
// ================================================================

/**
 * Validate admin permissions
 */
export const validateAdminPermissions = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'admin' || payload.permissions?.includes('gamification_admin');
  } catch {
    return false;
  }
};

/**
 * Get admin user info
 */
export const getAdminUser = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.userId || payload.sub,
      name: payload.name,
      role: payload.role,
      permissions: payload.permissions || []
    };
  } catch {
    return null;
  }
};

// ================================================================
// EXPORT ADMIN API FUNCTIONS
// ================================================================

export default {
  // Challenge Management
  createChallenge,
  updateChallenge,
  deleteChallenge,
  publishChallenge,
  archiveChallenge,
  duplicateChallenge,
  bulkChallengeActions,
  getAdminChallenges,
  
  // Templates
  getChallengeTemplates,
  createChallengeTemplate,
  updateChallengeTemplate,
  deleteChallengeTemplate,
  getAchievementTemplates,
  
  // Analytics
  getChallengeAnalytics,
  getChallengeParticipants,
  getChallengeEngagement,
  getOverviewAnalytics,
  getUserEngagementAnalytics,
  getChallengePerformanceAnalytics,
  exportAnalyticsReport,
  
  // Achievement Management
  createAchievement,
  updateAchievement,
  deleteAchievement,
  grantAchievementToUser,
  revokeAchievementFromUser,
  
  // User Management
  getGamificationUsers,
  getUserDetails,
  updateUserProgress,
  resetUserProgress,
  banUserFromGamification,
  unbanUserFromGamification,
  
  // System Management
  getSystemStatistics,
  getSystemSettings,
  updateSystemSettings,
  getSystemHealth,
  
  // Moderation
  getReportedContent,
  moderateContent,
  getFlaggedUsers,
  
  // Content Management
  updateFeaturedChallenges,
  updatePromotedAchievements,
  updateCommunityHighlights,
  
  // Utilities
  validateAdminPermissions,
  getAdminUser
};
