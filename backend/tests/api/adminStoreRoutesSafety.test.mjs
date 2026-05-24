import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const routeSource = readFileSync(
  resolve(__dirname, '../../routes/admin/adminStoreRoutes.mjs'),
  'utf8',
);

describe('admin store route safety', () => {
  it('keeps store maintenance endpoints behind authenticated admin middleware', () => {
    expect(routeSource).toContain('router.use(protect)');
    expect(routeSource).toContain("router.use(authorize(['admin']))");
  });

  it('does not expose raw operational errors to clients', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(routeSource).not.toMatch(/error:\s*error\.message/);
  });
});
