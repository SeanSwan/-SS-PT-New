/**
 * routesCatalog.mjs — the READ-ONLY surface. Nothing here creates, spends, or
 * submits: `listModels`, `wallet` and `estimate` answer questions.
 *
 * Split from `routes.mjs` for rule 4, and the seam is meaningful rather than
 * arithmetic: every handler in this file can be called by a caller with NO
 * permission to spend, which is what makes it safe to expose the model catalogue and
 * the remaining budget to an agent that is only planning.
 *
 *   GET  /v1/models     what exists, what is enabled, what is VERIFIED runnable
 *   GET  /v1/wallet     what is left of today's ceiling
 *   POST /v1/estimate   what a request would cost. Creates no quote, spends nothing.
 */

import { capabilities, readEnabled } from '../shared/providers/video/registry.mjs';
import { estimateRunCostMicros, formatUsd, describeCost } from '../shared/providers/video/costEstimate.mjs';
import { readLimits, dayKey } from '../shared/providers/video/spendGuard.mjs';
import { SERVED_PROVIDERS } from './preflight.mjs';
import { evidenceUnretrieved } from '../shared/providers/video/licenceTerms.mjs';
import { fail } from './wire.mjs';

/**
 * The catalogue, as the caller is allowed to see it.
 *
 * ── `enabled` IS THE RUNTIME STATE, NOT THE SHIPPED DEFAULT ─────────────────
 * This reported `caps.enabled` — the value frozen in `catalogue.mjs`, which is
 * `false` on every row — and that made the endpoint LIE. With
 * `SWAN_VIDEO_PROVIDERS_ENABLED=comfyui/minimax-h3` set, a quote and a job for that
 * provider both succeeded while `/v1/models` still said `enabled:false,
 * runnable:false`. An agent that reads the catalogue to decide what it can call would
 * conclude it has nothing, and would be wrong. Found by running the over-the-wire
 * flow, not by reading this file.
 *
 * Astra's CAP-001 asks readiness to distinguish *declared support*, *evidence level*,
 * *current enablement* and *verified executable binding*. Those are four different
 * questions, so they get four different fields — the shipped default is kept as
 * `catalog_enabled` rather than discarded, because "what ships" and "what an operator
 * has switched on" are both real and are not the same fact.
 *
 * `env` defaults to `{}`, not `process.env`. Unset grants nothing, and a caller that
 * forgot to pass the environment gets the fail-closed answer rather than whatever
 * happens to be ambient on the machine.
 */
export function listModels({ served = SERVED_PROVIDERS, env = {} } = {}) {
  const runtimeEnabled = readEnabled(env);
  const models = served.map((id) => {
    const caps = capabilities(id);
    const on = runtimeEnabled.has(id);
    return {
      id,
      label: caps.label,
      execution_kind: caps.transport === 'comfyui' ? 'local_gpu' : 'hosted',
      kind: caps.kind,
      enabled: on,
      // Astra: readiness must separate DECLARED support from VERIFIED binding, and a
      // published capability must not become runnable merely because its name exists.
      readiness: {
        declared: true,
        evidence: caps.provenance.costPerSecondUsd ?? (caps.transport === 'comfyui' ? 'probed' : 'published'),
        // What the frozen catalogue ships with. Every row ships disabled.
        catalog_enabled: caps.enabled,
        // What the operator has actually switched on for this process.
        enabled: on,
        // An operator-enabled row is still not necessarily RUNNABLE: a hosted row has
        // no model path and no bounded price, so it refuses at the adapter and at the
        // spend guard respectively. `runnable` means "this would reach a backend".
        runnable: on && caps.transport === 'comfyui',
      },
      rate: {
        // The UNIT is named, always. A bare `0.13` beside a duration is how a
        // per-second rate gets read as a per-run price.
        unit: caps.rateUnit,
        usd_per_second: caps.costPerSecondUsd,
        usd_per_run: caps.costPerRunUsd,
        provenance: caps.provenance.costPerSecondUsd,
      },
      max_duration_sec: caps.maxDurationSec,
      // WHICH WEIGHTS, published beside the provider id rather than instead of it. The console
      // lists what the lane can serve, and `provider` alone cannot answer that: `comfyui/minimax-h3`
      // and `higgsfield/minimax-h3` are different providers serving the SAME model, which is the
      // entire commercial argument for the local lane. Without this field the two rows are
      // distinguishable only by their ids — the same conflation the provenance record had.
      model_version: caps.modelVersion,
      licence: {
        name: caps.licence.name,
        restricts: caps.licence.restricts,
        commercial_use: caps.licence.commercialUse,
        // THE WIRE MUST MEAN WHAT THE GATE MEANS. This was `caps.licence.evidence ?? 'retrieved'`,
        // and `??` catches null and undefined and nothing else — while the gate's test is "the
        // flag is present and non-empty". Two rules for one field, one module apart, is the
        // defect round 14 fixed INSIDE the gate; round 15 found it surviving outside it. With
        // `??` the wire published `"pending"`, `""` or `"  "` — values the field is not
        // documented to carry — and published `"retrieved"` about a row the gate refuses.
        // Derived from the shared predicate so the published field and the decision cannot drift.
        evidence: evidenceUnretrieved(caps.licence) ? 'unretrieved' : 'retrieved',
        excluded_territories: caps.licence.excludedTerritories,
      },
      attribution: caps.attribution,
    };
  });
  return { status: 200, body: { models } };
}

export function wallet({ ledger, env, now = () => new Date() }) {
  const limits = readLimits(env);
  // `dayKey`, not an inline slice of the same string. Two spellings of "which day is
  // it" inside the one subsystem whose ceiling is decided by that answer is a
  // divergence waiting for the day one of them changes and the other does not.
  const day = dayKey(now());
  const usage = ledger ? ledger.usageFor(day) : { runs: 0, spendUsd: 0, degraded: false };
  return {
    status: 200,
    body: {
      day,
      runs: usage.runs,
      max_runs_daily: limits.maxRunsDaily,
      spend_usd: usage.spendUsd,
      max_spend_usd_daily: limits.maxSpendUsdDaily,
      // Surfaced, not swallowed: a corrupt ledger degrades the ceiling
      // ASYMMETRICALLY — free local generation continues while anything that bills
      // is refused — and a caller that cannot see this reports the wrong cause.
      ledger_degraded: usage.degraded === true,
      // Astra: day one does not pretend to enforce a predictive GPU-minute budget.
      gpu_budget_enforcement: 'metered_only',
    },
  };
}

/** POST /v1/estimate — price only. Creates no quote, spends nothing. */
export function estimate({ body }) {
  const params = body?.params && typeof body.params === 'object' ? body.params : body;
  const providerId = params?.provider;
  if (!providerId) return fail(400, 'E_NO_PROVIDER', 'Estimate requires params.provider.');
  // Price what this gateway SERVES, and nothing else. `capabilities()` resolves any row
  // in the catalogue, so without this check `/v1/estimate` would cheerfully price
  // `minimax/hailuo-hosted` while `/v1/quotes` refused the identical request with
  // E_UNKNOWN_PROVIDER. The documented flow is estimate → quote → job, so an estimate
  // for a route that cannot be quoted walks a caller into a wall it was told was clear.
  if (!SERVED_PROVIDERS.includes(providerId)) {
    return fail(404, 'E_UNKNOWN_PROVIDER',
      `This gateway does not serve "${providerId}". It serves: ${SERVED_PROVIDERS.join(', ')}.`);
  }
  let caps;
  try {
    caps = capabilities(providerId);
  } catch (err) {
    return fail(404, err.code || 'E_UNKNOWN_PROVIDER', err.message);
  }
  const micros = estimateRunCostMicros(caps, params);
  return {
    status: 200,
    body: {
      provider: providerId,
      duration: Number(params.duration) || null,
      // THE INTEGER TRAVELS BESIDE THE STRING, because the string cannot express every cost.
      // `formatUsd` renders four decimals, so any cost below 0.00005 USD — reachable with a
      // sub-cent per-second rate — renders as "0.0000", which is indistinguishable from free
      // in the one field a caller is most likely to read. The quote response already carries
      // `pricing.estimated_micros` for exactly this reason; `/v1/estimate` carried only the
      // string, so the two halves of the same flow disagreed about what "the cost" is.
      // Micro-dollars are the authoritative unit; this field is what the ceilings compare.
      estimate_micros: micros,
      estimate_usd: formatUsd(micros),
      detail: describeCost(caps, params),
      basis: caps.rateUnit === 'second' ? 'published-rate' : (micros === 0 ? 'free-local' : 'catalogue'),
      caveat: caps.rateUnit === 'second'
        ? 'Derived from the vendor\'s published list rate, not from a measured invoice. '
          + 'The vendor returns no cost field on completion, so this bounds exposure; it does not predict the bill.'
        : null,
    },
  };
}
