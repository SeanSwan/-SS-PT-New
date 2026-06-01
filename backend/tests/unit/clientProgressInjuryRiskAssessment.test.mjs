import { describe, expect, it } from 'vitest';
import { buildInjuryRiskAssessment } from '../../routes/clientProgressRoutes.mjs';

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

describe('client progress injury risk assessment builder', () => {
  it('derives risk categories from real progress levels, pain entries, and workout sessions', () => {
    const result = buildInjuryRiskAssessment({
      clientProgress: {
        balanceLevel: 200,
        stabilityLevel: 300,
        flexibilityLevel: 400,
        injuryPreventionLevel: 100,
        injuryRecoveryLevel: 0,
      },
      painEntries: [
        {
          id: 12,
          userId: 7,
          bodyRegion: 'lower_back',
          side: 'center',
          painLevel: 8,
          painType: 'aching',
          isActive: true,
          aggravatingMovements: 'hinge, squat',
        },
      ],
      recentSessions: [
        { date: daysAgo(2), duration: 60, intensity: 8, status: 'completed' },
        { date: daysAgo(6), duration: 70, intensity: 9, status: 'completed' },
        { date: daysAgo(21), duration: 30, intensity: 5, status: 'completed' },
      ],
    });

    expect(result.overallRisk).toBe('high');
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
    expect(result.categories.map((category) => category.id)).toEqual([
      'active-pain',
      'movement-capacity',
      'recovery-load',
      'training-progression',
    ]);
    expect(result.categories[0].findings[0]).toMatchObject({
      pattern: 'Lower Back pain',
      status: 'caution',
      recommendation: 'Modify or avoid: hinge, squat.',
    });
    expect(result.criticalAlerts.some((alert) => alert.title === 'Active high pain entry')).toBe(true);
    expect(result.correctiveProtocol.inhibit[0]).toMatchObject({
      muscle: 'Lower Back',
      exercise: 'Trainer-approved tissue prep',
    });
    expect(JSON.stringify(result)).not.toMatch(/Proper knee tracking|Averaging 5\.5 hours|Recovery Deficit|Volume Spike|Couch Stretch|Clamshells/);
  });

  it('returns an honest empty assessment when no evidence exists', () => {
    const result = buildInjuryRiskAssessment({
      clientProgress: null,
      painEntries: [],
      recentSessions: [],
    });

    expect(result).toMatchObject({
      overallRisk: 'low',
      riskScore: 0,
      categories: [],
      criticalAlerts: [],
      recommendations: [],
      correctiveProtocol: {
        inhibit: [],
        lengthen: [],
        activate: [],
        integrate: [],
      },
    });
  });
});
