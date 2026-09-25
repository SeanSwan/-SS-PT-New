import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, '../../socket/socketManager.mjs'), 'utf8');
const compact = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ');

/**
 * Socket auth consults the revocation registry — G9 hostile review, major 6.
 * ============================================================================
 *
 * THE DEFECT. `authenticateSocketUser` verified signature and token family, and
 * never consulted `isAccessTokenRevoked` — so a logged-out or stolen-and-revoked
 * access token kept a live socket, admin dashboard rooms included, until natural
 * expiry. HTTP requests went through `verifyAccessToken`, which DOES consult the
 * registry (authMiddleware.mjs) — the same credential, two different answers to
 * "was this revoked?".
 *
 * WHY A STRUCTURAL TEST AND NOT A BEHAVIORAL ONE. The repo's socket suites
 * (socketAdminRoomGate, socketMessagingNamespace) pin auth wiring structurally
 * against the compacted source; a behavioral version needs a full io + redis
 * harness for one conditional. These cases pin the three load-bearing facts:
 * the registry is consulted, it is consulted inside the authenticate path (so
 * a failure closes the socket), and it happens BEFORE the database fetch (a
 * revoked token must not earn a user lookup).
 */
describe('socket auth consults the revocation registry (G9 major 6)', () => {
  it('imports the shared revocation service', () => {
    expect(source).toContain("from '../services/tokenRevocationService.mjs'");
  });

  it('rejects a revoked access token inside authenticateSocketUser', () => {
    expect(compact).toContain('if (decoded?.tokenId && (await isAccessTokenRevoked(decoded.tokenId)))');
    const authFn = compact.indexOf('async function authenticateSocketUser');
    const check = compact.indexOf('isAccessTokenRevoked(decoded.tokenId)');
    const family = compact.indexOf("decoded?.tokenType !== 'access'");
    expect(check).toBeGreaterThan(authFn);
    // after the family check: verify → family → revocation, one policy
    expect(check).toBeGreaterThan(family);
    expect(compact.slice(check, check + 220)).toContain('return null');
  });

  it('consults revocation BEFORE the database fetch', () => {
    const check = compact.indexOf('isAccessTokenRevoked(decoded.tokenId)');
    const fetch = compact.indexOf('await User.findByPk(userId');
    expect(check).toBeGreaterThan(-1);
    expect(fetch).toBeGreaterThan(check);
  });

  it('does not weaken the HTTP boundary it mirrors', () => {
    const auth = readFileSync(join(__dirname, '../../middleware/authMiddleware.mjs'), 'utf8');
    expect(auth).toContain('isAccessTokenRevoked');
  });
});
