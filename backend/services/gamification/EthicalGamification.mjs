/**
 * EthicalGamification.mjs
 * Anti-addiction guardrails for the gamification system.
 */

import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';
import {
  cloneEthicalConstraints,
  clonePositivePatterns,
  selectSupportMessage
} from './ethicalGamificationConfig.mjs';
import {
  buildUnverifiedGamificationComplianceStatus,
  buildUnverifiedGamificationFeatureCompliance
} from './ethicalGamificationCompliance.mjs';
import {
  getCurrentSessionLength,
  getDailyActionCount,
  getDailyLoginCount,
  getRecentActions
} from './ethicalGamificationLedger.mjs';
import {
  analyzeAchievementDifficulty,
  detectAddictivePatterns,
  estimateAchievementDifficulty,
  validateCustomConstraints,
  validateRules
} from './ethicalGamificationRules.mjs';
import {
  checkAddictionIndicators,
  checkUserEngagementHealth,
  disconnectedTelemetry,
  generateAddictionRecommendations,
  generateHealthRecommendations,
  performFeatureSpecificChecks
} from './ethicalGamificationTelemetry.mjs';

export class EthicalGamification {
  constructor() {
    this.ethicalConstraints = cloneEthicalConstraints();
    this.positivePatterns = clonePositivePatterns();
  }

  async checkActionEthics(userId, action, metadata = {}) {
    try {
      void metadata;
      const checks = {
        approved: true,
        reason: null,
        cooldownMinutes: 0,
        supportMessage: null,
        warnings: []
      };

      const recentActions = await this.getRecentActions(userId, 5);
      if (recentActions.length >= this.ethicalConstraints.addictionWarningThresholds.rapidActionSequence) {
        checks.approved = false;
        checks.reason = 'healthy_break';
        checks.cooldownMinutes = this.ethicalConstraints.engagementCooldown;
        checks.supportMessage = this.getSupportMessage('healthyBreaks');
        checks.warnings.push('rapid_action_sequence');
      }

      const dailyCount = await this.getDailyActionCount(userId, action);
      const dailyLimit = this.ethicalConstraints.maxDailyActions[action];
      if (dailyLimit && dailyCount >= dailyLimit) {
        checks.approved = false;
        checks.reason = 'daily_limit_reached';
        checks.cooldownMinutes = this.getMinutesUntilMidnight();
        checks.supportMessage = `You've reached your healthy daily limit for ${action}. Take a break!`;
        checks.warnings.push('daily_limit');
      }

      const sessionLength = await this.getCurrentSessionLength(userId);
      if (sessionLength >= this.ethicalConstraints.addictionWarningThresholds.sessionLength) {
        checks.warnings.push('long_session');
        checks.supportMessage = this.getSupportMessage('healthyBreaks');
      }

      const dailyLogins = await this.getDailyLoginCount(userId);
      if (dailyLogins >= this.ethicalConstraints.addictionWarningThresholds.dailyLogins) {
        checks.warnings.push('excessive_engagement');
        checks.supportMessage = 'You\'ve been very active today. Consider taking a healthy break!';
      }

      piiSafeLogger.trackPrivacyOperation('ethical_check', userId, {
        action,
        approved: checks.approved,
        warnings: checks.warnings,
        reason: checks.reason
      });

      return checks;
    } catch (error) {
      piiSafeLogger.error('Failed to check action ethics', { error: error.message, userId, action });
      return {
        approved: true,
        reason: null,
        cooldownMinutes: 0,
        supportMessage: null,
        warnings: ['ethics_check_failed']
      };
    }
  }

  async getComplianceStatus() {
    return buildUnverifiedGamificationComplianceStatus({
      recommendations: await this.generateRecommendations()
    });
  }

  async checkCompliance(userId, feature) {
    void userId;
    return buildUnverifiedGamificationFeatureCompliance({ feature });
  }

  async validateRules(rules, ethicalConstraints) {
    return validateRules(this, rules, ethicalConstraints);
  }

  async getRecentActions(userId, minutes = 5) {
    return getRecentActions(userId, minutes);
  }

  async getDailyActionCount(userId, action) {
    return getDailyActionCount(userId, action);
  }

  async getCurrentSessionLength(userId) {
    return getCurrentSessionLength(userId);
  }

  async getDailyLoginCount(userId) {
    return getDailyLoginCount(userId);
  }

  async checkUserEngagementHealth(userId) {
    return checkUserEngagementHealth(this, userId);
  }

  async checkAddictionIndicators(userId) {
    return checkAddictionIndicators(this, userId);
  }

  async performFeatureSpecificChecks(userId, feature, checks) {
    return performFeatureSpecificChecks(this, userId, feature, checks);
  }

  analyzeAchievementDifficulty(achievements) {
    return analyzeAchievementDifficulty(achievements);
  }

  detectAddictivePatterns(rules) {
    return detectAddictivePatterns(rules);
  }

  validateCustomConstraints(rules, constraints) {
    return validateCustomConstraints(rules, constraints);
  }

  async generateRecommendations() {
    return [
      'Consider implementing break reminders every 30 minutes',
      'Add positive affirmations that focus on health, not just points',
      'Include optional limits users can set for themselves',
      'Provide resources on healthy gaming and fitness habits',
      'Regularly review engagement patterns for concerning behavior'
    ];
  }

  getSupportMessage(category, seed) {
    return selectSupportMessage(this.positivePatterns, category, seed);
  }

  getRandomMessage(category) {
    return this.getSupportMessage(category);
  }

  getMinutesUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight - now) / (1000 * 60));
  }

  async getUserAverageSessionTime(userId) { return disconnectedTelemetry.getUserAverageSessionTime(userId); }
  async getUserActionFrequency(userId) { return disconnectedTelemetry.getUserActionFrequency(userId); }
  async getUserBreakPatterns(userId) { return disconnectedTelemetry.getUserBreakPatterns(userId); }
  async getUserVariabilityScore(userId) { return disconnectedTelemetry.getUserVariabilityScore(userId); }
  async getCompulsiveCheckingScore(userId) { return disconnectedTelemetry.getCompulsiveCheckingScore(userId); }
  async getToleranceScore(userId) { return disconnectedTelemetry.getToleranceScore(userId); }
  async getWithdrawalScore(userId) { return disconnectedTelemetry.getWithdrawalScore(userId); }
  async getNeglectScore(userId) { return disconnectedTelemetry.getNeglectScore(userId); }
  async getCompetitiveScore(userId) { return disconnectedTelemetry.getCompetitiveScore(userId); }
  async getAchievementFocusScore(userId) { return disconnectedTelemetry.getAchievementFocusScore(userId); }
  async getPointFocusScore(userId) { return disconnectedTelemetry.getPointFocusScore(userId); }
  async getAverageSessionLength() { return disconnectedTelemetry.getAverageSessionLength(); }
  async getUsersWithWarningsCount() { return disconnectedTelemetry.getUsersWithWarningsCount(); }
  async calculateComplianceScore() { return disconnectedTelemetry.calculateComplianceScore(); }
  async getInterventionsToday() { return disconnectedTelemetry.getInterventionsToday(); }
  async getLastAuditDate() { return disconnectedTelemetry.getLastAuditDate(); }

  estimateAchievementDifficulty(achievement) {
    return estimateAchievementDifficulty(achievement);
  }

  generateHealthRecommendations(metrics) {
    return generateHealthRecommendations(metrics);
  }

  generateAddictionRecommendations(riskLevel, indicators) {
    return generateAddictionRecommendations(riskLevel, indicators);
  }
}

export const ethicalGamification = new EthicalGamification();
