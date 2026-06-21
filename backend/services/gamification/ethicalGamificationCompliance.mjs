const UNVERIFIED_PRINCIPLES = Object.freeze({
  healthyEngagement: 'not_verified',
  inclusiveCompetition: 'not_verified',
  positiveReinforcement: 'not_verified',
  noAddictivePatterns: 'not_verified'
});

const buildUnverifiedMetrics = () => ({
  avgSessionLength: null,
  usersWithWarnings: null,
  complianceScore: null,
  interventionsToday: null,
  dataSource: 'not_connected',
  verificationStatus: 'not_verified'
});

export const buildUnverifiedGamificationComplianceStatus = ({
  recommendations = [],
  timestamp = new Date().toISOString()
} = {}) => {
  const details = {
    ethicalPrinciples: { ...UNVERIFIED_PRINCIPLES },
    metrics: buildUnverifiedMetrics(),
    lastAudit: null,
    auditSource: 'not_connected',
    recommendations,
    verificationStatus: 'not_verified'
  };

  return {
    status: 'not_verified',
    score: null,
    verificationStatus: 'not_verified',
    details,
    timestamp
  };
};

export const buildUnverifiedGamificationFeatureCompliance = ({
  feature = null,
  recommendations = [
    'Connect observed engagement telemetry before treating this feature as ethically compliant'
  ]
} = {}) => ({
  passed: false,
  score: null,
  feature,
  issues: ['verification_not_connected'],
  recommendations,
  dataSource: 'not_connected',
  verificationStatus: 'not_verified'
});
