/**
 * ============================================================================
 * FILE: coachMemoryRoutes.mjs
 * PURPOSE: The HTTP surface for G09/S9 scoped visible memory — let an authorized
 *          caller INSPECT, CORRECT and FORGET the durable CoachFacts a client's
 *          coaching is built on.
 * AUTHOR: Astra | CREATED: 2026-09-13
 * BLUEPRINT: plan 43 (SCU-G09-43) + contract 32 T35-T37. Experience card S9 names
 *            this slice directly: "NEW CoachMemoryDrawer.tsx, memory route
 *            adapter if absent, and scoped cache invalidator" — the adapter was
 *            absent, which is why the whole lifecycle had no API.
 * ============================================================================
 *
 * WHY THIS FILE EXISTS: model + migration + coachFactService + memory policy all
 * shipped and were green, but nothing under routes/ or controllers/ imported
 * them. "Helpers/models alone are not completed products" (packet 75): inspect /
 * correct / forget had no caller, so a Trainer-facing drawer would have had
 * nothing to call. This file adds no lifecycle of its own — every write goes
 * through the adopted service and the T35 policy, unchanged.
 *
 * MOUNTED at /api/coach/memory in core/routes.mjs:
 *   GET  /:clientId/facts                  inspect  -> listFacts (status/category/limit)
 *   POST /:clientId/facts                  remember -> createManualFact (born active: a human typed it)
 *   POST /:clientId/facts/:factId/correct  correct  -> createManualFact + invalidateFact(old, supersededByFactId=new)
 *   POST /:clientId/facts/:factId/forget   forget   -> policy forgetFact (tombstone + 24h purge clock + cache invalidation)
 *
 * AUTHORIZATION — one chokepoint, no hand-rolled roles
 * Every route calls `utils/clientAccess.mjs::ensureClientAccess`, the same gate
 * as /api/photos, /api/notes, /api/nutrition, /api/stats and /api/recovery:
 * admin = any client; client-equivalent (client OR the default self-registration
 * role 'user', via the shared `isClientEquivalentRole`) = self only; trainer =
 * an ACTIVE ClientTrainerAssignment. Deliberately NOT the Coach-lane
 * `checkClientAccess`, which also grants a trainer with recent session history:
 * broader than a durable-memory write/delete surface should be.
 *
 * IDOR — a fact id is not a capability
 * `forgetFact` derives its target client from the FACT ROW, not from the route
 * parameter, so `loadOwnedFact` below is load-bearing: a caller authorized for
 * client A must not be able to tombstone client B's fact by guessing its id.
 * Every :factId route resolves the row through the authorized client's own
 * `listFacts` universe first and 404s when it is not in it.
 *
 * NOT EXPOSED, deliberately (T35-T37 do not require them): propose/approve/reject
 * — the machine-proposal review queue is the S2 extraction surface, and T35's
 * verbs are human-initiated; an HTTP route writing `proposed` rows would let a
 * CALLER impersonate the machine that invariant 1 reserves. detectFactConflicts
 * (T37) — a pure comparison needing an authoritative-record input this surface
 * has no provider for. getActiveFactsForContext — the S3 prompt read.
 *
 * PRIVACY (Rule 8): rows are returned as the service produced them — ids, enum
 * categories, de-identified `statement` prose and timestamps. No names are
 * joined in.
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import logger from '../utils/logger.mjs';
import {
  FACT_CATEGORIES,
  FACT_STATUSES,
  CoachFactError,
  createManualFact,
  invalidateFact,
  listFacts,
} from '../services/coachFactService.mjs';
import { forgetFact } from '../services/coachFactMemoryPolicy.mjs';

const router = express.Router();

/**
 * `listFacts` clamps any limit to its own MAX_FETCH_ROWS ceiling, so a very
 * large number here reads the whole readable universe rather than a page. That
 * is exactly what the ownership check needs: a fact the service cannot return
 * is a fact this surface cannot act on either.
 */
const WHOLE_UNIVERSE = Number.MAX_SAFE_INTEGER;

/** The authenticated human actor, as an integer id. */
const actorIdOf = (req) => Number(req.user?.id);

const isCoachFactError = (error) => (
  error instanceof CoachFactError || error?.name === 'CoachFactError'
);

function respondDenied(res, access) {
  return res.status(access.status).json({ success: false, message: access.message });
}

/** CoachFactError carries an actionable, PII-free message and its own status. */
function respondError(res, error, context) {
  if (isCoachFactError(error)) {
    return res.status(error.statusCode || 400).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }
  logger.error(`[coachMemory] ${context} failed`, { message: error?.message, name: error?.name });
  return res.status(500).json({ success: false, message: `Unable to ${context}.` });
}

/** Gate first, then resolve the authorized client id (never the raw param). */
async function authorize(req, res) {
  const access = await ensureClientAccess(req, req.params.clientId);
  if (!access.allowed) {
    respondDenied(res, access);
    return null;
  }
  return access;
}

/**
 * Resolve a fact ONLY if it belongs to the client this route was authorized for.
 * Returns null when the id is malformed, unknown, or another client's — the
 * three cases are deliberately indistinguishable to the caller.
 */
async function loadOwnedFact(clientId, factId) {
  const id = Number(factId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const rows = await listFacts({ userId: clientId, limit: WHOLE_UNIVERSE });
  return rows.find((row) => Number(row.id) === id) || null;
}

/**
 * Allowlist the writable fields. `toRowValues` already builds its row from an
 * explicit field list, but naming them here keeps the accepted request body
 * reviewable from the route alone — and `sourceType` defaults to
 * `trainer_manual` because a hand-typed fact is not a chat extraction.
 */
function factInputFrom(body) {
  const source = body && typeof body === 'object' ? body : {};
  return {
    category: source.category,
    statement: source.statement,
    structured: source.structured ?? null,
    validFrom: source.validFrom,
    validTo: source.validTo,
    sourceType: source.sourceType ?? 'trainer_manual',
    sourceRef: source.sourceRef ?? null,
  };
}

/** GET /:clientId/facts — the inspect / review-queue read. */
router.get('/:clientId/facts', protect, async (req, res) => {
  try {
    const access = await authorize(req, res);
    if (!access) return undefined;

    const { status, category, limit } = req.query;
    if (status !== undefined && !FACT_STATUSES.includes(String(status))) {
      return res.status(400).json({
        success: false,
        code: 'COACH_FACT_STATUS_INVALID',
        message: `Unknown status "${status}". Expected one of: ${FACT_STATUSES.join(', ')}.`,
      });
    }
    if (category !== undefined && !FACT_CATEGORIES.includes(String(category))) {
      return res.status(400).json({
        success: false,
        code: 'COACH_FACT_CATEGORY_INVALID',
        message: `Unknown fact category "${category}". Expected one of: ${FACT_CATEGORIES.join(', ')}.`,
      });
    }

    const facts = await listFacts({
      userId: access.clientId,
      ...(status !== undefined ? { status: String(status) } : {}),
      ...(category !== undefined ? { category: String(category) } : {}),
      ...(limit !== undefined ? { limit } : {}),
    });

    return res.json({
      success: true,
      data: { clientId: access.clientId, count: facts.length, facts },
    });
  } catch (error) {
    return respondError(res, error, 'read coach memory');
  }
});

/** POST /:clientId/facts — the explicit "remember this" reviewed write (S9a). */
router.post('/:clientId/facts', protect, async (req, res) => {
  try {
    const access = await authorize(req, res);
    if (!access) return undefined;

    const created = await createManualFact({
      userId: access.clientId,
      fact: factInputFrom(req.body),
      createdByUserId: actorIdOf(req),
    });

    return res.status(201).json({ success: true, data: { fact: created } });
  } catch (error) {
    return respondError(res, error, 'save a coach memory fact');
  }
});

/**
 * POST /:clientId/facts/:factId/correct — T35's versioned edit.
 *
 * Order is deliberate: the SUCCESSOR is written first, then the predecessor is
 * invalidated with `supersededByFactId`. The reverse order would, on a failure
 * between the two writes, remove the memory with no successor and no supersede
 * link — silent loss of the thing being corrected. This way a partial failure
 * leaves both versions live (recoverable) and says so in the response.
 */
router.post('/:clientId/facts/:factId/correct', protect, async (req, res) => {
  try {
    const access = await authorize(req, res);
    if (!access) return undefined;

    const existing = await loadOwnedFact(access.clientId, req.params.factId);
    if (!existing) {
      return res.status(404).json({ success: false, code: 'COACH_FACT_NOT_FOUND', message: 'Fact not found.' });
    }
    // Fail BEFORE any write: `invalidateFact` only transitions active rows, so
    // correcting a proposed/invalidated row would otherwise orphan a successor.
    if (existing.status !== 'active') {
      return res.status(409).json({
        success: false,
        code: 'COACH_FACT_STATUS_CONFLICT',
        message: `Cannot correct a fact with status "${existing.status}".`,
      });
    }

    const replacement = await createManualFact({
      userId: access.clientId,
      fact: factInputFrom(req.body),
      createdByUserId: actorIdOf(req),
    });

    let superseded;
    try {
      superseded = await invalidateFact({
        factId: existing.id,
        byUserId: actorIdOf(req),
        supersededByFactId: replacement.id,
      });
    } catch (error) {
      logger.error('[coachMemory] correct: successor written, supersede failed', {
        clientId: access.clientId,
        factId: existing.id,
        replacementFactId: replacement.id,
        code: error?.code,
        message: error?.message,
      });
      return res.status(error?.code === 'COACH_FACT_STATUS_CONFLICT' ? 409 : 500).json({
        success: false,
        code: 'COACH_FACT_SUPERSEDE_FAILED',
        message: 'The replacement fact was saved, but the previous version could not be invalidated. Retry, or forget the previous version explicitly.',
        data: { replacementFactId: replacement.id, supersedeReason: error?.code ?? null },
      });
    }

    return res.status(201).json({ success: true, data: { fact: replacement, supersededFact: superseded } });
  } catch (error) {
    return respondError(res, error, 'correct a coach memory fact');
  }
});

/**
 * POST /:clientId/facts/:factId/forget — T35's deletion right.
 *
 * `forgetFact` tombstones the row, stamps `purgeAfterAt = forgottenAt + 24h` and
 * invalidates the coach context cache for the fact's client in the SAME call, so
 * a stale cached context cannot resurrect what was just forgotten. This route
 * adds only the ownership check that binds the gate to the row.
 */
router.post('/:clientId/facts/:factId/forget', protect, async (req, res) => {
  try {
    const access = await authorize(req, res);
    if (!access) return undefined;

    const existing = await loadOwnedFact(access.clientId, req.params.factId);
    if (!existing) {
      return res.status(404).json({ success: false, code: 'COACH_FACT_NOT_FOUND', message: 'Fact not found.' });
    }

    const forgotten = await forgetFact({ factId: existing.id, byUserId: actorIdOf(req) });

    return res.json({
      success: true,
      data: { fact: forgotten, purgeAfterAt: forgotten?.purgeAfterAt ?? null },
    });
  } catch (error) {
    return respondError(res, error, 'forget a coach memory fact');
  }
});

export default router;
