import { describe, expect, it } from 'vitest';
import type { PainEntry } from '../../services/painEntryService';
import { buildPainChartInsight, formatPainRegionLabel } from './painChartInsights';

const painEntry = (overrides: Partial<PainEntry>): PainEntry => ({
  id: 1,
  userId: 47,
  createdById: 9,
  bodyRegion: 'left_knee',
  side: 'left',
  painLevel: 5,
  painType: 'aching',
  description: 'Client free-text should not enter the prompt snippet',
  onsetDate: '2026-06-20',
  isActive: true,
  resolvedAt: null,
  aggravatingMovements: null,
  relievingFactors: null,
  trainerNotes: 'Trainer private note should stay out of generated context',
  aiNotes: null,
  posturalSyndrome: 'none',
  assessmentFindings: null,
  createdAt: '2026-06-20T10:00:00.000Z',
  updatedAt: '2026-06-21T10:00:00.000Z',
  ...overrides,
});

describe('pain chart insights', () => {
  it('builds review-level constraints from severe active pain without leaking free text', () => {
    const insight = buildPainChartInsight([
      painEntry({
        id: 11,
        bodyRegion: 'left_knee',
        painLevel: 8,
        painType: 'sharp',
        aggravatingMovements: 'Squatting with PrivateName, Running',
        relievingFactors: 'Foam Rolling with PrivateName',
      }),
      painEntry({
        id: 12,
        bodyRegion: 'right_shoulder',
        painLevel: 2,
        painType: 'stiffness',
        isActive: false,
        resolvedAt: '2026-06-22T10:00:00.000Z',
      }),
    ]);

    expect(insight.activeEntries).toHaveLength(1);
    expect(insight.resolvedEntries).toHaveLength(1);
    expect(insight.needsTrainerReview).toBe(true);
    expect(insight.safetyMessages.join(' ')).toContain('Trainer review needed');
    expect(insight.workoutConstraints.riskBand).toBe('review');
    expect(insight.workoutConstraints.avoidMovements).toContain('Squatting with PrivateName');
    expect(insight.workoutConstraints.avoidMovements).toContain('Plyometrics');
    expect(insight.workoutConstraints.warmupPriorities).toContain('Foam Rolling with PrivateName if pain-free');
    expect(insight.workoutConstraints.promptSnippet).toContain('Left Knee 8/10 sharp');
    expect(insight.workoutConstraints.promptSnippet).toContain('Plyometrics');
    expect(insight.workoutConstraints.promptSnippet).not.toContain('Squatting with PrivateName');
    expect(insight.workoutConstraints.promptSnippet).not.toContain('Foam Rolling');
    expect(insight.workoutConstraints.promptSnippet).not.toContain('PrivateName');
    expect(insight.workoutConstraints.promptSnippet).not.toContain('free-text');
    expect(insight.workoutConstraints.promptSnippet).not.toContain('Trainer private');
  });

  it('flags numbness and tingling as trainer-review signals even below severe level', () => {
    const insight = buildPainChartInsight([
      painEntry({
        id: 21,
        bodyRegion: 'lower_back_left',
        painLevel: 4,
        painType: 'tingling',
        aggravatingMovements: 'Deadlifting',
      }),
    ]);

    expect(insight.redFlagTypes).toEqual(['tingling']);
    expect(insight.needsTrainerReview).toBe(true);
    expect(insight.safetyMessages.join(' ')).toContain('Numbness, tingling, or burning');
    expect(insight.workoutConstraints.modifyMovements).toContain('Deadlifting');
    expect(insight.workoutConstraints.warmupPriorities).toContain('Core bracing prep');
  });

  it('returns clear constraints when only resolved entries remain', () => {
    const insight = buildPainChartInsight([
      painEntry({ id: 31, isActive: false, resolvedAt: '2026-06-23T10:00:00.000Z' }),
    ]);

    expect(insight.activeEntries).toHaveLength(0);
    expect(insight.resolvedEntries).toHaveLength(1);
    expect(insight.needsTrainerReview).toBe(false);
    expect(insight.workoutConstraints.riskBand).toBe('clear');
    expect(insight.workoutConstraints.promptSnippet).toBe('');
    expect(insight.safetyMessages).toEqual([]);
  });

  it('derives trend and follow-up reminders from active and resolved history', () => {
    const insight = buildPainChartInsight([
      painEntry({
        id: 41,
        painLevel: 3,
        isActive: false,
        resolvedAt: '2026-06-10T10:00:00.000Z',
        updatedAt: '2026-06-10T10:00:00.000Z',
      }),
      painEntry({
        id: 42,
        bodyRegion: 'left_knee',
        painLevel: 6,
        isActive: false,
        resolvedAt: '2026-06-18T10:00:00.000Z',
        updatedAt: '2026-06-18T10:00:00.000Z',
      }),
      painEntry({
        id: 43,
        bodyRegion: 'left_knee',
        painLevel: 8,
        painType: 'sharp',
        isActive: true,
        resolvedAt: null,
        updatedAt: '2026-06-22T10:00:00.000Z',
      }),
    ], { now: '2026-06-30T12:00:00.000Z' });

    expect(insight.severityTrend.direction).toBe('worsening');
    expect(insight.severityTrend.delta).toBe(5);
    expect(insight.severityTrend.points.map((point) => point.painLevel)).toEqual([3, 6, 8]);
    expect(insight.severityTrend.summary).toContain('3/10 to 8/10');
    expect(insight.followUpReminders).toContain('Trainer review before next hard loading for Left Knee.');
    expect(insight.followUpReminders).toContain('Re-check Left Knee - active report has not been updated in 7+ days.');
  });
  it('uses body-region definitions for readable labels', () => {
    expect(formatPainRegionLabel('left_rotator_cuff')).toBe('Left Rotator Cuff');
    expect(formatPainRegionLabel('unknown_region')).toBe('Unknown Region');
  });
});