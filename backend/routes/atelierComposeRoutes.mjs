/**
 * atelierComposeRoutes.mjs — the HTTP surface for Swan Atelier's Compose ladder.
 * ============================================================================
 *
 * ── WHY THIS IS A NEW FILE AND NOT AN ADDITION TO contentStudioRoutes ───────
 * That file is 659 lines against a 300-line cap (rule 4). Extending it would
 * have doubled down on an existing violation, and splitting it first would have
 * spent a whole slice on a pure refactor with nothing visible at the end — the
 * exact substrate-first pattern this lane's own post-mortem records as the
 * reason it shipped a control panel instead of a studio. A new surface gets a
 * new file; the 659-line split stays a hygiene item on its own merits.
 *
 * ── WHAT THIS IS DELIBERATELY NOT ──────────────────────────────────────────
 * There is no Motion endpoint here yet, and that omission is load-bearing. The
 * blueprint requires that approving a still BINDS the exact asset id and hash
 * consumed by the first-frame graph, because the same prompt and seed do not
 * reproduce an image. Shipping an "animate this" call that quietly re-prompts
 * from text would deliver precisely the broken promise the design names. Motion
 * lands when the asset store it must bind to exists.
 *
 * ── ROLE ───────────────────────────────────────────────────────────────────
 * `protect, adminOnly`, matching the rest of the studio: these endpoints spend
 * real money per call, and the operator surface is admin by necessity rather
 * than convention.
 *
 * The logic lives in `services/atelier/composeStills.mjs` so the gates are
 * testable without an HTTP server or a dollar. This file only translates.
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import {
  composeStills, estimateStills, ComposeError, MAX_STILLS, readComposeLimits, SPEND_ENV_KEY,
} from '../services/atelier/composeStills.mjs';

const router = express.Router();

/**
 * Error code -> HTTP status.
 *
 * Every refusal below happens BEFORE the provider is called, so each of these
 * is a 4xx about the request, never a 5xx about the system. `E_LEDGER_DEGRADED`
 * is the exception: the request was fine and our own state was not.
 */
const STATUS = Object.freeze({
  E_EMPTY_BRIEF: 400,
  E_COMPILE: 400,
  E_LAW_VIOLATION: 400,
  E_CAPABILITY_UNVERIFIED: 400,
  E_PRICE_UNKNOWN: 409,
  E_PROVIDER_UNCONFIGURED: 503,
  E_RUN_CAP: 429,
  E_SPEND_CEILING: 402,
  E_LEDGER_DEGRADED: 503,
  E_ALL_FAILED: 502,
  E_BAD_CAP: 500,
});

function fail(res, err) {
  if (err instanceof ComposeError) {
    return res.status(STATUS[err.code] || 400).json({
      success: false, error: err.message, code: err.code,
    });
  }
  console.error('[Atelier/Compose] unexpected failure:', err?.message);
  return res.status(500).json({ success: false, error: 'Compose failed unexpectedly.' });
}

/**
 * Read today's usage.
 *
 * STATED PLAINLY: this slice has no spend ledger, so it reports zero and the
 * ceiling is enforced against a single batch rather than a running daily total.
 * That still stops the thing it was built to stop — one runaway request — and
 * does NOT stop fifty separate ones. `degraded` is the honest signal the
 * service already understands, and wiring a real ledger flips this one function
 * without touching a gate.
 */
function usageToday() {
  return { runs: 0, spendUsd: 0, degraded: false, ledger: 'absent-this-slice' };
}

/**
 * The image lane reads its OWN budget key, not the video lane's — see the note
 * in the service. Defaults to $0, which means these endpoints refuse until
 * someone sets a number; `/limits` says so in as many words.
 */
const limitsNow = () => readComposeLimits();

/**
 * POST /api/atelier/compose/estimate
 * What would this cost? Generates nothing, spends nothing, bills nothing.
 * The Compose surface calls this on every brief change so the price is on
 * screen before the button is live.
 */
router.post('/estimate', protect, adminOnly, async (req, res) => {
  try {
    const { brief, model, count = MAX_STILLS, seed } = req.body || {};
    const out = await composeStills(
      { brief, model, count, seed, userId: req.user?.id, workspaceId: req.body?.workspaceId, estimateOnly: true },
      { limits: limitsNow(), usage: usageToday() },
    );
    return res.json({
      success: true,
      data: {
        cost: out.cost,
        model: out.model,
        promptHash: out.promptHash,
        promptText: out.promptText,
        count: out.cost.count,
        ...(out.clampedFrom === undefined ? {} : { clampedFrom: out.clampedFrom }),
      },
    });
  } catch (err) { return fail(res, err); }
});

/**
 * POST /api/atelier/compose/stills
 * Generate the candidate grid.
 *
 * Returns 207 when some images failed, because a partial grid is neither a
 * success nor a failure and the caller has to render the difference. A short
 * grid returned as 200 reads as "the model only made three good ones."
 */
router.post('/stills', protect, adminOnly, async (req, res) => {
  try {
    const { brief, model, count = MAX_STILLS, seed, workspaceId } = req.body || {};
    const headerKey = req.get('Idempotency-Key');

    const out = await composeStills({
      brief,
      model,
      count,
      seed,
      workspaceId,
      userId: req.user?.id,
      idempotencyKey: (typeof headerKey === 'string' && headerKey.trim()) ? headerKey.trim() : undefined,
    }, { limits: limitsNow(), usage: usageToday() });

    return res.status(out.partial ? 207 : 200).json({
      success: true,
      data: {
        stills: out.stills,
        failures: out.failures,
        partial: out.partial,
        replayed: out.replayed,
        cost: out.cost,
        model: out.model,
        promptHash: out.promptHash,
        promptText: out.promptText,
        idempotencyKey: out.key,
        ...(out.clampedFrom === undefined ? {} : { clampedFrom: out.clampedFrom }),
      },
    });
  } catch (err) { return fail(res, err); }
});

/**
 * GET /api/atelier/compose/limits
 * What the ceilings currently are, and — honestly — that no ledger backs them
 * yet. The Compose header shows this, so "session $0.00 / cap $5.00" is read
 * from the same numbers the gate enforces rather than a second hardcoded copy.
 */
router.get('/limits', protect, adminOnly, (req, res) => {
  const limits = limitsNow();
  const usage = usageToday();
  return res.json({
    success: true,
    data: {
      maxStills: MAX_STILLS,
      limits: { maxRunsDaily: limits.maxRunsDaily, maxSpendUsdDaily: limits.maxSpendUsdDaily },
      usage: { runs: usage.runs, spendUsd: usage.spendUsd },
      ledger: usage.ledger,
      // Surfaced as a first-class field, not left for the caller to infer from a
      // zero. A UI that renders "cap $0.00" without saying WHY looks broken; one
      // that says "switched off, set this key" is actionable.
      enabled: !limits.disabled,
      spendEnvKey: SPEND_ENV_KEY,
      note: limits.disabled
        ? `Image generation is switched off: no budget is set, so the daily ceiling is $0. `
          + `Set ${SPEND_ENV_KEY} to enable it.`
        : 'No spend ledger exists yet, so usage reports zero and the ceiling is enforced '
          + 'per batch rather than per day.',
    },
  });
});

export { estimateStills };
export default router;
