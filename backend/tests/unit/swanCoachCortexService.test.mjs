import { describe, expect, it } from 'vitest';
import {
  buildSwanCoachReadinessContext,
  getSwanCoachCortexPolicy,
  normalizeReadinessCheck,
} from '../../services/swanCoachCortexService.mjs';

describe('swanCoachCortexService', () => {
  it('loads approved coach-brain notes into a structured readiness policy', async () => {
    const policy = await getSwanCoachCortexPolicy({ forceReload: true });

    expect(policy.source).toBe('swan_coach_cortex');
    expect(policy.reviewStatus).toBe('approved');
    expect(policy.notes.length).toBeGreaterThanOrEqual(11);
    expect(policy.domains).toEqual(expect.arrayContaining([
      'joint_integrity_release',
      'guided_generation',
      'client_output_privacy',
    ]));
    expect(policy.readiness.levels.map((level) => level.level)).toEqual(['green', 'yellow', 'red']);
    expect(policy.readiness.signals).toEqual(expect.arrayContaining([
      'tightness',
      'soreness',
      'range_of_motion',
      'recent_heavy_training',
      'tissue_quality',
    ]));
    expect(policy.readiness.clientSafeLanguage).toMatch(/training background/i);
    expect(policy.readiness.clientSafeLanguage).not.toMatch(/arthritis|diagnosis|surgery/i);
  });

  it('normalizes trainer readiness checks without preserving free-text private notes', () => {
    const normalized = normalizeReadinessCheck({
      tightness: 'Forearms and elbow, Marcus surgery detail',
      soreness: 'Chest from heavy weekend with private name',
      rangeOfMotion: 'Limited',
      recentHeavyTraining: true,
      redFlags: false,
      focusAreas: ['forearms', 'elbow', 'feet', 'private-client-name'],
      notes: 'Client named Marcus had surgery and private pain story',
    });

    expect(normalized).toEqual(expect.objectContaining({
      tightness: 'forearms, elbow',
      soreness: 'chest',
      rangeOfMotion: 'limited',
      recentHeavyTraining: true,
      redFlags: false,
    }));
    expect(normalized.focusAreas).toEqual(['forearms', 'elbow', 'feet']);
    expect(normalized).not.toHaveProperty('notes');
    expect(JSON.stringify(normalized)).not.toMatch(/Marcus|surgery|private pain|private name|weekend/i);
  });

  it('classifies readiness and returns trainer-useful but client-safe guidance', async () => {
    const readiness = await buildSwanCoachReadinessContext({
      category: 'arms',
      primaryGoal: 'strength',
      readinessCheck: {
        tightness: 'forearms',
        soreness: 'elbow',
        rangeOfMotion: 'limited',
        recentHeavyTraining: true,
        focusAreas: ['forearms', 'elbow'],
      },
      clientContext: {
        pain: { warnings: [{ bodyRegion: 'elbow', painLevel: 4 }], exclusions: [] },
        movement: { compensations: [] },
        workouts: { avgFormRating: 3.2, sessionsLast2Weeks: 5 },
        criticalDataUnavailable: false,
      },
    });

    expect(readiness.level).toBe('yellow');
    expect(readiness.constraints.avoidAggressiveIntensity).toBe(true);
    expect(readiness.constraints.preferControlledRange).toBe(true);
    expect(readiness.trainerNote).toMatch(/forearms|elbow|release|range of motion/i);
    expect(readiness.clientSafeNote).toMatch(/training background|current movement needs/i);
    expect(readiness.clientSafeNote).not.toMatch(/arthritis|diagnosis|surgery|pain story/i);
    expect(readiness.candidateScoring).toEqual(expect.arrayContaining([
      expect.stringMatching(/prefer/i),
    ]));
  });
});