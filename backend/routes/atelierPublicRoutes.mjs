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
 * `resolvePublic`. Nothing here reads the body, sets cookies, or reveals anything but
 * a redirect.
 */

import express from 'express';
import { resolvePublic } from '../services/atelier/publishAsset.mjs';

const router = express.Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/:id', async (req, res) => {
  const id = String(req.params.id || '');
  if (!UUID.test(id)) return res.status(404).end();
  try {
    const hit = await resolvePublic({ id });
    if (!hit) return res.status(404).end();
    // Short cache: the signed URL is fresh per request; a CDN may hold the redirect briefly.
    res.set('Cache-Control', 'public, max-age=300');
    return res.redirect(302, hit.url);
  } catch (err) {
    console.error('[Atelier/Public] resolve failed:', err?.message);
    return res.status(404).end();
  }
});

export default router;
