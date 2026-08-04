/**
 * Launch audit 2026-08-04 — socket token-PURPOSE gate must fail CLOSED.
 *
 * Both socket auth paths guarded with `decoded.tokenType && decoded.tokenType
 * !== 'access'`. Truthiness-gated: a token that OMITS `tokenType` passed
 * straight through — the exact opposite of the guarantee their own comments
 * make ("Only access tokens open a socket"). Refresh and
 * force-password-change tokens are signature-valid here because they share
 * the access secret, so a future signer that omits the claim would silently
 * open live connections.
 *
 * No signer omits it today, so this is hardening rather than an active
 * exploit — which is precisely why it needs a test: nothing else would notice
 * if it regressed to the truthiness form.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dirname, p), 'utf8').replace(/\r\n/g, '\n');

const SOCKET_AUTH_FILES = [
  ['socket/socket.mjs', '../../socket/socket.mjs'],
  ['socket/socketManager.mjs', '../../socket/socketManager.mjs'],
];

describe('socket token-purpose gate', () => {
  for (const [label, path] of SOCKET_AUTH_FILES) {
    it(`${label} rejects any token that is not an access token`, () => {
      const source = read(path);
      expect(source).toContain("decoded.tokenType !== 'access'");
      // The truthiness form let a claim-less token through. It must not return.
      expect(
        source,
        'truthiness-gated tokenType check lets a token OMITTING the claim authenticate',
      ).not.toContain("decoded.tokenType && decoded.tokenType !== 'access'");
    });
  }

  it('every legitimate access-token signer sets tokenType, so failing closed breaks nothing', () => {
    // This is the safety proof for the change: if any real signer omitted the
    // claim, fail-closing would lock those clients out.
    const signers = [
      ['controllers/authController.mjs', '../../controllers/authController.mjs'],
      ['services/auth/authSessionService.mjs', '../../services/auth/authSessionService.mjs'],
      ['services/auth/adminImpersonationService.mjs', '../../services/auth/adminImpersonationService.mjs'],
    ];
    for (const [label, path] of signers) {
      expect(read(path), `${label} must stamp tokenType on access tokens`).toContain("tokenType: 'access'");
    }
  });
});
