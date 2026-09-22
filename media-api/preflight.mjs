/**
 * preflight.mjs — the EARLY refusal. Not the enforcement.
 *
 * ── WHAT THIS IS, AND WHAT IT IS NOT ────────────────────────────────────────
 * A REST caller deserves a clear 4xx for "that provider is licence-refused" rather
 * than a 202 followed by a job that fails two seconds later. So the cheap,
 * request-shaped gates run here, synchronously, before a job is created.
 *
 * The ENFORCEMENT is still `runGenerate` in `backend/scripts/handlers/generateVideo.mjs`,
 * which re-runs every one of these gates in the background. That redundancy is
 * deliberate and it is the point: this file is an optimisation, and an optimisation
 * that is wrong must not become a way past a licence or a spending ceiling. If the
 * order here ever drifts from the handler's, the worst outcome is a worse ERROR
 * MESSAGE — never a rendered job that should have been refused.
 *
 * ── THE ONE DELIBERATE DEVIATION ────────────────────────────────────────────
 * Step 8 inserts a cost estimate that the handler does not have. The handler passes
 * `caps` straight to `checkRunAllowed`, which reads `costPerRunUsd` — correct for a
 * local model (0) and for a flat-rate API, and wrong for a vendor that bills per
 * second, where the per-run figure does not exist until a duration is known. The
 * estimate is computed here so a hosted request is costed against the ceiling BEFORE
 * it is authorised. Without it, a hosted row's `costPerRunUsd: null` reaches the
 * guard, the guard correctly calls that "unknown cost", and every hosted request is
 * refused with a message about a missing catalogue price — true, useless, and not
 * the actual problem.
 */

import {
  resolve as resolveProvider, validateVideoRequest, readGrants, readEnabled,
} from '../shared/providers/video/registry.mjs';
import { territories } from '../shared/providers/video/licenceGate.mjs';
import { assertPromptAllowed } from '../shared/providers/video/promptPolicy.mjs';
import { readLimits, dayKey, checkRunAllowed } from '../shared/providers/video/spendGuard.mjs';
import { withEstimatedRunCost, estimateRunCostMicros, estimateRunCostUsd, describeCost } from '../shared/providers/video/costEstimate.mjs';

/** Provider ids this gateway will accept. Anything else is refused before a job exists. */
export const SERVED_PROVIDERS = Object.freeze([
  'comfyui/minimax-h3',
  'comfyui/wan-2.2',
  'higgsfield/seedance-2.5',
  'higgsfield/kling-3.0',
  'higgsfield/pixverse-6',
  'higgsfield/minimax-h3',
  'higgsfield/ltx-2.5-pro',
  'higgsfield/wan-3.0',
  'higgsfield/dop',
]);

class PreflightError extends Error {
  constructor(code, message, { permanent = true } = {}) {
    super(message);
    this.name = 'PreflightError';
    this.code = code;
    this.permanent = permanent;
  }
}

/**
 * Normalise a thrown gate error into a `PreflightError` without losing its code.
 *
 * The registry, the validator and the policy filter each throw their own error class
 * with its own `code`, and `statusFor()` in `routes.mjs` maps on the CODE. Re-wrapping
 * without carrying the code across would collapse every refusal into one anonymous
 * 400 and throw away the distinction the whole error vocabulary exists to make.
 */
function asPreflight(err) {
  if (err instanceof PreflightError) return err;
  return new PreflightError(err.code || 'E_REFUSED', err.message, { permanent: err.permanent !== false });
}

/**
 * Run the request-shaped gates. Throws a `PreflightError` on refusal.
 *
 * @param {object} params  the request body's `params`
 * @param {object} env     INJECTED, never `process.env` — a gateway that reads its
 *                         own ambient environment while its caller believes it is
 *                         using an injected one is the shape of bug that makes a
 *                         test suite worthless.
 */
export function preflight({ params = {}, env = process.env, ledger = null, now = () => new Date() } = {}) {
  const providerId = params.provider || params.providerId;
  if (!providerId) {
    throw new PreflightError('E_NO_PROVIDER', 'Request requires params.provider.');
  }
  if (!SERVED_PROVIDERS.includes(providerId)) {
    throw new PreflightError('E_UNKNOWN_PROVIDER',
      `This gateway does not serve "${providerId}". It serves: ${SERVED_PROVIDERS.join(', ')}.`);
  }

  // 1. LICENCE + ENABLEMENT, before any validation work or GPU time. The cheapest
  //    possible place to discover the model may not legally be run — and the message
  //    says WHICH thing is restricted, because the ambiguous version of that sentence
  //    already cost this project days.
  //
  //    WRAPPED. The registry throws `ProviderError`, not `PreflightError`, and the
  //    first version let it escape — so a licence refusal surfaced as a 500 instead of
  //    a 403. A refusal that reports itself as a server fault sends the reader hunting
  //    an outage that does not exist.
  let caps;
  try {
    caps = resolveProvider(providerId, {
      commercial: params.commercial !== false,
      // THE TERRITORY IS AN OPERATOR FACT, NOT A REQUEST FIELD. The licence restricts where
      // the WEIGHTS RUN, and a request cannot move the machine. Reading `params.territory`
      // first let a caller declare its own jurisdiction and so switch the exclusion off —
      // measured over HTTP with no grant on file: `territory: "US"` → 403
      // E_LICENCE_GRANT_REQUIRED, while the identical request with `territory: "CA"` → 201 and
      // a quote. `territories()` still honours a request that names one, but only in the
      // direction that cannot weaken the gate: any refusal among them wins.
      territories: territories(env.SWAN_OPERATOR_TERRITORY, params.territory),
      grants: readGrants(env),
      enabled: readEnabled(env),
      // ── F3: THE FLAG HAS TO REACH THE RESOLVER, OR THE QUOTE PATH CANNOT SELECT ─────
      // Astra's round-2 F3. This call used to omit `explicitSelection`, so `registry.resolve()`
      // refused EVERY hosted quote with `E_HOSTED_REQUIRES_EXPLICIT_SELECTION` — including a
      // request that had explicitly asserted the selection. Measured: an environment-enabled,
      // non-commercial DoP request carrying `explicitSelection: true` still failed here.
      //
      // The result was a handler that accepts a deliberate hosted selection and a quote entry
      // point that cannot express one, so no hosted row could be quoted through the documented
      // path at all. Same reading as the handler's: only the boolean `true` asserts a
      // selection, because "the caller supplied a value" is not "the caller said yes" — the
      // same trap that once let `commercial: 0` skip the licence judgement.
      explicitSelection: params.explicitSelection === true,
    });
  } catch (err) {
    throw asPreflight(err);
  }

  // 2. Request shape.
  let request;
  try {
    request = validateVideoRequest(params, caps);
  } catch (err) {
    throw asPreflight(err);
  }

  // 3. Content policy — before spend, before GPU time, before anything reaches a model.
  let policy;
  try {
    policy = assertPromptAllowed(request.prompt, env);
  } catch (err) {
    throw asPreflight(err);
  }

  // 4. Ceilings.
  let limits;
  try {
    limits = readLimits(env);
  } catch (err) {
    throw new PreflightError(err.code || 'E_BAD_CAP', err.message, { permanent: true });
  }

  const day = dayKey(now());
  const usage = ledger ? ledger.usageFor(day) : { runs: 0, spendUsd: 0, degraded: false };

  // 5. Cost the run in the guard's unit, then ask the guard. See the header note.
  //    Logic reads MICROS (exact integers); display reads the decimal string.
  const costed = withEstimatedRunCost(caps, request);
  const estimatedMicros = estimateRunCostMicros(caps, request);
  const estimatedCostUsd = estimateRunCostUsd(caps, request);
  const costLine = describeCost(caps, request);

  let allowance;
  try {
    allowance = checkRunAllowed(costed, usage, limits);
  } catch (err) {
    // A ceiling is a fact about the DAY, not the request: retrying tomorrow genuinely
    // succeeds, so it must stay RETRYABLE. Marking it permanent would discard work for
    // a limit that expires on its own.
    throw new PreflightError(err.code || 'E_SPEND_REFUSED', err.message, { permanent: false });
  }

  return {
    providerId, caps, request, policy, limits, day, usage, allowance,
    estimatedMicros, estimatedCostUsd, costLine,
    // An unknown cost counts as BILLING — the fail-closed direction, and the same
    // rule the registry already applies when it treats a null price as a real one.
    billed: estimatedMicros === null || estimatedMicros > 0,
  };
}

export { PreflightError };
