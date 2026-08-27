/**
 * Cancellation duration helpers (rule 4 extraction from cancellationPricing.mjs)
 * =============================================================================
 * SwanStudios sells two session bands — $175 for 60 minutes or more, $110 below that —
 * and StorefrontItem records NO duration. That makes duration-aware SELECTION of the
 * right package impossible (a schema gap, tracked on SWA-212) but duration-aware
 * REFUSAL entirely possible, which is what these helpers support.
 *
 * Pure and dependency-free on purpose: every rule here is a policy statement about the
 * business, and policy that is testable in isolation is policy that stops drifting.
 */

const RATES = {
  STANDARD_60_MIN: 175,
  EXPRESS_30_MIN: 110
};

/**
 * The session rate the business charges for a given duration. SwanStudios sells exactly two
 * bands: $175 for 60 minutes or more, $110 below that. This mapping was written out by hand in
 * two places (here and routes/sessions.mjs) — and this file's own header warns that a policy
 * number with copies is a policy number that drifts. One export, both callers.
 *
 * An unknown/invalid duration maps to the 60-minute rate, which is what every caller assumed
 * before duration was passed at all, so omitting it changes nothing.
 */
export const expectedRateForDuration = (minutes) => {
  const m = Number(minutes);
  return Number.isFinite(m) && m > 0 && m < 60
    ? RATES.EXPRESS_30_MIN
    : RATES.STANDARD_60_MIN;
};

const isUsableDuration = (minutes) => {
  const m = Number(minutes);
  return Number.isFinite(m) && m > 0;
};

/** Which of the two bands a duration falls in. Only ever compared band-to-band. */
const durationBand = (minutes) => (Number(minutes) < 60 ? 30 : 60);

// A package name that STATES its duration ('30-Minute Assessment Pack'). Deliberately requires
// the word min/minute: a bare number in a name is a pack size far more often than a duration
// ('Signature 60 10-Pack' has two numbers and neither is reliably the duration).
const NAME_DURATION_RE = /\b(\d{2,3})\s*-?\s*(?:min\b|minute)/i;

const packageDurationFromName = (name) => {
  const match = NAME_DURATION_RE.exec(String(name || ''));
  if (!match) return null;
  const minutes = Number(match[1]);
  return Number.isFinite(minutes) && minutes >= 15 && minutes <= 180 ? minutes : null;
};

/**
 * Can this package price THIS session? Returns a reason string when it provably cannot, else null.
 *
 * StorefrontItem records no duration, so duration-aware SELECTION is not implementable — that is a
 * schema gap. Duration-aware REFUSAL is, from two independent signals:
 *
 *   1. the name states a duration in a different band than the session's
 *   2. the derived rate is EXACTLY the canonical rate of the other band, and not of this one
 *
 * Signal 2 exists because production's 60-minute package is named 'Single Session' and carries no
 * '60' anywhere; name parsing alone would catch the under-charge direction and miss the over-charge
 * one. A name that states a duration and AGREES wins outright — signal 2 is skipped — so a
 * legitimately discounted package that names its own duration is not refused.
 *
 * Refusal is always safe: both callers already degrade correctly on isFallback (the service
 * declines to suggest and logs UNVERIFIED; the client panel renders 'See cancellation policy').
 * This can only ever turn a number into a refusal, never into a different number.
 */
export const durationMismatchReason = (sessionMinutes, packageItem, ratePerSession) => {
  if (!isUsableDuration(sessionMinutes)) return null;
  const sessionBand = durationBand(sessionMinutes);

  const namedMinutes = packageDurationFromName(packageItem?.name);
  if (namedMinutes !== null) {
    return durationBand(namedMinutes) === sessionBand
      ? null
      : `package states ${namedMinutes} minutes, session is ${sessionMinutes}`;
  }

  const rateForThisBand = expectedRateForDuration(sessionMinutes);
  const rateForOtherBand = expectedRateForDuration(sessionBand === 60 ? 30 : 60);
  if (ratePerSession === rateForOtherBand && ratePerSession !== rateForThisBand) {
    return `rate ${ratePerSession} is the standard ${durationBand(sessionMinutes) === 60 ? 30 : 60}-minute rate, session is ${sessionMinutes} minutes`;
  }

  return null;
};

