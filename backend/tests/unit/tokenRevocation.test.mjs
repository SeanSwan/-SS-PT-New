import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  isAccessTokenRevoked,
  revokeAccessToken,
  tokenRevocationBackend,
} from '../../services/tokenRevocationService.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readSrc = (p) => readFileSync(join(__dirname, '../..', p), 'utf8');

/**
 * E-06 / U-05: access-token revocation registry + single verification
 * boundary. Backend-agnostic behavioural tests (memory or Redis — the API
 * contract is identical), plus source assertions for the wiring.
 */
describe('token revocation registry (E-06)', () => {
  it('reports a revoked token as revoked', async () => {
    const tokenId = `test-revoke-${Date.now()}-a`;
    const expSec = Math.floor(Date.now() / 1000) + 3600;

    expect(await revokeAccessToken(tokenId, expSec)).toBe(true);
    expect(await isAccessTokenRevoked(tokenId)).toBe(true);
  });

  it('does not report unknown or sibling tokens as revoked', async () => {
    const tokenId = `test-revoke-${Date.now()}-b`;
    await revokeAccessToken(tokenId, Math.floor(Date.now() / 1000) + 3600);

    expect(await isAccessTokenRevoked(`${tokenId}-other`)).toBe(false);
    expect(await isAccessTokenRevoked(`never-seen-${Date.now()}`)).toBe(false);
  });

  it('self-expires entries at the token TTL', async () => {
    const tokenId = `test-revoke-${Date.now()}-c`;
    // Already-expired token: TTL floors at 1s — the entry must clean itself.
    await revokeAccessToken(tokenId, Math.floor(Date.now() / 1000) - 5);
    expect(await isAccessTokenRevoked(tokenId)).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(await isAccessTokenRevoked(tokenId)).toBe(false);
  }, 10000);

  it('handles garbage input without throwing (fail-open contract)', async () => {
    expect(await revokeAccessToken(null)).toBe(false);
    expect(await revokeAccessToken(undefined)).toBe(false);
    expect(await revokeAccessToken(42)).toBe(false);
    expect(await isAccessTokenRevoked(null)).toBe(false);
    expect(await isAccessTokenRevoked('')).toBe(false);
  });

  it('exposes a backend diagnostic', () => {
    expect(['redis', 'memory']).toContain(tokenRevocationBackend());
  });
});

describe('single verification boundary wiring (U-05)', () => {
  it('protect() verifies through verifyAccessToken and carries tokenId on req.user', () => {
    const src = readSrc('middleware/authMiddleware.mjs');
    expect(src).toContain('const decoded = await verifyAccessToken(token);');
    expect(src).toContain('tokenId: decoded.tokenId ?? null');
    expect(src).toContain('TokenRevokedError');
  });

  it('optionalAuth shares the boundary and swallows its typed errors as anonymous', () => {
    const src = readSrc('middleware/optionalAuth.mjs');
    expect(src).toContain("import { verifyAccessToken } from './authMiddleware.mjs'");
    expect(src).toContain('await verifyAccessToken(token)');
    expect(src).toContain("err.name === 'TokenFamilyError'");
    expect(src).toContain("err.name === 'TokenRevokedError'");
  });

  it('gallery vip-checkout verifies user tokens through the boundary (E-02 site)', () => {
    const src = readSrc('routes/galleryRoutes.mjs');
    expect(src).toContain("import { verifyAccessToken } from '../middleware/authMiddleware.mjs'");
    expect(src).toContain('await verifyAccessToken(userToken)');
  });

  it('logout revokes the current access token (E-06)', () => {
    const src = readSrc('controllers/authController.mjs');
    expect(src).toContain('revokeAccessToken(req.user.tokenId, req.user.tokenExp)');
  });

  it('documents the real 24h default (doc defect corrected)', () => {
    const src = readSrc('controllers/authController.mjs');
    expect(src).toContain('JWT_EXPIRES_IN: Access token expiry (default: 24h)');
    expect(src).not.toContain('(default: 3h)');
  });
});
