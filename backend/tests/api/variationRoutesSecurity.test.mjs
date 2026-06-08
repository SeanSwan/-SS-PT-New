import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/variationRoutes.mjs'), 'utf8');

describe('variationRoutes public response hardening', () => {
  it('is mounted at the canonical workout variation API path', () => {
    const coreRoutes = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

    expect(coreRoutes).toContain("app.use('/api/variation', variationRoutes)");
    expect(routeSource).toContain("router.use(protect, authorize(['admin', 'trainer']))");
  });

  it('does not echo raw variation accept errors to clients', () => {
    const acceptRoute = routeSource.slice(
      routeSource.indexOf("router.post('/accept'"),
      routeSource.indexOf("router.get('/history'")
    );

    expect(routeSource).toContain('getVariationAcceptErrorResponse');
    expect(acceptRoute).not.toContain('error: err.message');
    expect(acceptRoute).toContain('getVariationAcceptErrorResponse(err)');
  });
});
