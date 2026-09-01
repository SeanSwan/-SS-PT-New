/**
 * atelierPublicRoutes.mjs — the permalink a site actually consumes.
 * ============================================================================
 *
 * GET /api/atelier/public/:id → 302 to a FRESH signed R2 URL, or 404.
 *
 * WHY THIS EXISTS: a signed URL expires (4h default). Pasting one into a site means
 * every image 403s after lunch, and "Unpublish" cannot retract a URL already copied.
 * This path re-signs on every request and resolves ONLY while the asset is
 * `published`, so unpublishing revokes it on the next request. Drafts never resolve.
 *
 * NO AUTH, on purpose: a public site cannot hold an admin session. Safety comes from
 * (1) UUIDv4 ids — not enumerable — and (2) the published-only predicate in
 * `resolvePublic`. Nothing here reads the body or sets cookies.
 *
 * It answers exactly four ways, and the distinction between the last two is the point:
 *   302  a fresh signed URL
 *   404  no such id, malformed id, or not published — the asset is not yours to see
 *   502  the asset resolved and something DOWNSTREAM broke
 *   429  this IP has exceeded the volume ceiling (see atelierPublicLimiter)
 *
 * Neither of the ids that 404 tells a caller anything they did not already know, and a 502
 * is reachable only by someone already holding a valid UUIDv4.
 */

import express from 'express';
import { resolvePublic } from '../services/atelier/publishAsset.mjs';
import { atelierPublicLimiter } from '../middleware/rateLimiter.mjs';

const router = express.Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/:id', atelierPublicLimiter, async (req, res) => {
  const id = String(req.params.id || '');
  if (!UUID.test(id)) return res.status(404).end();
  try {
    const hit = await resolvePublic({ id });
    if (!hit) return res.status(404).end();
    // Short cache: the signed URL is fresh per request; a CDN may hold the redirect briefly.
    res.set('Cache-Control', 'public, max-age=300');
    return res.redirect(302, hit.url);
  } catch (err) {
    // A FAILURE TO SIGN IS NOT A MISSING ASSET, AND SAYING SO COST NOTHING TO FIX.
    //
    // This returned 404 for every exception. A rotated storage credential, an R2 outage or
    // a bug in the resolver therefore told the whole internet that a published asset was
    // GONE — and told the operator the same thing, so the obvious next move is to hunt for
    // a deleted row that is sitting there fine. It is the same mistake as a page-wide
    // "previews are unavailable" for one purged object: an honest failure reported as a
    // different, wrong fact.
    //
    // 404 stays reserved for the predicate that means it: no such id, or not published.
    // Reaching here means the asset resolved and something downstream broke, so 502 with a
    // generic body. That is not a new existence oracle — an unpublished asset still 404s
    // through `resolvePublic` returning null, and only a caller already holding a valid
    // UUIDv4 can reach this line at all.
    console.error('[Atelier/Public] resolve failed for %s: %s', id, err?.message);
    return res.status(502).json({ success: false, error: 'resolve_failed' });
  }
});

export default router;
