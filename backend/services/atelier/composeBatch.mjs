/**
 * composeBatch.mjs — running the prompts, one image at a time.
 *
 * Split from composeStills at the 300-line cap. This is the only part of the flow that
 * actually touches a provider: everything above it refuses, everything below it persists.
 * Keeping it separate makes that boundary visible — if a change here can throw before a
 * generator is called, it belongs in the gates, not in the runner.
 */

import { sha, seedFor } from './composeLimits.mjs';
import * as local from './localStillLane.mjs';

export async function runBatch({ lane, prompts, key, req, model, deps }) {
  const { generator, renderStill, withGpu, env, reservation } = deps;
  const seedAt = (i) => (Number.isInteger(req.seed) ? req.seed + i : seedFor(key, i));
  const one = async (p, i) => {
    if (!p.ok) return { status: 'rejected', reason: { code: p.code, message: p.message } };
    const seed = seedAt(i);
    try {
      if (lane === 'local') {
        const r = await renderStill({ promptText: p.text, seed, outDir: req.outDir }, { env });
        return { status: 'fulfilled', value: { ...r, seed, promptText: p.text } };
      }
      const compiled = { ...p.compiled, promptText: p.text };
      const r = await generator(compiled, { seed });
      const data = (r?.images || [])[0];
      if (!data) return { status: 'rejected', reason: { code: 'E_NO_IMAGE', message: 'Provider returned no image.' } };
      return { status: 'fulfilled', value: {
        image: { kind: 'b64', data }, seed: Number.isInteger(r?.seedUsed) ? r.seedUsed : seed,
        promptText: p.text, usage: r?.usage || {}, provider: model,
        // Measured by the provider adapter, not assumed — carried so the asset row is truthful.
        width: r?.actualWidth ?? null, height: r?.actualHeight ?? null, format: r?.actualFormat ?? null,
        costUsd: r?.costUsd ?? null,
      } };
    } catch (e) {
      return { status: 'rejected', reason: { code: e?.code || 'E_PROVIDER_ERROR', message: e?.message || String(e) } };
    }
  };
  // Hosted calls parallelise; the GPU does not. One card, one render, one batch.
  if (lane === 'local') return withGpu(async () => { const out = []; for (let i = 0; i < prompts.length; i += 1) out.push(await one(prompts[i], i)); return out; }, reservation);
  return Promise.all(prompts.map(one));
}
