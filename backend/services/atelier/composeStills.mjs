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
import { promptsFromBrief, promptsFromTaste, resolveLawProfile, resolveKit, LAW_PROFILES } from './promptSources.mjs';
import * as local from './localStillLane.mjs';
import { persistBatch } from './persistStills.mjs';
import * as batches from './batchStore.mjs';
import { applyBrandKit, brandKitView, listBrandKits } from '../../../shared/brandKits/registry.mjs';
import { runLocalBatch } from './localBatchRunner.mjs';
import { chooseLane, gateHosted } from './composeLaneChoice.mjs';

export {
  ComposeError, MAX_STILLS, MAX_BRIEF_CHARS, IMAGE_PRICES, SPEND_ENV_KEY, RUNS_ENV_KEY,
  DEFAULT_MAX_SPEND_USD_DAILY, DEFAULT_MAX_RUNS_DAILY, readComposeLimits, estimateStills,
};

const SOURCES = new Set(['brief', 'taste']);

// chooseLane + gateHosted moved to composeLaneChoice.mjs when this file hit its cap.

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
  // BRAND KIT FIRST: which site's art direction this carries decides which laws judge it,
  // so an unknown kit costs nothing to discover. It REFUSES rather than falling back, and
  // it is a field of its own rather than the workspace id — see brandKits/registry.mjs.
  const kit = resolveKit(req);
  // NAMING A WORKSPACE WITHOUT NAMING A BRAND IS THE ORIGINAL BUG, DEFAULTED.
  // Omission is safe for the single-site case — no workspace, no ambiguity, take Swan.
  // It is NOT safe when the caller has said this asset belongs to another project: three
  // reviewers pointed out that silently defaulting there reinstates exactly the defect
  // this slice exists to fix, only now it is the documented behaviour.
  if (req.workspaceId && !req.brandKit) {
    throw new ComposeError('E_BRAND_KIT_REQUIRED',
      `This render names workspace "${req.workspaceId}" but no brand kit, so which site's `
      + 'art direction to use is ambiguous. Name one of: '
      + `${listBrandKits().map((k) => k.id).join(', ')}. Nothing was generated and nothing was spent.`);
  }
  const lawProfile = resolveLawProfile(kit.lawProfile); // validated before any gate spends anything
  // TASTE IS SWAN'S TASTE. The corpus behind the taste brain is Sean's Swan-rated library;
  // there is no version of it that belongs to another brand. Dressing a non-Swan render in
  // it and saying nothing is the brand-scope leak every seat of the panel named — so this
  // refuses and points at the two things that actually work instead.
  if (promptSource === 'taste' && lawProfile !== 'full') {
    throw new ComposeError('E_TASTE_IS_SWAN_ONLY',
      `The taste brain draws from the SwanStudios-rated corpus, so it cannot render for "${kit.brandKit}". `
      + "Use the brief source for this brand, or add a kit that carries the SwanStudios laws. Nothing was generated.");
  }
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
      cost: { ...cost, chargedUsd: 0 }, promptSource, model: cost.model, key, admission, brandKit: brandKitView(kit),
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
    const accepted = { accepted: true, batchId: batch.id, lane, promptSource, status: 'queued', count, cost: { ...cost, chargedUsd: 0 }, brandKit: brandKitView(kit),
      key, admission, statusUrl: `/api/atelier/compose/stills/${batch.id}`, replayed: false };
    settle.res(accepted);
    runLocalBatch({ batch, req, brief, count, key, promptSource, lawProfile, model: cost.model, reservation,
      deps: { renderStill, withGpu, env, tasteDeps, compiler, persist, brandKit: brandKitView(kit), ...(deps.watchdogMs ? { watchdogMs: deps.watchdogMs } : {}) } })
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
      // Kit language joins HERE, after the length gate, so the limit judges the operator's
      // own words rather than the brand's.
      // The kit may REPLACE the compiler's hardcoded kill-list, which is a Swan kill-list.
      // Dropping Swan's laws was only half of "render for another site" — the negatives
      // rode along regardless. An explicit caller override still wins, same as lawProfile.
      const b = promptsFromBrief({
        ...brief,
        text: applyBrandKit(brief.text, kit),
        slotOverrides: {
          ...(kit.negativeSlot ? { negative: kit.negativeSlot } : {}),
          ...(brief.slotOverrides || {}),
        },
        // The laws this brand is NOT judged by. Without this the compiler applied every
        // law to every brand, and a non-Swan site could not render a creature — LAW4
        // exists to protect the Swan mark and means nothing to anyone else.
        lawProfileDrop: LAW_PROFILES[lawProfile] || [],
      }, caps, count, compiler);
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
      : await persist({ stills, lane, userId: req.userId, workspaceId: req.workspaceId, brandKit: brandKitView(kit), model, env });
    return {
      persistence,
      estimateOnly: false, lane, promptSource, stills, failures, partial: failures.length > 0, replayed: false,
      cost: { ...cost, chargedUsd: cost.unitUsd * stills.length }, model: cost.model, key, admission, brandKit: brandKitView(kit), ...tasteMeta,
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
