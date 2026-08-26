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
import { runBatch } from './composeBatch.mjs';
import { buildPrompts } from './composePrompts.mjs';

/** The synchronous local path's watchdog. Same bound as the batch runner's, and the same
 *  reason: a render that hangs must not hold the card — or, here, the request — forever. */
const SYNC_WATCHDOG_MS = 20 * 60 * 1000;
function syncWatchdog(ms = SYNC_WATCHDOG_MS) {
  return new Promise((_, rej) => {
    const t = setTimeout(() => rej(Object.assign(
      new Error(`The render did not finish within ${Math.round((ms || SYNC_WATCHDOG_MS) / 60000)} minutes and was abandoned.`),
      { code: 'E_BATCH_TIMEOUT' },
    )), ms || SYNC_WATCHDOG_MS);
    if (typeof t.unref === 'function') t.unref();
  });
}
import { rememberKey, defaultCommit, slimForReplay, assertKeyHasOwner, assertSlotOverrides, COALESCING_STORE, settledKeys } from './composeGuards.mjs';
import { chooseLane, gateHosted } from './composeLaneChoice.mjs';

export {
  ComposeError, MAX_STILLS, MAX_BRIEF_CHARS, IMAGE_PRICES, SPEND_ENV_KEY, RUNS_ENV_KEY,
  DEFAULT_MAX_SPEND_USD_DAILY, DEFAULT_MAX_RUNS_DAILY, readComposeLimits, estimateStills,
};

const SOURCES = new Set(['brief', 'taste']);

// chooseLane + gateHosted moved to composeLaneChoice.mjs when this file hit its cap.


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
    tasteDeps = {}, env = process.env, store = COALESCING_STORE, persist = persistBatch,
    limits = readComposeLimits(env), usage = { runs: 0, spendUsd: 0 }, commit = defaultCommit, now = Date.now(),
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
  // Gated on the KIT'S OWN profile, never the merged one. Two reviewers independently
  // found the bypass: `lawProfile` here is the value AFTER the caller's explicit override
  // has won, so `brandKit: 'universal'` plus `lawProfile: 'full'` walked straight through
  // the gate and rendered another brand from the Swan-rated corpus — the exact leak this
  // refusal exists to stop, reopened by the override that sits two lines above it.
  if (promptSource === 'taste' && kit.lawProfileFromKit !== 'full') {
    throw new ComposeError('E_TASTE_IS_SWAN_ONLY',
      `The taste brain draws from the SwanStudios-rated corpus, so it cannot render for "${kit.brandKit}". `
      + "Use the brief source for this brand, or add a kit that carries the SwanStudios laws. Nothing was generated.");
  }
  const model = req.model || DEFAULT_MODEL;
  const { count, clampedFrom } = clampCount(req.count);
  // Bounded and normalised before the key is derived from them — see composeGuards.
  const slotOverrides = assertSlotOverrides(req.brief || {});
  const brief = { ...(req.brief || {}), text: normalizeText(req.brief?.text), ...(slotOverrides ? { slotOverrides } : {}) };

  // GATE 1 — a subject, bounded. Taste supplies its own subjects.
  if (promptSource === 'brief' && !brief.text) {
    throw new ComposeError('E_EMPTY_BRIEF', 'A brief needs text describing the subject. Nothing was generated and nothing was spent.');
  }
  if (brief.text.length > MAX_BRIEF_CHARS) {
    throw new ComposeError('E_BRIEF_TOO_LONG', `A brief is at most ${MAX_BRIEF_CHARS} characters; this one is ${brief.text.length}.`);
  }
  // GATE 3a — idempotency FIRST, before any reservation. A double-click must replay
  // without touching the GPU; checking after the lane gate meant the second request
  // reserved the card and was refused E_LOCAL_BUSY instead of coalescing.
  // A CLIENT-SUPPLIED key is namespaced by owner. Used raw, user B sending the same
  // Idempotency-Key header as user A would land on A's batch and receive A's batch id —
  // a confused deputy that also leaks a handle. The derived key already salts with userId.
  assertKeyHasOwner(req);
  const key = req.idempotencyKey
    ? `u${req.userId}:${sha(String(req.idempotencyKey)).slice(0, 32)}`
    : deriveKey({ ...req, brief, promptSource, lane: req.lane || 'auto', model, count, brandKit: kit.brandKit, lawProfile, aspect: req.aspect }, now);
  if (!req.estimateOnly && store.has(key)) return { ...(await store.get(key)), replayed: true };

  // GATE 2 — volume cap, AFTER the replay probe above. It used to run first, and a
  // reviewer raised the consequence twice before I acted on it: at the cap, a retry of a
  // request that ALREADY RAN AND WAS ALREADY PAID FOR was refused E_RUN_CAP instead of
  // replaying its result. The caller is then charged for work it cannot collect, by a cap
  // defending headroom that request already consumed. A replay costs no GPU and no money,
  // so nothing it could breach applies to it.
  const runs = Number(usage.runs) || 0;
  // An ESTIMATE consumes no run, so no run cap applies to it. Refusing a price preview at
  // the cap hides the price exactly when an operator most needs to see it — the same
  // mistake as the estimate that used to reserve the GPU, in the gate next door.
  if (!req.estimateOnly && runs + count > limits.maxRunsDaily) {
    throw new ComposeError('E_RUN_CAP', `This batch of ${count} would pass the daily run cap (${runs}/${limits.maxRunsDaily}). Raise ${RUNS_ENV_KEY}.`);
  }
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
    ? { ...gateHosted({ model, count, limits, usage, verifier, estimateOnly: req.estimateOnly }), lane }
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
      key, admission, statusUrl: `/api/atelier/compose/stills/${batch.id}`, replayed: false,
      // The synchronous path reports this and the async path did not, so a client whose
      // count was silently reduced had no way to know on the lane that reduces it most.
      ...(clampedFrom === undefined ? {} : { clampedFrom }) };
    settle.res(accepted);
    runLocalBatch({ batch, req, brief, count, key, promptSource,
      // The KIT's profile, not the merged one — the same correction the synchronous path
      // received two rounds ago and this one did not. Sixth time a fix has landed on one
      // half of a pair in this review; the async lane is where taste actually RUNS, so
      // fixing only the sync half fixed the path taste almost never takes.
      lawProfile, kit, model: cost.model, reservation,
      // The kit travels as ONE parameter, not as a parameter AND a deps field. Two
      // channels for one fact is how the sync and async halves drifted apart in the first
      // place: whichever one a later change updates, the other keeps its old value and
      // nothing disagrees loudly enough to notice.
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
    const { prompts, tasteMeta } = await buildPrompts({
      promptSource, brief, req, kit, lawProfile, count, key, lane, model, compiler, env, tasteDeps,
    });
    // A WATCHDOG ON THIS PATH TOO. The async lane has had one since the batching slice;
    // the synchronous local path (`async: false`) had none, so a hung render there held
    // the GPU AND the HTTP request open with nothing to end either. A reviewer pointed out
    // that the guard existed on one of the two lanes — which by this point in the review
    // was a familiar sentence.
    const settled = lane === 'local'
      ? await Promise.race([syncWatchdog(deps.watchdogMs), runBatch({ lane, prompts, key, req, model, deps: { generator, renderStill, withGpu, env, reservation } })])
      : await runBatch({ lane, prompts, key, req, model, deps: { generator, renderStill, withGpu, env, reservation } });
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
      // `cost.model`, not `model`. `model` is `req.model || DEFAULT_MODEL` — a HOSTED
      // model id — so a LOCAL render persisted provenance naming a provider it never
      // touched. `cost.model` is resolved per lane and is what the async path already
      // recorded, so the two lanes disagreed about what made the same kind of image.
      : await persist({ stills, lane, userId: req.userId, workspaceId: req.workspaceId, brandKit: brandKitView(kit), model: cost.model, env });
    return {
      persistence,
      estimateOnly: false, lane, promptSource, stills, failures, partial: failures.length > 0, replayed: false,
      cost: { ...cost, chargedUsd: cost.unitUsd * stills.length }, model: cost.model, key, admission, brandKit: brandKitView(kit),
      // NESTED, matching the async batch snapshot. These were spread top-level here and
      // nested there, so a client reading `lawRejected` had to know which lane produced
      // the response before it knew where to look — for facts that are identical in kind.
      // Kept top-level as well for one release so nothing reading the old shape breaks.
      ...(Object.keys(tasteMeta).length ? { tasteMeta } : {}), ...tasteMeta,
      ...(clampedFrom === undefined ? {} : { clampedFrom }),
    };
  })();
  const result = await work;
  settle.res(result);
  // Replace the retained promise with a SLIMMED copy before remembering it. The live
  // caller already has `result` in hand; what stays in the map is only what a retry needs
  // to learn that this request already ran — see slimForReplay for why the payloads go.
  const retained = slimForReplay(result);
  store.set(key, Promise.resolve(retained));
  // DELIBERATELY NOT EVICTED HERE. A reviewer found that the synchronous path never
  // deletes its key and called it a leak — correct about the leak, wrong about the cure.
  // This path is the HOSTED lane, which charges money. If the client's connection drops
  // after we billed, its retry MUST replay rather than generate and charge a second time,
  // and evicting on success is precisely what would make it charge twice. The async path
  // may evict because a batch id is a durable handle the client can poll; here the
  // response IS the only handle. So the key is retained and the MAP is bounded instead —
  // see rememberKey below.
  rememberKey(store, key, settledKeys, {
    clientKeyed: Boolean(req.idempotencyKey),
    // So the budget is released when this entry is later evicted, rather than counting
    // lifetime allocations and never recovering.
    carriesBytes: retained.bytesDropped !== true,
  });
  return result;
  } catch (err) {
    if (settle) { store.delete(key); settle.rej(err); }
    reservation?.release();
    throw err;
  }
}
