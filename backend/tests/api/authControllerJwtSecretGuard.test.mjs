import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const source = readFileSync(join(repoRoot, 'backend/controllers/authController.mjs'), 'utf8');
const runtimeSource = source.replace(/\/\*[\s\S]*?\*\//g, '');
const compactSource = runtimeSource.replace(/\s+/g, ' ');

describe('auth controller JWT secret guard', () => {
  it('resolves all auth secrets through fail-closed runtime guards', () => {
    expect(runtimeSource).toContain('const getJwtSecret = () =>');
    expect(runtimeSource).toContain('const getRefreshJwtSecret = () =>');
    expect(runtimeSource).toContain('getPasswordResetSecret');
    expect(runtimeSource).toContain('INSECURE_JWT_PLACEHOLDERS.has(secret)');
    expect(runtimeSource).toContain('JwtSecretConfigurationError');
  });

  it('does not sign or verify tokens directly against environment variables', () => {
    expect(runtimeSource).not.toContain('process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET');
    expect(runtimeSource).not.toMatch(/jwt\.(sign|verify)\([^;]*process\.env\.JWT_SECRET/s);
    expect(runtimeSource).not.toMatch(/jwt\.(sign|verify)\([^;]*process\.env\.JWT_REFRESH_SECRET/s);
    expect(runtimeSource.match(/jwt\.sign\(/g)).toHaveLength(3);
    expect(compactSource).toContain("jwt.sign( { id, role, tokenType: 'access'");
    expect(compactSource).toContain('getJwtSecret(), { expiresIn: JWT_EXPIRY }');
    expect(compactSource).toContain('getRefreshJwtSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY }');
    expect(compactSource).toContain("jwt.verify( refreshToken, getRefreshJwtSecret(), { algorithms: ['HS256'] } );");
    expect(compactSource).toContain("jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] })");
    expect(compactSource).toContain("jwt.verify(tempToken, getJwtSecret(), { algorithms: ['HS256'] })");
  });

  it('uses a runtime password reset secret instead of a module-load snapshot', () => {
    expect(runtimeSource).not.toMatch(/const\s+RESET_SECRET\s*=/);
    expect(compactSource).toContain('let resetSecret;');
    expect(compactSource).toContain('resetSecret = getPasswordResetSecret();');
    expect(compactSource).toContain('sendPasswordResetEmailForUser(user, { resetSecret })');
    expect(compactSource).toContain("message: 'Reset token and new password are required'");
    expect(compactSource).toContain('hashPasswordResetToken(resetToken)');
    expect(compactSource.indexOf("message: 'Reset token and new password are required'")).toBeLessThan(
      compactSource.indexOf('hashPasswordResetToken(resetToken)')
    );
    expect(runtimeSource).not.toContain("crypto.createHmac('sha256', resetSecret)");
  });
});
