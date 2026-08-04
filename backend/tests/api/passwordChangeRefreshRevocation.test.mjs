import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sliceBetween } from '../helpers/sliceBetween.mjs';

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
    // Launch audit 2026-08-04: the end anchor used to be
    // 'export const updateAppearanceProfile', which DOES NOT EXIST in this
    // controller. `indexOf` returned -1, so `slice(start, -1)` silently
    // widened the window from the updateProfile body to ~16k chars — the
    // entire rest of the file. This credential-revocation guard was therefore
    // measuring unrelated code, and passed only because its target string
    // happens to occur exactly once in the whole file; the day any other
    // function nulled refreshTokenHash it would have gone green over a real
    // regression. sliceBetween now throws if either anchor drifts.
    const updateBlock = sliceBetween(
      authControllerSource,
      'export const updateProfile',
      'export const validateToken',
      { label: 'authController.updateProfile' },
    );
    const passwordStart = updateBlock.indexOf('if (newPassword) {');
    const passwordEnd = updateBlock.indexOf('\n    // Update user fields', passwordStart);
    const passwordBlock = updateBlock.slice(passwordStart, passwordEnd);

    expect(passwordStart).toBeGreaterThan(-1);
    expect(passwordBlock).toContain('user.password = newPassword');
    expect(passwordBlock).toContain('user.refreshTokenHash = null');
  });
});
