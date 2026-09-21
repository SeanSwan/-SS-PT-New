import express from 'express';
import { Op } from 'sequelize';
import logger from '../../utils/logger.mjs';
import { bannedTerms } from '../social/feedEnrichment.mjs';
import { verifyBridgeRequest } from '../../services/swanBridgeSignature.mjs';
import { applyBridgeSpotlightRevision } from '../../services/bridgeSpotlightRevisionApply.mjs';
import { rehostBridgeSpotlightImage } from '../../services/bridgeSpotlightImageRehost.mjs';

/**
 * SwanGuard → SwanStudios Spotlight ingest.
 * Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §4.1
 *
 * Ingest order is contractual:
 *   flag check (503) -> signature + skew (401) -> schema validate (422)
 *   -> bannedTerms second gate (422) -> idempotent upsert -> R2 re-host -> audit log
 *
 * SCOPE OF THAT CLAIM, corrected after hostile review F04 (2026-09-20). The list above is
 * the order of the checks INSIDE the handler, not the middleware order. The route's own
 * body parser runs FIRST, before the flag check, so a disabled receiver can still be made
 * to answer a parser error (400/413) rather than the documented 503. That is a real gap
 * against "a disabled receiver returns 503 and touches nothing"; closing it means moving
 * the feature gate ahead of parsing, which is a change to the shipped route's behaviour
 * and is therefore reported rather than made unilaterally (06-bans #1).
 *
 * The R2 re-host NEVER fails the ingest: a broken image degrades to a text-only card.
 * A dropped Spotlight is worse than an imageless one.
 *
 * NOTE: this router owns its body parser. /api/bridge must stay excluded from the global
 * JSON parser (backend/core/middleware/index.mjs) or req.rawBody is empty and HMAC fails.
 */
const router = express.Router();

export const SPOTLIGHT_MAX_HEADLINE = 80;
export const SPOTLIGHT_MAX_DEK = 200;
export const SPOTLIGHT_MAX_CURATOR_NOTE = 140;
// `itemId` is the natural PRIMARY KEY (`SwanSpotlight.itemId STRING(36)`, G0-SOURCE-EXCERPTS.md:109)
// and the contract bounds it at 36 (`:54`). It is an IDENTITY, not display text: an over-long value
// is out of contract and must be REJECTED, never shortened to fit.
export const SPOTLIGHT_MAX_ITEM_ID = 36;

export const isSpotlightEnabled = (env = process.env) => env.SPOTLIGHT_ENABLED === 'true';

/** Raw-aware JSON parser — captures exact bytes for HMAC, mirroring the PLAUD precedent. */
export const spotlightJsonParser = express.json({
  limit: '256kb',
  verify: (req, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
});

/**
 * DISPLAY-TEXT normaliser: trims, and TRUNCATES to `max`.
 *
 * Truncation is correct for prose and WRONG for an identifier. The two were conflated once
 * (hostile review R5-02) and the result was two distinct itemIds — differing only past the 36th
 * character — collapsing onto a single primary key. Use `identity()` for anything that names a row.
 */
const str = (value, max) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

/**
 * IDENTITY normaliser: trims, and REJECTS anything that does not fit rather than shortening it.
 *
 * Returns `{ok:false, reason}` for a missing or over-long value so the caller can answer 422
 * BEFORE the value reaches the model. Whitespace normalisation is preserved (the established
 * contract); the bound is the column's, not a new format — an over-long id is out of contract,
 * not a UUID that needs converting, and no format is imposed here beyond the documented length.
 */
const identity = (value, max, label) => {
  if (typeof value !== 'string') return { ok: false, reason: `${label} is required.` };
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: `${label} is required.` };
  if (trimmed.length > max) {
    return { ok: false, reason: `${label} must be at most ${max} characters.` };
  }
  return { ok: true, value: trimmed };
};

/** Screen the human-readable copy against the shared positivity list. */
export const findBannedTerm = (fields) => {
  const haystack = fields.filter(Boolean).join(' ').toLowerCase();
  return bannedTerms.find((term) => haystack.includes(term)) ?? null;
};

// `revision` is stored in an INTEGER column (SwanSpotlight.mjs:23). An out-of-range value
// passed validation and then failed at the column, so the bound is part of the contract.
export const SPOTLIGHT_MAX_REVISION = 2147483647;

/**
 * Validate AND normalize. It returns the exact values the handler must persist, so validation
 * and persistence cannot disagree (hostile review D3 / F07).
 *
 * It used to return only `{ ok: true }`. Three consequences: `itemId` was bounded here but the
 * handler stored the RAW `req.body.itemId`; `revision` had no upper bound; and `retracted` was
 * truthiness-tested in the image branch but strict-compared for storage, so `retracted:"false"`
 * stored `false` while skipping the image. Coercing once, here, removes all three.
 */
export const validateSpotlightPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'Body must be a JSON object.' };
  }
  // Identity first, and bounded — never truncated (hostile review R5-02). `str()` would have
  // shortened an over-long id to 36 characters, silently aliasing two distinct items onto one row.
  const id = identity(body.itemId, SPOTLIGHT_MAX_ITEM_ID, 'itemId');
  if (!id.ok) return id;
  const itemId = id.value;
  if (!Number.isInteger(body.revision) || body.revision < 1) {
    return { ok: false, reason: 'revision must be a positive integer.' };
  }
  if (body.revision > SPOTLIGHT_MAX_REVISION) {
    return { ok: false, reason: `revision must be at most ${SPOTLIGHT_MAX_REVISION}.` };
  }
  const headline = str(body.headline, SPOTLIGHT_MAX_HEADLINE);
  if (!headline) return { ok: false, reason: 'headline is required.' };
  return { ok: true, value: { itemId, revision: body.revision, headline, retracted: body.retracted === true } };
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * POST /api/bridge/spotlight
 * 503 flag off | 401 bad signature | 422 invalid/banned | 200 stored | 200 no-op (replay)
 */
router.post('/spotlight', spotlightJsonParser, async (req, res) => {
  if (!isSpotlightEnabled()) {
    return res.status(503).json({ success: false, message: 'Spotlight ingest is disabled.' });
  }

  const verdict = verifyBridgeRequest(req);
  if (!verdict.ok) {
    logger.warn(`Spotlight ingest rejected: ${verdict.code}`);
    return res.status(verdict.status).json({ success: false, code: verdict.code });
  }

  const validation = validateSpotlightPayload(req.body);
  if (!validation.ok) {
    return res.status(422).json({ success: false, message: validation.reason });
  }

  // The VALIDATED, normalized values — never the raw body (D3).
  const { itemId, revision, headline, retracted } = validation.value;
  const dek = str(req.body.dek, SPOTLIGHT_MAX_DEK);
  const curatorNote = str(req.body.curatorNote, SPOTLIGHT_MAX_CURATOR_NOTE);

  // Second positivity gate — SwanGuard's ceremony is the first, this is the backstop.
  const banned = findBannedTerm([headline, dek, curatorNote]);
  if (banned) {
    logger.warn(`Spotlight ${itemId} rejected by banned-terms gate: "${banned}"`);
    return res.status(422).json({ success: false, code: 'BANNED_TERM' });
  }

  try {
    const SwanSpotlight = (await import('../../models/social/SwanSpotlight.mjs')).default;

    // Read ONLY to preserve the stored image across a text-only or retracted revision. This is
    // NOT the ordering guard — applyBridgeSpotlightRevision makes the database evaluate
    // `revision < incoming` inside the write itself (D1 / ban #19).
    const stored = await SwanSpotlight.findByPk(itemId, { attributes: ['imageUrl'] });

    const source = req.body.sourceAttribution && typeof req.body.sourceAttribution === 'object'
      ? req.body.sourceAttribution
      : {};
    const gate = req.body.gate && typeof req.body.gate === 'object' ? req.body.gate : {};

    // Image re-host is best-effort by design — never fail the ingest over a picture. A revision
    // that is about to carry an image starts at null, so a re-host failure leaves null and the
    // card renders text-only (ban #37); a retraction or text-only revision keeps what is there.
    const incomingImage = str(req.body.imageUrl, 2048);
    const willRehost = Boolean(incomingImage) && !retracted;

    const values = {
      itemId,
      revision,
      retracted,
      headline,
      dek,
      imageUrl: willRehost ? null : (stored?.imageUrl ?? null),
      sourceName: str(source.name, 80),
      sourceUrl: str(source.url, 2048),
      curatorNote,
      sortWeight: Number.isInteger(req.body.sortWeight) ? req.body.sortWeight : 1,
      publishedAt: toDate(req.body.publishedAt),
      expiresAt: toDate(req.body.expiresAt),
      gateHash: str(gate.checklistHash, 64)
    };

    const outcome = await applyBridgeSpotlightRevision({ SwanSpotlight, itemId, revision, values });
    if (!outcome.applied) {
      // A same-or-older revision: nothing was written, and no image was fetched for it.
      return res.status(200).json({ success: true, noop: true, itemId, revision: outcome.storedRevision });
    }

    // Attach the image ONLY now that this revision is the accepted, current one. The WHERE
    // clause re-checks the revision and the tombstone at attach time, so a newer revision or a
    // concurrent retraction cannot be handed a stale picture.
    if (willRehost) {
      const rehosted = await rehostBridgeSpotlightImage(incomingImage, itemId);
      if (rehosted) {
        await SwanSpotlight.update({ imageUrl: rehosted }, { where: { itemId, revision, retracted: false } });
      }
    }

    logger.info(`Spotlight ${retracted ? 'retracted' : 'stored'}: ${itemId}@${revision}`);
    return res.status(200).json({ success: true, itemId, revision, retracted });
  } catch (error) {
    logger.error('Spotlight ingest failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error during ingest.' });
  }
});

// Image re-host — its SSRF hardening, the wrong-import defect, and why it moved out of this
// file — lives in services/bridgeSpotlightImageRehost.mjs. Read that header before changing it.

/**
 * Raw-body capture for the bodyless reconciliation GET.
 *
 * FIXED 2026-09-19. This route previously had NO body parser, so `req.rawBody` was
 * undefined and `verifyBridgeRequest` returned `500 RAW_BODY_UNAVAILABLE` to every
 * caller that got past signature-shape and timestamp validation. The manifest was
 * therefore unreachable for any correctly-shaped, in-window request, and nothing
 * noticed because no test covered it. The reconciliation poll is what makes "silence
 * distinguishable from a dropped delivery", so a permanently-500 endpoint here was a
 * silently dead safety net.
 *
 * SCOPE OF THAT CLAIM, narrowed after hostile review F01 (2026-09-20). The original
 * comment said "on every call — with ANY signature, valid or not". That was false:
 * `parseSignatureHeader` and `isTimestampInWindow` both run BEFORE the raw-body guard,
 * so a malformed or expired request already returned 401. The guard's blast radius was
 * every request that survived those two checks.
 *
 * A GET carries no body, so the canonical payload is `${timestamp}.` and the correct
 * representation is an empty Buffer. `express.raw` is still mounted so that a client
 * which does send bytes is authenticated over the bytes it actually sent, rather than
 * having them silently ignored.
 *
 * FAIL CLOSED ON AMBIGUOUS EMPTINESS (hostile review F01). Synthesizing an empty Buffer
 * for *any* non-Buffer `req.body` cannot distinguish a genuinely bodyless GET from one
 * whose bytes were consumed upstream — and the second case would be authenticated as if
 * it were bodyless. When the request DECLARED a body and no bytes are available here, the
 * bytes are unknowable, so `rawBody` is left unset and the guard returns 500 rather than
 * authenticating a payload we never saw. A bodyless GET is unaffected.
 */
const spotlightRawCapture = express.raw({ type: () => true, limit: '256kb' });
const captureRawBody = (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body;
    return next();
  }
  const declaredBody = Number(req.headers['content-length'] ?? 0) > 0
    || req.headers['transfer-encoding'] !== undefined;
  req.rawBody = declaredBody ? undefined : Buffer.alloc(0);
  next();
};

/**
 * GET /api/bridge/spotlight/manifest — signed reconciliation poll.
 * SwanGuard compares this against its outbox and re-sends anything missing.
 */
router.get('/spotlight/manifest', spotlightRawCapture, captureRawBody, async (req, res) => {
  if (!isSpotlightEnabled()) {
    return res.status(503).json({ success: false, message: 'Spotlight ingest is disabled.' });
  }
  const verdict = verifyBridgeRequest(req);
  if (!verdict.ok) {
    return res.status(verdict.status).json({ success: false, code: verdict.code });
  }
  try {
    const SwanSpotlight = (await import('../../models/social/SwanSpotlight.mjs')).default;
    const rows = await SwanSpotlight.findAll({
      where: { retracted: false, [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }] },
      attributes: ['itemId', 'revision', 'updatedAt'],
      raw: true
    });
    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      items: rows.map((row) => ({ itemId: row.itemId, revision: row.revision, updatedAt: row.updatedAt }))
    });
  } catch (error) {
    logger.error('Spotlight manifest failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error while building the manifest.' });
  }
});

export default router;
