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
import { makeLaneLedger } from '../services/laneLedger.mjs';
import { verifyLocalStills, PROBE_ENV_KEY, STILL_PROVIDER } from '../services/atelier/localStillLane.mjs';
import { readAsset } from '../services/atelier/persistStills.mjs';
import { bindMotion } from '../services/atelier/motionBind.mjs';
import { transitionAsset, publishedReference } from '../services/atelier/publishAsset.mjs';
import { getBatch, assertBatchId } from '../services/atelier/batchStore.mjs';
import { listBrandKits } from '../../shared/brandKits/registry.mjs';
import { listAssets, DEFAULT_PAGE } from '../services/atelier/assetLibrary.mjs';
import { STATUS } from './atelierStatusMap.mjs';

const router = express.Router();


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

// The day counter the ceilings are actually compared against. Until this was wired the
// route reported zero on every request, which made both "daily" caps per-request caps:
// one runaway batch was stopped, fifty separate ones were not. Module-scoped because the
// ledger remembers an unwritable disk in-process — see laneLedger.mjs for why that
// memory is deliberately not cleared until a restart.
const ledger = makeLaneLedger({ lane: 'atelier' });
const usageToday = () => ledger.usageToday();

/** The day's standing, in words. This used to read "no spend ledger exists yet;
 *  ceilings are per batch" — true when written, false the moment the ledger was
 *  wired, and exactly the kind of confident copy that outlives the code it
 *  describes. Both failure states are named here because an operator whose billed
 *  lane is refusing needs to know it is the disk, not the budget. */
function ledgerNote(usage, limits) {
  if (usage.ledger === 'unwritable') {
    return 'The spend ledger cannot be written, so billed generation is refused until the disk is fixed. The free local lane is unaffected.';
  }
  if (usage.ledger === 'degraded') {
    return "The spend ledger cannot be read, so today's total is unknown and billed generation is refused. The free local lane is unaffected.";
  }
  return `Today: ${usage.runs}/${limits.maxRunsDaily} runs, $${usage.spendUsd.toFixed(4)} of $${limits.maxSpendUsdDaily} spent.`;
}

function reqFromBody(req, extra = {}) {
  const b = req.body || {};
  const headerKey = req.get('Idempotency-Key');
  return {
    brief: b.brief, promptSource: b.promptSource, lane: b.lane, model: b.model,
    count: b.count ?? MAX_STILLS, seed: b.seed, aspect: b.aspect, cinematic: b.cinematic, mode: b.mode, lawProfile: b.lawProfile,
    workspaceId: b.workspaceId, brandKit: b.brandKit, userId: req.user?.id, persist: b.persist,
    idempotencyKey: (typeof headerKey === 'string' && headerKey.trim()) ? headerKey.trim() : undefined,
    ...extra,
  };
}

const depsNow = () => ({ limits: readComposeLimits(), usage: usageToday(), commit: (d) => ledger.tryCommit(d) });

/**
 * GET /api/atelier/compose/assets — the library.
 *
 * Owner-scoped by construction: the query is built from `req.user.id`, never from a
 * parameter, so there is no id to tamper with. Filters are allowlisted, so a typo is a
 * refusal rather than a filter that silently matches everything.
 */
router.get('/assets', protect, adminOnly, async (req, res) => {
  try {
    const [{ default: MediaAsset }, { Op, fn, col, where }, r2] = await Promise.all([
      import('../models/MediaAsset.mjs'),
      import('sequelize'),
      import('../services/r2StorageService.mjs'),
    ]);
    const out = await listAssets({
      userId: req.user?.id,
      kind: req.query.kind, status: req.query.status,
      brandKit: req.query.brandKit, brandKitHash: req.query.brandKitHash,
      workspaceId: req.query.workspaceId, lane: req.query.lane,
      cursor: req.query.cursor, limit: req.query.limit ?? DEFAULT_PAGE,
    }, {
      assetModel: MediaAsset, Op, fn, col, where,
      // generateThumbnailUrl, NOT generatePlaybackUrl. The service already ships a signer
      // built for list endpoints — 1 hour instead of the playback TTL — and I reached for
      // the one I had seen elsewhere instead of reading what the service offers. Shorter
      // TTL is the right trade for a page that shows two dozen at once.
      readUrl: (key) => r2.generateThumbnailUrl(key),
    });
    return res.json({ success: true, data: out });
  } catch (err) { return fail(res, err); }
});

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
    // LOCAL LANE: accepted, rendering in the background. Poll statusUrl. The hosted lane
    // still answers synchronously below — it is seconds, not minutes.
    if (out.accepted) {
      return res.status(out.replayed ? 200 : 202).json({ success: true, data: {
        accepted: true, batchId: out.batchId, status: out.status, lane: out.lane, promptSource: out.promptSource,
        count: out.count, cost: out.cost, admission: out.admission, statusUrl: out.statusUrl, replayed: out.replayed,
      } });
    }
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
 * GET /api/atelier/compose/stills/:batchId — the growing snapshot of a local batch.
 * Owner-scoped. Each still already carries its asset id (persisted as it landed).
 * `terminal:true` means stop polling. 404 means no such batch for you — including a
 * batch that died with the process, which is reported by absence, never as "running".
 */
router.get('/stills/:batchId', protect, adminOnly, (req, res) => {
  try {
    assertBatchId(req.params.batchId);
    const snap = getBatch(req.params.batchId, req.user?.id);
    if (!snap) {
      // A lost batch is not lost work: every still that rendered was persisted the moment
      // it did, so it is in the asset library. Say so — otherwise a restart reads as
      // "your renders are gone" when the assets are sitting there.
      return res.status(404).json({ success: false, code: 'E_BATCH_NOT_FOUND',
        error: 'No such batch — it finished over an hour ago, or the server restarted. Any stills that had already rendered were saved to your asset library.' });
    }
    return res.json({ success: true, data: snap });
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
    // The kits an operator may pick. Ids and names only — the art direction itself is
    // prompt material and stays server-side, like a compiled prompt.
    brandKits: listBrandKits(),
    usage: { runs: usage.runs, spendUsd: usage.spendUsd },
    ledger: usage.ledger,
    enabled: lv.ok || !limits.disabled,
    spendEnvKey: SPEND_ENV_KEY,
    note: [
      lv.ok ? 'Local stills ready ($0).'
        : limits.disabled
          ? `No lane is ready. Local: ${lv.problems[0]}. Hosted is switched off — set ${SPEND_ENV_KEY} to enable it.`
          : `Hosted lane enabled. Local: ${lv.problems[0]}.`,
      ledgerNote(usage, limits),
    ].join(' '),
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

/**
 * POST /api/atelier/compose/asset/:id/status — draft → approved → published (and back).
 * Publish is refused (422) with the blockers from the FROZEN provenance record: an
 * unconfirmed consent flag, a missing required attribution, or a grant-required model
 * run with no grant used commercially. draft → published is not a step (409).
 */
router.post('/asset/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const out = await transitionAsset({ id: String(req.params.id || ''), userId: req.user?.id, to: req.body?.to, declaration: req.body?.declaration });
    return res.json({ success: true, data: out });
  } catch (err) {
    if (err?.code === 'E_PUBLISH_BLOCKED') return res.status(422).json({ success: false, error: err.message, code: err.code, blockers: err.blockers });
    return fail(res, err);
  }
});

/**
 * GET /api/atelier/compose/asset/:id/reference — what a site needs: read URL, an
 * <img>/<video> snippet, and the attribution. Withheld until published, so "copy link"
 * cannot put a draft on a page.
 */
router.get('/asset/:id/reference', protect, adminOnly, async (req, res) => {
  try {
    const out = await publishedReference({ id: String(req.params.id || ''), userId: req.user?.id, publicBase: process.env.SWAN_PUBLIC_BASE_URL || '' });
    return res.json({ success: true, data: out });
  } catch (err) { return fail(res, err); }
});

export { estimateStills };
export default router;
