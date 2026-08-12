/**
 * Clock-drift detection and correction.
 * ============================================================================
 *
 * THE PROBLEM MOST SYNC TOOLS DO NOT SOLVE. Finding the offset is the easy half.
 * The half that actually ruins a recording is DRIFT: a camera and a wireless
 * transmitter run on independent crystals, and "48000 Hz" on one is not exactly
 * 48000 Hz on the other. Align them perfectly at 00:00 and by minute twenty they
 * can be hundreds of milliseconds apart — which is precisely the length of video
 * this system is built to produce, and far past the ~45ms where an audience
 * consciously notices lips disagreeing with words.
 *
 * SLIDING THE TRACK CANNOT FIX THIS. A single offset correction is a constant; the
 * error is a RAMP. Correcting the start leaves the end wrong; splitting the
 * difference leaves both ends wrong by half. The only real fix is to RESAMPLE the
 * clean track so its timebase matches the camera's.
 *
 * A SECOND CAUSE, SAME SYMPTOM: shooting 29.97fps while treating the timeline as
 * 30fps introduces the identical creeping divergence from a completely different
 * origin (0.1%). It is handled here as drift because the correction is the same.
 *
 * MEASUREMENT: take the offset near the START and again near the END. Two points
 * define the ramp. The difference divided by the elapsed time is the drift rate.
 */

/** Below this, correction costs more (resampling artifacts) than it buys. */
export const NEGLIGIBLE_DRIFT_PPM = 5;

/**
 * Offset measurements are quantized by the envelope resolution (10ms at 100Hz).
 * A drift rate is a DIFFERENCE of two such measurements, so it carries up to one
 * full quantum of error — and dividing that by the span turns it into a ppm floor
 * below which any "drift" is indistinguishable from rounding.
 */
export const MEASUREMENT_RESOLUTION_SECONDS = 0.01;

/**
 * How far above the noise floor a rate must sit before it is believed. A value at
 * the floor is a coin flip; 2x is the smallest ratio that is not self-deception.
 */
export const NOISE_FLOOR_MARGIN = 2;

/**
 * The largest drift rate worth being able to detect. Consumer crystals run tens of
 * ppm; the 29.97-vs-30fps timebase trap is ~1000ppm and is the worst realistic case.
 * If a span's noise floor exceeds this, the pair cannot distinguish ANY rate that
 * actually occurs, so the measurement is useless rather than merely imprecise —
 * which is a different statement and deserves a different answer.
 */
export const MAX_TARGET_DRIFT_PPM = 1000;

/**
 * The ppm resolution limit for a given measurement span. THIS IS THE NUMBER THAT
 * WAS MISSING. Measured against the previous gates:
 *
 *   span   30s -> +/- 333.3 ppm      span  600s -> +/- 16.7 ppm
 *   span   60s -> +/- 166.7 ppm      span 1200s -> +/-  8.3 ppm
 *   span  300s -> +/-  33.3 ppm      span 2000s -> +/-  5.0 ppm
 *
 * NEGLIGIBLE_DRIFT_PPM is 5, so at EVERY realistic take length the old code could
 * "detect" a drift rate that was pure rounding and resample on it. At the old 30s
 * minimum span that is up to 333ppm of fabricated correction — on a 20-minute take,
 * 400ms of desync INTRODUCED by correcting nothing. The engine has to know what it
 * cannot resolve.
 */
export function noiseFloorPpm(spanSeconds, resolution = MEASUREMENT_RESOLUTION_SECONDS) {
  if (!spanSeconds || spanSeconds <= 0) return Infinity;
  return (resolution / spanSeconds) * 1e6;
}

/** Above this, two measurements probably disagree for a reason other than drift. */
export const IMPLAUSIBLE_DRIFT_PPM = 10000; // 1%

/**
 * Derive a drift model from two offset measurements taken at different points.
 *
 * ── MEASUREMENT VALIDITY IS CHECKED HERE, NOT ASSUMED ────────────────────────
 * Every gate below is downstream of two measurements, so consuming a measurement
 * that findOffset already declined would make all of them worthless. A head window
 * containing only room tone can lock one syllable off — say 200ms — which over a
 * 1200s span reads as 167ppm: comfortably inside the plausibility bound, and enough
 * to make this function resample a perfectly clean recording by a fabricated rate.
 * Pass the findOffset results through directly (they carry `usable`), or omit the
 * field only for measurements you have separately verified.
 *
 * ── SIGN CONVENTION ─────────────────────────────────────────────────────────
 * Offsets follow findOffset: positive means the clean track's content occurs later.
 * A positive driftPpm therefore means the clean track falls progressively FURTHER
 * behind, so it must be SPED UP — resampleRatio < 1 shortens it to match.
 *
 * ── ORDER OF OPERATIONS (the wiring depends on this) ─────────────────────────
 * Apply drift FIRST, then offset. The offset returned by a whole-file correlation
 * on drifted signals is roughly the mid-take average, not the head offset, so
 * shifting by it before removing the ramp leaves both ends wrong. Correct order:
 * resample by resampleRatio, re-measure the offset on the corrected audio, then
 * apply that offset.
 *
 * @param {{atSeconds:number, offsetSeconds:number, usable?:boolean}} head
 * @param {{atSeconds:number, offsetSeconds:number, usable?:boolean}} tail
 * @returns {{
 *   driftPpm:number, driftSecondsPerHour:number, resampleRatio:number,
 *   correctionNeeded:boolean, plausible:boolean, reason:string|null,
 *   errorAcrossMeasuredSpanMs:number
 * }}
 */
export function modelDrift(head, tail, { resolution = MEASUREMENT_RESOLUTION_SECONDS } = {}) {
  const none = {
    driftPpm: 0,
    driftSecondsPerHour: 0,
    resampleRatio: 1,
    correctionNeeded: false,
    plausible: true,
    reason: null,
    errorAcrossMeasuredSpanMs: 0,
    noiseFloorPpm: Infinity,
    belowNoiseFloor: true,
  };
  if (!head || !tail) return { ...none, plausible: false, reason: 'need-two-measurements' };

  // Refuse to build a rate out of a measurement its own detector declined. Only an
  // EXPLICIT false is treated as unusable, so callers passing plain {atSeconds,
  // offsetSeconds} (already-verified measurements) still work.
  if (head.usable === false || tail.usable === false) {
    return { ...none, plausible: false, reason: 'measurement-not-usable' };
  }

  const span = tail.atSeconds - head.atSeconds;

  // The floor is derived, not guessed. The previous gate was a flat span >= 30s,
  // which admits a +/-333ppm noise floor — 66x the threshold it then compared
  // against. Measure across the LONGEST span available (head near the start, tail
  // near the end); the floor falls linearly with span and there is no other lever.
  const floor = noiseFloorPpm(span, resolution);
  // A span whose noise floor swamps every rate that actually occurs cannot support a
  // conclusion at all. This replaces a flat span >= 30s guess with the span at which
  // the measurement stops being able to see anything real (~10s at 10ms resolution).
  if (!Number.isFinite(floor) || span <= 0 || floor > MAX_TARGET_DRIFT_PPM) {
    return { ...none, plausible: false, reason: 'measurement-span-too-short' };
  }

  const delta = tail.offsetSeconds - head.offsetSeconds;
  const driftPpm = (delta / span) * 1e6;

  if (!Number.isFinite(driftPpm) || Math.abs(driftPpm) > IMPLAUSIBLE_DRIFT_PPM) {
    // Two wildly different offsets are far more likely to be a mis-detection at one
    // end than a real 1%-off crystal. Say so rather than "correcting" by a value
    // that would destroy a correctly-aligned file.
    return { ...none, plausible: false, reason: 'implausible-drift-likely-bad-measurement' };
  }

  // A rate is only believed when it clears BOTH the "worth correcting" threshold and
  // the "distinguishable from rounding" floor. Below the floor the sign itself is a
  // coin flip, so applying a correction is as likely to add desync as remove it.
  const believable = Math.abs(driftPpm) >= floor * NOISE_FLOOR_MARGIN;
  const worthCorrecting = Math.abs(driftPpm) >= NEGLIGIBLE_DRIFT_PPM;
  const correctionNeeded = believable && worthCorrecting;

  // The clean track must be stretched/compressed by this factor to match the
  // camera timebase. Positive drift means the target fell progressively later, so
  // it must be sped up slightly (ratio < 1).
  const resampleRatioRaw = 1 / (1 + driftPpm / 1e6);
  const resampleRatio = resampleRatioRaw;

  return {
    driftPpm,
    driftSecondsPerHour: (driftPpm / 1e6) * 3600,
    // Below the floor the measurement cannot support a correction. Surfaced so a UI
    // can say "no measurable drift over this span" rather than implying zero drift.
    noiseFloorPpm: floor,
    belowNoiseFloor: !believable,
    resampleRatio: correctionNeeded ? resampleRatio : 1,
    correctionNeeded,
    plausible: true,
    reason: null,
    // Named for what it IS: drift accumulated across the measured span. It is NOT
    // the error at end of take unless the tail window sits at the very end — head
    // at 0s and tail at 60s of a 1200s take would understate the real end error by
    // 20x, which is false comfort to anyone reading it as a QA number. Use
    // isPerceptible(driftPpm, takeDurationSeconds) for end-of-take error.
    errorAcrossMeasuredSpanMs: Math.abs(delta) * 1000,
  };
}

/**
 * Would uncorrected drift be visible to a viewer by the end of this take?
 *
 * ~45ms is the widely-cited threshold at which audio lagging video becomes
 * consciously noticeable; lip-sync tolerance is asymmetric and tighter when audio
 * LEADS. 40ms is used here as a single conservative bound in both directions.
 */
export const PERCEPTIBLE_DESYNC_MS = 40;

export function isPerceptible(driftPpm, durationSeconds) {
  const errorMs = Math.abs(driftPpm / 1e6) * durationSeconds * 1000;
  return { errorMs, perceptible: errorMs >= PERCEPTIBLE_DESYNC_MS };
}

/**
 * How long can this take run before uncorrected drift becomes visible?
 * Surfaced in the UI so "you are fine for short clips, not for this one" is a
 * statement with a number behind it rather than a vibe.
 */
export function secondsUntilPerceptible(driftPpm) {
  const rate = Math.abs(driftPpm / 1e6);
  if (rate === 0) return Infinity;
  return (PERCEPTIBLE_DESYNC_MS / 1000) / rate;
}
