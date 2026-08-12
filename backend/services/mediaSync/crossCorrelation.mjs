/**
 * Audio offset detection by normalized cross-correlation.
 * ============================================================================
 *
 * THE PROBLEM: a Sony A7R IV records video with a mediocre on-camera "scratch"
 * track. A DJI transmitter separately records clean lav audio. To use the clean
 * audio the two must be aligned, and doing that by hand for every take is the
 * thing this system exists to eliminate.
 *
 * WHY THIS IS SOLVABLE: both microphones recorded the SAME room. The scratch track
 * only has to be audible, not good — its envelope carries the same rhythm of speech
 * and transients as the clean track. Sliding one against the other and measuring
 * agreement finds the offset without a clapperboard.
 *
 * ── CONFIDENCE IS NOT OPTIONAL ──────────────────────────────────────────────
 * A sync engine that cannot report its own failure is WORSE than manual sync,
 * because the operator stops checking. A high correlation peak alone is not
 * enough: a constant hum correlates well with itself at every offset. What
 * distinguishes "found it" from "noise" is PROMINENCE — how far the best peak
 * stands above the next-best unrelated peak. Both are reported, and the caller
 * decides whether a human needs to look.
 *
 * ── WHY ENVELOPES, NOT RAW SAMPLES ──────────────────────────────────────────
 * A 20-minute 48kHz take is ~57.6M samples per channel. Direct correlation is
 * O(n·m) and would take hours. Speech alignment does not need sample-level
 * waveform detail — it needs the ENERGY ENVELOPE, which survives aggressive
 * downsampling and is robust to the two mics having completely different
 * frequency responses (which they do: a lav on a chest and a camera mic three
 * metres away do not produce similar waveforms, but they produce the same
 * pattern of loud and quiet).
 */

/** Envelope resolution. 100 Hz = 10ms buckets — finer than one video frame at 30fps (33ms). */
export const ENVELOPE_HZ = 100;

/**
 * Minimum overlap before a lag is scored at all, as a fraction of the SHORTER
 * signal. Two recordings of the same take overlap almost entirely; a candidate
 * alignment that requires them to share only a sliver is not a real alignment.
 */
export const MIN_OVERLAP_RATIO = 0.5;

/** Absolute floor regardless of ratio: 2 seconds of envelope. */
export const MIN_OVERLAP_FRAMES = ENVELOPE_HZ * 2;

/**
 * Reduce a raw sample array to an RMS energy envelope at ENVELOPE_HZ.
 *
 * RMS rather than peak: peak is dominated by isolated clicks, and a click that
 * exists on one mic but not the other actively hurts alignment. RMS tracks
 * sustained energy, which is what both mics genuinely share.
 */
export function toEnvelope(samples, sampleRate, envelopeHz = ENVELOPE_HZ) {
  if (!samples?.length || !sampleRate) return new Float64Array(0);
  const bucket = Math.max(1, Math.round(sampleRate / envelopeHz));
  const out = new Float64Array(Math.floor(samples.length / bucket));
  for (let i = 0; i < out.length; i += 1) {
    let sum = 0;
    const start = i * bucket;
    for (let j = 0; j < bucket; j += 1) {
      const v = samples[start + j];
      sum += v * v;
    }
    out[i] = Math.sqrt(sum / bucket);
  }
  return out;
}

/**
 * Remove the mean and scale to unit variance.
 *
 * This is what makes the comparison immune to the two mics having different
 * gain and different noise floors — the single most important normalization
 * here, because a lav is far louder than a camera mic and without this the
 * correlation would be dominated by absolute level rather than by shape.
 */
export function standardize(env) {
  const n = env.length;
  if (!n) return new Float64Array(0);
  let mean = 0;
  for (let i = 0; i < n; i += 1) mean += env[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i += 1) {
    const d = env[i] - mean;
    variance += d * d;
  }
  const sd = Math.sqrt(variance / n);
  const out = new Float64Array(n);
  // A perfectly flat signal (digital silence, or a constant tone at the envelope
  // level) has no shape to align. Returning zeros makes every lag score 0, which
  // the caller reads as "no confidence" rather than as a spurious match.
  if (sd === 0) return out;
  for (let i = 0; i < n; i += 1) out[i] = (env[i] - mean) / sd;
  return out;
}

/**
 * Normalized cross-correlation of two standardized envelopes over a lag range.
 *
 * Returns every score so the caller can measure prominence, not just the peak.
 * `lag` is how far `target` sits AFTER `reference` in envelope frames; negative
 * means the target starts earlier (the recorder was rolling before the camera,
 * which is the normal case when someone hits record on the transmitter first).
 */
export function correlate(reference, target, maxLagFrames, {
  minOverlapRatio = MIN_OVERLAP_RATIO,
  minOverlapFrames = MIN_OVERLAP_FRAMES,
} = {}) {
  const scores = [];
  const shorter = Math.min(reference.length, target.length);

  // Never search further than the signal can support. A lag beyond the shorter
  // signal's length leaves nothing meaningful to compare.
  const maxLag = Math.min(maxLagFrames, shorter);

  // MINIMUM OVERLAP — this bound is load-bearing, and the original value (8 frames,
  // i.e. 80ms) was badly wrong. At an extreme lag the overlap shrinks to a sliver,
  // and a sliver correlates near-perfectly BY CHANCE. Measured: a 60s take searched
  // at +/-60s produced a spurious peak of 1.07 at -59.27s — scoring HIGHER than the
  // true peak of 1.01 at the correct offset. The engine refused it, but only by
  // luck of where the confidence thresholds sat; it had already picked the wrong lag.
  const minOverlap = Math.max(minOverlapFrames, Math.floor(shorter * minOverlapRatio));

  for (let lag = -maxLag; lag <= maxLag; lag += 1) {
    const start = Math.max(0, -lag);
    const end = Math.min(reference.length, target.length - lag);
    const n = end - start;
    if (n < minOverlap) continue;

    // Correlate AND normalize over the same window. Standardizing the whole signal
    // then scoring a sub-window leaves the sub-window's local statistics arbitrary,
    // so scores from different overlap sizes are not comparable — which is how a
    // score above 1.0 (impossible for a true NCC) appeared at all. Normalizing per
    // window makes every lag's score directly comparable and bounded by +/-1.
    let sxy = 0; let sxx = 0; let syy = 0;
    for (let i = start; i < end; i += 1) {
      const x = reference[i];
      const y = target[i + lag];
      sxy += x * y; sxx += x * x; syy += y * y;
    }
    const denom = Math.sqrt(sxx * syy);
    if (denom === 0) continue; // one window is flat — no shape to compare
    scores.push({ lag, score: sxy / denom, overlap: n });
  }
  return scores;
}

/**
 * Find the offset between a camera scratch track and a separately-recorded
 * clean track, with a confidence the caller can act on.
 *
 * @returns {{
 *   offsetFrames: number, offsetSeconds: number,
 *   peak: number, prominence: number, confidence: number,
 *   usable: boolean, reason: string|null
 * }}
 */
export function findOffset(referenceSamples, targetSamples, {
  sampleRate,
  maxOffsetSeconds = 60,
  envelopeHz = ENVELOPE_HZ,
} = {}) {
  const empty = {
    offsetFrames: 0, offsetSeconds: 0, peak: 0, prominence: 0,
    confidence: 0, usable: false, reason: 'insufficient-audio',
  };
  if (!sampleRate || !referenceSamples?.length || !targetSamples?.length) return empty;

  const ref = standardize(toEnvelope(referenceSamples, sampleRate, envelopeHz));
  const tgt = standardize(toEnvelope(targetSamples, sampleRate, envelopeHz));
  if (ref.length < 8 || tgt.length < 8) return empty;

  // A standardized signal that is all zeros had no variance — silence, or a
  // constant tone. There is nothing to align against; say so instead of
  // returning an arbitrary lag with a fabricated score.
  const refFlat = ref.every((v) => v === 0);
  const tgtFlat = tgt.every((v) => v === 0);
  if (refFlat || tgtFlat) {
    return { ...empty, reason: refFlat ? 'scratch-track-silent' : 'clean-track-silent' };
  }

  const scores = correlate(ref, tgt, Math.round(maxOffsetSeconds * envelopeHz));
  if (!scores.length) return empty;

  let best = scores[0];
  for (const s of scores) if (s.score > best.score) best = s;

  // PROMINENCE: the best score outside a guard band around the peak. A genuine
  // alignment produces one sharp peak; periodic content (a hum, a metronome,
  // music with a strong beat) produces many near-equal peaks, and that is
  // exactly the case where a naive implementation confidently returns garbage.
  const guard = Math.round(envelopeHz * 0.5); // 500ms either side
  let runnerUp = -Infinity;
  for (const s of scores) {
    if (Math.abs(s.lag - best.lag) <= guard) continue;
    if (s.score > runnerUp) runnerUp = s.score;
  }
  if (runnerUp === -Infinity) runnerUp = 0;

  const peak = best.score;
  const prominence = peak - Math.max(0, runnerUp);

  // Confidence blends "do they match at all" with "is this the ONLY place they
  // match". Either alone is misleading: a high peak with no prominence is a hum;
  // high prominence with a low peak is two signals that barely relate.
  const confidence = Math.max(0, Math.min(1, peak * 0.5 + prominence * 0.5));

  let reason = null;
  if (peak < 0.3) reason = 'weak-correlation';
  else if (prominence < 0.1) reason = 'ambiguous-periodic-content';

  return {
    offsetFrames: best.lag,
    offsetSeconds: best.lag / envelopeHz,
    peak,
    prominence,
    confidence,
    usable: reason === null,
    reason,
  };
}
