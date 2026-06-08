import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/badgeCreatorRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('badge creator route disclosure hardening', () => {
  it('locks the active badge creator mount and frontend-backed route paths', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin/badge-creator', badgeCreatorRoutes)");
    expect(routeSource).toContain("router.post('/generate'");
    expect(routeSource).toContain("router.post('/generate-batch'");
    expect(routeSource).toContain("router.post('/generate-pet-avatar'");
  });

  it('does not echo raw generation provider errors to API clients', () => {
    expect(routeSource).not.toContain('return res.status(502).json({ success: false, message: result.error });');
    expect(routeSource).not.toContain("error: r.status === 'fulfilled' ? r.value.error : r.reason?.message");
  });
});
