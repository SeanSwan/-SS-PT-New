import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/admin.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('admin maintenance route security', () => {
  it('keeps legacy admin maintenance routes independently authenticated', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin', adminDebugRoutes)");
    expect(routeSource).toContain("import { protect, adminOnly as isAdmin } from '../middleware/authMiddleware.mjs';");

    const protectIndex = routeSource.indexOf('router.use(protect);');
    expect(protectIndex).toBeGreaterThan(-1);

    for (const routeSignature of [
      "router.post('/sync-data'",
      "router.post('/restart-mcp-connections'",
      "router.post('/test-notifications'",
    ]) {
      expect(protectIndex).toBeLessThan(routeSource.indexOf(routeSignature));
      expect(routeSource).toContain(`${routeSignature}, isAdmin`);
    }
  });
});
