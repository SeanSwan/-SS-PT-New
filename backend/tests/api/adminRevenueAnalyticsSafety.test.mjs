import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const routeSource = readFileSync(
  resolve(__dirname, '../../routes/admin/analyticsRevenueRoutes.mjs'),
  'utf8',
);

describe('admin revenue analytics safety', () => {
  it('keeps revenue analytics behind auth, admin authorization, and rate limiting', () => {
    expect(routeSource).toContain('router.use(authenticateToken)');
    expect(routeSource).toContain('router.use(authorizeAdmin)');
    expect(routeSource).toContain('router.use(analyticsRateLimit)');
  });

  it('does not expose raw revenue analytics errors to admin clients', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(routeSource).not.toContain("process.env.NODE_ENV === 'development' ? error.message");
  });
});
