import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

function readRepoFile(pathFromRoot) {
  return readFileSync(resolve(repoRoot, pathFromRoot), 'utf8');
}

const controllerSource = readRepoFile('backend/controllers/analyticsController.mjs');
const coreRoutesSource = readRepoFile('backend/core/routes.mjs');
const clientRoutesSource = readRepoFile('backend/routes/clientAnalyticsRoutes.mjs');
const adminRoutesSource = readRepoFile('backend/routes/analyticsRoutes.mjs');

describe('analytics controller disclosure guard', () => {
  it('maps the shared analytics controller to both active progress surfaces', () => {
    expect(coreRoutesSource).toContain("app.use('/api/client/analytics', clientAnalyticsRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/analytics', analyticsRoutes)");
    expect(clientRoutesSource).toContain("from '../controllers/analyticsController.mjs'");
    expect(adminRoutesSource).toContain("from '../controllers/analyticsController.mjs'");
    expect(clientRoutesSource).toContain('req.params.userId = String(req.user.id)');
    expect(adminRoutesSource).toContain('requireOwnershipOrTrainer, getAnalyticsDashboard');
  });

  it('does not expose raw analytics exceptions to client or trainer dashboards', () => {
    expect(controllerSource).toContain("const ANALYTICS_INTERNAL_ERROR = 'analytics_internal_error'");
    expect(controllerSource).not.toContain('console.error(');
    expect(controllerSource).not.toContain('error: error.message');
    expect(controllerSource).not.toContain('message: error.message');
    expect(controllerSource).not.toContain('details: error.message');
    expect(controllerSource.match(/return sendAnalyticsError\(res,/g)?.length).toBeGreaterThanOrEqual(9);
  });
});
