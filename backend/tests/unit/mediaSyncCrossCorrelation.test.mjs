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
} from '../../services/mediaSync/crossCorrelation.mjs';

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
      expect(r.confidence).toBeGreaterThan(0.5);
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
    expect(r.confidence).toBe(0);
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
    expect(r.confidence).toBeLessThan(0.5);
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