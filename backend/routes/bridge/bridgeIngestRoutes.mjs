import express from 'express';
import { Op } from 'sequelize';
import logger from '../../utils/logger.mjs';
import { bannedTerms } from '../social/feedEnrichment.mjs';
import { verifyBridgeRequest } from '../../services/swanBridgeSignature.mjs';
import { fetchAndDecodeSpotlightImage } from '../../services/spotlightImageFetch.mjs';

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

export const isSpotlightEnabled = (env = process.env) => env.SPOTLIGHT_ENABLED === 'true';

/** Raw-aware JSON parser — captures exact bytes for HMAC, mirroring the PLAUD precedent. */
export const spotlightJsonParser = express.json({
  limit: '256kb',
  verify: (req, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
});

const str = (value, max) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

/** Screen the human-readable copy against the shared positivity list. */
export const findBannedTerm = (fields) => {
  const haystack = fields.filter(Boolean).join(' ').toLowerCase();
  return bannedTerms.find((term) => haystack.includes(term)) ?? null;
};

export const validateSpotlightPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'Body must be a JSON object.' };
  }
  const itemId = str(body.itemId, 36);
  if (!itemId) return { ok: false, reason: 'itemId is required.' };
  if (!Number.isInteger(body.revision) || body.revision < 1) {
    return { ok: false, reason: 'revision must be a positive integer.' };
  }
  const headline = str(body.headline, SPOTLIGHT_MAX_HEADLINE);
  if (!headline) return { ok: false, reason: 'headline is required.' };
  return { ok: true };
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

  const { itemId, revision, retracted = false } = req.body;
  const headline = str(req.body.headline, SPOTLIGHT_MAX_HEADLINE);
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
    const existing = await SwanSpotlight.findByPk(itemId);

    // Idempotency is (itemId, revision): same revision = no-op, higher revision = upsert.
    if (existing && existing.revision >= revision) {
      return res.status(200).json({ success: true, noop: true, itemId, revision: existing.revision });
    }

    // Image re-host is best-effort by design — never fail the ingest over a picture.
    let imageUrl = existing?.imageUrl ?? null;
    const incomingImage = str(req.body.imageUrl, 2048);
    if (incomingImage && !retracted) {
      imageUrl = await rehostImage(incomingImage, itemId) ?? null;
    }

    const source = req.body.sourceAttribution && typeof req.body.sourceAttribution === 'object'
      ? req.body.sourceAttribution
      : {};
    const gate = req.body.gate && typeof req.body.gate === 'object' ? req.body.gate : {};

    const values = {
      itemId,
      revision,
      retracted: retracted === true,
      headline,
      dek,
      imageUrl,
      sourceName: str(source.name, 80),
      sourceUrl: str(source.url, 2048),
      curatorNote,
      sortWeight: Number.isInteger(req.body.sortWeight) ? req.body.sortWeight : 1,
      publishedAt: toDate(req.body.publishedAt),
      expiresAt: toDate(req.body.expiresAt),
      gateHash: str(gate.checklistHash, 64)
    };

    if (existing) {
      await existing.update(values);
    } else {
      await SwanSpotlight.create(values);
    }

    logger.info(`Spotlight ${retracted ? 'retracted' : 'stored'}: ${itemId}@${revision}`);
    return res.status(200).json({ success: true, itemId, revision, retracted: values.retracted });
  } catch (error) {
    logger.error('Spotlight ingest failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error during ingest.' });
  }
});

/**
 * Re-host a SwanGuard image into SwanStudios' own R2 bucket.
 * Returns null on any failure — the caller renders a text-only card (blueprint ban #4:
 * never hot-link SwanGuard's URL in a production render path).
 *
 * HARDENED 2026-09-19, and two real defects were fixed here rather than one.
 *
 * (a) SSRF. The old version checked the protocol of the URL it was HANDED and then
 *     called fetch with defaults — which follows redirects. A host returning
 *     `302 → http://169.254.169.254/...` therefore defeated the check completely,
 *     because the protocol was only ever inspected on the first hop. It also applied
 *     its size cap AFTER `arrayBuffer()` had buffered the entire body, so the cap
 *     bounded what was stored, not what was consumed. `fetchAndDecodeSpotlightImage`
 *     now owns validation, the no-redirect fetch, the streamed cap, and the decode.
 *
 * (b) A wrong import. `uploadPhoto` was destructured from `r2StorageService.mjs`,
 *     which does not export it — it lives in `photoStorageService.mjs`. Every call
 *     threw `TypeError: uploadPhoto is not a function`, and this function's own
 *     catch reported it as a non-fatal degradation and returned null. So image
 *     re-hosting has never once succeeded, and the design ("a broken image degrades
 *     to a text-only card") is precisely what made that invisible. Verified by
 *     runtime introspection: `r2StorageService.uploadPhoto === undefined`.
 */
async function rehostImage(url, itemId) {
  try {
    const decoded = await fetchAndDecodeSpotlightImage(url);
    if (!decoded.ok) {
      logger.warn(`Spotlight image for ${itemId} not re-hosted (${decoded.code}): ${decoded.message}`);
      return null;
    }

    // `uploadPhoto` is the single choke point for every upload caller and re-sniffs the
    // bytes itself, deriving the stored extension and Content-Type from them rather than
    // from anything this call declares.
    const { uploadPhoto } = await import('../../services/photoStorageService.mjs');
    const result = await uploadPhoto(decoded.buffer, {
      userId: 0,
      category: 'swan-spotlight',
      originalFilename: `${itemId}.${decoded.ext}`,
      contentType: decoded.contentType
    });
    return result?.url ?? null;
  } catch (error) {
    logger.warn(`Spotlight image re-host failed for ${itemId} (non-fatal): ${error?.message}`);
    return null;
  }
}

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
