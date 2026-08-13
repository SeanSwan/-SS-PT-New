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
/**
 * ── INPUT CONTRACT (violating this produces a CONFIDENTLY WRONG answer) ──────
 *
 * Both signals MUST be single-channel, already downmixed. Decoded stereo arrives
 * interleaved as L R L R; consumed as if it were mono, the apparent sample rate
 * DOUBLES, so every reported offset is 2x wrong — and because both channels carry
 * the same program material the correlation peak still clears the confidence gate.
 * That is the worst failure this module can produce: wrong, and confident.
 *
 * It cannot be detected from the samples alone, which is exactly why it is stated
 * here as a caller obligation. The extraction layer must downmix explicitly and
 * assert `channels === 1` before calling in. A silent first channel is the adjacent
 * trap: channel-0 selection on such a file yields a flat signal, which this module
 * does refuse (`*-silent`), but the right fix is still an explicit downmix.
 *
 * SECOND OBLIGATION: every sample must be FINITE. One NaN or Infinity anywhere in the
 * signal propagates through the envelope into every correlation score, and the failure
 * disguises itself — measured on a 40s signal with a single NaN, the engine returns
 * `peak: NaN`, an offset pinned at the search boundary, and the reason
 * "search-range-too-narrow-to-judge", which sends the reader off to widen a window
 * that was never the problem. It refuses rather than lying, but the diagnosis is
 * actively misleading, so `audioExtract` rejects non-finite samples at decode time
 * where the true cause can still be named. A caller building arrays by hand owns this.
 *
 * Nothing in the current test suite covers this — every fixture is synthesized mono.
 */
export const ENVELOPE_HZ = 100;

/**
 * Minimum overlap before a lag is scored at all — an ABSOLUTE duration, derived
 * from measurement rather than chosen as a fraction.
 *
 * The floor exists because NCC is normalized, so a short window can score high by
 * chance. That is a VARIANCE property (variance ~ 1/n), not a geometric one, so the
 * requirement is an amount of audio, not a proportion of the file.
 *
 * IT MUST BE MEASURED AGAINST THE RIGHT DISTRIBUTION. Derived from uncorrelated
 * GAUSSIAN noise the answer looks like 4 seconds. Real speech envelopes are sparse,
 * bursty and heavy-tailed — long near-silent stretches punctuated by loud syllables —
 * and two unrelated ones agree by chance far more often. Worst spurious peak over 300
 * trials of each, against the 0.3 peak gate:
 *
 *              gaussian      REAL SPEECH ENVELOPES
 *     0.5s      0.410              0.894
 *     1.0s      0.285              0.900
 *     2.0s      0.179              0.588
 *     4.0s      0.159              0.470   <- would clear the gate: confidently wrong
 *     8.0s      0.124              0.268   safe
 *    15.0s        -                0.208   safe
 *
 * A 4-second floor chosen from the Gaussian column is wrong by roughly 3x for the
 * signals this module actually sees. 8 seconds is the measured-safe value, and it
 * still preserves the capability the old 50%-of-shorter ratio was costing: effective
 * search on a 60s file is 52s (was 30s under the ratio), and a 12s-overlap pairing
 * still syncs. The previous 50%-of-the-shorter-signal ratio was ~7.5x stricter
 * than statistics require and refused real pairings because of it: a 30s transmitter
 * clip against a 3-minute take sharing 10s of true overlap demanded 15s and never
 * scored the correct lag — a pair a human syncs by ear in seconds. An absolute floor
 * keeps the variance guard at full strength AND recovers that capability. It also
 * still blocks the sliver case that motivated the floor: at lag 59s on a 60s file the
 * overlap is 1s, far under 8s, so it is never scored.
 */
export const MIN_OVERLAP_FRAMES = ENVELOPE_HZ * 8;

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
  minOverlapFrames = MIN_OVERLAP_FRAMES,
} = {}) {
  const scores = [];
  const shorter = Math.min(reference.length, target.length);
  void shorter;

  // Never search further than the signal can support. A lag beyond the shorter
  // signal's length leaves nothing meaningful to compare.
  const maxLag = Math.min(maxLagFrames, shorter);

  // MINIMUM OVERLAP — this bound is load-bearing, and the original value (8 frames,
  // i.e. 80ms) was badly wrong. At an extreme lag the overlap shrinks to a sliver,
  // and a sliver correlates near-perfectly BY CHANCE. Measured: a 60s take searched
  // at +/-60s produced a spurious peak of 1.07 at -59.27s — scoring HIGHER than the
  // true peak of 1.01 at the correct offset. The engine refused it, but only by
  // luck of where the confidence thresholds sat; it had already picked the wrong lag.
  // ANCHOR THE FLOOR TO ACHIEVABLE GEOMETRY, NOT TO THE SHORTER SIGNAL.
  //
  // The floor exists because NCC is normalized, so a tiny overlap can score
  // spuriously high — it is a VARIANCE guard, not a statement about geometry. Anchored
  // naively to 50% of the shorter signal it rejects real pairings: operator starts the
  // transmitter, starts the camera 20s later, transmitter clip is 30s and the take is
  // 3 minutes. True alignment shares only 10s, the floor demands 15s, and the correct
  // lag is never even scored — a refusal on a pair a human syncs by ear in seconds.
  // Same shape whenever a clip is truncated at a take boundary: battery died, late
  // start, early stop.
  //
  // So: keep the variance guard at full strength when the geometry permits it, and
  // degrade to what is actually achievable when it does not.
  let maxAchievableOverlap = 0;
  for (let lag = -maxLag; lag <= maxLag; lag += 1) {
    const o = Math.min(reference.length, target.length - lag) - Math.max(0, -lag);
    if (o > maxAchievableOverlap) maxAchievableOverlap = o;
  }
  // Cap by what the geometry can actually deliver, so a pair that simply cannot reach
  // the floor is flagged rather than silently yielding nothing at all.
  const minOverlap = Math.min(minOverlapFrames, maxAchievableOverlap);
  const lowOverlap = minOverlap < minOverlapFrames;

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
  // lowOverlap rides along so findOffset can flag a result whose variance guard had
  // to be relaxed — the caller deserves to know the answer rests on less evidence.
  scores.lowOverlap = lowOverlap;
  return scores;
}

/**
 * Find the offset between a camera scratch track and a separately-recorded
 * clean track, with a confidence the caller can act on.
 *
 * ── SIGN CONVENTION (write it down or the ffmpeg wiring guesses) ─────────────
 *   offsetSeconds > 0  the CLEAN track's content occurs LATER than the scratch
 *                      track's, i.e. the clean recording must be moved EARLIER
 *                      (or the video later) to align. Equivalently: delay the
 *                      scratch/video by offsetSeconds.
 *   offsetSeconds < 0  the clean recording started FIRST (the usual case when
 *                      someone hits record on the transmitter before the camera);
 *                      trim |offsetSeconds| from its head to align.
 *
 * To apply with ffmpeg: a POSITIVE offset means `-itsoffset <offset>` on the
 * VIDEO input, or trim nothing from the audio. A NEGATIVE offset means
 * `-ss |offset|` on the AUDIO input.
 *
 * There is deliberately NO blended `confidence` score. An earlier version returned
 * `peak*0.5 + prominence*0.5`, which nothing consumed and which a UI would inevitably
 * have thresholded on — hiding WHICH gate was close to failing. `marginToRefusal`
 * replaces it: 1.0 is exactly the refusal boundary, and `bindingTerm` names the gate
 * that is binding, so a marginal result explains itself.
 *
 * @returns {{
 *   offsetFrames: number, offsetSeconds: number,
 *   peak: number, prominence: number,
 *   marginToRefusal: number, bindingTerm: 'peak'|'prominence',
 *   usable: boolean, reason: string|null,
 *   searchedSeconds: number, searchTruncated: boolean, lowOverlap: boolean
 * }}
 */
export function findOffset(referenceSamples, targetSamples, {
  sampleRate,
  referenceSampleRate,
  targetSampleRate,
  maxOffsetSeconds = 60,
  envelopeHz = ENVELOPE_HZ,
} = {}) {
  // Two rates are accepted so a 48kHz camera and a 44.1kHz recorder can be compared
  // without a resample step: each signal is bucketed on ITS OWN rate, and both
  // envelopes then share the same real timebase. `sampleRate` remains supported as
  // the matched-pair shorthand.
  //
  // This matters beyond mismatched pairs: bucket size is round(rate / envelopeHz),
  // so passing a WRONG rate for a matched pair scales every reported offset by
  // passed/actual — 44100 against true 48000 is an 8.8% error, silent, with
  // healthy-looking confidence. Rates must come from file metadata, never a default.
  const refRate = referenceSampleRate || sampleRate;
  const tgtRate = targetSampleRate || sampleRate;
  const empty = {
    offsetFrames: 0, offsetSeconds: 0, peak: 0, prominence: 0,
    marginToRefusal: 0, usable: false, reason: 'insufficient-audio',
  };
  if (!refRate || !tgtRate || !referenceSamples?.length || !targetSamples?.length) return empty;

  const ref = standardize(toEnvelope(referenceSamples, refRate, envelopeHz));
  const tgt = standardize(toEnvelope(targetSamples, tgtRate, envelopeHz));
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
  let bestIndex = 0;
  for (let i = 0; i < scores.length; i += 1) {
    if (scores[i].score > best.score) { best = scores[i]; bestIndex = i; }
  }

  // SUB-BIN REFINEMENT. The envelope quantizes lag to 10ms, which is fine against a
  // 33.3ms video frame but NOT fine for drift: a drift rate is a DIFFERENCE of two
  // offsets, so it inherits a full quantum of error, and over a short span that noise
  // dwarfs the signal (10ms over 30s is 333ppm against real rates of 10-100ppm).
  //
  // Fitting a parabola through the three scores bracketing the peak recovers the true
  // maximum to roughly a tenth of a bin — ~1ms — which cuts the drift noise floor by
  // an order of magnitude. This is far cheaper than raising the envelope rate, which
  // would multiply the cost of scoring EVERY lag to fix a two-measurement problem.
  let refinedLag = best.lag;
  const prev = scores[bestIndex - 1];
  const next = scores[bestIndex + 1];
  if (prev && next && prev.lag === best.lag - 1 && next.lag === best.lag + 1) {
    const denomP = prev.score - 2 * best.score + next.score;
    if (denomP !== 0) {
      const delta = (0.5 * (prev.score - next.score)) / denomP;
      // A well-formed peak sits within half a bin of the sampled maximum. Anything
      // further means the parabola is not describing a peak; keep the integer lag.
      if (Number.isFinite(delta) && Math.abs(delta) <= 0.5) refinedLag = best.lag + delta;
    }
  }

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

  // DEGENERATE CASE: if every scored lag falls inside the guard band there is no
  // runner-up at all. Clamping to 0 here would make prominence equal the peak and
  // manufacture MAXIMUM confidence by construction — the opposite of the intent.
  // There is genuinely nothing to compare against, so say so.
  const haveRunnerUp = runnerUp !== -Infinity;
  if (!haveRunnerUp) {
    return {
      offsetFrames: best.lag,
      offsetSeconds: best.lag / envelopeHz,
      peak: best.score,
      prominence: 0,
      marginToRefusal: 0,
      usable: false,
      reason: 'search-range-too-narrow-to-judge',
    };
  }

  const peak = best.score;
  const prominence = peak - Math.max(0, runnerUp);

  // Confidence blends "do they match at all" with "is this the ONLY place they
  // match". Either alone is misleading: a high peak with no prominence is a hum;
  // high prominence with a low peak is two signals that barely relate.
  // MARGIN TO REFUSAL, not a blend. `peak*0.5 + prominence*0.5` mixed two terms with
  // different gates (0.3 and 0.1) and different distributions, so a value of 0.2 could
  // mean "both nearly failed" or "one failed while the other was excellent" — different
  // situations, hidden behind one number a UI would inevitably threshold on.
  //
  // This instead answers the only question a reviewer asks: how close was this to being
  // refused. 1.0 sits exactly on the boundary; below 1.0 it IS refused; higher is safer.
  const peakMargin = peak / 0.3;
  const prominenceMargin = prominence / 0.1;
  const marginToRefusal = Math.min(peakMargin, prominenceMargin);

  // WHICH TERM BINDS. min() hides whether the peak or the prominence is the thing
  // nearly failing, and those call for different operator actions: a peak-limited
  // result means widen the window or supply better audio, a prominence-limited one
  // means suspect periodic content (music bed, hum, metronome). Derived here rather
  // than stored as a label because near the boundary noise flips which term is
  // smaller, so it must reflect the values actually returned.
  const bindingTerm = peakMargin <= prominenceMargin ? 'peak' : 'prominence';

  // BOUNDARY HIT — the strongest available evidence that the TRUE peak lies outside
  // the search window. A DJI recorder left running between takes routinely produces
  // offsets of minutes; if the real alignment is beyond maxOffsetSeconds, the best
  // in-window sidelobe can score cleanly and would otherwise be returned as a
  // confident WRONG answer. Refusing and asking for a wider window is the only
  // honest response, and this is the common case for separately-started devices,
  // not an edge case.
  // EFFECTIVE ceiling, not the requested one. The minimum-overlap floor caps how far
  // the search can actually reach: for equal-length signals no lag beyond 50% of the
  // file is ever scored. Computing the boundary threshold from `maxOffsetSeconds`
  // therefore made this guard DEAD CODE on any file shorter than twice the requested
  // window — measured: a 60s file asking for +/-60s can only reach +/-30s, while the
  // threshold sat at 59.5s. The guard existed only on paper in exactly the short-take
  // case it was written for.
  //
  // Deriving it from the lags actually scored is exact and cannot drift from the
  // overlap rule the way a re-derived formula would.
  let effectiveMaxLag = 0;
  for (const s of scores) {
    const a = Math.abs(s.lag);
    if (a > effectiveMaxLag) effectiveMaxLag = a;
  }
  const atBoundary = Math.abs(best.lag) >= effectiveMaxLag - guard;

  // The caller asked for a window we may not have been able to honour. Saying so is
  // the difference between "no alignment exists within 60s" and "I only looked at 30s".
  const requestedLagFrames = Math.round(maxOffsetSeconds * envelopeHz);
  const searchTruncated = effectiveMaxLag < requestedLagFrames;

  let reason = null;
  if (atBoundary) reason = 'peak-at-search-boundary-widen-window';
  // Below the overlap floor the 0.3 peak gate is calibrated for a distribution that no
  // longer applies, so passing it means nothing. Measured worst spurious correlation
  // between UNRELATED speech envelopes, 400 trials per length:
  //
  //     1s -> 0.963    3s -> 0.682    6s -> 0.403    12s -> 0.271
  //     2s -> 0.651    4s -> 0.461    8s -> 0.349    16s -> 0.242
  //
  // At 1s, pure chance reaches 0.963 — indistinguishable from a perfect match. The
  // previous behaviour degraded the floor to whatever geometry allowed and returned
  // `usable: true` anyway: a 3s clip sharing NO content with a 90s take produced
  // offset -1.3376s at peak 0.5566, exactly where that table predicts junk lands.
  //
  // No replacement curve is fitted here on purpose. Two independent measurements of
  // the 8s point disagreed (0.268 vs 0.349) because the result is sensitive to the
  // synthetic envelope model — so a curve derived from that model would repeat the
  // original mistake of calibrating against a chosen distribution rather than the real
  // one. The offset is still returned so a UI can offer it for verification by ear;
  // what is withheld is the CLAIM that it is trustworthy.
  else if (scores.lowOverlap === true) reason = 'insufficient-overlap-to-judge';
  else if (peak < 0.3) reason = 'weak-correlation';
  else if (prominence < 0.1) reason = 'ambiguous-periodic-content';

  return {
    offsetFrames: refinedLag,
    offsetSeconds: refinedLag / envelopeHz,
    peak,
    prominence,
    marginToRefusal,
    bindingTerm,
    usable: reason === null,
    reason,
    // How far the search could actually reach, and whether that fell short of what
    // was asked for. A caller that gets `searchTruncated: true` with no usable result
    // knows to supply longer audio rather than a wider window.
    searchedSeconds: effectiveMaxLag / envelopeHz,
    searchTruncated,
    // True when the geometry forced the variance guard below its desired strength.
    // The answer may still be right; it simply rests on less overlapping audio.
    lowOverlap: scores.lowOverlap === true,
  };
}
