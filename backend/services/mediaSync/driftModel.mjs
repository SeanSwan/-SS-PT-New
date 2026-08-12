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
export function modelDrift(head, tail) {
  const none = {
    driftPpm: 0,
    driftSecondsPerHour: 0,
    resampleRatio: 1,
    correctionNeeded: false,
    plausible: true,
    reason: null,
    errorAcrossMeasuredSpanMs: 0,
  };
  if (!head || !tail) return { ...none, plausible: false, reason: 'need-two-measurements' };

  // Refuse to build a rate out of a measurement its own detector declined. Only an
  // EXPLICIT false is treated as unusable, so callers passing plain {atSeconds,
  // offsetSeconds} (already-verified measurements) still work.
  if (head.usable === false || tail.usable === false) {
    return { ...none, plausible: false, reason: 'measurement-not-usable' };
  }

  const span = tail.atSeconds - head.atSeconds;
  // Two measurements taken close together cannot separate drift from measurement
  // noise: a 10ms envelope resolution over a 5-second span implies a 2000ppm
  // "drift" that is entirely quantization.
  if (span < 30) {
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

  const correctionNeeded = Math.abs(driftPpm) >= NEGLIGIBLE_DRIFT_PPM;

  // The clean track must be stretched/compressed by this factor to match the
  // camera timebase. Positive drift means the target fell progressively later, so
  // it must be sped up slightly (ratio < 1).
  const resampleRatio = 1 / (1 + driftPpm / 1e6);

  return {
    driftPpm,
    driftSecondsPerHour: (driftPpm / 1e6) * 3600,
    resampleRatio,
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
