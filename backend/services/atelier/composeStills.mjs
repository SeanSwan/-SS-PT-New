/**
 * composeStills.mjs — the Still rung of Swan Atelier's Compose ladder.
 * ============================================================================
 *
 * Turns a brief into N candidate images so a human can pick one BEFORE the
 * expensive rung runs. That ordering is the whole point: a 27-second GPU render
 * of a composition that was already wrong is the most avoidable cost in the
 * lane.
 *
 * ── WHY THIS IS NOT THE VIDEO LANE ─────────────────────────────────────────
 * The video lane queues a job because it needs the local 5090. Images come from
 * a HOSTED API, so there is no worker to wait for and no lease to hold — and
 * mirroring `workerPresence` here would invent a dependency that does not
 * exist. What DOES transfer from the video route is the discipline: gate before
 * you spend, derive an idempotency key, and report what actually happened.
 *
 * ── THE FAIL-OPEN THIS MODULE REFUSES TO INHERIT ───────────────────────────
 * `spendGuard.checkRunAllowed` maps a `null` price to Infinity — unknown cost
 * is treated as unaffordable, which is right. But the image catalogue
 * (`openrouterModels.mjs`) carries NO price field at all, so its price arrives
 * as `undefined`, falls through `Number(undefined) || 0`, and lands on **zero**
 * — the free-local branch. An unpriced hosted model would therefore bypass the
 * ceiling entirely.
 *
 * So prices live here, explicitly, and a model absent from the table is
 * REFUSED rather than assumed free. Only measured figures are recorded; a
 * guessed price is the same lie in a friendlier costume.
 *
 * ── EVERY GATE RUNS BEFORE THE GENERATOR IS REACHABLE ──────────────────────
 * A refusal that arrives after the API call has already billed is not a gate,
 * it is a receipt. The suite asserts zero generator calls on every refusal.
 */

import { createHash } from 'node:crypto';
import { compileImage } from '../../../shared/swanPromptCompiler.mjs';
import { capabilities, DEFAULT_MODEL } from '../../../shared/providers/openrouterModels.mjs';
import { generate as openrouterGenerate, verify as openrouterVerify } from '../../../shared/providers/openrouterImage.mjs';

/** A 4-up grid is the judgement unit. More candidates is a batch job (S8), not a rung. */
export const MAX_STILLS = 4;

/** Same window the video route uses, so a double-click behaves identically in both lanes. */
export const DERIVED_KEY_BUCKET_MS = 60 * 1000;

/**
 * USD per generated image, MEASURED — never estimated.
 *
 * `openai/gpt-5.4-image-2` at $0.0039 is the figure recorded in
 * `openrouterImage.mjs`'s own endpoint note (images endpoint, 2026-08-11),
 * alongside the $0.2274 the wrong endpoint used to cost. A model missing from
 * this table is refused with E_PRICE_UNKNOWN; adding one requires a real
 * measurement, not a vendor page.
 */
export const IMAGE_PRICES = Object.freeze({
  'openai/gpt-5.4-image-2': 0.0039,
});

/**
 * Ceilings for the IMAGE lane, read from its OWN variable.
 *
 * The video lane's `SWAN_VIDEO_MAX_SPEND_USD_DAILY` was the obvious thing to
 * reuse and would have been a naming lie: raising a *video* budget would have
 * silently raised an *image* budget, and the first person to do it would have
 * had no reason to expect that. Two lanes that bill separately get two keys.
 *
 * The $0 default is inherited deliberately — a lane that bills is DENIED until
 * someone sets a real number. That means these endpoints refuse everything on a
 * fresh install, which is the correct posture and a terrible surprise, so every
 * refusal names the variable that lifts it.
 */
export const SPEND_ENV_KEY = 'SWAN_ATELIER_MAX_SPEND_USD_DAILY';
export const RUNS_ENV_KEY = 'SWAN_ATELIER_MAX_RUNS_DAILY';
export const DEFAULT_MAX_SPEND_USD_DAILY = 0;
export const DEFAULT_MAX_RUNS_DAILY = 50;

export function readComposeLimits(env = process.env) {
  const num = (raw, fallback) => {
    if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      throw new ComposeError('E_BAD_CAP',
        `${SPEND_ENV_KEY}/${RUNS_ENV_KEY} must be a non-negative number; got "${raw}".`);
    }
    return n;
  };
  const maxSpendUsdDaily = num(env[SPEND_ENV_KEY], DEFAULT_MAX_SPEND_USD_DAILY);
  return Object.freeze({
    maxRunsDaily: num(env[RUNS_ENV_KEY], DEFAULT_MAX_RUNS_DAILY),
    maxSpendUsdDaily,
    /** True when the lane is switched off because nobody has set a budget yet. */
    disabled: maxSpendUsdDaily === 0,
    spendEnvKey: SPEND_ENV_KEY,
  });
}

export class ComposeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ComposeError';
    this.code = code;
  }
}

/** Price a whole batch. The batch is the decision unit, so the batch is what gets priced. */
export function estimateStills({ count = 1, model = DEFAULT_MODEL } = {}) {
  const n = clampCount(count).count;
  const unitUsd = IMAGE_PRICES[model];
  if (unitUsd === undefined) {
    throw new ComposeError('E_PRICE_UNKNOWN',
      `No measured price for "${model}". A model with no recorded cost is refused rather than `
      + 'billed as free. Measure one run and add it to IMAGE_PRICES.');
  }
  return { count: n, model, unitUsd, totalUsd: unitUsd * n };
}

function clampCount(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return { count: 1, clampedFrom: Number.isFinite(n) ? raw : undefined };
  if (n > MAX_STILLS) return { count: MAX_STILLS, clampedFrom: raw };
  return { count: Math.floor(n) };
}

const sha = (s) => createHash('sha256').update(s).digest('hex');

/**
 * A seed per still, derived rather than random.
 *
 * Random seeds would make a replayed batch a different batch, which defeats the
 * idempotency this module just paid for. Derived from the request key, so the
 * same request reproduces the same four candidates.
 */
function seedFor(key, index) {
  return parseInt(sha(`${key}:${index}`).slice(0, 8), 16);
}

function deriveKey({ brief, model, count, seed, workspaceId, userId }, now) {
  const bucket = Math.floor(now / DERIVED_KEY_BUCKET_MS);
  return sha(JSON.stringify({
    u: userId ?? null, w: workspaceId ?? null, model, count,
    b: brief?.text ?? '', i: brief?.intent ?? '', a: brief?.aspect ?? '',
    f: brief?.facets ?? [], s: seed ?? null, bucket,
  })).slice(0, 40);
}

/**
 * Compose N candidate stills.
 *
 * @param {object} req   { brief, model, count, seed, userId, workspaceId,
 *                         idempotencyKey, estimateOnly }
 * @param {object} deps  { generator, verifier, compiler, store, limits, usage, now }
 *                       — injected so the gates are testable without spending.
 */
export async function composeStills(req = {}, deps = {}) {
  const {
    generator = openrouterGenerate,
    verifier = openrouterVerify,
    compiler = compileImage,
    store = new Map(),
    limits = readComposeLimits(),
    usage = { runs: 0, spendUsd: 0 },
    now = Date.now(),
  } = deps;

  const model = req.model || DEFAULT_MODEL;
  const { count, clampedFrom } = clampCount(req.count);
  const brief = req.brief || {};

  // ── GATE 1: a brief with no subject cannot be compiled, and must not bill. ──
  if (!String(brief.text || '').trim()) {
    throw new ComposeError('E_EMPTY_BRIEF',
      'A brief needs text describing the subject. Nothing was generated and nothing was spent.');
  }

  // ── GATE 2: provider actually configured. Cheap, no spend. ──
  const check = verifier(model);
  if (!check?.ok) {
    throw new ComposeError('E_PROVIDER_UNCONFIGURED',
      `Refusing to generate: ${(check?.problems || ['provider unavailable']).join('; ')}`);
  }

  // ── GATE 3: price known. An unpriced model is unaffordable, not free. ──
  const cost = estimateStills({ count, model });

  // ── GATE 4: ceilings, checked against the WHOLE batch before any of it runs. ──
  const spent = Number(usage.spendUsd) || 0;
  const runs = Number(usage.runs) || 0;
  if (usage.degraded) {
    throw new ComposeError('E_LEDGER_DEGRADED',
      'The spend ledger could not be read, so today\'s total is unknown and a billed model '
      + 'cannot be charged safely.');
  }
  if (runs + count > limits.maxRunsDaily) {
    throw new ComposeError('E_RUN_CAP',
      `This batch of ${count} would pass the daily run cap (${runs}/${limits.maxRunsDaily}).`);
  }
  if (spent + cost.totalUsd > limits.maxSpendUsdDaily) {
    const key = limits.spendEnvKey || SPEND_ENV_KEY;
    throw new ComposeError('E_SPEND_CEILING',
      limits.maxSpendUsdDaily === 0
        // A $0 cap is not "you overspent", it is "this lane was never switched on",
        // and saying the former sends someone hunting a phantom charge.
        ? `Image generation is switched off: no budget is set, so the daily ceiling is $0. `
          + `This batch would cost $${cost.totalUsd.toFixed(4)}. Set ${key} to a real number `
          + 'to enable it. Nothing was spent.'
        : `This batch costs $${cost.totalUsd.toFixed(4)} and today's spend is $${spent.toFixed(4)}, `
          + `which passes the $${limits.maxSpendUsdDaily} daily ceiling. Raise ${key} or wait for `
          + 'the UTC day to roll over. Nothing was spent.');
  }

  // ── GATE 5: compile. A law violation or unsupported aspect must surface here,
  // before four billed calls discover it one at a time. ──
  const caps = capabilities(model);
  let compiled;
  try {
    compiled = compiler(brief, caps);
  } catch (err) {
    throw new ComposeError(err.code || 'E_COMPILE', err.message);
  }

  const promptText = compiled?.promptText || '';
  const promptHash = sha(promptText).slice(0, 12);
  const key = req.idempotencyKey || deriveKey({ ...req, model, count }, now);

  if (req.estimateOnly) {
    return {
      estimateOnly: true, stills: [], failures: [], partial: false, replayed: false,
      cost: { ...cost, chargedUsd: 0 }, promptText, promptHash, model, key,
      ...(clampedFrom === undefined ? {} : { clampedFrom }),
    };
  }

  // ── GATE 6: idempotency. A double-clicked Generate must not bill twice. ──
  // Process-local by design for this slice: it stops the double-click it was
  // built for, and does NOT survive a restart or span instances. Durable replay
  // belongs with the MediaAsset row that already carries the columns for it.
  if (store.has(key)) {
    return { ...store.get(key), replayed: true };
  }

  const settled = await Promise.allSettled(
    Array.from({ length: count }, (_, i) => {
      const seed = Number.isInteger(req.seed) ? req.seed + i : seedFor(key, i);
      return Promise.resolve(generator(compiled, { seed })).then((r) => ({ r, seed, i }));
    }),
  );

  const stills = [];
  const failures = [];
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      const { r, seed } = s.value;
      const image = (r?.images || [])[0];
      if (!image) {
        failures.push({ index: i, code: 'E_NO_IMAGE', message: 'Provider returned no image.' });
        return;
      }
      stills.push({
        index: i, image, model, promptHash,
        // The provider's own reported seed wins when it gives one; ours is the request.
        seed: Number.isInteger(r?.seedUsed) ? r.seedUsed : seed,
        usage: r?.usage || {},
      });
    } else {
      const e = s.reason || {};
      failures.push({ index: i, code: e.code || 'E_PROVIDER_ERROR', message: e.message || String(e) });
    }
  });

  // Every image failing is a failed call, not an empty success. An empty grid
  // rendered as "here are your candidates" is the dishonest shape.
  if (stills.length === 0) {
    throw new ComposeError('E_ALL_FAILED',
      `All ${count} images failed. First error: ${failures[0]?.message || 'unknown'}`);
  }

  const result = {
    estimateOnly: false,
    stills,
    failures,
    partial: failures.length > 0,
    replayed: false,
    // Charged reflects what came back. Billing for four when three arrived is the
    // same silent-shortfall bug in the ledger instead of the grid.
    cost: { ...cost, chargedUsd: cost.unitUsd * stills.length },
    promptText,
    promptHash,
    model,
    key,
    ...(clampedFrom === undefined ? {} : { clampedFrom }),
  };

  store.set(key, result);
  return result;
}
