/**
 * composeLaneChoice.mjs — which lane may run this, and may it spend.
 *
 * Split from composeStills when it reached its 300-line cap. These two functions are one
 * concern — the answer to "can this request run at all, and on whose GPU or whose dollar"
 * — and they were the largest thing in that file that was not the orchestration itself.
 *
 * They stay REFUSAL-shaped: every path either returns a lane with its admission, or throws
 * a code the route maps to a deliberate status. Neither one generates anything, and both
 * run before a provider is ever touched.
 */

import { capabilities as hostedCaps } from '../../../shared/providers/openrouterModels.mjs';
import { ComposeError, SPEND_ENV_KEY, RUNS_ENV_KEY, estimateStills } from './composeLimits.mjs';
import * as local from './localStillLane.mjs';

/** Moved here with chooseLane: it is the set that function validates against, and
 *  leaving it behind is exactly the dangling reference this split produced once. */
export const LANES = new Set(['auto', 'local', 'hosted']);

/**
 * Decide the lane. `auto` prefers local when it is probed and reachable; falls
 * to hosted only when hosted has a budget. Neither → a refusal that names both
 * switches, so "nothing works" is never the message.
 */
export async function chooseLane(req, deps) {
  const { env, limits, localVerify, admit, reserve } = deps;
  const want = req.lane || 'auto';
  if (!LANES.has(want)) throw new ComposeError('E_BAD_LANE', `lane must be one of ${[...LANES].join(', ')}.`);
  if (req.promptSource === 'taste' && want === 'hosted') {
    throw new ComposeError('E_TASTE_LOCAL_ONLY',
      'Taste-brain prompts render on the local GPU only. They encode a private aesthetic history '
      + 'and are never sent to a hosted provider. Choose lane "local" or source "brief".');
  }
  const lv = localVerify(env);
  // Reserve the GPU BEFORE reading its free memory, so admission is not a check-then-act
  // race between two requests. The reservation travels with the batch; a refusal below
  // releases it.
  // An ESTIMATE never contends for the card. It is read-only compute, and reserving for it
  // meant the UI's debounced cost preview answered E_LOCAL_BUSY for the whole two minutes
  // a batch was rendering — a price that disappears exactly when you are watching it.
  const admitLocal = async () => {
    if (req.estimateOnly) return { lane: 'local', admission: null, reservation: null };
    const reservation = reserve();
    try { return { lane: 'local', admission: await admit({ env }), reservation }; } catch (err) { reservation.release(); throw err; }
  };
  if (want === 'local' || (want === 'auto' && req.promptSource === 'taste')) {
    if (!lv.ok) {
      throw new ComposeError(lv.status !== 'probed' ? 'E_STILL_LANE_UNPROBED' : 'E_PROVIDER_UNCONFIGURED',
        `Local still lane is not ready: ${lv.problems.join('; ')}.`);
    }
    return admitLocal();
  }
  if (want === 'auto' && lv.ok) {
    try { return await admitLocal(); } catch { /* fall through to hosted */ }
  }
  if (want === 'auto' && limits.disabled) {
    throw new ComposeError('E_NO_LANE',
      `No lane is available. Local stills: ${lv.problems[0] || 'not ready'}. Hosted: switched off `
      + `(${SPEND_ENV_KEY} is $0). Fix one of those. Nothing was generated and nothing was spent.`);
  }
  return { lane: 'hosted', admission: null };
}

export function gateHosted({ model, count, limits, usage, verifier, estimateOnly = false }) {
  const check = verifier(model);
  if (!check?.ok) {
    throw new ComposeError('E_PROVIDER_UNCONFIGURED',
      `Refusing to generate: ${(check?.problems || ['provider unavailable']).join('; ')}`);
  }
  const cost = estimateStills({ count, model });
  const spent = Number(usage.spendUsd) || 0;
  if (usage.degraded) {
    throw new ComposeError('E_LEDGER_DEGRADED',
      'The spend ledger could not be read, so today\'s total is unknown and a billed model cannot be charged safely.');
  }
  // An ESTIMATE spends nothing, so no ceiling applies to it. The run cap learned this a
  // round earlier and the spend gate did not — the same one-parameter-over miss, which is
  // now the most repeated shape in this whole review: a fix applied to one of a pair.
  // Refusing a preview at the ceiling hides the price at the moment it is most needed,
  // and hides WHY, because the refusal reads as though money had been at stake.
  if (!estimateOnly && spent + cost.totalUsd > limits.maxSpendUsdDaily) {
    throw new ComposeError('E_SPEND_CEILING',
      limits.maxSpendUsdDaily === 0
        ? `Image generation is switched off: no budget is set, so the daily ceiling is $0. `
          + `This batch would cost $${cost.totalUsd.toFixed(4)}. Set ${SPEND_ENV_KEY} to a real number to enable it. `
          + 'Nothing was spent.'
        : `This batch costs $${cost.totalUsd.toFixed(4)} and today's spend is $${spent.toFixed(4)}, which passes `
          + `the $${limits.maxSpendUsdDaily} daily ceiling. Raise ${SPEND_ENV_KEY} or wait for the UTC day to roll over. `
          + 'Nothing was spent.');
  }
  return cost;
}
