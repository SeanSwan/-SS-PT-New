import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routesDir = __dirname;
const srcDir = resolve(routesDir, '..');

const readSource = (path: string) => readFileSync(path, 'utf8');
const readOptionalSource = (path: string) => (existsSync(path) ? readSource(path) : '');

describe('admin dashboard local recovery contracts', () => {
  it('uses a retrying lazy route loader for transient dev-server module fetch failures', () => {
    const mainRoutesSource = readSource(resolve(routesDir, 'main-routes.tsx'));
    const lazyLoaderPath = resolve(routesDir, 'lazyLoadWithErrorHandling.tsx');
    const lazyLoaderSource = readOptionalSource(lazyLoaderPath);

    expect(mainRoutesSource).toContain("from './lazyLoadWithErrorHandling'");
    expect(existsSync(lazyLoaderPath)).toBe(true);
    expect(lazyLoaderSource).toContain('isRetryableLazyImportError');
    expect(lazyLoaderSource).toContain('Failed to fetch dynamically imported module');
    expect(lazyLoaderSource).toContain('maxRetries = 1');
    expect(lazyLoaderSource).not.toContain('window.location.reload()');
    expect(lazyLoaderSource).toContain('handleRetryRouteImport');
    expect(lazyLoaderSource).toContain('loadLazyRouteModule');
  });

  it('does not set admin bypass flags from normal login form credentials', () => {
    const loginSource = readSource(resolve(srcDir, 'pages/EnhancedLoginModal.tsx'));

    expect(loginSource).not.toContain("credentials.username.toLowerCase() === 'admin'");
    expect(loginSource).not.toContain("setItem('bypass_admin_verification', 'true')");
  });

  it('does not let a stale bypass flag skip role checks without explicit emergency mode', () => {
    const protectedRouteSource = readSource(resolve(routesDir, 'protected-route.tsx'));

    expect(protectedRouteSource).toContain("localStorage.getItem('admin_emergency_mode') === 'true'");
    expect(protectedRouteSource).toContain("localStorage.removeItem('bypass_admin_verification')");
    expect(protectedRouteSource).toContain("localStorage.removeItem('admin_emergency_mode')");
  });

  it('cleans emergency auth flags during real login and token cleanup', () => {
    const authContextSource = readSource(resolve(srcDir, 'context/AuthContextProvider.tsx'));
    const tokenCleanupSource = readSource(resolve(srcDir, 'utils/tokenCleanup.ts'));

    expect(authContextSource).toContain("localStorage.removeItem('bypass_admin_verification')");
    expect(authContextSource).toContain("localStorage.removeItem('admin_emergency_mode')");
    expect(tokenCleanupSource).toContain("'admin_emergency_mode'");
  });
});
