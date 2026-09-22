/**
 * costEstimate.mjs — turn a published RATE plus a requested DURATION into a cost,
 * in FIXED-POINT.
 *
 * ── THE TYPE MISMATCH THIS EXISTS TO RESOLVE ────────────────────────────────
 * `spendGuard.checkRunAllowed` compares `caps.costPerRunUsd` against a daily USD
 * ceiling. That is the right shape for a local model (free) and for a flat-rate
 * hosted API, and the WRONG shape for a vendor that bills per second: a scalar
 * cannot express "6 seconds of Kling 3.0 at $0.112/sec", and no single number is
 * true for both a 2-second and a 30-second request.
 *
 * Rather than widen the guard — which would put provider-specific arithmetic inside
 * the thing that enforces the ceiling — the conversion happens here, in front of it.
 *
 * ── FIXED-POINT, BECAUSE ASTRA REJECTED FLOAT MONEY ─────────────────────────
 * The first version of this file multiplied floats and rounded with `toFixed(4)`.
 * Astra's ruling: "Use fixed-point decimal/integer arithmetic, never binary
 * floating-point money arithmetic."
 *
 * That is not pedantry. `0.1 + 0.2 !== 0.3` in binary floating point, and a ledger
 * that accumulates that error drifts against a real balance. Worse, it drifts in the
 * direction that matters: a ceiling compared against a slightly-too-small sum admits
 * a run it should have refused. So the authoritative unit here is an INTEGER NUMBER
 * OF MICRO-DOLLARS (1e-6 USD), which is finer than any published rate and exact for
 * every one of them. Decimal strings cross the API boundary; integers do the maths.
 *
 * ── FAIL-CLOSED, IN THE DIRECTION THAT PROTECTS MONEY ───────────────────────
 * `null` means "cannot be determined". It is NOT zero, and a caller must never treat
 * it as free: the registry already turns a claimed rate into null, and the guard
 * already refuses a provider whose per-run cost is null. So an unknown rate, an
 * absent duration, or a duration that is not a positive integer all end in a refusal
 * for a billing provider and in "free" for a provider that genuinely is.
 *
 * ── WHAT THIS IS NOT ────────────────────────────────────────────────────────
 * It is not a prediction of the bill. Higgsfield's status response carries no cost
 * field, so this is the number the CEILING is checked against, derived from the
 * vendor's published list rate — labelled as such, never presented as an invoice.
 */

/** Micro-dollars per dollar. The authoritative scale. */
export const MICROS_PER_USD = 1_000_000;

/** How many decimals a money string is rendered with. */
const USD_DECIMALS = 4;

class CostEstimateError extends Error {
  constructor(code, message) { super(message); this.name = 'CostEstimateError'; this.code = code; }
}

/**
 * Convert a rate to integer micro-dollars WITHOUT going through a float multiply.
 *
 * `0.0738` as a JS number is already the nearest double, and `String()` renders it
 * back as "0.0738" — so parsing the DECIMAL STRING is what keeps the value exact.
 * Multiplying the double by 1e6 and rounding would work for these particular rates
 * and would fail for a rate whose double lands just under a .5 boundary.
 */
export function toMicros(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(str)) {
    throw new CostEstimateError('E_BAD_RATE',
      `Rate must be a plain non-negative decimal; got "${value}". A malformed rate is the most `
      + 'dangerous input here: reading it as absent would restore a default, and reading it as '
      + 'Infinity would remove the ceiling entirely.');
  }
  const [whole, frac = ''] = str.split('.');
  // ONE GUARD DIGIT, THEN ROUND HALF-UP. The previous version sliced to six decimals,
  // which TRUNCATED — and truncating a rate understates the cost that rate produces,
  // which is the unsafe direction for money. `0.9999999` became 999999 micros instead
  // of 1000000, and `0.0000009` became 0. Rounding up can only ever make a ceiling
  // bind sooner, which is the direction that cannot spend money it should not.
  const digits = (frac + '0000000').slice(0, 7);
  const micros = Number(whole) * MICROS_PER_USD + Number(digits.slice(0, 6));
  return micros + (Number(digits[6]) >= 5 ? 1 : 0);
}

/** Render integer micro-dollars as a decimal string. Money never becomes a float. */
export function formatUsd(micros) {
  if (micros === null || micros === undefined) return null;
  const neg = micros < 0;
  const abs = Math.abs(Math.trunc(micros));
  const whole = Math.floor(abs / MICROS_PER_USD);
  const rem = abs % MICROS_PER_USD;
  // Round HALF-UP at the displayed precision rather than truncating. Truncation
  // understates a cost, and this string is what a caller reads a ceiling comparison
  // off. The previous version rendered 1234567 micros as "1.2345" — below the truth.
  //
  // Four decimals cannot express a cost below 0.00005 USD, so 1 micro still renders as
  // "0.0000". That is a precision limit, not a licence to decide on the string: every
  // gate compares integer micros, and the string travels beside them as display.
  const scale = 10 ** (6 - USD_DECIMALS);
  const rounded = Math.floor(rem / scale) + ((rem % scale) >= scale / 2 ? 1 : 0);
  if (rounded >= 10 ** USD_DECIMALS) {
    // Carry into the whole dollars: 0.999999 must not render as "0.10000".
    return `${neg ? '-' : ''}${whole + 1}.${'0'.repeat(USD_DECIMALS)}`;
  }
  return `${neg ? '-' : ''}${whole}.${String(rounded).padStart(USD_DECIMALS, '0')}`;
}

/**
 * COMPATIBILITY BRIDGE, and a known gap.
 *
 * `spendGuard.checkRunAllowed` still compares floats. Converting micros back to a
 * number for it reintroduces exactly the arithmetic Astra ruled out — at the one
 * boundary where it matters most.
 *
 * It is here rather than silently absent so the gap is visible: the guard needs the
 * same fixed-point treatment before this lane handles real money, and until then the
 * bridge is the weakest link in the chain. Named `toUsdNumber` rather than
 * `asNumber` so a reader cannot mistake it for the authoritative path.
 */
export function toUsdNumber(micros) {
  return micros === null || micros === undefined ? null : micros / MICROS_PER_USD;
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Is this rate an EXPLICIT zero — the one shape that legitimately means "free"?
 *
 * `Number(x) === 0` is the WRONG test, and it was the bug. It accepts `''`, `' '`,
 * `'\t'` and `false`, every one of which is a MISSING or malformed rate rather than a
 * free one. A billing provider whose rate cell was authored empty was therefore priced
 * at $0.00, passed the daily ceiling, and never charged the ledger — the same fail-open
 * direction `spendGuard.costFrom` had already been fixed to refuse.
 *
 * That asymmetry is the point: the guard returned `Infinity` for `''` while this module
 * returned `0` for the same value, so the two halves of one decision disagreed about
 * whether a malformed rate was expensive or free. A guard is only as strong as its worst
 * reading, and this was the worst reading.
 *
 * A number `0`, or a decimal string of nothing but zeros, is free. Anything else goes
 * through `toMicros`, which raises `E_BAD_RATE` on it rather than inventing a default.
 */
export function isExplicitZero(rate) {
  if (typeof rate === 'number') return rate === 0;
  if (typeof rate !== 'string') return false;
  return /^0+(\.0+)?$/.test(rate.trim());
}

/**
 * A flat rate as micro-dollars, with "free" decided by the RATE and never by the
 * rounding.
 *
 * A rate below half a micro-dollar rounds to zero micros, and reading that zero as
 * "explicitly free" handed a billing provider a $0.00 run that the daily ceiling was
 * never charged for. `0.0000004` is not free; it is a rate this unit cannot express,
 * which makes the cost UNKNOWN, not zero.
 */
function perRunMicros(rate) {
  if (rate === null || rate === undefined) return null;
  if (isExplicitZero(rate)) return 0;            // explicitly free
  const micros = toMicros(rate);                 // raises on anything not a plain decimal
  return micros === 0 ? null : micros;           // nonzero but sub-micro: unknown
}

/**
 * Cost of ONE run, as INTEGER MICRO-DOLLARS, or `null` when it cannot be determined.
 *
 * @param {object} caps     resolved provider capabilities (carries rate + unit)
 * @param {object} request  validated request (carries `duration` in SECONDS)
 * @returns {number|null}   micro-dollars
 */
export function estimateRunCostMicros(caps, request = {}) {
  if (!caps || !caps.provider) {
    throw new CostEstimateError('E_NO_PROVIDER', 'estimateRunCostMicros requires resolved capabilities.');
  }

  // ── A PRICE THAT IS NOT PUBLISHED IS NOT A PRICE ──────────────────────────
  // Astra's round-2 F1. This function used to read `caps.costPerSecondUsd` and nothing else,
  // so a row carrying `pricingStatus: 'disputed'` priced normally the moment its rate field
  // held a number: six seconds came back as 442,800 micros and `checkRunAllowed` returned
  // `allowed: true`. The quarantine was enforced by the ABSENCE of a value, not by the status
  // that claimed to describe it — which is the same defect the round-1 adjudication named for
  // D3: *"a policy that exists only as a side effect of another field's absence is not a
  // policy."*
  //
  // The gate sits BEFORE the `rateUnit` switch on purpose. A flat per-generation row is no
  // more safe to price while its rate is disputed than a metered one, and a check placed
  // inside `case 'second'` would have left `rateUnit: 'generation'` (DoP) unpoliced.
  //
  // `null` is the right return, not a throw: this module's contract is that `null` means
  // "cannot be determined", never zero, and `checkRunAllowed` already refuses a null cost
  // with `E_UNKNOWN_COST`. An unpriced row therefore refuses at the existing guard rather
  // than needing a new one.
  //
  // `undefined` is allowed through for the same reason as in `specShape`: rows that carry no
  // status at all are the local ones, and the registry defaults them to `published`.
  const pricingStatus = caps.pricingStatus;
  if (pricingStatus !== undefined && pricingStatus !== null && pricingStatus !== 'published') {
    return null;
  }

  switch (caps.rateUnit) {
    case 'generation':
      // Flat per generation — the rate IS the per-run figure. DoP is shaped this way
      // and must not be multiplied by a duration it ignores.
      return perRunMicros(caps.costPerRunUsd);

    case 'second': {
      const rawRate = caps.costPerSecondUsd;
      if (rawRate === null || rawRate === undefined) return null;  // unpriced or merely claimed
      if (isExplicitZero(rawRate)) return 0;                       // explicitly free
      // `toMicros` RAISES on a malformed rate. It must be reached for anything that is
      // not a genuine zero, because the previous `Number(rawRate) === 0` test coerced
      // `''`, `' '` and `false` into "explicitly free" — a billing provider priced at
      // nothing by an empty rate cell.
      const rateMicros = toMicros(rawRate);
      // NOTHING THAT IS NOT A NUMBER MAY REACH THE MULTIPLY BELOW.
      // `null * 6 === 0` in JavaScript, so an unreadable rate produced a cost of ZERO
      // and handed a billing provider a free render. The `=== 0` guard does not catch it
      // either, because `null !== 0` — the zero arrived one line further down.
      if (rateMicros === null || rateMicros === 0) return null;    // unreadable, or sub-micro

      const duration = finite(request.duration);
      // A per-second price with no duration is not a cheaper price, it is an
      // unknowable one. Returning 0 here is the single most expensive mistake this
      // module could make.
      if (duration === null || duration <= 0) return null;
      // Whole seconds only. A fractional duration is not something the vendor's
      // contract establishes, and rounding it silently would misstate the charge.
      if (!Number.isInteger(duration)) return null;
      return rateMicros * duration;
    }

    // ── 'run' GETS ITS OWN CASE, AND THAT IS THE WHOLE OF R3-1 ────────────────
    // This branch used to be the `default:` arm, documented as "'run' and anything
    // unrecognised". Those are two different facts wearing one arm:
    //
    //   * `'run'` is a REAL unit. `registry.mjs:152` sets `rateUnit: spec.rateUnit ?? 'run'`,
    //     so every row that does not declare a unit resolves to it. Returning the flat
    //     per-run figure for it is correct and must stay correct.
    //   * An UNRECOGNISED unit is not a unit at all. It is a typo, a value from a newer
    //     catalogue, or an attacker-chosen string — and the old arm answered all three with
    //     the flat figure, which the comment claimed not to be doing.
    //
    // Measured on the old code, for four caps objects differing ONLY in `rateUnit`:
    // `'run'`, `'unrecognised'` and `'per-minute'` each priced at 125000 micros. The
    // comment asserted a refusal the code did not perform — the same shape as round 26's D3
    // and round 27's F1, and the fourth appearance of this lane's recurring class.
    //
    // Splitting the arm is what makes the comment true rather than aspirational. The
    // distinction is not invented here: `media-api/routes.mjs:77-79` ALREADY tells `'run'`
    // from everything else and maps the remainder to `'none'`, so this brings the money
    // boundary into line with a distinction the API layer was already making.
    case 'run':
      return perRunMicros(caps.costPerRunUsd);

    default:
      // AN UNRECOGNISED UNIT IS AN UNKNOWN COST, NOT THE CHEAPEST READING.
      //
      // `null` — not a throw — because `null` is this module's established word for "cannot
      // be determined" (see the module header), and `checkRunAllowed` already refuses a null
      // cost with `E_UNKNOWN_COST`. So an unpriced unit refuses at the existing guard rather
      // than needing a new one, exactly like the `pricingStatus` gate above.
      //
      // The direction matters and is the point. A per-second row mislabelled as nothing at
      // all would previously have been priced at its FLAT field — and for a row carrying only
      // `costPerSecondUsd` that field is absent, so `perRunMicros(undefined)` returned null
      // and the mistake was invisible. Reading it as "unknown" makes the mislabelling fail
      // closed *and* legible, which is what a typo in a money field deserves.
      //
      // R3-1's other half is at import: `specShape.assertSpecShape` now rejects a `rateUnit`
      // outside the known set, so a catalogue row cannot reach this arm at all. This arm still
      // has to exist because `estimateRunCostMicros` is a public export that a caller can hand
      // a hand-built caps object — the shape all six of this lane's probes use.
      return null;
  }
}

/** The same estimate as a decimal string, which is how it crosses the API boundary. */
export function estimateRunCostUsd(caps, request = {}) {
  return formatUsd(estimateRunCostMicros(caps, request));
}

/**
 * A caps object with `costPerRunUsd` filled from the estimate, for handing to
 * `checkRunAllowed` unchanged.
 *
 * Deliberately adapt-at-the-boundary rather than mutating the registry:
 * `capabilities()` must keep reporting the CATALOGUE's cost (null = unknown) so every
 * other consumer sees the truth. Only the guard needs a number, and only for the
 * duration actually requested.
 */
export function withEstimatedRunCost(caps, request = {}) {
  const micros = estimateRunCostMicros(caps, request);
  return { ...caps, costPerRunUsd: toUsdNumber(micros) };
}

/**
 * A human-readable cost line. Never returns a bare number without its unit, because
 * "0.13" beside a duration is how a per-second rate gets read as a per-run price.
 */
export function describeCost(caps, request = {}) {
  const micros = estimateRunCostMicros(caps, request);
  if (caps.rateUnit === 'second') {
    const rate = caps.costPerSecondUsd;
    if (rate === null) return `${caps.provider}: rate not published — cost unknown`;
    if (micros === null) return `${caps.provider}: $${rate}/sec, duration unknown — cost unknown`;
    return `${caps.provider}: $${rate}/sec x ${request.duration}s = $${formatUsd(micros)}`;
  }
  if (micros === null) return `${caps.provider}: cost unknown`;
  if (micros === 0) return `${caps.provider}: free (local hardware)`;
  return `${caps.provider}: $${formatUsd(micros)} per ${caps.rateUnit}`;
}

export { CostEstimateError, USD_DECIMALS };
