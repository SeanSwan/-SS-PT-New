/**
 * providerPricing.mjs — neutral generation-cost table + estimator.
 *
 * OWNERSHIP: authored in the design-brain lane as a dependency-free module so
 * the Content Studio submit route can enforce a spend cap without importing
 * anything from the design brain, and without a second pricing table growing
 * somewhere else. It has no imports and no side effects on purpose.
 *
 * ENFORCEMENT LIVES ELSEWHERE. This module answers "what will this cost?".
 * The gate — "may we spend it?" — belongs in the session/submit path that owns
 * the approval record. Adapters estimate; the session decides.
 *
 * FAIL-CLOSED: an unknown provider, model, or resolution THROWS. It never
 * returns 0 and never guesses. A silent zero is how an unmetered model ends up
 * generating for free until the invoice arrives.
 *
 * PRICE PROVENANCE: every entry carries `verifiedOn` + `source`. Published
 * prices move. Anything older than STALE_AFTER_DAYS is reported as stale so a
 * caller can refuse or re-check rather than quoting a number that has drifted.
 */

/** Cost basis kinds. */
export const BASIS = Object.freeze({
  PER_SECOND: 'per_second',
  PER_IMAGE: 'per_image',
});

export const STALE_AFTER_DAYS = 60;

/**
 * Prices in CENTS. Integer cents only — never floats for money.
 * `centsPerSecond` is keyed by the vertical resolution label the provider bills on.
 */
export const PRICING = Object.freeze({
  'minimax-h3-hosted': {
    kind: BASIS.PER_SECOND,
    label: 'MiniMax H3 (hosted API)',
    attribution: 'MiniMax H3', // licence requires prominent UI display
    centsPerSecond: { '512p': 1, '768p': 4, '1080p': 8 },
    verifiedOn: '2026-08-11',
    source: 'published third-party + vendor pricing pages, cross-checked',
    confidence: 'verified',
  },

  'gemini-image-flash': {
    kind: BASIS.PER_IMAGE,
    label: 'Gemini 3.1 Flash Image',
    centsPerImage: 4,
    verifiedOn: '2026-08-11',
    source: 'scripts/generate-image.mjs header, in-repo',
    confidence: 'claimed', // repo comment, not a vendor page
  },

  'gemini-image-pro': {
    kind: BASIS.PER_IMAGE,
    label: 'Gemini 3 Pro Image',
    centsPerImage: 13,
    verifiedOn: '2026-08-11',
    source: 'scripts/generate-image.mjs header, in-repo',
    confidence: 'claimed',
  },

  /**
   * Local GPU (e.g. Wan 2.2 on the workstation). Zero marginal DOLLARS, which
   * is exactly why it must still be metered: at ~10-30 min per 5s clip the
   * scarce resource is TIME, and a queue that treats it as free will happily
   * accept a month of work. Cost is 0; `wallClockSecondsPerOutputSecond` is the
   * budget a scheduler should actually reason about.
   */
  'local-gpu': {
    kind: BASIS.PER_SECOND,
    label: 'Local GPU (open weights)',
    centsPerSecond: { '480p': 0, '720p': 0, '1080p': 0, '2k': 0 },
    wallClockSecondsPerOutputSecond: { '480p': 24, '720p': 60, '1080p': 120, '2k': 300 },
    verifiedOn: '2026-08-11',
    source: 'community benchmarks, RTX 5090 32GB, INT8 pruned — ORDER OF MAGNITUDE ONLY',
    confidence: 'claimed',
  },
});

class PricingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PricingError';
    this.code = code;
  }
}

function daysBetween(isoDate, nowMs) {
  const then = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((nowMs - then) / 86_400_000);
}

/**
 * Estimate the cost of one generation, in integer cents.
 *
 * @param {object} p
 * @param {string} p.provider        key of PRICING
 * @param {number} [p.durationSec]   required for PER_SECOND providers
 * @param {string} [p.resolution]    required for PER_SECOND providers ('1080p')
 * @param {number} [p.imageCount=1]  for PER_IMAGE providers
 * @param {number} [p.nowMs]         injectable clock (tests / determinism)
 * @returns {{cents:number, basis:string, stale:boolean, confidence:string, detail:string}}
 * @throws {PricingError} on anything unknown — never returns a guess.
 */
export function estimateCents({ provider, durationSec, resolution, imageCount = 1, nowMs = Date.now() }) {
  const entry = PRICING[provider];
  if (!entry) {
    throw new PricingError('E_UNKNOWN_PROVIDER', `No pricing for provider "${provider}". Refusing to estimate.`);
  }

  const ageDays = daysBetween(entry.verifiedOn, nowMs);
  const stale = ageDays > STALE_AFTER_DAYS;

  if (entry.kind === BASIS.PER_IMAGE) {
    if (!Number.isInteger(imageCount) || imageCount < 1) {
      throw new PricingError('E_BAD_COUNT', `imageCount must be a positive integer, got ${imageCount}.`);
    }
    return {
      cents: entry.centsPerImage * imageCount,
      basis: BASIS.PER_IMAGE,
      stale,
      confidence: entry.confidence,
      detail: `${imageCount} x ${entry.centsPerImage}c (${entry.label})`,
    };
  }

  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new PricingError('E_BAD_DURATION', `durationSec must be > 0 for "${provider}", got ${durationSec}.`);
  }
  const rate = entry.centsPerSecond?.[resolution];
  if (rate === undefined) {
    const known = Object.keys(entry.centsPerSecond ?? {}).join(', ') || 'none';
    throw new PricingError(
      'E_UNKNOWN_RESOLUTION',
      `No rate for "${provider}" at "${resolution}". Known: ${known}. Refusing to estimate.`,
    );
  }

  // Providers bill whole seconds; round UP so an estimate is never optimistic.
  const cents = Math.ceil(rate * Math.ceil(durationSec));
  return {
    cents,
    basis: BASIS.PER_SECOND,
    stale,
    confidence: entry.confidence,
    detail: `${Math.ceil(durationSec)}s @ ${rate}c/s ${resolution} (${entry.label})`,
  };
}

/**
 * Fail-closed cap check. Returns a decision; does NOT mutate or spend.
 * `warnAtPercent` drives the UI's amber state; `allowed:false` is a hard stop.
 */
export function checkCap({ spentCents, estimateCents: est, capCents, warnAtPercent = 80 }) {
  if (!Number.isInteger(capCents) || capCents <= 0) {
    // No configured cap is NOT permission to spend.
    return { allowed: false, reason: 'E_NO_CAP_CONFIGURED', projectedCents: spentCents + est, warn: true };
  }
  const projected = spentCents + est;
  return {
    allowed: projected <= capCents,
    reason: projected <= capCents ? null : 'E_CAP_EXCEEDED',
    projectedCents: projected,
    warn: projected >= Math.floor((capCents * warnAtPercent) / 100),
    capCents,
  };
}

/** Attribution string a surface must display for this provider, or null. */
export function attributionFor(provider) {
  return PRICING[provider]?.attribution ?? null;
}

export { PricingError };
