import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readBackendSource = (relativePath) => readFileSync(
  resolve(process.cwd(), relativePath),
  'utf8'
);

const routeSlice = (source, routeNeedle) => {
  const index = source.indexOf(routeNeedle);
  expect(index).toBeGreaterThan(-1);
  return source.slice(index, index + 220);
};

describe('owner-admin destructive route contracts', () => {
  it('owner-gates client deactivate and restore routes', () => {
    const source = readBackendSource('routes/adminClientRoutes.mjs');
    expect(source).toContain('ownerAdminOnly');
    expect(routeSlice(source, "router.put('/clients/:clientId/restore'")).toContain('ownerAdminOnly');
    expect(routeSlice(source, "router.delete('/clients/:clientId'")).toContain('ownerAdminOnly');
  });

  it('owner-gates storefront package and variant deletion routes', () => {
    const source = readBackendSource('routes/adminPackageRoutes.mjs');
    expect(source).toContain('ownerAdminOnly');
    expect(routeSlice(source, "router.delete('/:id'")).toContain('ownerAdminOnly');
    expect(routeSlice(source, "router.delete('/variants/:variantId'")).toContain('ownerAdminOnly');
  });

  it('owner-gates legacy admin promotion and user deactivation routes', () => {
    const source = readBackendSource('routes/userManagementRoutes.mjs');
    expect(source).toContain('ownerAdminOnly');
    expect(routeSlice(source, "router.post('/promote-admin'")).toContain('ownerAdminOnly');
    expect(routeSlice(source, "router.delete('/user/:id'")).toContain('ownerAdminOnly');
  });
});
