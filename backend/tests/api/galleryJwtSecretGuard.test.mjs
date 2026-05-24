import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const source = readFileSync(join(repoRoot, 'backend/routes/galleryRoutes.mjs'), 'utf8');
const runtimeSource = source.replace(/\/\*[\s\S]*?\*\//g, '');
const compactSource = runtimeSource.replace(/\s+/g, ' ');

describe('gallery route JWT secret guard', () => {
  it('does not snapshot or use raw JWT secrets for gallery and VIP tokens', () => {
    expect(runtimeSource).toContain('jwtSecretGuard.mjs');
    expect(runtimeSource).toContain('getJwtSecret');
    expect(runtimeSource).toContain('isJwtSecretConfigurationError');
    expect(runtimeSource).not.toContain('GALLERY_JWT_SECRET');
    expect(runtimeSource).not.toMatch(/jwt\.(sign|verify)\([^;]*process\.env\.JWT_SECRET/s);
  });

  it('centralizes Swan VIP access token signing behind the guarded resolver', () => {
    expect(runtimeSource).toContain('function signSwanAccessToken(userId, role)');
    expect(compactSource).toContain("jwt.sign( { id: userId, role, tokenType: 'access', tokenId: uuidv4() }, getJwtSecret()");
    expect(compactSource).toContain('const accessToken = signSwanAccessToken(userId, existingUser.role);');
    expect(compactSource).toContain('const accessToken = signSwanAccessToken(userId, newUser.role);');
  });

  it('returns configuration errors instead of treating secret failures as expired tokens', () => {
    expect(compactSource).toContain('if (isJwtSecretConfigurationError(error))');
    expect(compactSource).toContain('Gallery access is not configured');
    expect(compactSource).toContain('if (isJwtSecretConfigurationError(tokenErr))');
    expect(compactSource).toContain('Authentication is not configured');
  });
});
