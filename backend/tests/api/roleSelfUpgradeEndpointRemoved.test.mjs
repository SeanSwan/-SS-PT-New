/**
 * Regression: no self-service role-escalation endpoint on /api/roles.
 *
 * Found 2026-08-16 by the sibling sweep required after GLM audit F2 (the cart
 * add-to-cart role escalation). The audit never saw this file.
 *
 * `POST /api/roles/test-upgrade` was mounted (core/routes.mjs -> /api/roles),
 * sat behind `protect` ONLY, took its subject from `req.user.id`, and called
 * `upgradeToClient(userId)` — i.e. any authenticated `user` could promote
 * THEMSELVES to `client` with no payment and no admin involvement.
 *
 * Its only guard was `if (process.env.NODE_ENV === 'production') return 403`.
 * That is a BLACKLIST and it fails OPEN on the classic misconfigurations:
 * NODE_ENV unset on a PaaS, 'staging', 'prod', 'Production', review apps.
 *
 * This repo had already learned that lesson once: sessionPackageManualGrantRoutes
 * replaced the identical blacklist with an allowlist + explicit opt-in flag
 * (Kimi security audit F3, SWA-129) and documented exactly this failure mode.
 * The fix was never propagated here.
 *
 * The endpoint had ZERO consumers (no frontend caller, no test, no script), so
 * it is deleted rather than hardened — the safest form of "disabled in
 * production" is "does not exist".
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const upgradeToClientMock = vi.hoisted(() => vi.fn());

// Authenticated as a plain `user` — the role the exploit escalates FROM.
// adminOnly is NOT bypassed: the admin route must stay gated.
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 501, role: 'user', email: 'user@example.test' };
    next();
  },
  adminOnly: (req, res, next) => (
    req.user?.role === 'admin'
      ? next()
      : res.status(403).json({ success: false, message: 'Admin only' })
  ),
}));

vi.mock('../../services/roleService.mjs', () => ({
  upgradeToClient: upgradeToClientMock,
  hasAccessToDashboard: vi.fn(() => true),
  getAccessibleDashboards: vi.fn(() => []),
}));

vi.mock('../../models/User.mjs', () => ({
  default: {
    findByPk: vi.fn(async () => ({
      id: 501, firstName: 'A', lastName: 'B', email: 'user@example.test', role: 'client',
    })),
  },
}));

const roleRoutes = (await import('../../routes/roleRoutes.mjs')).default;

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/roles', roleRoutes);
  return app;
};

describe('no self-service role escalation on /api/roles', () => {
  // Without this, a call in one case leaks into the next case's
  // not.toHaveBeenCalled() assertion and reports a false failure.
  beforeEach(() => {
    upgradeToClientMock.mockReset();
  });

  it('does not expose POST /api/roles/test-upgrade at all', async () => {
    const response = await request(makeApp()).post('/api/roles/test-upgrade').send({});

    // 404 = the route does not exist. A 403 would mean it still ships and is
    // merely env-gated — which is the fail-open shape this test exists to kill.
    expect(response.status).toBe(404);
    expect(upgradeToClientMock).not.toHaveBeenCalled();
  });

  it('still gates the admin upgrade route on adminOnly', async () => {
    const response = await request(makeApp())
      .post('/api/roles/upgrade-to-client/501')
      .send({});

    expect(response.status).toBe(403);
    expect(upgradeToClientMock).not.toHaveBeenCalled();
  });

  it('carries no NODE_ENV-blacklist-guarded route logic in roleRoutes', () => {
    const source = readFileSync(resolve(process.cwd(), 'routes/roleRoutes.mjs'), 'utf8');
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    expect(code).not.toContain('test-upgrade');

    // The blacklist shape itself: it fails open when NODE_ENV is unset/other.
    // Match BOTH comparison directions — the sibling fail-open guard at
    // routes/api.mjs:33 is `NODE_ENV !== 'production'`, which an assertion
    // against the `===` spelling alone would sail straight past.
    expect(code).not.toMatch(/process\.env\.NODE_ENV\s*[!=]==?\s*['"]production['"]/);
    // And no NODE_ENV reference at all in this file's guard position.
    expect(code).not.toContain('process.env.NODE_ENV');

    // Every route that can write a role must be admin-gated. Match the
    // middleware list up to the handler, whether the handler is async, sync,
    // or a named controller reference.
    for (const match of code.matchAll(/router\.(post|put|patch)\(\s*'([^']+)'\s*,([^{]*?)(?:async\s*)?\(?\s*req/g)) {
      const [, verb, routePath, middleware] = match;
      expect(middleware, `${verb.toUpperCase()} ${routePath} must be adminOnly`).toContain('adminOnly');
    }
    // Guard the guard: the sweep must actually have found the one write route.
    expect(code.match(/router\.(post|put|patch)\(/g) ?? []).toHaveLength(1);
  });
});
