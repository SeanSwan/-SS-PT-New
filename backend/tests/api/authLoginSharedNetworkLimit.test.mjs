import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const routeSource = readFileSync(
  fileURLToPath(new URL('../../routes/authRoutes.mjs', import.meta.url)),
  'utf8',
);

const loginRouteStart = routeSource.indexOf("'/login'");
const refreshRouteStart = routeSource.indexOf("'/refresh-token'", loginRouteStart);
const loginRouteBlock = routeSource.slice(loginRouteStart, refreshRouteStart);

describe('auth login shared-network rate limit', () => {
  it('keeps a broad IP flood ceiling above the per-identity credential limit', () => {
    expect(loginRouteStart).toBeGreaterThan(-1);
    expect(refreshRouteStart).toBeGreaterThan(loginRouteStart);
    expect(loginRouteBlock).toContain('max: 100');
  });
});
