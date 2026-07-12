/**
 * Canonical-surface lock for admin role promotion.
 *
 * There must be exactly ONE reachable implementation of promote-admin /
 * promote-client: the userManagementController handlers mounted at
 * /api/admin (the path the admin dashboard actually calls —
 * UsersManagementSection.tsx). The legacy inline handlers that used to live
 * on /api/auth (userManagementRoutes) drifted from the canonical ones — they
 * validated a DIFFERENT env var (ADMIN_PROMOTION_CODE, never covered by the
 * boot-time secret guard) and had no live consumers. This spec locks their
 * removal so the duplicate surface cannot quietly return.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/userManagementRoutes.mjs'), 'utf8');
const adminRouteSource = readFileSync(resolve(__dirname, '../../routes/adminRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/userManagementController.mjs'), 'utf8');
const envTemplateSource = readFileSync(resolve(__dirname, '../../.env.template'), 'utf8');

describe('promote-role canonical surface', () => {
  it('keeps the canonical controller-backed promotion routes mounted at /api/admin', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin', adminRoutes)");
    expect(adminRouteSource).toContain("router.post('/promote-admin', userManagementController.promoteToAdmin)");
    expect(adminRouteSource).toContain("router.post('/promote-client', userManagementController.promoteToClient)");
    expect(controllerSource).toContain('export const promoteToAdmin = async');
    expect(controllerSource).toContain('export const promoteToClient = async');
  });

  it('removes the legacy inline promotion handlers from the /api/auth router', () => {
    expect(coreRoutesSource).toContain("app.use('/api/auth', userManagementRoutes)");
    expect(routeSource).not.toContain("router.post('/promote-admin'");
    expect(routeSource).not.toContain("router.post('/promote-client'");
  });

  it('retires the drifted ADMIN_PROMOTION_CODE env var entirely (canonical guard is ADMIN_ACCESS_CODE)', () => {
    expect(routeSource).not.toContain('ADMIN_PROMOTION_CODE');
    expect(envTemplateSource).not.toContain('ADMIN_PROMOTION_CODE');
    expect(controllerSource).toContain('ADMIN_ACCESS_CODE');
  });
});
