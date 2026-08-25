/**
 * atelierComposeRoutes.mjs — the HTTP surface for Swan Atelier's Compose ladder.
 * ============================================================================
 *
 * ── WHY A NEW FILE ─────────────────────────────────────────────────────────
 * contentStudioRoutes.mjs is 659 lines against a 300-line cap. Extending it
 * doubles down; splitting it first spends a slice on a refactor with nothing
 * visible — the substrate-first pattern this lane's post-mortem blames for
 * shipping a control panel instead of a studio.
 *
 * ── LANES ──────────────────────────────────────────────────────────────────
 * `lane: auto|local|hosted`. Local is the default (the 5090, $0). Hosted is
 * the opt-in fallback and is OFF until a budget is set. `promptSource:
 * brief|taste` — taste prompts are local-only, enforced in the service.
 *
 * ── DELIBERATELY ABSENT ────────────────────────────────────────────────────
 * No Motion endpoint. Approving a still must BIND the exact asset id + hash the
 * first-frame graph consumes; an "animate this" that re-prompts from text is
 * the broken promise the blueprint names. Motion lands with the asset store.
 *
 * `protect, adminOnly` throughout: these endpoints spend money or GPU time.
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import {
  composeStills, estimateStills, ComposeError, MAX_STILLS, readComposeLimits, SPEND_ENV_KEY,
} from '../services/atelier/composeStills.mjs';
import { verifyLocalStills, PROBE_ENV_KEY, STILL_PROVIDER } from '../services/atelier/localStillLane.mjs';
import { readAsset } from '../services/atelier/persistStills.mjs';
import { bindMotion } from '../services/atelier/motionBind.mjs';

const router = express.Router();

/**
 * Error code -> HTTP status. Every refusal happens BEFORE a generator is
 * called, so these are statements about the request or about our own state.
 * Busy/unreachable responses carry Retry-After so a client backs off instead
 * of retrying into a doubled queue.
 */
const STATUS = Object.freeze({
  E_EMPTY_BRIEF: 400,
  E_BRIEF_TOO_LONG: 413,
  E_BAD_LANE: 400,
  E_BAD_SOURCE: 400,
  E_BAD_LAW_PROFILE: 400,
  E_COMPILE: 400,
  E_LAW_VIOLATION: 400,
  E_CAPABILITY_UNVERIFIED: 400,
  E_TASTE_LOCAL_ONLY: 400,
  E_PRICE_UNKNOWN: 409,
  E_NO_LANE: 409,
  E_STILL_LANE_UNPROBED: 409,
  E_LOCAL_BUSY: 409,
  E_PROVIDER_DISABLED: 403,
  E_LICENCE_GRANT_REQUIRED: 403,
  E_SPEND_CEILING: 402,
  E_RUN_CAP: 429,
  E_PROVIDER_UNCONFIGURED: 503,
  E_COMFY_UNREACHABLE: 503,
  E_VRAM_BUSY: 503,
  E_LEDGER_DEGRADED: 503,
  E_TASTE_UNREACHABLE: 502,
  E_TASTE_BAD_RESPONSE: 502,
  E_ALL_FAILED: 502,
  E_LOCAL_RENDER: 502,
  E_TASTE_URL_NOT_LOOPBACK: 500,
  E_BAD_CAP: 500,
  E_STORAGE_UNCONFIGURED: 503,
  E_STILL_UNREADABLE: 502,
  E_ARTIFACT_HASH_MISMATCH: 502,
  E_ASSET_NOT_FOUND: 404,
  E_BIND_NO_ASSET: 400,
  E_BIND_NO_HASH: 400,
  E_BAD_OWNER: 400,
  E_BIND_ASSET_NOT_FOUND: 404,
  E_ASSET_NOT_IMAGE: 400,
  E_BIND_NO_RECORDED_HASH: 409,
  E_BIND_HASH_MISMATCH: 409,
  E_BAD_INPUT: 400,
  E_UNSUPPORTED_KIND: 400,
  E_IMAGE_FIRST_REQUIRED: 400,
  E_UNKNOWN_PROVIDER: 400,
  // Ticket codes are served by renderAgentRoutes; mapped here too so the invariant
  // 'every code the atelier services can throw has a deliberate status' stays simple.
  E_JOB_NOT_FOUND: 404,
  E_LEASE_CONFLICT: 409,
  E_BIND_NO_INIT_IMAGE: 400,
});

function fail(res, err) {
  if (err instanceof ComposeError) {
    if (err.retryAfterSec) res.set('Retry-After', String(err.retryAfterSec));
    return res.status(STATUS[err.code] || 400).json({
      success: false, error: err.message, code: err.code,
      ...(err.retryAfterSec ? { retryAfterSec: err.retryAfterSec } : {}),
      ...(err.freeMb !== undefined ? { freeMb: err.freeMb, neededMb: err.neededMb } : {}),
    });
  }
  console.error('[Atelier/Compose] unexpected failure:', err?.message);
  return res.status(500).json({ success: false, error: 'Compose failed unexpectedly.' });
}

/**
 * STATED PLAINLY: no spend ledger exists yet, so usage reports zero and the
 * ceilings are enforced per batch, not per day. That stops one runaway request
 * and does not stop fifty separate ones.
 */
function usageToday() {
  return { runs: 0, spendUsd: 0, degraded: false, ledger: 'absent-this-slice' };
}

function reqFromBody(req, extra = {}) {
  const b = req.body || {};
  const headerKey = req.get('Idempotency-Key');
  return {
    brief: b.brief, promptSource: b.promptSource, lane: b.lane, model: b.model,
    count: b.count ?? MAX_STILLS, seed: b.seed, aspect: b.aspect, cinematic: b.cinematic, mode: b.mode, lawProfile: b.lawProfile,
    workspaceId: b.workspaceId, userId: req.user?.id, persist: b.persist,
    idempotencyKey: (typeof headerKey === 'string' && headerKey.trim()) ? headerKey.trim() : undefined,
    ...extra,
  };
}

const depsNow = () => ({ limits: readComposeLimits(), usage: usageToday() });

/** POST /api/atelier/compose/estimate — lane, price, readiness. Generates nothing. */
router.post('/estimate', protect, adminOnly, async (req, res) => {
  try {
    const out = await composeStills(reqFromBody(req, { estimateOnly: true }), depsNow());
    return res.json({ success: true, data: {
      lane: out.lane, promptSource: out.promptSource, cost: out.cost, model: out.model,
      count: out.cost.count, admission: out.admission,
      ...(out.clampedFrom === undefined ? {} : { clampedFrom: out.clampedFrom }),
    } });
  } catch (err) { return fail(res, err); }
});

/**
 * POST /api/atelier/compose/stills — the candidate grid.
 * 207 when some images failed: a partial grid is neither a success nor a
 * failure, and a short grid returned as 200 reads as "the model only made three".
 *
 * Each still: { index, lane, image: {kind:'b64',data} | {kind:'path',path,mime},
 *               seed, promptHash, promptText, provider, sha256?, bytes?, usage? }
 */
router.post('/stills', protect, adminOnly, async (req, res) => {
  try {
    const out = await composeStills(reqFromBody(req), depsNow());
    return res.status(out.partial ? 207 : 200).json({ success: true, data: {
      lane: out.lane, promptSource: out.promptSource, stills: out.stills, failures: out.failures,
      partial: out.partial, replayed: out.replayed, cost: out.cost, model: out.model,
      idempotencyKey: out.key, admission: out.admission,
      // Per-still `assetId` rides on each still; this is the batch-level verdict and the
      // reason when nothing persisted (e.g. R2 unconfigured) — never hidden behind a 200.
      persistence: out.persistence,
      ...(out.tasteSeed !== undefined ? { tasteSeed: out.tasteSeed, lawRejected: out.lawRejected, lawProfile: out.lawProfile } : {}),
      ...(out.clampedFrom === undefined ? {} : { clampedFrom: out.clampedFrom }),
    } });
  } catch (err) { return fail(res, err); }
});

/**
 * GET /api/atelier/compose/limits — what each lane can do RIGHT NOW, with the
 * switch that changes it. `advertisable:false` on a claimed lane is the UI's
 * instruction not to promise it.
 */
router.get('/limits', protect, adminOnly, (req, res) => {
  const limits = readComposeLimits();
  const usage = usageToday();
  const lv = verifyLocalStills();
  return res.json({ success: true, data: {
    maxStills: MAX_STILLS,
    lanes: {
      local: { provider: STILL_PROVIDER, status: lv.status, ready: lv.ok, advertisable: lv.status === 'probed',
        problems: lv.problems, probeEnvKey: PROBE_ENV_KEY, unitUsd: 0 },
      hosted: { enabled: !limits.disabled, spendEnvKey: SPEND_ENV_KEY,
        limits: { maxRunsDaily: limits.maxRunsDaily, maxSpendUsdDaily: limits.maxSpendUsdDaily } },
    },
    usage: { runs: usage.runs, spendUsd: usage.spendUsd },
    ledger: usage.ledger,
    enabled: lv.ok || !limits.disabled,
    spendEnvKey: SPEND_ENV_KEY,
    note: lv.ok ? 'Local stills ready ($0). No spend ledger exists yet; ceilings are per batch.'
      : limits.disabled
        ? `No lane is ready. Local: ${lv.problems[0]}. Hosted is switched off — set ${SPEND_ENV_KEY} to enable it.`
        : `Hosted lane enabled. Local: ${lv.problems[0]}. No spend ledger exists yet; ceilings are per batch.`,
  } });
});

/**
 * GET /api/atelier/compose/asset/:id — one persisted still, owner-scoped, with its
 * frozen provenance and a short-lived read URL. This is the record the Motion rung
 * will BIND to: id + sha256, not a prompt.
 */
router.get('/asset/:id', protect, adminOnly, async (req, res) => {
  try {
    const out = await readAsset({ id: String(req.params.id || ''), userId: req.user?.id });
    return res.json({ success: true, data: out });
  } catch (err) { return fail(res, err); }
});

/**
 * POST /api/atelier/compose/motion — animate THE approved frame.
 * Body: { assetId, sha256, prompt?, provider?, duration?, seed?, workspaceId? }.
 * A prompt alone is refused (E_BIND_NO_ASSET): approval binds bytes, not words.
 * Returns the queued job + the same worker-presence honesty as the video route —
 * `startable:false` means nothing can render this right now, and the UI must say so.
 */
router.post('/motion', protect, adminOnly, async (req, res) => {
  try {
    const b = req.body || {};
    const headerKey = req.get('Idempotency-Key');
    const out = await bindMotion({
      assetId: b.assetId, sha256: b.sha256, prompt: b.prompt, provider: b.provider, duration: b.duration,
      seed: b.seed, workspaceId: b.workspaceId, userId: req.user?.id,
      idempotencyKey: (typeof headerKey === 'string' && headerKey.trim()) ? headerKey.trim() : undefined,
    });
    return res.status(out.replayed ? 200 : 202).json({ success: true, data: out });
  } catch (err) { return fail(res, err); }
});

export { estimateStills };
export default router;
