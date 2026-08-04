/**
 * Launch audit 2026-08-04 — optionalAuth token-PURPOSE enforcement.
 *
 * REGRESSION: `optionalAuth` verified the JWT signature but never checked
 * `decoded.tokenType`. `protect` does check it. Several NON-access tokens are
 * signed with the SAME secret and handed to the client — notably the 15-minute
 * `force-password-change` token returned in the login 200 body
 * (controllers/authController.mjs:845). A user an admin had locked behind a
 * mandatory password change could present that token as a Bearer on any
 * optionalAuth-mounted route (routes/videoCatalogPublicRoutes.mjs,
 * routes/publicWaiverRoutes.mjs) and regain an authenticated identity,
 * defeating the admin's security action.
 *
 * Correct behaviour for OPTIONAL auth is to degrade to anonymous — never to
 * reject — so these tests assert `req.user` is simply absent.
 */
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SECRET = 'test-secret-for-optional-auth-purpose-check';

const { findByPkMock } = vi.hoisted(() => ({ findByPkMock: vi.fn() }));

vi.mock('../../utils/jwtSecretGuard.mjs', () => ({
  getJwtSecret: () => SECRET,
  isJwtSecretConfigurationError: () => false,
}));

vi.mock('../../models/index.mjs', () => ({
  getUser: () => ({ findByPk: findByPkMock }),
}));

const loadMiddleware = async () => {
  const mod = await import('../../middleware/optionalAuth.mjs');
  return mod.default ?? mod.optionalAuth;
};

const runWith = async (token) => {
  const optionalAuth = await loadMiddleware();
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const res = {};
  const next = vi.fn();
  await optionalAuth(req, res, next);
  return { req, next };
};

describe('optionalAuth token-purpose enforcement', () => {
  beforeEach(() => {
    findByPkMock.mockReset().mockResolvedValue({
      id: 42, role: 'client', username: 'qa', email: 'qa@example.test',
    });
  });

  const NON_ACCESS = ['force-password-change', 'refresh', 'password-reset'];

  for (const tokenType of NON_ACCESS) {
    it(`treats a "${tokenType}" token as anonymous`, async () => {
      const token = jwt.sign({ id: 42, tokenType }, SECRET, { expiresIn: '15m' });
      const { req, next } = await runWith(token);

      expect(req.user, `a ${tokenType} token must not confer identity`).toBeFalsy();
      expect(next).toHaveBeenCalled(); // optional auth degrades, never rejects
    });
  }

  it('treats a token with NO tokenType as anonymous (fail closed)', async () => {
    const token = jwt.sign({ id: 42 }, SECRET, { expiresIn: '15m' });
    const { req, next } = await runWith(token);
    expect(req.user).toBeFalsy();
    expect(next).toHaveBeenCalled();
  });

  it('still accepts a genuine access token (control — not deny-everything)', async () => {
    const token = jwt.sign({ id: 42, tokenType: 'access' }, SECRET, { expiresIn: '15m' });
    const { req, next } = await runWith(token);

    expect(req.user, 'a real access token must still authenticate').toBeDefined();
    expect(req.user.id).toBe('42');
    expect(next).toHaveBeenCalled();
  });

  it('stays anonymous when no token is presented', async () => {
    const { req, next } = await runWith(null);
    expect(req.user).toBeFalsy();
    expect(next).toHaveBeenCalled();
  });
});
