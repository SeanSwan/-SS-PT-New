import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routesDir = __dirname;
const srcDir = resolve(routesDir, '..');

const protectedRouteSource = readFileSync(resolve(routesDir, './protected-route.tsx'), 'utf8');
const authContextSource = readFileSync(resolve(srcDir, './context/AuthContext.tsx'), 'utf8');

describe('ProtectedRoute access retry contract', () => {
  it('refreshes auth state in-app instead of reloading the whole page', () => {
    expect(authContextSource).toContain('refreshUser: () => Promise');
    expect(authContextSource).toContain('refreshToken: () => Promise<boolean>');

    expect(protectedRouteSource).not.toContain('window.location.reload()');
    expect(protectedRouteSource).toContain('const handleAccessRetry = React.useCallback(async () => {');
    expect(protectedRouteSource).toContain('const refreshedUser = await auth.refreshUser();');
    expect(protectedRouteSource).toContain('const refreshedToken = await auth.refreshToken();');
    expect(protectedRouteSource.match(/onRetry={handleAccessRetry}/g)).toHaveLength(3);
  });
});
