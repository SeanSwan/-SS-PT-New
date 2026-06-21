import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  database: {
    QueryTypes: { SELECT: 'SELECT' },
    query: vi.fn()
  }
}));

vi.mock('../../database.mjs', () => ({ default: mocks.database }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const readBackendOptional = (relativePath) => {
  try {
    return readFileSync(resolve(__dirname, relativePath), 'utf8');
  } catch {
    return '';
  }
};
const ethicsSource = readBackendOptional('../../services/gamification/EthicalGamification.mjs');
const ethicsConfigSource = readBackendOptional('../../services/gamification/ethicalGamificationConfig.mjs');
const ethicsComplianceSource = readBackendOptional('../../services/gamification/ethicalGamificationCompliance.mjs');
const ethicsLedgerSource = readBackendOptional('../../services/gamification/ethicalGamificationLedger.mjs');
const ethicsRulesSource = readBackendOptional('../../services/gamification/ethicalGamificationRules.mjs');
const ethicsTelemetrySource = readBackendOptional('../../services/gamification/ethicalGamificationTelemetry.mjs');
const countSourceLines = (source) => source.split(/\r?\n/).length;

const { EthicalGamification } = await import('../../services/gamification/EthicalGamification.mjs');

describe('EthicalGamification point-ledger source filters', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EthicalGamification();
  });

  it('counts legacy workout actions through the legal point source and legacy reason', async () => {
    mocks.database.query.mockResolvedValue([{ cnt: '2' }]);

    const count = await service.getDailyActionCount(7, 'workout_completed');

    expect(count).toBe(2);
    const [sql, options] = mocks.database.query.mock.calls[0];
    expect(sql).toContain('"source" = :action');
    expect(sql).toContain('"metadata"->>\'legacyReason\' = :legacyReason');
    expect(options.replacements).toMatchObject({
      userId: 7,
      action: 'workout_completion',
      legacyReason: 'workout_completed'
    });
  });

  it('returns every recent action row so rapid-action detection can trigger', async () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      source: 'social_engagement'
    }));
    mocks.database.query.mockResolvedValue(rows);

    const recentActions = await service.getRecentActions(7, 5);

    expect(recentActions).toHaveLength(10);
    expect(recentActions).toEqual(rows);
  });

  it('reads daily-login session metrics from social engagement rows with legacy reason', async () => {
    const loginTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    mocks.database.query
      .mockResolvedValueOnce([{ createdAt: loginTime }])
      .mockResolvedValueOnce([{ cnt: '3' }]);

    const minutes = await service.getCurrentSessionLength(7);
    const count = await service.getDailyLoginCount(7);

    expect(minutes).toBeGreaterThanOrEqual(9);
    expect(count).toBe(3);
    const [sessionSql, sessionOptions] = mocks.database.query.mock.calls[0];
    const [countSql, countOptions] = mocks.database.query.mock.calls[1];
    expect(sessionSql).toContain('"source" = :action');
    expect(sessionSql).toContain('"metadata"->>\'legacyReason\' = :legacyReason');
    expect(sessionOptions.replacements).toMatchObject({
      userId: 7,
      action: 'social_engagement',
      legacyReason: 'daily_login'
    });
    expect(countSql).toContain('"source" = :action');
    expect(countSql).toContain('"metadata"->>\'legacyReason\' = :legacyReason');
    expect(countOptions.replacements).toMatchObject({
      userId: 7,
      action: 'social_engagement',
      legacyReason: 'daily_login'
    });
  });

  it('reports ethics compliance as explicitly unverified when no audit ledger is connected', async () => {
    const status = await service.getComplianceStatus();

    expect(status).toMatchObject({
      status: 'not_verified',
      score: null,
      verificationStatus: 'not_verified',
      details: {
        verificationStatus: 'not_verified',
        lastAudit: null,
        metrics: {
          avgSessionLength: null,
          usersWithWarnings: null,
          complianceScore: null,
          interventionsToday: null,
          dataSource: 'not_connected',
          verificationStatus: 'not_verified'
        },
        ethicalPrinciples: {
          healthyEngagement: 'not_verified',
          inclusiveCompetition: 'not_verified',
          positiveReinforcement: 'not_verified',
          noAddictivePatterns: 'not_verified'
        }
      }
    });
    expect(status.details.recommendations).toEqual(expect.any(Array));
    expect(status.timestamp).toEqual(expect.any(String));
  });

  it('does not pass user-feature ethical compliance from static placeholder scores', async () => {
    const compliance = await service.checkCompliance(7, 'leaderboard');

    expect(compliance).toMatchObject({
      passed: false,
      score: null,
      verificationStatus: 'not_verified',
      dataSource: 'not_connected',
      feature: 'leaderboard'
    });
    expect(compliance.issues).toContain('verification_not_connected');
    expect(compliance.recommendations).toEqual(expect.any(Array));
  });

  it('marks engagement health as unverified when engagement telemetry is disconnected', async () => {
    const health = await service.checkUserEngagementHealth(7);

    expect(health).toMatchObject({
      healthy: false,
      dataSource: 'not_connected',
      verificationStatus: 'not_verified',
      metrics: {
        avgSessionTime: null,
        actionFrequency: null,
        breakPatterns: {
          frequency: null,
          dataSource: 'not_connected'
        },
        variabilityScore: null
      }
    });
    expect(health.recommendations).toContain('Engagement health telemetry is not connected');
  });

  it('marks addiction risk as unknown when addiction telemetry is disconnected', async () => {
    const risk = await service.checkAddictionIndicators(7);

    expect(risk).toMatchObject({
      riskLevel: 'unknown',
      score: null,
      dataSource: 'not_connected',
      verificationStatus: 'not_verified',
      indicators: {
        compulsiveChecking: null,
        toleranceIncrease: null,
        withdrawalSigns: null,
        neglectOtherActivities: null
      }
    });
    expect(risk.recommendations).toContain('Addiction-risk telemetry is not connected');
  });

  it('does not alter feature compliance checks from disconnected telemetry', async () => {
    const checks = { score: 100, issues: [], recommendations: [] };

    await service.performFeatureSpecificChecks(7, 'leaderboard', checks);
    await service.performFeatureSpecificChecks(7, 'achievements', checks);
    await service.performFeatureSpecificChecks(7, 'points', checks);

    expect(checks).toEqual({ score: 100, issues: [], recommendations: [] });
  });

  it('does not fabricate static compliance metrics or random support messages in the active ethics service', () => {
    const combinedSource = [
      ethicsSource,
      ethicsConfigSource,
      ethicsComplianceSource,
      ethicsLedgerSource,
      ethicsRulesSource,
      ethicsTelemetrySource
    ].join('\n');

    expect(combinedSource).toContain('buildUnverifiedGamificationComplianceStatus');
    expect(combinedSource).toContain('buildUnverifiedEngagementHealth');
    expect(combinedSource).toContain('hasVerifiedEngagementMetrics');
    expect(combinedSource).toContain("verificationStatus: 'not_verified'");
    expect(combinedSource).toContain('lastAudit: null');
    expect(combinedSource).not.toContain('Math.random');
    expect(combinedSource).not.toContain("noAddictivePatterns: 'verified'");
    expect(combinedSource).not.toContain('async getAverageSessionLength() { return 35; }');
    expect(combinedSource).not.toContain('async getUsersWithWarningsCount() { return 12; }');
    expect(combinedSource).not.toContain('async calculateComplianceScore() { return 92; }');
    expect(combinedSource).not.toContain('async getInterventionsToday() { return 5; }');
    expect(combinedSource).not.toContain('new Date(Date.now() - 86400000).toISOString()');
    expect(combinedSource).not.toContain('async getUserAverageSessionTime(userId) { return 45; }');
    expect(combinedSource).not.toContain('async getUserActionFrequency(userId) { return 25; }');
    expect(combinedSource).not.toContain('async getCompulsiveCheckingScore(userId) { return 0.2; }');
    expect(combinedSource).not.toContain('async getCompetitiveScore(userId) { return 0.5; }');
  });

  it('keeps the active ethics service and extracted helpers under the Rule-4 line cap', () => {
    const helperSources = [
      ['ethicalGamificationLedger.mjs', ethicsLedgerSource],
      ['ethicalGamificationRules.mjs', ethicsRulesSource],
      ['ethicalGamificationTelemetry.mjs', ethicsTelemetrySource],
      ['ethicalGamificationConfig.mjs', ethicsConfigSource],
      ['ethicalGamificationCompliance.mjs', ethicsComplianceSource]
    ];

    expect(countSourceLines(ethicsSource)).toBeLessThanOrEqual(300);
    for (const [name, source] of helperSources) {
      expect(source.length, `${name} should exist`).toBeGreaterThan(0);
      expect(countSourceLines(source), name).toBeLessThanOrEqual(300);
    }
  });
});
