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
 * @param {{atSeconds:number, offsetSeconds:number}} head measured near the start
 * @param {{atSeconds:number, offsetSeconds:number}} tail measured near the end
 * @returns {{
 *   driftPpm:number, driftSecondsPerHour:number, resampleRatio:number,
 *   correctionNeeded:boolean, plausible:boolean, reason:string|null,
 *   predictedErrorAtEndMs:number
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
    predictedErrorAtEndMs: 0,
  };
  if (!head || !tail) return { ...none, plausible: false, reason: 'need-two-measurements' };

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
    predictedErrorAtEndMs: Math.abs(delta) * 1000,
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
