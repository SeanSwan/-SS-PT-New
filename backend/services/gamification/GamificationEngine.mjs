/**
 * Gamification Engine Service
 * Core gamification logic with ethical constraints
 */

import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';
import { GamificationPersistence } from './GamificationPersistence.mjs';

export class GamificationEngine {
  constructor() {
    this.persistence = new GamificationPersistence();
    
    // Core gamification rules
    this.pointRules = {
      workout_completed: 100,
      workout_streak_3: 150,
      workout_streak_7: 300,
      workout_streak_14: 500,
      goal_achieved: 200,
      form_improvement: 75,
      helped_community: 50,
      profile_updated: 25,
      check_in_logged: 15
    };
    
    // Level thresholds
    this.levelThresholds = [
      0, 500, 1000, 1750, 2750, 4000, 
      5500, 7250, 9250, 11500, 14000, 
      17000, 20500, 24500, 29000, 34000,
      40000, 47000, 55000, 64000, 74000,
      85000, 97000, 110000, 124000, 139000
    ];
    
    // Achievement definitions
    this.achievements = {
      'first_workout': {
        name: 'First Steps',
        description: 'Complete your first workout',
        points: 50,
        type: 'milestone'
      },
      'week_warrior': {
        name: 'Week Warrior',
        description: 'Complete workouts for 7 consecutive days',
        points: 300,
        type: 'streak'
      },
      'form_master': {
        name: 'Form Master',
        description: 'Maintain perfect form for an entire workout',
        points: 200,
        type: 'skill'
      },
      'community_helper': {
        name: 'Community Helper',
        description: 'Help 10 other members with their fitness journey',
        points: 150,
        type: 'social'
      },
      'consistency_champion': {
        name: 'Consistency Champion',
        description: 'Work out every day for a month',
        points: 1000,
        type: 'streak'
      }
    };
  }
  
  /**
   * Get user's complete gamification status
   */
  async getUserGamificationStatus(userId) {
    try {
      const points = await this.persistence.getUserTotalPoints(userId);
      const level = this.calculateLevel(points);
      const streak = await this.persistence.getCurrentStreak(userId);
      const achievements = await this.persistence.getUserAchievements(userId);
      const leaderboardRank = await this.persistence.getUserLeaderboardRank(userId);
      
      return {
        totalPoints: points,
        level: level,
        levelProgress: this.getLevelProgress(points),
        currentStreak: streak,
        achievements: achievements,
        leaderboardRank: leaderboardRank,
        nextLevelPoints: this.getNextLevelPoints(level),
        availableAchievements: this.getAvailableAchievements(achievements)
      };
    } catch (error) {
      piiSafeLogger.error('Failed to get gamification status', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  
  /**
   * Award points for specific actions
   */
  async awardPoints(userId, action, metadata = {}) {
    try {
      const pointsAwarded = this.pointRules[action] || 0;
      
      if (pointsAwarded === 0) {
        throw new Error(`Unknown action for points: ${action}`);
      }
      
      // Check for any multipliers (e.g., streak bonuses)
      const multiplier = await this.calculateMultiplier(userId, action, metadata);
      const finalPoints = Math.round(pointsAwarded * multiplier);
      
      // Record the points
      await this.persistence.awardPoints(userId, finalPoints, action, metadata);
      
      // Check for level up
      const newTotalPoints = await this.persistence.getUserTotalPoints(userId);
      const newLevel = this.calculateLevel(newTotalPoints);
      const oldLevel = this.calculateLevel(newTotalPoints - finalPoints);
      const levelUp = newLevel > oldLevel;
      
      // Check for new achievements
      const newAchievements = await this.checkForAchievements(userId, action, metadata);
      
      // Log the award
      piiSafeLogger.trackGamificationEngagement('points_awarded', userId, {
        action,
        pointsAwarded: finalPoints,
        multiplier,
        levelUp,
        newLevel,
        newAchievements: newAchievements.length
      });
      
      return {
        pointsAwarded: finalPoints,
        totalPoints: newTotalPoints,
        levelUp,
        newLevel,
        newAchievements,
        multiplier
      };
    } catch (error) {
      piiSafeLogger.error('Failed to award points', {
        error: error.message,
        userId,
        action
      });
      throw error;
    }
  }
  
  /**
   * Process automated user action for gamification
   */
  async processUserAction(userId, action, metadata = {}) {
    try {
      // Check if action is eligible for points
      if (!this.pointRules[action]) {
        return { pointsAwarded: 0, message: 'Action not eligible for points' };
      }
      
      // Check for cooldowns or rate limiting
      const canAward = await this.checkActionEligibility(userId, action, metadata);
      if (!canAward.eligible) {
        return { 
          pointsAwarded: 0, 
          message: canAward.reason,
          cooldownMinutes: canAward.cooldownMinutes 
        };
      }
      
      // Award points and process achievements
      return await this.awardPoints(userId, action, metadata);
    } catch (error) {
      piiSafeLogger.error('Failed to process user action', {
        error: error.message,
        userId,
        action
      });
      throw error;
    }
  }
  
  /**
   * Get user's achievements
   */
  async getUserAchievements(userId) {
    try {
      const earned = await this.persistence.getUserAchievements(userId);
      const available = this.getAvailableAchievements(earned);
      
      return {
        earned: earned.map(achievement => ({
          ...this.achievements[achievement.achievementId],
          earnedAt: achievement.earnedAt
        })),
        available: available.map(id => this.achievements[id]),
        progress: await this.getAchievementProgress(userId, available)
      };
    } catch (error) {
      piiSafeLogger.error('Failed to get user achievements', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  
  /**
   * Get leaderboard with privacy considerations
   */
  async getLeaderboard(options = {}) {
    try {
      const {
        timeframe = 'weekly',
        category = 'overall',
        limit = 10,
        requestingUserId
      } = options;
      
      return await this.persistence.getLeaderboard({
        timeframe,
        category,
        limit,
        requestingUserId
      });
    } catch (error) {
      piiSafeLogger.error('Failed to get leaderboard', {
        error: error.message,
        options
      });
      throw error;
    }
  }
  
  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    try {
      return {
        activeUsers: await this.persistence.getActiveUsersCount(),
        totalPointsAwarded: await this.persistence.getTotalPointsAwarded(),
        achievementCompletionRate: await this.persistence.getAchievementCompletionRate(),
        averageStreak: await this.persistence.getAverageStreak(),
        healthStatus: 'healthy',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      piiSafeLogger.error('Failed to get gamification system health', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(options = {}) {
    try {
      const { timeframe = '30d', segment, requestingRole } = options;
      
      // Only admins and trainers can see detailed metrics
      if (!['admin', 'trainer'].includes(requestingRole)) {
        throw new Error('Insufficient permissions for detailed metrics');
      }
      
      return await this.persistence.getEngagementMetrics({
        timeframe,
        segment
      });
    } catch (error) {
      piiSafeLogger.error('Failed to get engagement metrics', {
        error: error.message,
        options
      });
      throw error;
    }
  }
  
  /**
   * Update gamification rules
   */
  async updateRules(rules, ethicalConstraints) {
    try {
      // Validate rules against ethical constraints
      this.validateRules(rules, ethicalConstraints);
      
      // Update point rules
      if (rules.pointRules) {
        Object.assign(this.pointRules, rules.pointRules);
      }
      
      // Update achievements
      if (rules.achievements) {
        Object.assign(this.achievements, rules.achievements);
      }
      
      // Log the update
      piiSafeLogger.trackUserAction('gamification_rules_updated', 'system', {
        rulesUpdated: Object.keys(rules).length,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: 'Gamification rules updated successfully',
        updatedRules: Object.keys(rules)
      };
    } catch (error) {
      piiSafeLogger.error('Failed to update gamification rules', {
        error: error.message,
        rules
      });
      throw error;
    }
  }
  
  /**
   * Calculate level from points
   */
  calculateLevel(points) {
    for (let i = this.levelThresholds.length - 1; i >= 0; i--) {
      if (points >= this.levelThresholds[i]) {
        return i + 1;
      }
    }
    return 1;
  }
  
  /**
   * Get level progress (0-100%)
   */
  getLevelProgress(points) {
    const level = this.calculateLevel(points);
    const currentThreshold = this.levelThresholds[level - 1] || 0;
    const nextThreshold = this.levelThresholds[level] || points;
    
    if (nextThreshold === currentThreshold) {
      return 100; // Max level
    }
    
    return Math.round(((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100);
  }
  
  /**
   * Get points needed for next level
   */
  getNextLevelPoints(level) {
    const nextThreshold = this.levelThresholds[level];
    return nextThreshold || null;
  }
  
  /**
   * Calculate multiplier based on streaks and other factors
   */
  async calculateMultiplier(userId, action, metadata) {
    let multiplier = 1.0;
    
    // Streak bonus
    if (action.includes('workout') || action.includes('streak')) {
      const streak = await this.persistence.getCurrentStreak(userId);
      if (streak >= 7) multiplier += 0.2;
      if (streak >= 14) multiplier += 0.3;
      if (streak >= 30) multiplier += 0.5;
    }
    
    // Time-based bonuses (optional)
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 8) { // Early morning bonus
      multiplier += 0.1;
    }
    
    return Math.min(multiplier, 3.0); // Cap at 3x
  }
  
  /**
   * Check if action is eligible for points (cooldowns, etc.)
   */
  async checkActionEligibility(userId, action, metadata) {
    try {
      // Check daily limits for certain actions
      const dailyLimits = {
        'profile_updated': 1,
        'check_in_logged': 3
      };
      
      if (dailyLimits[action]) {
        const todayCount = await this.persistence.getActionCountToday(userId, action);
        if (todayCount >= dailyLimits[action]) {
          return {
            eligible: false,
            reason: `Daily limit of ${dailyLimits[action]} reached for ${action}`,
            cooldownMinutes: this.getMinutesUntilMidnight()
          };
        }
      }
      
      return { eligible: true };
    } catch (error) {
      piiSafeLogger.error('Failed to check action eligibility', {
        error: error.message,
        userId,
        action
      });
      return { eligible: false, reason: 'Error checking eligibility' };
    }
  }
  
  /**
   * Check for new achievements
   */
  async checkForAchievements(userId, action, metadata) {
    const newAchievements = [];
    
    try {
      // First workout achievement
      if (action === 'workout_completed') {
        const workoutCount = await this.persistence.getUserWorkoutCount(userId);
        if (workoutCount === 1) {
          await this.persistence.awardAchievement(userId, 'first_workout');
          newAchievements.push('first_workout');
        }
      }
      
      // Streak achievements
      if (action.includes('streak')) {
        const streak = await this.persistence.getCurrentStreak(userId);
        if (streak === 7 && !(await this.persistence.hasAchievement(userId, 'week_warrior'))) {
          await this.persistence.awardAchievement(userId, 'week_warrior');
          newAchievements.push('week_warrior');
        }
        if (streak === 30 && !(await this.persistence.hasAchievement(userId, 'consistency_champion'))) {
          await this.persistence.awardAchievement(userId, 'consistency_champion');
          newAchievements.push('consistency_champion');
        }
      }
      
      // Form-based achievements
      if (metadata.formScore && metadata.formScore >= 95) {
        if (!(await this.persistence.hasAchievement(userId, 'form_master'))) {
          await this.persistence.awardAchievement(userId, 'form_master');
          newAchievements.push('form_master');
        }
      }
      
      return newAchievements;
    } catch (error) {
      piiSafeLogger.error('Failed to check for achievements', {
        error: error.message,
        userId,
        action
      });
      return [];
    }
  }
  
  /**
   * Get available achievements for user
   */
  getAvailableAchievements(earnedAchievements) {
    const earnedIds = earnedAchievements.map(a => a.achievementId);
    return Object.keys(this.achievements).filter(id => !earnedIds.includes(id));
  }
  
  /**
   * Get achievement progress for user
   */
  async getAchievementProgress(userId, availableAchievementIds) {
    const progress = {};
    
    for (const achievementId of availableAchievementIds) {
      try {
        switch (achievementId) {
          case 'week_warrior':
            progress[achievementId] = {
              current: await this.persistence.getCurrentStreak(userId),
              target: 7,
              percentage: Math.min((await this.persistence.getCurrentStreak(userId) / 7) * 100, 100)
            };
            break;
          case 'consistency_champion':
            progress[achievementId] = {
              current: await this.persistence.getCurrentStreak(userId),
              target: 30,
              percentage: Math.min((await this.persistence.getCurrentStreak(userId) / 30) * 100, 100)
            };
            break;
          case 'community_helper':
            const helpCount = await this.persistence.getCommunityHelpCount(userId);
            progress[achievementId] = {
              current: helpCount,
              target: 10,
              percentage: Math.min((helpCount / 10) * 100, 100)
            };
            break;
          default:
            progress[achievementId] = { current: 0, target: 1, percentage: 0 };
        }
      } catch (error) {
        piiSafeLogger.error('Failed to get achievement progress', {
          error: error.message,
          userId,
          achievementId
        });
        progress[achievementId] = { current: 0, target: 1, percentage: 0 };
      }
    }
    
    return progress;
  }
  
  /**
   * Validate gamification rules against ethical constraints
   */
  validateRules(rules, ethicalConstraints) {
    // Check for excessive point inflation
    if (rules.pointRules) {
      for (const [action, points] of Object.entries(rules.pointRules)) {
        if (points > 1000) {
          throw new Error(`Point value too high for action ${action}: ${points}`);
        }
      }
    }
    
    // Ensure achievement requirements aren't too demanding
    if (rules.achievements) {
      for (const [id, achievement] of Object.entries(rules.achievements)) {
        if (achievement.points && achievement.points > 2000) {
          throw new Error(`Achievement points too high for ${id}: ${achievement.points}`);
        }
      }
    }
    
    // Check ethical constraints
    if (ethicalConstraints) {
      if (ethicalConstraints.maxDailyPoints && rules.pointRules) {
        const maxPossibleDaily = Math.max(...Object.values(rules.pointRules)) * 3; // Max 3 times a day
        if (maxPossibleDaily > ethicalConstraints.maxDailyPoints) {
          throw new Error(`Potential daily points exceed ethical limit: ${maxPossibleDaily}`);
        }
      }
    }
  }
  
  /**
   * Get minutes until midnight (for cooldown calculations)
   */
  getMinutesUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight - now) / (1000 * 60));
  }
  
  /**
   * Get active engagement statistics
   */
  async getActiveEngagementStats() {
    try {
      return {
        dailyActiveUsers: await this.persistence.getDailyActiveUsers(),
        weeklyActiveUsers: await this.persistence.getWeeklyActiveUsers(),
        avgSessionLength: await this.persistence.getAverageSessionLength(),
        engagementRate: await this.persistence.getEngagementRate(),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      piiSafeLogger.error('Failed to get active engagement stats', {
        error: error.message
      });
      throw error;
    }
  }
}

// Export singleton instance
export const gamificationEngine = new GamificationEngine();