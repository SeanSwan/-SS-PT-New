import { describe, it, expect } from 'vitest';
import {
  GOAL_CONFIG,
  normalizeGoal,
  resolveStartingPhase,
  buildGoalPhaseSequence,
  getGoalOptBias,
  ALLOWED_GOALS,
} from '../services/workoutBuilderGoalConfig.mjs';

const ALL_GOALS = [
  'general_fitness',
  'hypertrophy',
  'strength',
  'fat_loss',
  'athletic_performance',
  'golf_performance',
];

describe('workoutBuilderGoalConfig - allowlist', () => {
  it('exposes the six goals matching the route validator', () => {
    expect(ALLOWED_GOALS).toEqual(ALL_GOALS);
  });

  it('GOAL_CONFIG has an entry for every allowed goal', () => {
    for (const goal of ALL_GOALS) {
      expect(GOAL_CONFIG[goal]).toBeDefined();
    }
  });
});

describe('workoutBuilderGoalConfig - normalizeGoal', () => {
  it.each(ALL_GOALS)('passes through valid goal: %s', (goal) => {
    expect(normalizeGoal(goal)).toBe(goal);
  });

  it('falls back to general_fitness for unknown string', () => {
    expect(normalizeGoal('powerlifting')).toBe('general_fitness');
  });

  it('falls back to general_fitness for null/undefined/empty', () => {
    expect(normalizeGoal(null)).toBe('general_fitness');
    expect(normalizeGoal(undefined)).toBe('general_fitness');
    expect(normalizeGoal('')).toBe('general_fitness');
  });

  it('falls back to general_fitness for non-string types', () => {
    expect(normalizeGoal(42)).toBe('general_fitness');
    expect(normalizeGoal({})).toBe('general_fitness');
    expect(normalizeGoal([])).toBe('general_fitness');
  });
});

describe('workoutBuilderGoalConfig - resolveStartingPhase', () => {
  it('honors valid override 1-5', () => {
    for (const p of [1, 2, 3, 4, 5]) {
      expect(resolveStartingPhase({ startingPhaseOverride: p, contextPhase: 1 })).toBe(p);
    }
  });

  it('falls back to contextPhase when override is missing', () => {
    expect(resolveStartingPhase({ startingPhaseOverride: undefined, contextPhase: 3 })).toBe(3);
    expect(resolveStartingPhase({ startingPhaseOverride: null, contextPhase: 4 })).toBe(4);
  });

  it('falls back to contextPhase when override is out of range', () => {
    expect(resolveStartingPhase({ startingPhaseOverride: 0, contextPhase: 2 })).toBe(2);
    expect(resolveStartingPhase({ startingPhaseOverride: 6, contextPhase: 2 })).toBe(2);
    expect(resolveStartingPhase({ startingPhaseOverride: -1, contextPhase: 2 })).toBe(2);
  });

  it('falls back to contextPhase when override is non-integer', () => {
    expect(resolveStartingPhase({ startingPhaseOverride: '3', contextPhase: 2 })).toBe(2);
    expect(resolveStartingPhase({ startingPhaseOverride: 2.5, contextPhase: 2 })).toBe(2);
    expect(resolveStartingPhase({ startingPhaseOverride: NaN, contextPhase: 2 })).toBe(2);
  });

  it('defaults to 1 when neither override nor context is valid', () => {
    expect(resolveStartingPhase({ startingPhaseOverride: undefined, contextPhase: undefined })).toBe(1);
    expect(resolveStartingPhase({ startingPhaseOverride: null, contextPhase: 0 })).toBe(1);
    expect(resolveStartingPhase({ startingPhaseOverride: 99, contextPhase: 99 })).toBe(1);
  });

  it('is deterministic for the same inputs', () => {
    const a = resolveStartingPhase({ startingPhaseOverride: 3, contextPhase: 1 });
    const b = resolveStartingPhase({ startingPhaseOverride: 3, contextPhase: 1 });
    expect(a).toBe(b);
  });
});

describe('workoutBuilderGoalConfig - buildGoalPhaseSequence', () => {
  it('returns an array of length ceil(durationWeeks / 4) for each goal', () => {
    for (const goal of ALL_GOALS) {
      const seq = buildGoalPhaseSequence({ primaryGoal: goal, startingPhase: 1, durationWeeks: 12 });
      expect(seq).toHaveLength(3);
    }
    for (const goal of ALL_GOALS) {
      const seq = buildGoalPhaseSequence({ primaryGoal: goal, startingPhase: 1, durationWeeks: 24 });
      expect(seq).toHaveLength(6);
    }
  });

  it('clamps every phase into the 1-5 range', () => {
    for (const goal of ALL_GOALS) {
      const seq = buildGoalPhaseSequence({ primaryGoal: goal, startingPhase: 1, durationWeeks: 24 });
      for (const phase of seq) {
        expect(phase).toBeGreaterThanOrEqual(1);
        expect(phase).toBeLessThanOrEqual(5);
        expect(Number.isInteger(phase)).toBe(true);
      }
    }
  });

  it('every phase is at least startingPhase (override-as-floor)', () => {
    for (const goal of ALL_GOALS) {
      const seq = buildGoalPhaseSequence({ primaryGoal: goal, startingPhase: 3, durationWeeks: 24 });
      for (const phase of seq) {
        expect(phase).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('hypertrophy holds Phase 3 in the back half of a 24-week plan', () => {
    const seq = buildGoalPhaseSequence({ primaryGoal: 'hypertrophy', startingPhase: 1, durationWeeks: 24 });
    const backHalf = seq.slice(3);
    for (const phase of backHalf) {
      expect(phase).toBe(3);
    }
  });

  it('strength reaches Phase 4 and holds it', () => {
    const seq = buildGoalPhaseSequence({ primaryGoal: 'strength', startingPhase: 1, durationWeeks: 24 });
    expect(seq).toContain(4);
    const lastTwo = seq.slice(-2);
    for (const phase of lastTwo) {
      expect(phase).toBe(4);
    }
  });

  it('athletic_performance reaches Phase 5 by the final mesocycle', () => {
    const seq = buildGoalPhaseSequence({ primaryGoal: 'athletic_performance', startingPhase: 1, durationWeeks: 20 });
    expect(seq[seq.length - 1]).toBe(5);
  });

  it('fat_loss biases to Phase 2 for the bulk of the plan', () => {
    const seq = buildGoalPhaseSequence({ primaryGoal: 'fat_loss', startingPhase: 1, durationWeeks: 24 });
    const phase2Count = seq.filter((p) => p === 2).length;
    expect(phase2Count).toBeGreaterThanOrEqual(3);
  });

  it('golf_performance alternates between stability (P2) and power (P5) blocks', () => {
    const seq = buildGoalPhaseSequence({ primaryGoal: 'golf_performance', startingPhase: 1, durationWeeks: 24 });
    expect(seq).toContain(2);
    expect(seq).toContain(5);
  });

  it('general_fitness preserves legacy linear ramp behavior', () => {
    // Legacy: phase = min(5, startingPhase + floor(i / 2))
    const seq = buildGoalPhaseSequence({ primaryGoal: 'general_fitness', startingPhase: 1, durationWeeks: 24 });
    expect(seq).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('different goals produce DIFFERENT sequences for identical input', () => {
    const inputs = { startingPhase: 1, durationWeeks: 24 };
    const sequences = ALL_GOALS.map((goal) =>
      buildGoalPhaseSequence({ primaryGoal: goal, ...inputs }).join(',')
    );
    const unique = new Set(sequences);
    expect(unique.size).toBe(ALL_GOALS.length);
  });

  it('is deterministic - same inputs yield identical sequences', () => {
    const a = buildGoalPhaseSequence({ primaryGoal: 'hypertrophy', startingPhase: 2, durationWeeks: 16 });
    const b = buildGoalPhaseSequence({ primaryGoal: 'hypertrophy', startingPhase: 2, durationWeeks: 16 });
    expect(a).toEqual(b);
  });

  it('falls back to general_fitness for unknown goal string', () => {
    const seq = buildGoalPhaseSequence({ primaryGoal: 'invalid_goal', startingPhase: 1, durationWeeks: 24 });
    const expected = buildGoalPhaseSequence({ primaryGoal: 'general_fitness', startingPhase: 1, durationWeeks: 24 });
    expect(seq).toEqual(expected);
  });

  it('handles short plans (4 weeks = 1 mesocycle) without throwing', () => {
    for (const goal of ALL_GOALS) {
      const seq = buildGoalPhaseSequence({ primaryGoal: goal, startingPhase: 1, durationWeeks: 4 });
      expect(seq).toHaveLength(1);
    }
  });
});

describe('workoutBuilderGoalConfig - getGoalOptBias', () => {
  it('returns a bias object with the five expected keys for every goal x phase combination', () => {
    for (const goal of ALL_GOALS) {
      for (let phase = 1; phase <= 5; phase++) {
        const bias = getGoalOptBias({ primaryGoal: goal, phase });
        expect(bias).toHaveProperty('setBias');
        expect(bias).toHaveProperty('repBias');
        expect(bias).toHaveProperty('restBias');
        expect(bias).toHaveProperty('intensityBias');
        expect(bias).toHaveProperty('exerciseBias');
        expect(['low', 'mid', 'high']).toContain(bias.setBias);
        expect(['low', 'mid', 'high']).toContain(bias.repBias);
        expect(['low', 'mid', 'high']).toContain(bias.restBias);
        expect(['low', 'mid', 'high']).toContain(bias.intensityBias);
        expect(Array.isArray(bias.exerciseBias)).toBe(true);
      }
    }
  });

  it('hypertrophy in Phase 2 keeps canonical OPT bands while changing exercise priority', () => {
    const bias = getGoalOptBias({ primaryGoal: 'hypertrophy', phase: 2 });
    expect(bias.repBias).toBe('mid');
    expect(bias.restBias).toBe('mid');
    expect(bias.setBias).toBe('mid');
    expect(bias.exerciseBias).toEqual(['compound', 'isolation']);
  });

  it('hypertrophy in Phase 3 favors top of rep band, low rest, high sets', () => {
    const bias = getGoalOptBias({ primaryGoal: 'hypertrophy', phase: 3 });
    expect(bias.repBias).toBe('high');
    expect(bias.restBias).toBe('low');
    expect(bias.setBias).toBe('high');
  });

  it('strength in Phase 4 favors low reps, high rest, high intensity', () => {
    const bias = getGoalOptBias({ primaryGoal: 'strength', phase: 4 });
    expect(bias.repBias).toBe('low');
    expect(bias.restBias).toBe('high');
    expect(bias.intensityBias).toBe('high');
  });

  it('fat_loss in Phase 2 favors low rest (circuit-friendly)', () => {
    const bias = getGoalOptBias({ primaryGoal: 'fat_loss', phase: 2 });
    expect(bias.restBias).toBe('low');
  });

  it('athletic_performance in Phase 5 prioritizes plyometric exercise selection', () => {
    const bias = getGoalOptBias({ primaryGoal: 'athletic_performance', phase: 5 });
    expect(bias.exerciseBias).toContain('plyometric');
  });

  it('golf_performance in Phase 2 prioritizes stability/core exercise selection', () => {
    const bias = getGoalOptBias({ primaryGoal: 'golf_performance', phase: 2 });
    expect(bias.exerciseBias.some((t) => t === 'stability' || t === 'core')).toBe(true);
  });

  it('golf_performance in Phase 5 prioritizes plyometric/power for swing speed', () => {
    const bias = getGoalOptBias({ primaryGoal: 'golf_performance', phase: 5 });
    expect(bias.exerciseBias).toContain('plyometric');
  });

  it('general_fitness returns balanced mid biases', () => {
    const bias = getGoalOptBias({ primaryGoal: 'general_fitness', phase: 2 });
    expect(bias.setBias).toBe('mid');
    expect(bias.repBias).toBe('mid');
    expect(bias.restBias).toBe('mid');
    expect(bias.intensityBias).toBe('mid');
  });

  it('falls back to general_fitness biases for unknown goal', () => {
    const a = getGoalOptBias({ primaryGoal: 'invalid_goal', phase: 2 });
    const b = getGoalOptBias({ primaryGoal: 'general_fitness', phase: 2 });
    expect(a).toEqual(b);
  });

  it('clamps invalid phase numbers to a safe default rather than throwing', () => {
    expect(() => getGoalOptBias({ primaryGoal: 'hypertrophy', phase: 0 })).not.toThrow();
    expect(() => getGoalOptBias({ primaryGoal: 'hypertrophy', phase: 99 })).not.toThrow();
    expect(() => getGoalOptBias({ primaryGoal: 'hypertrophy', phase: 'three' })).not.toThrow();
  });

  it('is deterministic - same inputs yield identical bias objects', () => {
    const a = getGoalOptBias({ primaryGoal: 'strength', phase: 4 });
    const b = getGoalOptBias({ primaryGoal: 'strength', phase: 4 });
    expect(a).toEqual(b);
  });
});
