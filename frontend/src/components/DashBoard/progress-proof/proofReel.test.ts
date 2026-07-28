/**
 * TEST: proofReel (real proof-moment sequencing)
 * PURPOSE: Slides come only from real data; ordered level -> PR -> gain; an empty bundle
 *   yields an empty reel; every slide gets a truthful share caption.
 */

import { describe, expect, it } from 'vitest';
import { buildProofReel } from './proofReel';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';

const pts = (ys: number[]) => ys.map((y, i) => ({ x: `W${i + 1}`, y }));
const bundle = (p: Partial<Record<string, unknown>>) => p as unknown as CanonicalProgressCharts;

describe('buildProofReel', () => {
  it('builds an ordered reel from real proof moments (level, pr, gain)', () => {
    const reel = buildProofReel(bundle({
      prTimeline: [{ x: 'W3', y: 225, exercise: 'Back Squat', reps: 3 }],
      workoutFrequency: pts([3, 5]), // improving gain
    }), 6);
    expect(reel.map((s) => s.kind)).toEqual(['level', 'pr', 'gain']);
    expect(reel[0].detail).toBe('6 of 15 charts verified');
    expect(reel[1].detail).toBe('Back Squat — 225 (3 reps)');
    expect(reel[2].headline).toBe('Biggest gain');
    // every slide carries a truthful, non-empty share caption
    expect(reel.every((s) => typeof s.shareCaption === 'string' && s.shareCaption.length > 0)).toBe(true);
  });

  it('omits the level slide when no chart is populated yet', () => {
    const reel = buildProofReel(bundle({
      prTimeline: [{ x: 'W1', y: 100, exercise: 'Deadlift', reps: 5 }],
    }), 0);
    expect(reel.map((s) => s.kind)).toEqual(['pr']);
  });

  it('omits the PR slide when there is no PR and the gain slide when nothing improved', () => {
    const reel = buildProofReel(bundle({
      weightTrend: pts([180, 182]), // neutral metric, never a "gain"
    }), 3);
    expect(reel.map((s) => s.kind)).toEqual(['level']); // only the proof level
  });

  it('picks the largest-percent improving mover as the gain slide', () => {
    const reel = buildProofReel(bundle({
      workoutFrequency: pts([4, 5]),     // +25%
      weeklyVolume: pts([100, 200]),     // +100% -> should win
    }), 2);
    const gain = reel.find((s) => s.kind === 'gain');
    expect(gain?.detail).toContain('Training Volume');
    expect(gain?.detail).toContain('+100%');
  });

  it('returns an empty reel when there is nothing real to celebrate', () => {
    expect(buildProofReel(bundle({}), 0)).toHaveLength(0);
    // a single-point series (no movement) + zero populated charts -> still empty
    expect(buildProofReel(bundle({ workoutFrequency: pts([4]) }), 0)).toHaveLength(0);
  });
});
