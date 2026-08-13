/**
 * Audio sync — offset recovery proven against KNOWN offsets.
 *
 * This is the test that makes "syncs perfectly" a property instead of a hope.
 * Each case synthesizes a scratch track and a clean track whose true offset is
 * known by construction, then asserts the engine recovers it within one video
 * frame at 30fps (33.3ms). Without this, sync quality decays silently as the
 * code changes and nobody finds out until a published video looks wrong.
 *
 * Signals are synthesized rather than loaded from fixtures on purpose: a fixture
 * proves the engine works on one recording, whereas construction lets us prove it
 * across offset directions, noise levels, mismatched gain, and the adversarial
 * cases (silence, periodic content) where a naive implementation returns a
 * confident wrong answer.
 */

import { describe, it, expect } from 'vitest';
import {
  findOffset,
  toEnvelope,
  standardize,
  ENVELOPE_HZ,
  MIN_OVERLAP_FRAMES,
} from '../../services/mediaSync/crossCorrelation.mjs';

/**
 * Derived, never hardcoded. These expectations have now been wrong twice because the
 * overlap floor moved (50%-ratio -> 4s -> 8s) and the numbers were literals. A test
 * that restates a constant has to be edited every time the constant improves, and an
 * edit is a chance to silently weaken the assertion.
 */
const FLOOR_SECONDS = MIN_OVERLAP_FRAMES / ENVELOPE_HZ;
const reachFor = (fileSeconds) => fileSeconds - FLOOR_SECONDS;

const SR = 8000;               // envelope-domain math is rate-independent; 8k keeps tests fast
const FRAME_MS = 1000 / 30;    // one video frame at 30fps
const ENV_MS = 1000 / ENVELOPE_HZ;

/** Deterministic PRNG — a seeded generator keeps failures reproducible. */
function rng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * Speech-like signal: bursts of energy separated by pauses, with APERIODIC timing.
 *
 * The aperiodicity is load-bearing, and the first version of this helper got it
 * wrong. Building the envelope from sin(2*pi*f*t) produces a PERIODIC signal that
 * correlates equally well at every multiple of its period — peak 0.97 but
 * prominence 0.004 — and the engine correctly refused it as ambiguous. That was a
 * bad fixture, not a bad algorithm: real speech has irregular syllable timing, and
 * that irregularity is precisely what makes a single alignment identifiable.
 *
 * Burst onsets and durations are drawn from the seeded PRNG, so the pattern never
 * repeats but every run is reproducible.
 */
function speechLike(seconds, { seed = 1, rate = 2.2 } = {}) {
  const rand = rng(seed);
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  let cursor = 0;
  while (cursor < n) {
    const gap = Math.round(((0.05 + rand() * 0.9) / rate) * SR);      // irregular pause
    const len = Math.round(((0.08 + rand() * 0.55) / rate) * SR);     // irregular syllable
    const amp = 0.35 + rand() * 0.65;                                  // irregular loudness
    const start = cursor + gap;
    for (let i = 0; i < len && start + i < n; i += 1) {
      // Raised-cosine envelope over the burst so edges are not clicks.
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, len));
      out[start + i] = amp * w * (rand() * 2 - 1);
    }
    cursor = start + len;
  }
  return out;
}

/** Shift a signal by a known number of seconds, padding with (optionally noisy) silence. */
function shift(sig, seconds, { noise = 0, seed = 7 } = {}) {
  const rand = rng(seed);
  const shiftN = Math.round(seconds * SR);
  const out = new Float32Array(sig.length);
  for (let i = 0; i < out.length; i += 1) {
    const src = i - shiftN;
    const v = src >= 0 && src < sig.length ? sig[src] : 0;
    out[i] = v + (noise ? (rand() * 2 - 1) * noise : 0);
  }
  return out;
}

/** Degrade a signal the way a distant camera mic does: quieter, noisier, band-limited-ish. */
function asScratchTrack(sig, { gain = 0.15, noise = 0.05, seed = 9 } = {}) {
  const rand = rng(seed);
  const out = new Float32Array(sig.length);
  let prev = 0;
  for (let i = 0; i < sig.length; i += 1) {
    prev = prev * 0.6 + sig[i] * 0.4;            // crude low-pass: different frequency response
    out[i] = prev * gain + (rand() * 2 - 1) * noise;
  }
  return out;
}

const withinOneFrame = (actualSec, expectedSec) =>
  Math.abs(actualSec - expectedSec) * 1000 <= FRAME_MS;

describe('findOffset — recovers a KNOWN offset within one video frame', () => {
  const cases = [
    ['clean track starts 1.2s LATE', 1.2],
    ['clean track starts 0.5s late', 0.5],
    ['clean track starts 3.7s late', 3.7],
    ['recorder rolled FIRST (negative offset)', -2.4],
    ['near-zero offset', 0.1],
    ['zero offset', 0],
  ];

  for (const [name, trueOffset] of cases) {
    it(name + ` (${trueOffset}s)`, () => {
      const clean = speechLike(30, { seed: 3 });
      const scratch = asScratchTrack(shift(clean, -trueOffset, { noise: 0.02 }));
      const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 10 });

      expect(r.usable).toBe(true);
      expect(withinOneFrame(r.offsetSeconds, trueOffset)).toBe(true);
      expect(r.marginToRefusal).toBeGreaterThan(1);
    });
  }

  it('is accurate to better than the envelope resolution allows to be exceeded', () => {
    // Sanity on the floor: we cannot beat one envelope frame (10ms), and we should
    // not silently claim to. This asserts the error is bounded BY that resolution.
    const clean = speechLike(30, { seed: 11 });
    const scratch = asScratchTrack(shift(clean, -0.83, { noise: 0.02 }));
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 10 });
    expect(Math.abs(r.offsetSeconds - 0.83) * 1000).toBeLessThanOrEqual(ENV_MS * 1.5);
  });
});

describe('findOffset — survives the conditions a real shoot produces', () => {
  it('works when the scratch track is far quieter than the lav (gain mismatch)', () => {
    const clean = speechLike(30, { seed: 5 });
    const scratch = asScratchTrack(shift(clean, -1.5), { gain: 0.02, noise: 0.01 });
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 10 });
    expect(r.usable).toBe(true);
    expect(withinOneFrame(r.offsetSeconds, 1.5)).toBe(true);
  });

  /**
   * OPERATING ENVELOPE, measured rather than assumed.
   *
   * The first version of this case demanded success at SNR 0.8 — noise LOUDER than
   * signal — and failed. Sweeping the noise floor showed why: the engine recovers
   * the offset exactly at every level tested, but at SNR 0.8 the correlation peak
   * falls to 0.24 and it DECLINES to assert the answer. That is the correct
   * conservative bias, not a bug: on real footage a peak that weak could as easily
   * be a wrong lag, and asserting it would be the "confidently wrong" behaviour this
   * whole module exists to avoid. The test now pins the real envelope.
   */
  const noiseSweep = [
    { noise: 0.05, snr: 4.0, mustAssert: true },
    { noise: 0.10, snr: 2.0, mustAssert: true },
    { noise: 0.15, snr: 1.33, mustAssert: true },
    { noise: 0.20, snr: 1.0, mustAssert: true },   // noise == signal: still asserts
    { noise: 0.25, snr: 0.8, mustAssert: false },  // noise > signal: may decline
  ];

  for (const { noise, snr, mustAssert } of noiseSweep) {
    it(`camera-mic noise SNR~${snr}${mustAssert ? ' — asserts a correct offset' : ' — may decline, must never be confidently wrong'}`, () => {
      const clean = speechLike(40, { seed: 6 });
      const scratch = asScratchTrack(shift(clean, -2.0), { gain: 0.2, noise });
      const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 10 });

      if (mustAssert) {
        expect(r.usable).toBe(true);
        expect(withinOneFrame(r.offsetSeconds, 2.0)).toBe(true);
      } else {
        // The one thing that is never acceptable: asserting a WRONG offset.
        // Declining is fine; being confidently wrong is not.
        expect(r.usable === false || withinOneFrame(r.offsetSeconds, 2.0)).toBe(true);
      }
    });
  }

  it('works when the two tracks have different lengths', () => {
    // The transmitter is usually rolling before and after the camera.
    const clean = speechLike(45, { seed: 8 });
    const scratchFull = asScratchTrack(shift(clean, -1.0, { noise: 0.02 }));
    const scratch = scratchFull.slice(0, Math.round(25 * SR)); // camera stopped earlier
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 10 });
    expect(r.usable).toBe(true);
    expect(withinOneFrame(r.offsetSeconds, 1.0)).toBe(true);
  });
});

describe('findOffset — REPORTS ITS OWN FAILURE (the property that matters most)', () => {
  it('refuses when the scratch track is digital silence', () => {
    const clean = speechLike(20, { seed: 2 });
    const scratch = new Float32Array(clean.length); // all zeros
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 10 });
    expect(r.usable).toBe(false);
    expect(r.reason).toBe('scratch-track-silent');
    expect(r.marginToRefusal).toBe(0);
  });

  it('refuses when the clean track is silent', () => {
    const scratch = asScratchTrack(speechLike(20, { seed: 4 }));
    const clean = new Float32Array(scratch.length);
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 10 });
    expect(r.usable).toBe(false);
    expect(r.reason).toBe('clean-track-silent');
  });

  it('refuses two UNRELATED recordings instead of inventing an offset', () => {
    // The wrong-take case: two different shoots, no true alignment exists.
    const a = asScratchTrack(speechLike(30, { seed: 21, rate: 2.1 }));
    const b = speechLike(30, { seed: 99, rate: 3.9 });
    const r = findOffset(a, b, { sampleRate: SR, maxOffsetSeconds: 10 });
    expect(r.usable).toBe(false);
    expect(r.marginToRefusal).toBeLessThan(1);
  });

  it('refuses periodic content rather than locking onto the wrong cycle', () => {
    // A metronome or a strong music beat correlates equally well at every period.
    // This is the case where a naive implementation is confidently, silently wrong.
    const n = Math.round(30 * SR);
    const tone = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const t = i / SR;
      tone[i] = Math.sin(2 * Math.PI * 2 * t) > 0.9 ? Math.sin(2 * Math.PI * 440 * t) : 0;
    }
    const r = findOffset(asScratchTrack(tone), shift(tone, -1.0), {
      sampleRate: SR, maxOffsetSeconds: 10,
    });
    // Either it declines, or it is honest that the peak is not distinctive.
    expect(r.usable === false || r.prominence < 0.2).toBe(true);
  });

  it('returns a typed refusal for empty input rather than throwing', () => {
    const r = findOffset(new Float32Array(0), new Float32Array(0), { sampleRate: SR });
    expect(r.usable).toBe(false);
    expect(r.reason).toBe('insufficient-audio');
  });
});

describe('envelope helpers', () => {
  it('standardize returns all zeros for a flat signal (no shape to align)', () => {
    const flat = new Float64Array(100).fill(0.5);
    const s = standardize(flat);
    expect(Array.from(s).every((v) => v === 0)).toBe(true);
  });

  it('toEnvelope reduces sample count by roughly sampleRate/envelopeHz', () => {
    const sig = new Float32Array(SR * 10);
    const env = toEnvelope(sig, SR);
    expect(env.length).toBeCloseTo(10 * ENVELOPE_HZ, -1);
  });
});

/**
 * SHORT TAKES vs A WIDE SEARCH — the defect a benchmark found, not a unit test.
 *
 * Searching +/-60s on a 60-second take let the overlap shrink to a sliver at extreme
 * lags, and a sliver correlates near-perfectly BY CHANCE. Measured before the fix:
 * a spurious peak of 1.07 at -59.27s, scoring HIGHER than the true peak of 1.01 at
 * the correct -1.50s. Two things were wrong:
 *
 *   1. The minimum overlap (8 envelope frames = 80ms) was far too permissive.
 *   2. Scores were not normalized per window, so a score could exceed 1.0 — which is
 *      impossible for a true normalized cross-correlation and is the tell that
 *      different lags were not being compared on equal terms.
 *
 * The engine did refuse that answer, but only because the confidence thresholds
 * happened to sit where they did. It had already selected the wrong lag. These cases
 * pin both the correctness and the invariant.
 */
describe('short takes searched over a wide range', () => {
  const shortTake = (seconds, trueOffset) => {
    const clean = speechLike(seconds, { seed: 3 });
    const scratch = asScratchTrack(shift(clean, -trueOffset, { noise: 0.02 }));
    return { clean, scratch };
  };

  for (const maxOffsetSeconds of [60, 30, 10]) {
    it(`finds the true offset on a 60s take searched at +/-${maxOffsetSeconds}s`, () => {
      const { clean, scratch } = shortTake(60, 1.5);
      const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds });
      expect(r.usable).toBe(true);
      expect(withinOneFrame(r.offsetSeconds, 1.5)).toBe(true);
    });
  }

  it('never produces a correlation score above 1.0 (NCC invariant)', () => {
    // A score >1 means windows of different sizes were compared without
    // normalization — the exact condition that produced the spurious peak.
    for (const seconds of [20, 60, 120]) {
      const { clean, scratch } = shortTake(seconds, 1.5);
      const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 60 });
      expect(r.peak).toBeLessThanOrEqual(1.0000001);
      expect(r.peak).toBeGreaterThanOrEqual(-1.0000001);
    }
  });

  it('refuses rather than aligning on a sliver when the search dwarfs the signal', () => {
    // A 3-second clip searched at +/-60s: there is no honest answer here.
    const clean = speechLike(3, { seed: 12 });
    const scratch = asScratchTrack(speechLike(3, { seed: 77 })); // unrelated
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 60 });
    expect(r.usable).toBe(false);
  });
});

/**
 * BOUNDARY HITS — the failure the whole "refuse rather than assert" philosophy
 * exists to catch, and it was unguarded until a hostile review found it.
 *
 * A DJI transmitter left running between takes routinely produces offsets of
 * minutes. If the true alignment lies outside the search window, the best
 * IN-window sidelobe can score cleanly — and after per-window normalization it
 * scores even more cleanly — so it would be returned as a confident wrong answer.
 * A peak sitting at the edge of the search space is the strongest available
 * evidence that the real peak is outside it.
 */
describe('boundary-hit detection', () => {
  /**
   * MEASURED BEHAVIOUR, not assumed. With per-window NCC normalization an
   * out-of-window search produces a genuinely WEAK best peak (0.07-0.10 across
   * windows of 4s, 8s, 11s and 11.8s against a true +12s offset), so
   * `weak-correlation` refuses first and the boundary guard is defense-in-depth.
   *
   * That was NOT true before normalization: unnormalized sub-windows could score
   * 1.07 — higher than the true peak — which is precisely the "healthy-looking
   * confident wrong answer" this guard was added for. Both protections stay; the
   * property under test is that it NEVER asserts a wrong offset, by whichever
   * route it declines.
   */
  for (const maxOffsetSeconds of [4, 8, 11, 11.8]) {
    it(`refuses a true +12s offset searched at only +/-${maxOffsetSeconds}s`, () => {
      const clean = speechLike(60, { seed: 31 });
      const scratch = asScratchTrack(shift(clean, -12, { noise: 0.02 }));
      const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds });
      expect(r.usable).toBe(false);
      expect(['weak-correlation', 'peak-at-search-boundary-widen-window', 'search-range-too-narrow-to-judge'])
        .toContain(r.reason);
    });
  }

  it('accepts the same pair once the window is wide enough', () => {
    const clean = speechLike(60, { seed: 31 });
    const scratch = asScratchTrack(shift(clean, -12, { noise: 0.02 }));
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 25 });
    expect(r.usable).toBe(true);
    expect(withinOneFrame(r.offsetSeconds, 12)).toBe(true);
  });

  it('refuses when the search range is too narrow to have any runner-up', () => {
    // Every scored lag inside the guard band leaves no comparison point. Clamping
    // the missing runner-up to 0 would have made prominence equal the peak and
    // manufactured MAXIMUM confidence by construction.
    const clean = speechLike(30, { seed: 33 });
    const scratch = asScratchTrack(clean);
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 0.2 });
    expect(r.usable).toBe(false);
    expect(['search-range-too-narrow-to-judge', 'peak-at-search-boundary-widen-window'])
      .toContain(r.reason);
  });
});

/**
 * SAMPLE RATES come from file metadata, never a default. Bucket size is
 * round(rate / envelopeHz), so a wrong rate silently scales every reported offset —
 * 44100 passed for true 48000 is an 8.8% error with healthy-looking confidence.
 */
describe('sample-rate handling', () => {
  it('supports two different rates without a resample step', () => {
    // Same content, different rates: 8000 vs 16000. Both bucket to the same real
    // timebase, so the offset must come out identical.
    const cleanLo = speechLike(40, { seed: 41 });
    const cleanHi = new Float32Array(cleanLo.length * 2);
    for (let i = 0; i < cleanHi.length; i += 1) cleanHi[i] = cleanLo[Math.floor(i / 2)];
    const scratchLo = asScratchTrack(shift(cleanLo, -2.0, { noise: 0.02 }));

    const r = findOffset(scratchLo, cleanHi, {
      referenceSampleRate: SR,
      targetSampleRate: SR * 2,
      maxOffsetSeconds: 10,
    });
    expect(r.usable).toBe(true);
    expect(withinOneFrame(r.offsetSeconds, 2.0)).toBe(true);
  });

  it('a WRONG rate visibly scales the answer — which is why rates must come from metadata', () => {
    const clean = speechLike(40, { seed: 43 });
    const scratch = asScratchTrack(shift(clean, -4.0, { noise: 0.02 }));
    const right = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 15 });
    const wrong = findOffset(scratch, clean, { sampleRate: SR * 2, maxOffsetSeconds: 15 });
    expect(withinOneFrame(right.offsetSeconds, 4.0)).toBe(true);
    // Documented consequence, asserted so nobody assumes the engine self-corrects.
    expect(Math.abs(wrong.offsetSeconds - 4.0)).toBeGreaterThan(0.5);
  });
});

/**
 * THE BOUNDARY GUARD WAS DEAD CODE — a defect introduced by the FIX for the
 * overlap defect, found by testing my own remediation rather than the original.
 *
 * The minimum-overlap floor caps how far the search can actually reach: for
 * equal-length signals, no lag beyond 50% of the file is ever scored. But the
 * boundary threshold was computed from the REQUESTED window, so on a 60s file
 * asking for +/-60s the guard sat at 59.5s while the search could only reach 30s.
 * It could never fire — in exactly the short-take case it was written for.
 *
 * The threshold is now derived from the lags ACTUALLY scored, which cannot drift
 * from the overlap rule the way a re-derived formula would.
 */
describe('effective search ceiling', () => {
  const sixtySecondTake = (trueOffset) => {
    const clean = speechLike(60, { seed: 31 });
    const scratch = asScratchTrack(shift(clean, -trueOffset, { noise: 0.02 }));
    return { clean, scratch };
  };

  it('reports how far it could actually search, and that it fell short of the request', () => {
    const { clean, scratch } = sixtySecondTake(5);
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 60 });
    // 60s file minus the variance floor. Under the old 50%-of-shorter ratio this was
    // 30s; an absolute floor recovers most of that range without weakening the guard.
    expect(r.searchedSeconds).toBeCloseTo(reachFor(60), 0);
    expect(r.searchTruncated).toBe(true);
  });

  it('does NOT flag truncation when the request fits inside the reachable range', () => {
    const { clean, scratch } = sixtySecondTake(5);
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 10 });
    expect(r.searchTruncated).toBe(false);
  });

  it('accepts offsets across the WHOLE reachable range, including ones the ratio refused', () => {
    // 35s was previously beyond reach on a 60s file and was refused. It now syncs.
    for (const off of [5, 25, 29, 35, Math.floor(reachFor(60)) - 5]) {
      const { clean, scratch } = sixtySecondTake(off);
      const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 60 });
      expect(r.usable).toBe(true);
      expect(withinOneFrame(r.offsetSeconds, off)).toBe(true);
    }
  });

  it('FIRES the boundary guard at the effective edge, wherever the floor puts it', () => {
    const { clean, scratch } = sixtySecondTake(reachFor(60) - 0.2);
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 60 });
    expect(r.usable).toBe(false);
    expect(r.reason).toBe('peak-at-search-boundary-widen-window');
  });

  it('still refuses — never asserts — when the truth is beyond any reachable lag', () => {
    // Leaves less overlap than the variance floor requires, so it is never scored.
    const { clean, scratch } = sixtySecondTake(60 - FLOOR_SECONDS / 2);
    const r = findOffset(scratch, clean, { sampleRate: SR, maxOffsetSeconds: 60 });
    expect(r.usable).toBe(false);
  });
});

/**
 * PARTIAL-OVERLAP PAIRINGS — refused by the old 50%-of-shorter ratio, which was
 * ~7.5x stricter than the variance guard actually requires. Measured worst spurious
 * peak from uncorrelated noise: 0.888 at 0.1s, 0.410 at 0.5s, 0.179 at 2s, 0.159 at
 * 4s. Four seconds is comfortably safe against the 0.3 gate, so the floor is an
 * absolute duration now, not a proportion of file length.
 */
describe('partial-overlap pairings', () => {
  it('syncs a short clip against a long take sharing well under half the clip', () => {
    // Transmitter clip 30s; camera take 3 min; they share ~12s.
    const content = speechLike(180, { seed: 55 });
    const clipLen = Math.round(30 * SR);
    const clip = content.slice(0, clipLen);
    const cameraStart = Math.round(18 * SR);       // camera rolls 18s into the clip
    const camera = asScratchTrack(content).slice(cameraStart);
    const r = findOffset(camera, clip, { sampleRate: SR, maxOffsetSeconds: 60 });
    expect(r.usable).toBe(true);
    expect(withinOneFrame(Math.abs(r.offsetSeconds), 18)).toBe(true);
  });
});

/**
 * THE OVERLAP FLOOR MUST HOLD AGAINST REAL SPEECH, NOT GAUSSIAN NOISE.
 *
 * The floor was first derived from uncorrelated Gaussian noise, which said 4 seconds
 * was comfortably safe. Real envelopes are sparse, bursty and heavy-tailed — long
 * near-silent stretches punctuated by loud syllables — and two unrelated ones agree
 * by chance far more often. Worst spurious peak over 300 trials each:
 *
 *            gaussian    real speech
 *     2.0s     0.179        0.588
 *     4.0s     0.159        0.470   <- clears the 0.3 gate: confidently wrong
 *     8.0s     0.124        0.268   safe
 *
 * So the Gaussian-derived floor was wrong by ~3x for the signals this module actually
 * sees. This test asserts the property directly, so the floor cannot drift back to a
 * value that only holds for a distribution we never encounter.
 */
describe('overlap floor holds against realistic speech statistics', () => {
  const nccOf = (a, b) => {
    const A = standardize(toEnvelope(a, SR));
    const B = standardize(toEnvelope(b, SR));
    const n = Math.min(A.length, B.length);
    let sxy = 0; let sxx = 0; let syy = 0;
    for (let i = 0; i < n; i += 1) { sxy += A[i] * B[i]; sxx += A[i] * A[i]; syy += B[i] * B[i]; }
    const d = Math.sqrt(sxx * syy);
    return d === 0 ? 0 : Math.abs(sxy / d);
  };

  it('keeps unrelated speech below the 0.3 peak gate at the configured floor', () => {
    const floorSeconds = MIN_OVERLAP_FRAMES / ENVELOPE_HZ;
    let worst = 0;
    for (let t = 0; t < 120; t += 1) {
      const a = speechLike(floorSeconds, { seed: 5000 + t * 2, rate: 1.5 + (t % 5) * 0.4 });
      const b = speechLike(floorSeconds, { seed: 9000 + t * 2, rate: 2.0 + (t % 7) * 0.3 });
      const score = nccOf(a, b);
      if (score > worst) worst = score;
    }
    // Measured worst over 300 trials at 8s was 0.268; 120 trials should stay under
    // the gate with margin. If this fails, the floor is too low for real content.
    expect(worst).toBeLessThan(0.3);
  });

  it('demonstrates that a shorter floor would NOT hold — the reason 8s was chosen', () => {
    let worst = 0;
    for (let t = 0; t < 120; t += 1) {
      const a = speechLike(2, { seed: 6000 + t * 2, rate: 1.5 + (t % 5) * 0.4 });
      const b = speechLike(2, { seed: 8000 + t * 2, rate: 2.0 + (t % 7) * 0.3 });
      const score = nccOf(a, b);
      if (score > worst) worst = score;
    }
    // 2 seconds of unrelated speech can and does clear the gate.
    expect(worst).toBeGreaterThan(0.3);
  });
});

/**
 * SUB-BIN REFINEMENT — measured accuracy and the peak-locking question.
 *
 * Parabolic interpolation of a discretely sampled peak is biased toward the nearest
 * integer bin. The bias matters when peaks are narrow (a bin or two); envelope peaks
 * are several bins wide, which should make it negligible. Rather than assume that,
 * this measures it against known FRACTIONAL offsets.
 *
 * Measured over 200 cases with true offsets spread across the fractional part of a
 * bin: mean |error| 0.024 bins (0.24ms), max 0.083 bins (0.83ms). One video frame at
 * 30fps is 3.33 bins, so the residual bias is ~140x smaller than the tolerance that
 * matters — and the refinement itself buys ~40x over raw 10ms quantization, which is
 * what makes drift measurement viable.
 */
describe('sub-bin refinement accuracy', () => {
  const samplesPerBin = SR / ENVELOPE_HZ;

  it('resolves FRACTIONAL offsets far better than the 10ms envelope quantum', () => {
    let sumAbsBins = 0; let n = 0; let maxAbsBins = 0;
    for (let t = 0; t < 40; t += 1) {
      const frac = (t % 10) / 10 + 0.05;
      const trueSamples = Math.round((3 + (t % 5)) * samplesPerBin + frac * samplesPerBin);
      const trueSec = trueSamples / SR;
      const clean = speechLike(40, { seed: 7000 + t });
      const shifted = new Float32Array(clean.length);
      for (let i = 0; i < shifted.length; i += 1) {
        const j = i - trueSamples;
        shifted[i] = j >= 0 && j < clean.length ? clean[j] : 0;
      }
      const r = findOffset(asScratchTrack(shifted), clean, { sampleRate: SR, maxOffsetSeconds: 15 });
      if (!r.usable) continue;
      // MAGNITUDE, not signed value. This helper shifts the opposite way to the
      // `shift()` helper used elsewhere in this file, so the reported offset is
      // correctly negative here. The property under test is sub-bin RESOLUTION;
      // the sign convention is asserted by the dedicated offset cases above.
      const errBins = Math.abs(Math.abs(r.offsetSeconds) - trueSec) * ENVELOPE_HZ;
      sumAbsBins += errBins; n += 1;
      if (errBins > maxAbsBins) maxAbsBins = errBins;
    }
    expect(n).toBeGreaterThan(20);
    // Comfortably inside one bin — i.e. genuinely sub-quantum, not just rounding.
    expect(sumAbsBins / n).toBeLessThan(0.25);
    expect(maxAbsBins).toBeLessThan(1.0);
  });

  it('reports which term is binding, so a refusal is actionable', () => {
    const clean = speechLike(30, { seed: 4242 });
    const r = findOffset(asScratchTrack(shift(clean, -2, { noise: 0.02 })), clean, {
      sampleRate: SR, maxOffsetSeconds: 10,
    });
    expect(['peak', 'prominence']).toContain(r.bindingTerm);
  });
});
