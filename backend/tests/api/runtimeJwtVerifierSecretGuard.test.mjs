import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const readRuntimeSource = (path) =>
  readFileSync(join(repoRoot, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const guardedRuntimeFiles = [
  'backend/middleware/authMiddleware.mjs',
  'backend/middleware/optionalAuth.mjs',
  'backend/socket/socket.mjs',
  'backend/socket/socketManager.mjs',
];

describe('runtime JWT verifier secret guard', () => {
  it('provides a shared fail-closed JWT secret resolver', () => {
    const source = readRuntimeSource('backend/utils/jwtSecretGuard.mjs');

    expect(source).toContain('INSECURE_JWT_PLACEHOLDERS');
    expect(source).toContain('your-secret-key-change-in-production');
    expect(source).toContain('JwtSecretConfigurationError');
    expect(source).toContain('process.env.JWT_SECRET');
    expect(source).toContain('INSECURE_JWT_PLACEHOLDERS.has(secret)');
  });

  it.each(guardedRuntimeFiles)('%s verifies JWTs through the shared resolver', (path) => {
    const source = readRuntimeSource(path);

    expect(source).toContain('jwtSecretGuard.mjs');
    expect(source).toContain('getJwtSecret');
    expect(source).not.toMatch(/jwt\.verify\([^;]*process\.env\.JWT_SECRET/s);
    expect(source).not.toMatch(/jwt\.verify\([^;]*\bJWT_SECRET\b/s);
    expect(source).not.toMatch(/jwt\.verify\([^;]*\bjwtSecret\b/s);
  });

  it('keeps protected routes fail-closed when JWT_SECRET is not configured', () => {
    const source = readRuntimeSource('backend/middleware/authMiddleware.mjs');

    expect(source).toContain('isJwtSecretConfigurationError(tokenError)');
    expect(source).toContain("message: 'Server configuration error'");
  });
});
