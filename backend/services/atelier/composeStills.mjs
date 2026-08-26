/**
 * composeStills.mjs — the Still rung of Swan Atelier's Compose ladder (orchestrator).
 * ============================================================================
 *
 * Turns a brief — or a draw from the Swan taste brain — into N candidate images
 * so a human can pick one BEFORE the expensive rung runs. A 27-second GPU
 * render of a composition that was already wrong is the most avoidable cost
 * in the lane.
 *
 * LANES   local  — the 5090 via ComfyUI, $0, volume-capped, single-flight,
 *                  VRAM-admitted, `claimed` until probed. THE DEFAULT.
 *         hosted — OpenRouter, billed per image, OFF until a budget is set.
 *                  Opt-in fallback; never carries taste prompts.
 * SOURCES brief  — the slot compiler + law filter.
 *         taste  — the Swan taste brain, each prompt law-checked. Local only.
 *
 * Every gate runs before any generator is reachable; every refusal test
 * asserts zero generator calls. A refusal after the call has billed or burned
 * GPU time is a receipt, not a gate.
 *
 * Idempotency reserves the key at START and coalesces concurrent identical
 * requests onto one promise — a check at the end is a race, and the panel
 * called it. The store is process-local: it stops a double-click and a
 * concurrent duplicate, and does NOT survive a restart. Stated, not hidden.
 */

import { capabilities as hostedCaps, DEFAULT_MODEL } from '../../../shared/providers/openrouterModels.mjs';
import { generate as hostedGenerate, verify as hostedVerify } from '../../../shared/providers/openrouterImage.mjs';
import {
  ComposeError, MAX_STILLS, MAX_BRIEF_CHARS, IMAGE_PRICES, SPEND_ENV_KEY, RUNS_ENV_KEY,
  DEFAULT_MAX_SPEND_USD_DAILY, DEFAULT_MAX_RUNS_DAILY, readComposeLimits, estimateStills,
  clampCount, sha, seedFor, deriveKey, normalizeText,
} from './composeLimits.mjs';
import { promptsFromBrief, promptsFromTaste, resolveLawProfile } from './promptSources.mjs';
import * as local from './localStillLane.mjs';
import { persistBatch } from './persistStills.mjs';
import * as batches from './batchStore.mjs';
import { runLocalBatch } from './localBatchRunner.mjs';

export {
  ComposeError, MAX_STILLS, MAX_BRIEF_CHARS, IMAGE_PRICES, SPEND_ENV_KEY, RUNS_ENV_KEY,
  DEFAULT_MAX_SPEND_USD_DAILY, DEFAULT_MAX_RUNS_DAILY, readComposeLimits, estimateStills,
};

const LANES = new Set(['auto', 'local', 'hosted']);
const SOURCES = new Set(['brief', 'taste']);

/**
 * Decide the lane. `auto` prefers local when it is probed and reachable; falls
 * to hosted only when hosted has a budget. Neither → a refusal that names both
 * switches, so "nothing works" is never the message.
 */
async function chooseLane(req, deps) {
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

function gateHosted({ model, count, limits, usage, verifier }) {
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
  if (spent + cost.totalUsd > limits.maxSpendUsdDaily) {
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

async function runBatch({ lane, prompts, key, req, model, deps }) {
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

/**
 * Compose N candidate stills.
 * @param {object} req  { brief, promptSource, lane, model, count, seed, aspect, cinematic,
 *                        userId, workspaceId, idempotencyKey, estimateOnly, outDir }
 * @param {object} deps injected so every gate is testable without a GPU or a dollar
 */
export async function composeStills(req = {}, deps = {}) {
  const {
    generator = hostedGenerate, verifier = hostedVerify, compiler,
    renderStill = local.renderStill, withGpu = local.withGpu,
    localVerify = local.verifyLocalStills, admit = local.admission, reserve = local.reserveGpu,
    tasteDeps = {}, env = process.env, store = new Map(), persist = persistBatch,
    limits = readComposeLimits(env), usage = { runs: 0, spendUsd: 0 }, commit = () => ({ allowed: true }), now = Date.now(),
  } = deps;

  const promptSource = req.promptSource || 'brief';
  if (!SOURCES.has(promptSource)) throw new ComposeError('E_BAD_SOURCE', `promptSource must be brief or taste.`);
  const lawProfile = resolveLawProfile(req.lawProfile); // validated before any gate spends anything
  const model = req.model || DEFAULT_MODEL;
  const { count, clampedFrom } = clampCount(req.count);
  const brief = { ...(req.brief || {}), text: normalizeText(req.brief?.text) };

  // GATE 1 — a subject, bounded. Taste supplies its own subjects.
  if (promptSource === 'brief' && !brief.text) {
    throw new ComposeError('E_EMPTY_BRIEF', 'A brief needs text describing the subject. Nothing was generated and nothing was spent.');
  }
  if (brief.text.length > MAX_BRIEF_CHARS) {
    throw new ComposeError('E_BRIEF_TOO_LONG', `A brief is at most ${MAX_BRIEF_CHARS} characters; this one is ${brief.text.length}.`);
  }
  // GATE 2 — volume cap applies to BOTH lanes; a free lane is still one GPU.
  const runs = Number(usage.runs) || 0;
  if (runs + count > limits.maxRunsDaily) {
    throw new ComposeError('E_RUN_CAP', `This batch of ${count} would pass the daily run cap (${runs}/${limits.maxRunsDaily}). Raise ${RUNS_ENV_KEY}.`);
  }
  // GATE 3a — idempotency FIRST, before any reservation. A double-click must replay
  // without touching the GPU; checking after the lane gate meant the second request
  // reserved the card and was refused E_LOCAL_BUSY instead of coalescing.
  // A CLIENT-SUPPLIED key is namespaced by owner. Used raw, user B sending the same
  // Idempotency-Key header as user A would land on A's batch and receive A's batch id —
  // a confused deputy that also leaks a handle. The derived key already salts with userId.
  const key = req.idempotencyKey
    ? `u${req.userId ?? 'anon'}:${sha(String(req.idempotencyKey)).slice(0, 32)}`
    : deriveKey({ ...req, brief, promptSource, lane: req.lane || 'auto', model, count }, now);
  if (!req.estimateOnly && store.has(key)) return { ...(await store.get(key)), replayed: true };
  // Reserve the key SYNCHRONOUSLY, before the first await below: two concurrent identical
  // requests would otherwise both pass `has` and both run. The placeholder is settled with
  // the real outcome; a failure deletes it so a retry can run.
  let settle = null; let reservation = null;
  if (!req.estimateOnly) { const pending = new Promise((res, rej) => { settle = { res, rej }; }); pending.catch(() => {}); store.set(key, pending); }
  try {

  // GATE 3b — lane: readiness, licence, admission, or hosted budget.
  const chosen = await chooseLane({ ...req, promptSource }, { env, limits, localVerify, admit, reserve });
  const { lane, admission } = chosen; reservation = chosen.reservation ?? null;
  const cost = lane === 'hosted'
    ? { ...gateHosted({ model, count, limits, usage, verifier }), lane }
    : { count, model: local.STILL_PROVIDER, unitUsd: 0, totalUsd: 0, lane };

  if (req.estimateOnly) {
    reservation?.release();
    return { estimateOnly: true, lane, stills: [], failures: [], partial: false, replayed: false,
      cost: { ...cost, chargedUsd: 0 }, promptSource, model: cost.model, key, admission,
      ...(clampedFrom === undefined ? {} : { clampedFrom }) };
  }

  // ── THE AUTHORITATIVE MONEY GATE ────────────────────────────────────────────────
  // Everything above is a fast pre-check that produces a better error earlier. THIS is the
  // gate. It checks both ceilings and commits the cost as ONE synchronous operation, so
  // two requests in the same tick cannot both read a stale total and both pass a cap
  // neither would pass together.
  //
  // The first version of this slice committed here but checked further up, and claimed
  // that closed the race. Six reviewers independently said it only narrowed it, and they
  // were right — between the check and the commit sat every `await` in `chooseLane`.
  //
  // Committing BEFORE the provider call also means the ledger never reconciles downward
  // (it is monotonic on purpose: a negative delta would let anyone who can reach it mint
  // headroom). So the ceiling counts what was COMMITTED, not what was collected, and a
  // batch that fails still consumes budget. That is the conservative direction — it is
  // what stops a retry storm from spending without bound. The local lane commits $0 and
  // so pays only its run count, which a GPU genuinely spent either way.
  const verdict = commit({
    runs: count, spendUsd: cost.totalUsd,
    maxRunsDaily: limits.maxRunsDaily, maxSpendUsdDaily: limits.maxSpendUsdDaily,
  });
  if (!verdict.allowed) {
    const hint = verdict.code === 'E_SPEND_CEILING' ? ` Raise ${SPEND_ENV_KEY} or wait for the UTC day to roll over.`
      : verdict.code === 'E_RUN_CAP' ? ` Raise ${RUNS_ENV_KEY}.` : '';
    throw new ComposeError(verdict.code, `${verdict.message}${hint} Nothing was spent.`);
  }

  // LOCAL LANE IS ASYNC. ~27s per frame on the 5090 means a 4-up is ~2 minutes; no HTTP
  // request survives that through a proxy. Answer 202 with a batch id at once, render in
  // the background under the reservation, persist each still as it lands, and let the
  // client poll. The idempotency store coalesces on the same batch id.
  if (lane === 'local' && req.async !== false) {
    const batch = batches.createBatch({ userId: req.userId, lane, count, key, promptSource, model: cost.model });
    const accepted = { accepted: true, batchId: batch.id, lane, promptSource, status: 'queued', count, cost: { ...cost, chargedUsd: 0 },
      key, admission, statusUrl: `/api/atelier/compose/stills/${batch.id}`, replayed: false };
    settle.res(accepted);
    runLocalBatch({ batch, req, brief, count, key, promptSource, lawProfile, model: cost.model, reservation,
      deps: { renderStill, withGpu, env, tasteDeps, compiler, persist, ...(deps.watchdogMs ? { watchdogMs: deps.watchdogMs } : {}) } })
      // The key is evicted when the batch is terminal: a replay is only honest WHILE the
      // batch is in flight. Holding it for the store's lifetime would silently return an
      // old batch to someone deliberately re-rendering the same composition.
      .finally(() => { store.delete(key); })
      .catch(() => { /* recorded on the batch; never an unhandled rejection */ });
    return accepted;
  }

  const work = (async () => {
    // Prompts — after every refusal gate, before any generator.
    let prompts; let tasteMeta = {};
    if (promptSource === 'taste') {
      const t = await promptsFromTaste({ count, aspect: brief.aspect || req.aspect, seed: seedFor(key, 0), cinematic: !!req.cinematic, mode: req.mode, lawProfile }, { env, ...tasteDeps });
      prompts = t.prompts; tasteMeta = { tasteSeed: t.tasteSeed, lawRejected: t.lawRejected, tasteDropped: t.dropped, lawProfile };
    } else {
      const caps = lane === 'hosted' ? hostedCaps(model) : { provider: local.STILL_PROVIDER, promptStyle: 'sentence' };
      const b = promptsFromBrief(brief, caps, count, compiler);
      prompts = b.prompts.map((p) => ({ ...p, compiled: b.compiled }));
    }
    const settled = await runBatch({ lane, prompts, key, req, model, deps: { generator, renderStill, withGpu, env, reservation } });
    const stills = []; const failures = [];
    settled.forEach((s, i) => {
      // `provider` is canonical; `model` is kept as an alias so the hosted contract
      // shipped in 383c218e9 does not silently change shape under its consumers.
      if (s.status === 'fulfilled') stills.push({ index: i, lane, promptHash: sha(s.value.promptText).slice(0, 12), ...s.value, model: s.value.provider });
      else failures.push({ index: i, ...s.reason });
    });
    if (stills.length === 0) throw new ComposeError('E_ALL_FAILED', `All ${count} images failed. First error: ${failures[0]?.message || 'unknown'}`);
    // PERSIST — the still becomes a MediaAsset with provenance, or the caller is told why not.
    // Never fatal to the batch: bytes exist, the row does not, and each still says which.
    const persistence = req.persist === false
      ? { ok: false, code: 'E_PERSIST_SKIPPED', persisted: 0 }
      : await persist({ stills, lane, userId: req.userId, workspaceId: req.workspaceId, model, env });
    return {
      persistence,
      estimateOnly: false, lane, promptSource, stills, failures, partial: failures.length > 0, replayed: false,
      cost: { ...cost, chargedUsd: cost.unitUsd * stills.length }, model: cost.model, key, admission, ...tasteMeta,
      ...(clampedFrom === undefined ? {} : { clampedFrom }),
    };
  })();
  const result = await work;
  settle.res(result);
  return result;
  } catch (err) {
    if (settle) { store.delete(key); settle.rej(err); }
    reservation?.release();
    throw err;
  }
}
