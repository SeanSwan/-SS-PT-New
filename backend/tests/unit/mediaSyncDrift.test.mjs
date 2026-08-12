/**
 * Clock drift — modelled from two measurements, with the failure modes pinned.
 *
 * Offset detection is the easy half. Drift is the half that ruins a 20-minute
 * take: aligned at 00:00, visibly out by the end. These cases assert the model
 * recovers a KNOWN drift rate and — just as importantly — refuses to "correct"
 * when the two measurements cannot support a drift conclusion.
 */

import { describe, it, expect } from 'vitest';
import {
  modelDrift,
  isPerceptible,
  secondsUntilPerceptible,
  NEGLIGIBLE_DRIFT_PPM,
  PERCEPTIBLE_DESYNC_MS,
} from '../../services/mediaSync/driftModel.mjs';

/** Build two measurements from a known drift rate, the way the agent would. */
const measurements = (driftPpm, headAt = 5, tailAt = 1200, baseOffset = 1.5) => ({
  head: { atSeconds: headAt, offsetSeconds: baseOffset },
  tail: {
    atSeconds: tailAt,
    offsetSeconds: baseOffset + (driftPpm / 1e6) * (tailAt - headAt),
  },
});

describe('modelDrift — recovers a KNOWN drift rate', () => {
  for (const truePpm of [50, 100, 250, -100, -500, 1000]) {
    it(`recovers ${truePpm} ppm`, () => {
      const { head, tail } = measurements(truePpm);
      const m = modelDrift(head, tail);
      expect(m.plausible).toBe(true);
      expect(m.driftPpm).toBeCloseTo(truePpm, 1);
      expect(m.correctionNeeded).toBe(true);
    });
  }

  it('produces a resample ratio that actually cancels the drift', () => {
    const { head, tail } = measurements(200);
    const m = modelDrift(head, tail);
    // Applying the ratio to the drifted duration must return the reference duration.
    const drifted = 1200 * (1 + 200 / 1e6);
    expect(drifted * m.resampleRatio).toBeCloseTo(1200, 3);
  });

  it('reports drift in a unit a human can reason about', () => {
    const { head, tail } = measurements(100);
    const m = modelDrift(head, tail);
    // 100ppm = 0.36s per hour. That is the number worth showing an operator.
    expect(m.driftSecondsPerHour).toBeCloseTo(0.36, 2);
  });
});

describe('modelDrift — declines rather than guessing', () => {
  it('treats negligible drift as no correction needed', () => {
    const { head, tail } = measurements(NEGLIGIBLE_DRIFT_PPM - 1);
    const m = modelDrift(head, tail);
    expect(m.plausible).toBe(true);
    expect(m.correctionNeeded).toBe(false);
  });

  it('refuses when the two measurements are too close together', () => {
    // 10ms envelope resolution over a 5s span implies a 2000ppm "drift" that is
    // entirely quantization noise. Correcting on that would CREATE desync.
    const m = modelDrift(
      { atSeconds: 1, offsetSeconds: 1.50 },
      { atSeconds: 6, offsetSeconds: 1.51 },
    );
    expect(m.plausible).toBe(false);
    expect(m.reason).toBe('measurement-span-too-short');
    expect(m.correctionNeeded).toBe(false);
  });

  it('refuses an implausible drift rather than destroying an aligned file', () => {
    // Two wildly different offsets are far likelier to be one bad detection than a
    // 5%-off crystal. Applying that "correction" would wreck a good take.
    const m = modelDrift(
      { atSeconds: 5, offsetSeconds: 1.5 },
      { atSeconds: 1200, offsetSeconds: 61.5 },
    );
    expect(m.plausible).toBe(false);
    expect(m.reason).toBe('implausible-drift-likely-bad-measurement');
    expect(m.resampleRatio).toBe(1);
  });

  it('refuses when a measurement is missing entirely', () => {
    const m = modelDrift({ atSeconds: 5, offsetSeconds: 1.5 }, null);
    expect(m.plausible).toBe(false);
    expect(m.reason).toBe('need-two-measurements');
  });

  it('never returns a correction when it is not plausible', () => {
    for (const bad of [
      modelDrift(null, null),
      modelDrift({ atSeconds: 1, offsetSeconds: 0 }, { atSeconds: 3, offsetSeconds: 0.4 }),
    ]) {
      expect(bad.correctionNeeded).toBe(false);
      expect(bad.resampleRatio).toBe(1);
    }
  });
});

describe('perceptibility — the reason drift matters at all', () => {
  it('100ppm is imperceptible on a 60s clip and PERCEPTIBLE on a 20-minute take', () => {
    // This is the whole argument for correcting drift: the same rate is fine on
    // short content and unshippable at the length this operator actually films.
    expect(isPerceptible(100, 60).perceptible).toBe(false);
    expect(isPerceptible(100, 1200).perceptible).toBe(true);
    expect(isPerceptible(100, 1200).errorMs).toBeCloseTo(120, 0);
  });

  it('computes how long a take can run before drift shows', () => {
    // 100ppm crosses the 40ms threshold at 400s (~6.7 min).
    expect(secondsUntilPerceptible(100)).toBeCloseTo(PERCEPTIBLE_DESYNC_MS / 1000 / 1e-4, 0);
    expect(secondsUntilPerceptible(0)).toBe(Infinity);
  });

  it('is direction-agnostic — audio early is as bad as audio late', () => {
    expect(isPerceptible(-100, 1200).perceptible).toBe(true);
    expect(secondsUntilPerceptible(-100)).toBe(secondsUntilPerceptible(100));
  });
});

describe('the 29.97 vs 30 fps trap', () => {
  it('models the 0.1% timebase error as drift, because the correction is identical', () => {
    // Shooting 29.97 while treating the timeline as 30 is ~1000ppm — a different
    // cause with the same symptom and the same fix.
    const ppm = (1 - 29.97 / 30) * 1e6;
    const { head, tail } = measurements(ppm);
    const m = modelDrift(head, tail);
    expect(m.plausible).toBe(true);
    expect(m.correctionNeeded).toBe(true);
    // Over a 20-minute take that is ~1.2 seconds — catastrophic, and invisible at the start.
    expect(isPerceptible(ppm, 1200).errorMs).toBeGreaterThan(1000);
  });
});