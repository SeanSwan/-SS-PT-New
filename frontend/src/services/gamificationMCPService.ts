/**
 * Legacy gamification MCP service name backed by SwanStudios REST APIs.
 *
 * The standalone MCP server stack is retired. This file remains only for old
 * imports and does not use localhost, MCP routes, or generated sample rewards.
 */

import apiService from './api.service';

interface GamificationPayload {
  userId: string;
  action: 'session_completed' | 'milestone_reached' | 'streak_achieved' | 'challenge_completed' | 'perfect_form' | 'early_arrival';
  sessionId?: string;
  points: number;
  timestamp: string;
  metadata?: {
    streakCount?: number;
    milestoneType?: string;
    challengeId?: string;
    formScore?: number;
  };
}

interface SocialPostPayload {
  userId: string;
  type: 'workout_completion' | 'achievement_unlock' | 'milestone_reached' | 'challenge_win' | 'progress_update';
  sessionId?: string;
  achievementId?: string;
  autoGenerate: boolean;
  customMessage?: string;
  includeStats?: boolean;
}

interface Achievement {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  points: number;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalPoints: number;
  rank: number;
  weeklyPoints: number;
  streak: number;
  level: number;
}

const unwrap = (response: any) => response?.data?.data || response?.data || {};

class GamificationMCPService {
  async awardPoints(payload: GamificationPayload): Promise<{
    success: boolean;
    newTotal: number;
    achievement?: Achievement;
    levelUp?: boolean;
  }> {
    const response = await apiService.post(`/api/gamification/users/${payload.userId}/points`, {
      points: payload.points,
      source: payload.action,
      metadata: payload.metadata || {},
      sessionId: payload.sessionId,
      timestamp: payload.timestamp
    });

    const data = unwrap(response);
    return {
      success: data.success !== false,
      newTotal: data.newTotal || data.newBalance || data.points || 0,
      achievement: data.achievement,
      levelUp: Boolean(data.levelUp)
    };
  }

  async getUserStatus(userId: string): Promise<{
    totalPoints: number;
    level: number;
    currentStreak: number;
    rank: number;
    achievements: Achievement[];
    nextLevelPoints: number;
  }> {
    const response = await apiService.get(`/api/v1/gamification/users/${userId}/profile`);
    const data = unwrap(response);
    const profile = data.profile || data.user || data || {};

    return {
      totalPoints: profile.points || 0,
      level: profile.level || 1,
      currentStreak: profile.streak || 0,
      rank: profile.rank || 0,
      achievements: profile.achievements || [],
      nextLevelPoints: profile.nextLevelPoints || 100
    };
  }

  async getLeaderboard(timeframe: 'weekly' | 'monthly' | 'all-time' = 'weekly', limit = 10): Promise<LeaderboardEntry[]> {
    const response = await apiService.get(`/api/v1/gamification/leaderboard?timeframe=${timeframe}&limit=${limit}`);
    const data = unwrap(response);
    return data.leaderboard || data.entries || [];
  }

  async generateWorkoutPost(payload: SocialPostPayload): Promise<{
    success: boolean;
    content: string;
    postId?: string;
  }> {
    return {
      success: false,
      content: payload.customMessage || '',
      postId: undefined
    };
  }

  async generateAchievementPost(_userId: string, _achievement: Achievement): Promise<void> {
    return;
  }

  async getActiveChallenges(): Promise<Array<{
    id: string;
    title: string;
    description: string;
    participants: number;
    endDate: string;
    rewards: string[];
  }>> {
    const response = await apiService.get('/api/v1/gamification/challenges?status=active');
    const data = unwrap(response);
    return data.challenges || [];
  }

  async joinChallenge(userId: string, challengeId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post(`/api/v1/gamification/challenges/${challengeId}/join`, { userId });
      const data = unwrap(response);
      return { success: data.success !== false, message: data.message || 'Challenge joined' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Failed to join challenge' };
    }
  }

  broadcastPointUpdate(_userId: string, _newTotal: number): void {
    return;
  }

  async triggerLevelUpCelebration(_userId: string): Promise<void> {
    return;
  }
}

export const gamificationMCPService = new GamificationMCPService();
export { GamificationMCPService };
export default gamificationMCPService;
