import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

const isFiniteMetric = (value) => Number.isFinite(value);

const hasVerifiedEngagementMetrics = (metrics) =>
  isFiniteMetric(metrics.avgSessionTime) &&
  isFiniteMetric(metrics.actionFrequency) &&
  isFiniteMetric(metrics.breakPatterns?.frequency) &&
  isFiniteMetric(metrics.variabilityScore);

export const disconnectedTelemetry = {
  getUserAverageSessionTime: async () => null,
  getUserActionFrequency: async () => null,
  getUserBreakPatterns: async () => ({ frequency: null, avgLength: null, dataSource: 'not_connected' }),
  getUserVariabilityScore: async () => null,
  getCompulsiveCheckingScore: async () => null,
  getToleranceScore: async () => null,
  getWithdrawalScore: async () => null,
  getNeglectScore: async () => null,
  getCompetitiveScore: async () => null,
  getAchievementFocusScore: async () => null,
  getPointFocusScore: async () => null,
  getAverageSessionLength: async () => null,
  getUsersWithWarningsCount: async () => null,
  calculateComplianceScore: async () => null,
  getInterventionsToday: async () => null,
  getLastAuditDate: async () => null
};

export const buildUnverifiedEngagementHealth = (metrics = {}) => ({
  healthy: false,
  metrics,
  recommendations: ['Engagement health telemetry is not connected'],
  dataSource: 'not_connected',
  verificationStatus: 'not_verified'
});

export async function checkUserEngagementHealth(service, userId) {
  try {
    const metrics = {
      avgSessionTime: await service.getUserAverageSessionTime(userId),
      actionFrequency: await service.getUserActionFrequency(userId),
      breakPatterns: await service.getUserBreakPatterns(userId),
      variabilityScore: await service.getUserVariabilityScore(userId)
    };

    if (!hasVerifiedEngagementMetrics(metrics)) {
      return buildUnverifiedEngagementHealth(metrics);
    }

    const healthy = metrics.avgSessionTime <= 120 &&
      metrics.actionFrequency <= 50 &&
      metrics.breakPatterns.frequency >= 1 &&
      metrics.variabilityScore >= 0.3;

    return {
      healthy,
      metrics,
      recommendations: healthy ? [] : service.generateHealthRecommendations(metrics)
    };
  } catch (error) {
    piiSafeLogger.error('Failed to check user engagement health', { error: error.message, userId });
    return buildUnverifiedEngagementHealth();
  }
}

export async function checkAddictionIndicators(service, userId) {
  try {
    const indicators = {
      compulsiveChecking: await service.getCompulsiveCheckingScore(userId),
      toleranceIncrease: await service.getToleranceScore(userId),
      withdrawalSigns: await service.getWithdrawalScore(userId),
      neglectOtherActivities: await service.getNeglectScore(userId)
    };

    const scores = Object.values(indicators);
    if (!scores.every(Number.isFinite)) {
      return {
        riskLevel: 'unknown',
        score: null,
        indicators,
        recommendations: ['Addiction-risk telemetry is not connected'],
        dataSource: 'not_connected',
        verificationStatus: 'not_verified'
      };
    }

    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const riskLevel = avgScore >= 0.7 ? 'high' : avgScore >= 0.4 ? 'medium' : 'low';

    return {
      riskLevel,
      score: avgScore,
      indicators,
      recommendations: service.generateAddictionRecommendations(riskLevel, indicators)
    };
  } catch (error) {
    piiSafeLogger.error('Failed to check addiction indicators', { error: error.message, userId });
    return {
      riskLevel: 'unknown',
      score: null,
      indicators: {},
      recommendations: ['Addiction-risk telemetry could not be verified'],
      dataSource: 'not_connected',
      verificationStatus: 'not_verified'
    };
  }
}

export async function performFeatureSpecificChecks(service, userId, feature, checks) {
  if (feature === 'leaderboard') {
    const competitiveScore = await service.getCompetitiveScore(userId);
    if (Number.isFinite(competitiveScore) && competitiveScore > 0.8) {
      checks.score -= 15;
      checks.issues.push('excessive_competitive_behavior');
      checks.recommendations.push('Consider focusing on personal goals over competition');
    }
  }

  if (feature === 'achievements') {
    const achievementFocus = await service.getAchievementFocusScore(userId);
    if (Number.isFinite(achievementFocus) && achievementFocus > 0.9) {
      checks.score -= 10;
      checks.issues.push('achievement_obsession');
      checks.recommendations.push('Remember that progress is more important than badges');
    }
  }

  if (feature === 'points') {
    const pointFocus = await service.getPointFocusScore(userId);
    if (Number.isFinite(pointFocus) && pointFocus > 0.85) {
      checks.score -= 12;
      checks.issues.push('point_accumulation_obsession');
      checks.recommendations.push('Focus on the journey, not just the points');
    }
  }
}

export const generateHealthRecommendations = (metrics = {}) => {
  const recommendations = [];

  if (Number.isFinite(metrics.avgSessionTime) && metrics.avgSessionTime > 120) {
    recommendations.push('Take more frequent breaks during long sessions');
  }
  if (Number.isFinite(metrics.actionFrequency) && metrics.actionFrequency > 50) {
    recommendations.push('Consider reducing the frequency of actions per day');
  }
  if (Number.isFinite(metrics.breakPatterns?.frequency) && metrics.breakPatterns.frequency < 1) {
    recommendations.push('Try to take at least one break per session');
  }
  if (Number.isFinite(metrics.variabilityScore) && metrics.variabilityScore < 0.3) {
    recommendations.push('Explore different types of activities for better variety');
  }

  return recommendations;
};

export const generateAddictionRecommendations = (riskLevel, indicators = {}) => {
  const recommendations = [];

  if (riskLevel === 'high') {
    recommendations.push('Consider speaking with a healthcare professional about your usage patterns');
    recommendations.push('Set daily usage limits for yourself');
  }

  if (Number.isFinite(indicators.compulsiveChecking) && indicators.compulsiveChecking > 0.5) {
    recommendations.push('Try turning off notifications for a few hours each day');
  }

  if (Number.isFinite(indicators.neglectOtherActivities) && indicators.neglectOtherActivities > 0.5) {
    recommendations.push('Schedule specific times for other activities and hobbies');
  }

  return recommendations;
};
