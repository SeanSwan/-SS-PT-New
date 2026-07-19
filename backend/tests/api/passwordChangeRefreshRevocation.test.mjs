import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const authRoutesSource = readFileSync(
  resolve(__dirname, '../../routes/authRoutes.mjs'),
  'utf8'
);
const authControllerSource = readFileSync(
  resolve(__dirname, '../../controllers/authController.mjs'),
  'utf8'
);

describe('authenticated password-change refresh credential revocation', () => {
  it('revokes the existing refresh credential on the dedicated password route', () => {
    const routeStart = authRoutesSource.indexOf("'/password',");
    const routeEnd = authRoutesSource.indexOf('@route   POST /api/auth/force-change-password', routeStart);
    const routeBlock = authRoutesSource.slice(routeStart, routeEnd);

    expect(routeStart).toBeGreaterThan(-1);
    expect(routeBlock).toContain('user.password = newPassword');
    expect(routeBlock).toContain('user.refreshTokenHash = null');
    expect(routeBlock.indexOf('user.refreshTokenHash = null')).toBeLessThan(
      routeBlock.indexOf('await user.save()')
    );
  });

  it('revokes the existing refresh credential when profile update changes the password', () => {
    const updateStart = authControllerSource.indexOf('export const updateProfile');
    const updateEnd = authControllerSource.indexOf(
      'export const updateAppearanceProfile',
      updateStart
    );
    const updateBlock = authControllerSource.slice(updateStart, updateEnd);
    const passwordStart = updateBlock.indexOf('if (newPassword) {');
    const passwordEnd = updateBlock.indexOf('\n    // Update user fields', passwordStart);
    const passwordBlock = updateBlock.slice(passwordStart, passwordEnd);

    expect(passwordStart).toBeGreaterThan(-1);
    expect(passwordBlock).toContain('user.password = newPassword');
    expect(passwordBlock).toContain('user.refreshTokenHash = null');
  });
});
