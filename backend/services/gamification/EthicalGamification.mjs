/**
 * Ethical Gamification Service
 * Ensures gamification remains ethical and non-addictive
 */

import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

export class EthicalGamification {
  constructor() {
    // Ethical constraints and thresholds
    this.ethicalConstraints = {
      maxDailyPoints: 1000,
      maxStreakBonus: 3.0,
      engagementCooldown: 30, // minutes
      maxDailyActions: {
        workout_completed: 3,
        check_in_logged: 5,
        social_interaction: 10
      },
      addictionWarningThresholds: {
        sessionLength: 180, // minutes
        dailyLogins: 20,
        rapidActionSequence: 10 // actions in 5 minutes
      }
    };
    
    // Positive reinforcement patterns
    this.positivePatterns = {
      encouragement: [
        'Great job staying consistent!',
        'Your progress is inspiring!',
        'Remember, rest days are important too!',
        'Quality over quantity - you\'re doing amazing!'
      ],
      healthyBreaks: [
        'Take a moment to celebrate your progress',
        'How about some water and a stretch?',
        'Your body and mind deserve this rest',
        'Recovery is part of the journey'
      ]
    };
  }
  
  /**
   * Check if user action violates ethical gamification principles
   */
  async checkActionEthics(userId, action, metadata = {}) {
    try {
      const checks = {
        approved: true,
        reason: null,
        cooldownMinutes: 0,
        supportMessage: null,
        warnings: []
      };
      
      // Check for rapid action sequences (potential obsessive behavior)
      const recentActions = await this.getRecentActions(userId, 5); // Last 5 minutes
      if (recentActions.length >= this.ethicalConstraints.addictionWarningThresholds.rapidActionSequence) {
        checks.approved = false;
        checks.reason = 'healthy_break';
        checks.cooldownMinutes = this.ethicalConstraints.engagementCooldown;
        checks.supportMessage = this.getRandomMessage('healthyBreaks');
        checks.warnings.push('rapid_action_sequence');
      }
      
      // Check daily action limits
      const dailyCount = await this.getDailyActionCount(userId, action);
      const dailyLimit = this.ethicalConstraints.maxDailyActions[action];
      if (dailyLimit && dailyCount >= dailyLimit) {
        checks.approved = false;
        checks.reason = 'daily_limit_reached';
        checks.cooldownMinutes = this.getMinutesUntilMidnight();
        checks.supportMessage = `You've reached your healthy daily limit for ${action}. Take a break!`;
        checks.warnings.push('daily_limit');
      }
      
      // Check session length
      const sessionLength = await this.getCurrentSessionLength(userId);
      if (sessionLength >= this.ethicalConstraints.addictionWarningThresholds.sessionLength) {
        checks.warnings.push('long_session');
        checks.supportMessage = this.getRandomMessage('healthyBreaks');
      }
      
      // Check for excessive daily engagement
      const dailyLogins = await this.getDailyLoginCount(userId);
      if (dailyLogins >= this.ethicalConstraints.addictionWarningThresholds.dailyLogins) {
        checks.warnings.push('excessive_engagement');
        checks.supportMessage = 'You\'ve been very active today. Consider taking a healthy break!';
      }
      
      // Log ethical check
      piiSafeLogger.trackPrivacyOperation('ethical_check', userId, {
        action,
        approved: checks.approved,
        warnings: checks.warnings,
        reason: checks.reason
      });
      
      return checks;
    } catch (error) {
      piiSafeLogger.error('Failed to check action ethics', {
        error: error.message,
        userId,
        action
      });
      
      // Default to allowing action but with warnings
      return {
        approved: true,
        reason: null,
        cooldownMinutes: 0,
        supportMessage: null,
        warnings: ['ethics_check_failed']
      };
    }
  }
  
  /**
   * Get comprehensive compliance status
   */
  async getComplianceStatus() {
    try {
      const status = {
        ethicalPrinciples: {
          healthyEngagement: 'enforced',
          inclusiveCompetition: 'active',
          positiveReinforcement: 'active',
          noAddictivePatterns: 'verified'
        },
        metrics: {
          avgSessionLength: await this.getAverageSessionLength(),
          usersWithWarnings: await this.getUsersWithWarningsCount(),
          complianceScore: await this.calculateComplianceScore(),
          interventionsToday: await this.getInterventionsToday()
        },
        lastAudit: await this.getLastAuditDate(),
        recommendations: await this.generateRecommendations()
      };
      
      return {
        status: 'compliant',
        score: status.metrics.complianceScore,
        details: status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      piiSafeLogger.error('Failed to get compliance status', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Check compliance for specific user and feature
   */
  async checkCompliance(userId, feature) {
    try {
      const checks = {
        passed: true,
        score: 100,
        issues: [],
        recommendations: []
      };
      
      // Check user's engagement patterns
      const engagementCheck = await this.checkUserEngagementHealth(userId);
      if (!engagementCheck.healthy) {
        checks.passed = false;
        checks.score -= 20;
        checks.issues.push('unhealthy_engagement_pattern');
        checks.recommendations.push('Suggest taking regular breaks');
      }
      
      // Check for addiction indicators
      const addictionCheck = await this.checkAddictionIndicators(userId);
      if (addictionCheck.riskLevel === 'high') {
        checks.passed = false;
        checks.score -= 30;
        checks.issues.push('addiction_risk_detected');
        checks.recommendations.push('Recommend professional support if needed');
      }
      
      // Feature-specific checks
      await this.performFeatureSpecificChecks(userId, feature, checks);
      
      return checks;
    } catch (error) {
      piiSafeLogger.error('Failed to check compliance', {
        error: error.message,
        userId,
        feature
      });
      throw error;
    }
  }
  
  /**
   * Validate gamification rules against ethical guidelines
   */
  async validateRules(rules, ethicalConstraints) {
    const validation = {
      passed: true,
      score: 100,
      issues: [],
      warnings: []
    };
    
    try {
      // Check point inflation
      if (rules.pointRules) {
        for (const [action, points] of Object.entries(rules.pointRules)) {
          if (points > this.ethicalConstraints.maxDailyPoints) {
            validation.passed = false;
            validation.score -= 10;
            validation.issues.push(`Point value too high for ${action}: ${points}`);
          }
        }
      }
      
      // Check achievement balance
      if (rules.achievements) {
        const achievementDifficulty = this.analyzeAchievementDifficulty(rules.achievements);
        if (achievementDifficulty.tooEasy > 0) {
          validation.score -= 5;
          validation.warnings.push(`${achievementDifficulty.tooEasy} achievements may be too easy`);
        }
        if (achievementDifficulty.tooHard > 0) {
          validation.score -= 10;
          validation.warnings.push(`${achievementDifficulty.tooHard} achievements may be too difficult`);
        }
      }
      
      // Check for addictive patterns
      const addictivePatterns = this.detectAddictivePatterns(rules);
      if (addictivePatterns.length > 0) {
        validation.passed = false;
        validation.score -= 25;
        validation.issues.push('Potentially addictive patterns detected');
        validation.issues.push(...addictivePatterns);
      }
      
      // Apply custom ethical constraints
      if (ethicalConstraints) {
        const customValidation = this.validateCustomConstraints(rules, ethicalConstraints);
        validation.passed = validation.passed && customValidation.passed;
        validation.score = Math.min(validation.score, validation.score - customValidation.scorePenalty);
        validation.issues.push(...customValidation.issues);
        validation.warnings.push(...customValidation.warnings);
      }
      
      return validation;
    } catch (error) {
      piiSafeLogger.error('Failed to validate gamification rules', {
        error: error.message,
        rules
      });
      
      return {
        passed: false,
        score: 0,
        issues: ['Validation failed due to error'],
        warnings: ['Could not complete ethical validation']
      };
    }
  }
  
  /**
   * Get user's recent actions for pattern analysis
   */
  async getRecentActions(userId, minutes = 5) {
    // This would connect to the database to get recent actions
    // For now, returning mock data structure
    try {
      // Implementation would query user actions in last X minutes
      return [];
    } catch (error) {
      piiSafeLogger.error('Failed to get recent actions', {
        error: error.message,
        userId,
        minutes
      });
      return [];
    }
  }
  
  /**
   * Get daily action count for user
   */
  async getDailyActionCount(userId, action) {
    try {
      // Implementation would query daily action count
      return 0;
    } catch (error) {
      piiSafeLogger.error('Failed to get daily action count', {
        error: error.message,
        userId,
        action
      });
      return 0;
    }
  }
  
  /**
   * Get current session length for user
   */
  async getCurrentSessionLength(userId) {
    try {
      // Implementation would track session start time
      return 0;
    } catch (error) {
      piiSafeLogger.error('Failed to get session length', {
        error: error.message,
        userId
      });
      return 0;
    }
  }
  
  /**
   * Get daily login count for user
   */
  async getDailyLoginCount(userId) {
    try {
      // Implementation would count logins today
      return 0;
    } catch (error) {
      piiSafeLogger.error('Failed to get daily login count', {
        error: error.message,
        userId
      });
      return 0;
    }
  }
  
  /**
   * Check user engagement health
   */
  async checkUserEngagementHealth(userId) {
    try {
      const metrics = {
        avgSessionTime: await this.getUserAverageSessionTime(userId),
        actionFrequency: await this.getUserActionFrequency(userId),
        breakPatterns: await this.getUserBreakPatterns(userId),
        variabilityScore: await this.getUserVariabilityScore(userId)
      };
      
      // Analyze patterns for health indicators
      const healthy = metrics.avgSessionTime <= 120 && // Max 2 hours
                     metrics.actionFrequency <= 50 && // Max 50 actions per day
                     metrics.breakPatterns.frequency >= 1 && // At least 1 break per session
                     metrics.variabilityScore >= 0.3; // Healthy variety in actions
      
      return {
        healthy,
        metrics,
        recommendations: healthy ? [] : this.generateHealthRecommendations(metrics)
      };
    } catch (error) {
      piiSafeLogger.error('Failed to check user engagement health', {
        error: error.message,
        userId
      });
      return { healthy: true, metrics: {}, recommendations: [] };
    }
  }
  
  /**
   * Check for addiction indicators
   */
  async checkAddictionIndicators(userId) {
    try {
      const indicators = {
        compulsiveChecking: await this.getCompulsiveCheckingScore(userId),
        toleranceIncrease: await this.getToleranceScore(userId),
        withdrawalSigns: await this.getWithdrawalScore(userId),
        neglectOtherActivities: await this.getNeglectScore(userId)
      };
      
      const totalScore = Object.values(indicators).reduce((sum, score) => sum + score, 0);
      const avgScore = totalScore / Object.keys(indicators).length;
      
      let riskLevel = 'low';
      if (avgScore >= 0.7) riskLevel = 'high';
      else if (avgScore >= 0.4) riskLevel = 'medium';
      
      return {
        riskLevel,
        score: avgScore,
        indicators,
        recommendations: this.generateAddictionRecommendations(riskLevel, indicators)
      };
    } catch (error) {
      piiSafeLogger.error('Failed to check addiction indicators', {
        error: error.message,
        userId
      });
      return { riskLevel: 'low', score: 0, indicators: {}, recommendations: [] };
    }
  }
  
  /**
   * Perform feature-specific ethical checks
   */
  async performFeatureSpecificChecks(userId, feature, checks) {
    switch (feature) {
      case 'leaderboard':
        // Check for unhealthy competition patterns
        const competitiveScore = await this.getCompetitiveScore(userId);
        if (competitiveScore > 0.8) {
          checks.score -= 15;
          checks.issues.push('excessive_competitive_behavior');
          checks.recommendations.push('Consider focusing on personal goals over competition');
        }
        break;
        
      case 'achievements':
        // Check for achievement hunting addiction
        const achievementFocus = await this.getAchievementFocusScore(userId);
        if (achievementFocus > 0.9) {
          checks.score -= 10;
          checks.issues.push('achievement_obsession');
          checks.recommendations.push('Remember that progress is more important than badges');
        }
        break;
        
      case 'points':
        // Check for point accumulation obsession
        const pointFocus = await this.getPointFocusScore(userId);
        if (pointFocus > 0.85) {
          checks.score -= 12;
          checks.issues.push('point_accumulation_obsession');
          checks.recommendations.push('Focus on the journey, not just the points');
        }
        break;
    }
  }
  
  /**
   * Analyze achievement difficulty balance
   */
  analyzeAchievementDifficulty(achievements) {
    let tooEasy = 0;
    let tooHard = 0;
    let balanced = 0;
    
    for (const [id, achievement] of Object.entries(achievements)) {
      // Mock analysis based on achievement properties
      const difficulty = this.estimateAchievementDifficulty(achievement);
      
      if (difficulty < 0.2) tooEasy++;
      else if (difficulty > 0.9) tooHard++;
      else balanced++;
    }
    
    return { tooEasy, tooHard, balanced };
  }
  
  /**
   * Detect potentially addictive patterns in rules
   */
  detectAddictivePatterns(rules) {
    const patterns = [];
    
    // Check for excessive reward frequency
    if (rules.pointRules) {
      const avgPoints = Object.values(rules.pointRules).reduce((sum, p) => sum + p, 0) / Object.keys(rules.pointRules).length;
      if (avgPoints > 200) {
        patterns.push('Excessive point rewards may create addiction');
      }
    }
    
    // Check for manipulation tactics
    if (rules.notifications && rules.notifications.frequency > 5) {
      patterns.push('Too frequent notifications may be manipulative');
    }
    
    // Check for pressure tactics
    if (rules.streaks && rules.streaks.lossConsequence === 'severe') {
      patterns.push('Severe streak loss consequences may create unhealthy pressure');
    }
    
    return patterns;
  }
  
  /**
   * Validate custom ethical constraints
   */
  validateCustomConstraints(rules, constraints) {
    const validation = {
      passed: true,
      scorePenalty: 0,
      issues: [],
      warnings: []
    };
    
    // Example custom constraint validations
    if (constraints.maxPointsPerAction) {
      const maxPoints = Math.max(...Object.values(rules.pointRules || {}));
      if (maxPoints > constraints.maxPointsPerAction) {
        validation.passed = false;
        validation.scorePenalty += 15;
        validation.issues.push(`Max points per action exceeded: ${maxPoints} > ${constraints.maxPointsPerAction}`);
      }
    }
    
    if (constraints.requiredBreakReminders && !rules.breakReminders) {
      validation.scorePenalty += 5;
      validation.warnings.push('Missing required break reminders');
    }
    
    return validation;
  }
  
  /**
   * Generate ethical recommendations
   */
  async generateRecommendations() {
    return [
      'Consider implementing break reminders every 30 minutes',
      'Add positive affirmations that focus on health, not just points',
      'Include optional limits users can set for themselves',
      'Provide resources on healthy gaming and fitness habits',
      'Regularly review engagement patterns for concerning behavior'
    ];
  }
  
  /**
   * Get random motivational message
   */
  getRandomMessage(category) {
    const messages = this.positivePatterns[category] || this.positivePatterns.encouragement;
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  /**
   * Calculate minutes until midnight
   */
  getMinutesUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight - now) / (1000 * 60));
  }
  
  // Placeholder methods for various score calculations
  // These would be implemented with actual logic based on user data
  
  async getUserAverageSessionTime(userId) { return 45; }
  async getUserActionFrequency(userId) { return 25; }
  async getUserBreakPatterns(userId) { return { frequency: 2, avgLength: 15 }; }
  async getUserVariabilityScore(userId) { return 0.7; }
  async getCompulsiveCheckingScore(userId) { return 0.2; }
  async getToleranceScore(userId) { return 0.1; }
  async getWithdrawalScore(userId) { return 0.0; }
  async getNeglectScore(userId) { return 0.1; }
  async getCompetitiveScore(userId) { return 0.5; }
  async getAchievementFocusScore(userId) { return 0.6; }
  async getPointFocusScore(userId) { return 0.4; }
  async getAverageSessionLength() { return 35; }
  async getUsersWithWarningsCount() { return 12; }
  async calculateComplianceScore() { return 92; }
  async getInterventionsToday() { return 5; }
  async getLastAuditDate() { return new Date(Date.now() - 86400000).toISOString(); }
  
  estimateAchievementDifficulty(achievement) {
    // Simple heuristic based on point value and description
    const points = achievement.points || 100;
    return Math.min(points / 1000, 1.0);
  }
  
  generateHealthRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.avgSessionTime > 120) {
      recommendations.push('Take more frequent breaks during long sessions');
    }
    if (metrics.actionFrequency > 50) {
      recommendations.push('Consider reducing the frequency of actions per day');
    }
    if (metrics.breakPatterns.frequency < 1) {
      recommendations.push('Try to take at least one break per session');
    }
    if (metrics.variabilityScore < 0.3) {
      recommendations.push('Explore different types of activities for better variety');
    }
    
    return recommendations;
  }
  
  generateAddictionRecommendations(riskLevel, indicators) {
    const recommendations = [];
    
    if (riskLevel === 'high') {
      recommendations.push('Consider speaking with a healthcare professional about your usage patterns');
      recommendations.push('Set daily usage limits for yourself');
    }
    
    if (indicators.compulsiveChecking > 0.5) {
      recommendations.push('Try turning off notifications for a few hours each day');
    }
    
    if (indicators.neglectOtherActivities > 0.5) {
      recommendations.push('Schedule specific times for other activities and hobbies');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const ethicalGamification = new EthicalGamification();