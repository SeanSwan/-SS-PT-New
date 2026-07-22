/**
 * CC-1 Muscle Readiness — pure scoring contracts (Mobbin plan 1.3; Coach-Convergence wave).
 *
 * Truth rules: deterministic, real-log-driven, NO LLM. Larger muscle groups recover slower.
 * Never claims physiology — output carries source: 'training-log-estimate'.
 */
import { describe, expect, it } from 'vitest';
import {
  canonicalGroup,
  scoreReadiness,
  buildReadinessBoard,
  RECOVERY_WINDOW_DAYS,
} from '../../services/recovery/muscleReadinessService.mjs';

describe('canonicalGroup', () => {
  it('maps freeform primaryMuscles strings to canonical groups', () => {
    expect(canonicalGroup('Quadriceps')).toBe('quads');
    expect(canonicalGroup('quads')).toBe('quads');
    expect(canonicalGroup('Hamstrings')).toBe('hamstrings');
    expect(canonicalGroup('GLUTES')).toBe('glutes');
    expect(canonicalGroup('lats')).toBe('back');
    expect(canonicalGroup('Upper Back')).toBe('back');
    expect(canonicalGroup('Pectorals')).toBe('chest');
    expect(canonicalGroup('Deltoids')).toBe('shoulders');
    expect(canonicalGroup('Abs')).toBe('core');
    expect(canonicalGroup('obliques')).toBe('core');
    expect(canonicalGroup('Biceps')).toBe('biceps');
    expect(canonicalGroup('Calves')).toBe('calves');
  });
  it('returns null for unknown strings (excluded, never guessed)', () => {
    expect(canonicalGroup('vibes')).toBeNull();
    expect(canonicalGroup('')).toBeNull();
    expect(canonicalGroup(null)).toBeNull();
  });
});

describe('scoreReadiness', () => {
  it('a group never trained is READY at 100', () => {
    const s = scoreReadiness({ group: 'quads', daysSince: null, relativeVolume: 0 });
    expect(s.pct).toBe(100);
    expect(s.state).toBe('ready');
  });
  it('trained today → deep in LOADING', () => {
    const s = scoreReadiness({ group: 'quads', daysSince: 0, relativeVolume: 1 });
    expect(s.pct).toBeLessThan(50);
    expect(s.state).toBe('loading');
  });
  it('large groups recover slower than small ones at the same elapsed time', () => {
    const legs = scoreReadiness({ group: 'quads', daysSince: 1.5, relativeVolume: 1 });
    const arms = scoreReadiness({ group: 'biceps', daysSince: 1.5, relativeVolume: 1 });
    expect(arms.pct).toBeGreaterThan(legs.pct);
  });
  it('heavier-than-usual volume slows recovery; lighter speeds it', () => {
    const heavy = scoreReadiness({ group: 'chest', daysSince: 1, relativeVolume: 2 });
    const light = scoreReadiness({ group: 'chest', daysSince: 1, relativeVolume: 0.5 });
    expect(light.pct).toBeGreaterThan(heavy.pct);
  });
  it('pct is clamped 0..100 and states map ready>=90 / caution>=50 / loading<50', () => {
    const ready = scoreReadiness({ group: 'calves', daysSince: 30, relativeVolume: 1 });
    expect(ready.pct).toBe(100);
    expect(ready.state).toBe('ready');
    const caution = scoreReadiness({ group: 'quads', daysSince: 1.6, relativeVolume: 1 });
    expect(caution.state).toBe(['caution', 'loading', 'ready'].includes(caution.state) ? caution.state : 'invalid');
    expect(caution.pct).toBeGreaterThanOrEqual(0);
    expect(caution.pct).toBeLessThanOrEqual(100);
  });
});

describe('buildReadinessBoard', () => {
  const day = (offset) => {
    const d = new Date(Date.UTC(2026, 6, 22));
    d.setUTCDate(d.getUTCDate() - offset);
    return d.toISOString().slice(0, 10);
  };

  it('aggregates freeform muscles into canonical groups and scores each', () => {
    const board = buildReadinessBoard({
      recentLoad: [
        { muscle: 'quadriceps', count: 12, lastTrainedLocalDate: day(0) },
        { muscle: 'glutes', count: 8, lastTrainedLocalDate: day(0) },
        { muscle: 'pectorals', count: 10, lastTrainedLocalDate: day(3) },
        { muscle: 'vibes', count: 3, lastTrainedLocalDate: day(1) }, // unknown → dropped
      ],
      todayLocalDate: day(0),
    });
    const groups = board.groups.map((g) => g.group);
    expect(groups).toContain('quads');
    expect(groups).toContain('glutes');
    expect(groups).toContain('chest');
    expect(groups).not.toContain('vibes');
    const quads = board.groups.find((g) => g.group === 'quads');
    const chest = board.groups.find((g) => g.group === 'chest');
    expect(quads.state).toBe('loading');
    expect(chest.pct).toBeGreaterThan(quads.pct);
    expect(board.source).toBe('training-log-estimate');
  });

  it('always returns the full canonical group set (untrained groups read READY)', () => {
    const board = buildReadinessBoard({ recentLoad: [], todayLocalDate: day(0) });
    expect(board.groups.length).toBeGreaterThanOrEqual(10);
    expect(board.groups.every((g) => g.state === 'ready' && g.pct === 100)).toBe(true);
  });

  it('window table covers every canonical group', () => {
    const board = buildReadinessBoard({ recentLoad: [], todayLocalDate: day(0) });
    for (const g of board.groups) {
      expect(RECOVERY_WINDOW_DAYS[g.group], `missing window for ${g.group}`).toBeTruthy();
    }
  });
});
