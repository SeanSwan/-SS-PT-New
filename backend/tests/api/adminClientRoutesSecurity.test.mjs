import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, '../..');
const repoRoot = resolve(backendRoot, '..');

function readRepoFile(pathFromRoot) {
  return readFileSync(resolve(repoRoot, pathFromRoot), 'utf8');
}

const coreRoutesSource = readRepoFile('backend/core/routes.mjs');
const adminRoutesSource = readRepoFile('backend/routes/adminRoutes.mjs');
const adminClientRouteSource = readRepoFile('backend/routes/adminClientRoutes.mjs');
const adminClientControllerSource = readRepoFile('backend/controllers/adminClientController.mjs');
const frontendAdminClientServiceSource = readRepoFile('frontend/src/services/adminClientService.ts');

describe('admin client route security contract', () => {
  it('documents the active duplicate mount path before hardening the shared router', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin', adminRoutes)");
    expect(adminRoutesSource).toContain("router.use('/', adminClientRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/admin', adminClientRoutes)");
    expect(frontendAdminClientServiceSource).toContain("this.api.get('/admin/clients'");
  });

  it('keeps activation-queue before the dynamic client id route', () => {
    const activationQueueIndex = adminClientRouteSource.indexOf("router.get('/clients/activation-queue'");
    const clientDetailsIndex = adminClientRouteSource.indexOf("router.get('/clients/:clientId'");

    expect(activationQueueIndex).toBeGreaterThan(-1);
    expect(clientDetailsIndex).toBeGreaterThan(-1);
    expect(activationQueueIndex).toBeLessThan(clientDetailsIndex);
  });

  it('does not expose raw operational errors from active admin client responses', () => {
    for (const source of [adminClientRouteSource, adminClientControllerSource]) {
      expect(source).toContain("const INTERNAL_ERROR = 'internal_error'");
      expect(source).toContain('function sendInternalError(res, message)');
      expect(source).not.toContain("process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message");
      expect(source).not.toContain('error: error.message');
      expect(source).not.toContain('message: error.message');
      expect(source).not.toContain('details: error.message');
    }
  });

  it('sanitizes the custom notification handler and parses client ids with a radix', () => {
    const notifyHandler = adminClientRouteSource.slice(
      adminClientRouteSource.indexOf("router.post('/clients/:clientId/notify'"),
      adminClientRouteSource.indexOf('// P0: Billing & Sessions overview')
    );

    expect(notifyHandler).toContain('Number.parseInt(clientId, 10)');
    expect(notifyHandler).not.toContain('parseInt(clientId)');
    expect(notifyHandler).not.toContain('error: error.message');
    expect(notifyHandler).toContain("sendInternalError(res, 'Error sending notification')");
  });
});
