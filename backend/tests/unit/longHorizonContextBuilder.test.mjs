/**
 * longHorizonContextBuilder — Phase 5C-B Unit Tests
 * ==================================================
 * Tests for the long-horizon context builder pure computation helpers.
 *
 * Covers:
 *   - Progression trend computation (per-exercise load/volume/rep trends)
 *   - Adherence metrics (scheduled vs completed, consistency flags)
 *   - Fatigue/RPE trends (4w/8w windows)
 *   - Injury/restriction extraction (OHSA compensations)
 *   - Goal progress extraction
 *   - Body composition trends
 *   - PII safety (no identifying fields in output)
 *   - Null safety (graceful degradation on missing data)
 *
 * Phase 5C — Long-Horizon Planning Engine
 */
import { describe, it, expect } from 'vitest';
import {
  computeProgressionTrends,
  computeAdherence,
  computeFatigueTrends,
  extractInjuryRestrictions,
  extractGoalProgress,
  computeBodyCompositionTrend,
} from '../../services/ai/longHorizonContextBuilder.mjs';

// ── Test data factories ─────────────────────────────────────────────

function makeLog(exerciseName, weight, reps, date, rpe = null) {
  return { exerciseName, weight, reps, date, rpe };
}

function makeSession(date, avgRPE = null, intensity = null) {
  return { date, avgRPE, intensity, status: 'completed', createdAt: date };
}

const WINDOW_4W = { weeks: 4, label: '4w' };
const WINDOW_8W = { weeks: 8, label: '8w' };
const WINDOW_12W = { weeks: 12, label: '12w' };

// ── computeProgressionTrends ────────────────────────────────────────

describe('computeProgressionTrends', () => {
  it('1 — returns empty metrics for null input', () => {
    const result = computeProgressionTrends(null, WINDOW_4W);
    expect(result.period).toBe('4w');
    expect(result.metrics).toEqual([]);
  });

  it('2 — returns empty metrics for empty array', () => {
    const result = computeProgressionTrends([], WINDOW_12W);
    expect(result.period).toBe('12w');
    expect(result.metrics).toEqual([]);
  });

  it('3 — single data point returns insufficient_data', () => {
    const logs = [makeLog('Squat', 100, 10, '2026-02-01')];
    const result = computeProgressionTrends(logs, WINDOW_4W);
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0].exercise).toBe('Squat');
    expect(result.metrics[0].volumeTrend).toBe('insufficient_data');
    expect(result.metrics[0].loadTrend).toBe('insufficient_data');
    expect(result.metrics[0].dataPoints).toBe(1);
  });

  it('4 — detects increasing load trend', () => {
    const logs = [
      makeLog('Bench Press', 100, 10, '2026-01-01'),
      makeLog('Bench Press', 105, 10, '2026-01-08'),
      makeLog('Bench Press', 130, 10, '2026-01-15'),
      makeLog('Bench Press', 135, 10, '2026-01-22'),
    ];
    const result = computeProgressionTrends(logs, WINDOW_4W);
    expect(result.metrics[0].loadTrend).toBe('increasing');
  });

  it('5 — detects decreasing volume trend', () => {
    const logs = [
      makeLog('Deadlift', 200, 10, '2026-01-01'), // vol = 2000
      makeLog('Deadlift', 200, 10, '2026-01-08'), // vol = 2000
      makeLog('Deadlift', 150, 8, '2026-01-15'),  // vol = 1200
      makeLog('Deadlift', 150, 8, '2026-01-22'),  // vol = 1200
    ];
    const result = computeProgressionTrends(logs, WINDOW_4W);
    expect(result.metrics[0].volumeTrend).toBe('decreasing');
  });

  it('6 — detects stable trend within 10% threshold', () => {
    const logs = [
      makeLog('OHP', 60, 10, '2026-01-01'),
      makeLog('OHP', 62, 10, '2026-01-08'),
      makeLog('OHP', 61, 10, '2026-01-15'),
      makeLog('OHP', 63, 10, '2026-01-22'),
    ];
    const result = computeProgressionTrends(logs, WINDOW_4W);
    expect(result.metrics[0].loadTrend).toBe('stable');
  });

  it('7 — multiple exercises tracked independently', () => {
    const logs = [
      makeLog('Squat', 100, 10, '2026-01-01'),
      makeLog('Squat', 130, 10, '2026-01-15'),
      makeLog('Bench', 80, 10, '2026-01-01'),
      makeLog('Bench', 60, 10, '2026-01-15'),
    ];
    const result = computeProgressionTrends(logs, WINDOW_4W);
    expect(result.metrics).toHaveLength(2);
    const squat = result.metrics.find(m => m.exercise === 'Squat');
    const bench = result.metrics.find(m => m.exercise === 'Bench');
    expect(squat.loadTrend).toBe('increasing');
    expect(bench.loadTrend).toBe('decreasing');
  });

  it('8 — caps at 15 exercises sorted by dataPoints', () => {
    const logs = [];
    for (let i = 0; i < 20; i++) {
      logs.push(makeLog(`Exercise_${i}`, 100, 10, '2026-01-01'));
      logs.push(makeLog(`Exercise_${i}`, 110, 10, '2026-01-15'));
    }
    const result = computeProgressionTrends(logs, WINDOW_4W);
    expect(result.metrics).toHaveLength(15);
  });

  it('9 — uses correct window label', () => {
    expect(computeProgressionTrends([], WINDOW_4W).period).toBe('4w');
    expect(computeProgressionTrends([], WINDOW_8W).period).toBe('8w');
    expect(computeProgressionTrends([], WINDOW_12W).period).toBe('12w');
  });

  it('10 — skips logs with no exerciseName', () => {
    const logs = [
      makeLog(null, 100, 10, '2026-01-01'),
      makeLog('Squat', 100, 10, '2026-01-01'),
      makeLog('Squat', 120, 10, '2026-01-15'),
    ];
    const result = computeProgressionTrends(logs, WINDOW_4W);
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0].exercise).toBe('Squat');
  });
});

// ── computeAdherence ────────────────────────────────────────────────

describe('computeAdherence', () => {
  const refDate = new Date('2026-02-26');

  it('11 — returns zero adherence for null sessions', () => {
    const result = computeAdherence(null, 4);
    expect(result.completedSessions).toBe(0);
    expect(result.adherenceRate).toBe(0);
    expect(result.consistencyFlags).toContain('no_workout_data');
  });

  it('12 — returns zero adherence for empty sessions', () => {
    const result = computeAdherence([], 4);
    expect(result.completedSessions).toBe(0);
    expect(result.consistencyFlags).toContain('no_workout_data');
  });

  it('13 — computes correct adherence rate', () => {
    // 4 weeks × 3/week = 12 scheduled, 6 completed = 0.5
    const sessions = Array.from({ length: 6 }, (_, i) =>
      makeSession(new Date(refDate - i * 4 * 24 * 60 * 60 * 1000).toISOString())
    );
    const result = computeAdherence(sessions, 4, refDate);
    expect(result.scheduledSessions).toBe(12);
    expect(result.completedSessions).toBe(6);
    expect(result.adherenceRate).toBe(0.5);
  });

  it('14 — adherence rate capped at 1.0', () => {
    // 4 weeks × 3/week = 12 scheduled, 20 completed (overachievement)
    const sessions = Array.from({ length: 20 }, (_, i) =>
      makeSession(new Date(refDate - i * 1 * 24 * 60 * 60 * 1000).toISOString())
    );
    const result = computeAdherence(sessions, 4, refDate);
    expect(result.adherenceRate).toBeLessThanOrEqual(1);
  });

  it('15 — detects missed 3+ consecutive weeks', () => {
    const sessions = [
      makeSession('2026-01-01'),
      makeSession('2026-02-01'), // 31 day gap
    ];
    const result = computeAdherence(sessions, 8, refDate);
    expect(result.consistencyFlags).toContain('missed_3_consecutive_weeks');
  });

  it('16 — detects missed 2 consecutive weeks (14-21 day gap)', () => {
    const sessions = [
      makeSession('2026-02-05'),
      makeSession('2026-02-22'), // 17 day gap
    ];
    const result = computeAdherence(sessions, 4, refDate);
    expect(result.consistencyFlags).toContain('missed_2_consecutive_weeks');
  });

  it('17 — flags inactive_14_plus_days when last workout is old', () => {
    const sessions = [makeSession('2026-02-01')];
    const result = computeAdherence(sessions, 4, new Date('2026-02-26'));
    expect(result.consistencyFlags).toContain('inactive_14_plus_days');
  });

  it('18 — flags low_adherence when rate < 0.5', () => {
    // 12 weeks × 3 = 36 scheduled, 5 completed = 0.14
    const sessions = Array.from({ length: 5 }, (_, i) =>
      makeSession(new Date(refDate - i * 7 * 24 * 60 * 60 * 1000).toISOString())
    );
    const result = computeAdherence(sessions, 12, refDate);
    expect(result.consistencyFlags).toContain('low_adherence');
  });

  it('19 — marks consistent when no flags', () => {
    // All sessions recent, no big gaps
    const sessions = Array.from({ length: 12 }, (_, i) =>
      makeSession(new Date(refDate - i * 2 * 24 * 60 * 60 * 1000).toISOString())
    );
    const result = computeAdherence(sessions, 4, refDate);
    expect(result.consistencyFlags).toContain('consistent');
  });
});

// ── computeFatigueTrends ────────────────────────────────────────────

describe('computeFatigueTrends', () => {
  it('20 — returns insufficient_data for null sessions', () => {
    const result = computeFatigueTrends(null);
    expect(result.avgRpe4w).toBeNull();
    expect(result.avgRpe8w).toBeNull();
    expect(result.trend).toBe('insufficient_data');
  });

  it('21 — returns insufficient_data for empty sessions', () => {
    const result = computeFatigueTrends([]);
    expect(result.trend).toBe('insufficient_data');
  });

  it('22 — returns insufficient_data when sessions have no RPE', () => {
    const sessions = [
      makeSession(new Date().toISOString(), null, null),
    ];
    const result = computeFatigueTrends(sessions);
    expect(result.avgRpe4w).toBeNull();
    expect(result.trend).toBe('insufficient_data');
  });

  it('23 — computes avgRpe4w from recent sessions', () => {
    const now = new Date();
    const sessions = [
      makeSession(new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), 7),
      makeSession(new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(), 8),
      makeSession(new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString(), 6),
    ];
    const result = computeFatigueTrends(sessions);
    expect(result.avgRpe4w).toBe(7);
  });

  it('24 — detects increasing RPE trend (4w > 8w by > 0.5)', () => {
    const now = new Date();
    const sessions = [
      // Recent 4 weeks: high RPE
      makeSession(new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), 9),
      makeSession(new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(), 8.5),
      // 4-8 weeks ago: lower RPE
      makeSession(new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(), 6),
      makeSession(new Date(now - 42 * 24 * 60 * 60 * 1000).toISOString(), 6),
    ];
    const result = computeFatigueTrends(sessions);
    expect(result.trend).toBe('increasing');
  });

  it('25 — detects stable RPE trend (diff <= 0.5)', () => {
    const now = new Date();
    const sessions = [
      makeSession(new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), 7),
      makeSession(new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(), 7),
    ];
    const result = computeFatigueTrends(sessions);
    expect(result.trend).toBe('stable');
  });

  it('26 — falls back to intensity when avgRPE is null', () => {
    const now = new Date();
    const sessions = [
      makeSession(new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), null, 8),
    ];
    const result = computeFatigueTrends(sessions);
    expect(result.avgRpe4w).toBe(8);
  });
});

// ── extractInjuryRestrictions ───────────────────────────────────────

describe('extractInjuryRestrictions', () => {
  it('27 — returns empty arrays for null baseline', () => {
    const result = extractInjuryRestrictions(null);
    expect(result.active).toEqual([]);
    expect(result.resolved).toEqual([]);
  });

  it('28 — returns empty arrays when no compensations', () => {
    const baseline = { overheadSquatAssessment: null, correctiveExerciseStrategy: null };
    const result = extractInjuryRestrictions(baseline);
    expect(result.active).toEqual([]);
  });

  it('29 — extracts OHSA compensations from anteriorView', () => {
    const baseline = {
      overheadSquatAssessment: {
        anteriorView: { kneeValgus: 'moderate', feetTurnout: 'none' },
      },
      takenAt: '2026-01-15',
    };
    const result = extractInjuryRestrictions(baseline);
    expect(result.active).toHaveLength(1);
    expect(result.active[0].area).toBe('knee valgus');
    expect(result.active[0].type).toBe('moderate compensation');
    expect(result.active[0].since).toBe('2026-01-15');
  });

  it('30 — extracts OHSA compensations from lateralView', () => {
    const baseline = {
      overheadSquatAssessment: {
        lateralView: { excessiveForwardLean: 'significant', lowBackArch: 'minor' },
      },
      takenAt: '2026-02-01',
    };
    const result = extractInjuryRestrictions(baseline);
    expect(result.active).toHaveLength(2);
    const areas = result.active.map(a => a.area);
    expect(areas).toContain('excessive forward lean');
    expect(areas).toContain('low back arch');
  });

  it('31 — deduplicates corrective strategy compensations', () => {
    const baseline = {
      overheadSquatAssessment: {
        anteriorView: { kneeValgus: 'moderate' },
      },
      correctiveExerciseStrategy: {
        compensationsIdentified: ['knee valgus', 'hip flexor tightness'],
      },
      takenAt: '2026-01-15',
    };
    const result = extractInjuryRestrictions(baseline);
    // 'knee valgus' should appear once (from OHSA), 'hip flexor tightness' added
    expect(result.active).toHaveLength(2);
    const areas = result.active.map(a => a.area);
    expect(areas).toContain('knee valgus');
    expect(areas).toContain('hip flexor tightness');
  });

  it('32 — handles missing takenAt gracefully', () => {
    const baseline = {
      overheadSquatAssessment: {
        anteriorView: { feetFlattening: 'minor' },
      },
    };
    const result = extractInjuryRestrictions(baseline);
    expect(result.active[0].since).toBeNull();
  });
});

// ── extractGoalProgress ─────────────────────────────────────────────

describe('extractGoalProgress', () => {
  it('33 — returns null primaryGoal for no goals', () => {
    expect(extractGoalProgress(null).primaryGoal).toBeNull();
    expect(extractGoalProgress([]).primaryGoal).toBeNull();
  });

  it('34 — uses category ENUM as primaryGoal (not user-authored title)', () => {
    const goals = [{ title: 'Build Muscle', category: 'strength', milestones: [] }];
    const result = extractGoalProgress(goals);
    expect(result.primaryGoal).toBe('strength');
  });

  it('35 — returns null when category is missing', () => {
    const goals = [{ title: 'Custom Goal', category: null, milestones: [] }];
    const result = extractGoalProgress(goals);
    expect(result.primaryGoal).toBeNull();
  });

  it('36 — extracts milestones with achieved status', () => {
    const goals = [{
      category: 'weight',
      milestones: [
        { percentage: 50, achieved: true, achievedAt: '2026-02-10T00:00:00Z' },
        { percentage: 100, achieved: false, achievedAt: null },
      ],
    }];
    const result = extractGoalProgress(goals);
    expect(result.milestones).toHaveLength(2);
    expect(result.milestones[0].achieved).toBe(true);
    expect(result.milestones[0].achievedOn).toBe('2026-02-10');
    expect(result.milestones[1].achieved).toBe(false);
    expect(result.milestones[1].achievedOn).toBeNull();
  });

  it('37 — milestone labels use percentage format (no user text)', () => {
    const goals = [{
      category: 'strength',
      milestones: [{ percentage: 50, achieved: false }],
    }];
    const result = extractGoalProgress(goals);
    expect(result.milestones[0].label).toBe('strength milestone at 50%');
  });

  it('38 — handles goals with no milestones array', () => {
    const goals = [{ category: 'flexibility', milestones: null }];
    const result = extractGoalProgress(goals);
    expect(result.milestones).toEqual([]);
  });

  it('38a — goal titles never appear in output (PII safety)', () => {
    const goals = [{
      title: 'Help John Smith lose weight',
      category: 'weight',
      milestones: [{ label: 'John target reached', percentage: 75, achieved: false }],
    }];
    const result = extractGoalProgress(goals);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('John');
    expect(serialized).not.toContain('Smith');
    expect(serialized).not.toContain('Help');
    expect(result.primaryGoal).toBe('weight');
  });
});

// ── computeBodyCompositionTrend ─────────────────────────────────────

describe('computeBodyCompositionTrend', () => {
  it('39 — returns null for no measurements', () => {
    expect(computeBodyCompositionTrend(null)).toBeNull();
    expect(computeBodyCompositionTrend([])).toBeNull();
  });

  it('40 — returns insufficient_data for single measurement', () => {
    const result = computeBodyCompositionTrend([{ bodyFatPercentage: 20 }]);
    expect(result.available).toBe(true);
    expect(result.trend).toBe('insufficient_data');
    expect(result.dataPoints).toBe(1);
  });

  it('41 — detects improving trend (body fat decreasing > 3%)', () => {
    const measurements = [
      { bodyFatPercentage: 25 },
      { bodyFatPercentage: 24 },
      { bodyFatPercentage: 22 },
      { bodyFatPercentage: 21 },
    ];
    const result = computeBodyCompositionTrend(measurements);
    expect(result.trend).toBe('improving');
  });

  it('42 — detects regressing trend (body fat increasing > 3%)', () => {
    const measurements = [
      { bodyFatPercentage: 18 },
      { bodyFatPercentage: 19 },
      { bodyFatPercentage: 21 },
      { bodyFatPercentage: 22 },
    ];
    const result = computeBodyCompositionTrend(measurements);
    expect(result.trend).toBe('regressing');
  });

  it('43 — detects stable trend (within 3% threshold)', () => {
    const measurements = [
      { bodyFatPercentage: 20 },
      { bodyFatPercentage: 20.1 },
      { bodyFatPercentage: 19.9 },
      { bodyFatPercentage: 20 },
    ];
    const result = computeBodyCompositionTrend(measurements);
    expect(result.trend).toBe('stable');
  });

  it('44 — falls back to weight when bodyFatPercentage missing', () => {
    const measurements = [
      { weight: 180 },
      { weight: 182 },
      { weight: 190 },
      { weight: 195 },
    ];
    const result = computeBodyCompositionTrend(measurements);
    expect(result.available).toBe(true);
    expect(result.dataPoints).toBe(4);
    expect(result.trend).toBe('regressing');
  });

  it('45 — filters out null values', () => {
    const measurements = [
      { bodyFatPercentage: null, weight: null },
      { bodyFatPercentage: 20 },
      { bodyFatPercentage: 19 },
    ];
    const result = computeBodyCompositionTrend(measurements);
    expect(result.dataPoints).toBe(2);
  });
});

// ── PII safety ──────────────────────────────────────────────────────

describe('PII safety — no identifying fields in output', () => {
  const PII_FIELDS = ['email', 'phone', 'firstName', 'lastName', 'address', 'ssn', 'userId'];

  it('46 — computeProgressionTrends output has no PII', () => {
    const logs = [
      makeLog('Squat', 100, 10, '2026-01-01'),
      makeLog('Squat', 120, 10, '2026-01-15'),
    ];
    const serialized = JSON.stringify(computeProgressionTrends(logs, WINDOW_4W));
    for (const field of PII_FIELDS) {
      expect(serialized).not.toContain(`"${field}"`);
    }
  });

  it('47 — computeAdherence output has no PII', () => {
    const sessions = [makeSession('2026-02-20'), makeSession('2026-02-22')];
    const serialized = JSON.stringify(computeAdherence(sessions, 4));
    for (const field of PII_FIELDS) {
      expect(serialized).not.toContain(`"${field}"`);
    }
  });

  it('48 — extractInjuryRestrictions output has no PII', () => {
    const baseline = {
      overheadSquatAssessment: {
        anteriorView: { kneeValgus: 'moderate' },
      },
      takenAt: '2026-01-15',
    };
    const serialized = JSON.stringify(extractInjuryRestrictions(baseline));
    for (const field of PII_FIELDS) {
      expect(serialized).not.toContain(`"${field}"`);
    }
  });

  it('49 — extractGoalProgress output has no PII fields or user-authored text', () => {
    const goals = [{
      title: 'Help Jane Doe reach her goals',
      category: 'fitness',
      milestones: [{ label: 'Jane hit 50%', percentage: 50, achieved: true, achievedAt: '2026-02-10T00:00:00Z' }],
    }];
    const result = extractGoalProgress(goals);
    const serialized = JSON.stringify(result);
    // No PII field names
    for (const field of PII_FIELDS) {
      expect(serialized).not.toContain(`"${field}"`);
    }
    // No user-authored text leaking through
    expect(serialized).not.toContain('Jane');
    expect(serialized).not.toContain('Doe');
    expect(serialized).not.toContain('Help');
    // Uses category ENUM instead
    expect(result.primaryGoal).toBe('fitness');
  });
});

// ── Null safety ─────────────────────────────────────────────────────

describe('Null safety — all helpers handle missing data', () => {
  it('50 — all helpers accept null without throwing', () => {
    expect(() => computeProgressionTrends(null, WINDOW_4W)).not.toThrow();
    expect(() => computeAdherence(null, 4)).not.toThrow();
    expect(() => computeFatigueTrends(null)).not.toThrow();
    expect(() => extractInjuryRestrictions(null)).not.toThrow();
    expect(() => extractGoalProgress(null)).not.toThrow();
    expect(() => computeBodyCompositionTrend(null)).not.toThrow();
  });

  it('51 — all helpers accept undefined without throwing', () => {
    expect(() => computeProgressionTrends(undefined, WINDOW_4W)).not.toThrow();
    expect(() => computeAdherence(undefined, 4)).not.toThrow();
    expect(() => computeFatigueTrends(undefined)).not.toThrow();
    expect(() => extractInjuryRestrictions(undefined)).not.toThrow();
    expect(() => extractGoalProgress(undefined)).not.toThrow();
    expect(() => computeBodyCompositionTrend(undefined)).not.toThrow();
  });

  it('52 — extractInjuryRestrictions handles malformed OHSA', () => {
    // String instead of object
    expect(() => extractInjuryRestrictions({
      overheadSquatAssessment: 'invalid',
    })).not.toThrow();
    // Nested null
    expect(() => extractInjuryRestrictions({
      overheadSquatAssessment: { anteriorView: null },
    })).not.toThrow();
  });
});

// ── Security: no raw SQL ────────────────────────────────────────────

describe('Security — parameterized queries only', () => {
  it('53 — longHorizonContextBuilder contains no raw SQL', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../services/ai/longHorizonContextBuilder.mjs', import.meta.url),
      'utf-8'
    );
    expect(content).not.toMatch(/sequelize\.query\s*\(/);
    expect(content).not.toMatch(/queryInterface/);
  });
});
