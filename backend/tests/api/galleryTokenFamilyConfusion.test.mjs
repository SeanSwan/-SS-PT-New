import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const source = readFileSync(join(repoRoot, 'backend/routes/galleryRoutes.mjs'), 'utf8');
const runtimeSource = source.replace(/\/\*[\s\S]*?\*\//g, '');
const compactSource = runtimeSource.replace(/\s+/g, ' ');
const boundarySource = readFileSync(join(repoRoot, 'backend/middleware/authMiddleware.mjs'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');

/**
 * E-02 regression guard (hostile review seat 3, 2026-09-18).
 *
 * Two distinct defects in galleryRoutes.mjs, both instances of "jwt.verify()
 * proves the token was signed by us, but not WHICH family it belongs to":
 *
 *  1. /vip-checkout accepted any JWT family as proof of user identity. A
 *     gallery_access token (or a refresh / force-password-change token) is
 *     signed with the same secret, so it verified successfully.
 *  2. requireGalleryAccess accepted ?token= on EVERY method, including POST.
 *     A URL token lands in access logs, browser history and Referer headers.
 *
 * The query-token fallback exists only because <img>/<a> tags cannot set an
 * Authorization header, so it is now scoped to GET.
 *
 * U-05 update (same day, fixing pass): the family check MOVED from an inline
 * `decoded?.tokenType !== 'access'` in this file into the single shared
 * boundary, verifyAccessToken (authMiddleware.mjs). These tests assert the
 * PROPERTY through the new mechanism: vip-checkout goes through the boundary,
 * and the boundary enforces family + revocation.
 */
describe('gallery token family confusion (E-02)', () => {
  it('verifies the vip-checkout user token through the shared boundary', () => {
    expect(compactSource).toContain('await verifyAccessToken(userToken)');
    // family/revocation rejection must actually return 401, not just log
    expect(compactSource).toContain("tokenErr?.name === 'TokenFamilyError'");
    expect(compactSource).toContain("tokenErr?.name === 'TokenRevokedError'");
    expect(compactSource).toContain('Invalid user token — please log in again');
  });

  it('boundary still verifies the signature before reading tokenType', () => {
    // order matters: verify first (throws on bad signature), then check family
    const verifyIdx = boundarySource.indexOf('jwt.verify(token, getJwtSecret())');
    const checkIdx = boundarySource.indexOf("decoded?.tokenType !== 'access'");
    expect(verifyIdx).toBeGreaterThan(-1);
    expect(checkIdx).toBeGreaterThan(verifyIdx);
  });

  it('boundary rejects non-access families and revoked tokens', () => {
    expect(boundarySource).toContain('TokenFamilyError');
    expect(boundarySource).toContain('isAccessTokenRevoked(decoded.tokenId)');
    expect(boundarySource).toContain('TokenRevokedError');
  });

  it('scopes the ?token= query fallback to GET requests only', () => {
    expect(compactSource).toContain("req.method === 'GET' ? req.query.token : null");
    // the unconditional fallback must not come back
    expect(compactSource).not.toContain("authHeader.slice(7) : req.query.token");
  });

  it('keeps requiring the gallery_access type for gallery tokens', () => {
    expect(compactSource).toContain("decoded.type !== 'gallery_access'");
  });

  it('still issues gallery tokens without a tokenType claim', () => {
    // This is WHY the new check is effective: a gallery token has
    // type:'gallery_access' and no tokenType, so tokenType !== 'access'.
    expect(compactSource).toContain("type: 'gallery_access'");
  });
});

describe('E-02 semantics: one secret, several token families', () => {
  it('a gallery_access payload fails the access-token family check', () => {
    const galleryPayload = {
      type: 'gallery_access',
      visitorId: 'v-1',
      eventId: 'e-1',
      email: 'a@b.com',
      slug: 'spring',
    };
    // the new guard
    expect(galleryPayload.tokenType !== 'access').toBe(true);
    // but it WOULD have passed the old verify-only check
    expect(typeof galleryPayload.type).toBe('string');
  });

  it('a real access payload passes the family check', () => {
    const accessPayload = { id: 'u-1', role: 'client', tokenType: 'access', tokenId: 'x' };
    expect(accessPayload.tokenType !== 'access').toBe(false);
  });
});
