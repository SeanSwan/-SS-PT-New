import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackendFile = (path) => readFileSync(resolve(__dirname, '../..', path), 'utf8');

const authSource = readBackendFile('controllers/authController.mjs');
const claimSource = readBackendFile('routes/claimRoutes.mjs');
const onboardSource = readBackendFile('routes/clientOnboardRoutes.mjs');

const sliceFrom = (source, startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
};

describe('client activation password policy', () => {
  it('uses the shared strong-password policy for first-login temporary-token changes', () => {
    const forcedPasswordBlock = sliceFrom(
      authSource,
      'export const changePasswordForced',
      'export const forgotPassword'
    );

    expect(authSource).toContain("from '../services/auth/passwordPolicyService.mjs'");
    expect(forcedPasswordBlock).toContain('validatePasswordStrength(newPassword)');
    expect(forcedPasswordBlock).toContain('passwordValidation.message');
    expect(forcedPasswordBlock).not.toContain('newPassword.length < PASSWORD_MIN_LENGTH');
  });

  it('uses the shared strong-password policy for protected password changes', () => {
    const authRoutesSource = readBackendFile('routes/authRoutes.mjs');
    const normalizedSource = authRoutesSource.replace(/\r\n/g, '\n');
    const routeStart = normalizedSource.indexOf("router.put(\n  '/password'");
    const routeEnd = normalizedSource.indexOf("router.post(\n  '/force-change-password'", routeStart);

    expect(routeStart).toBeGreaterThanOrEqual(0);
    expect(routeEnd).toBeGreaterThan(routeStart);

    const passwordRouteBlock = normalizedSource.slice(routeStart, routeEnd);

    expect(authRoutesSource).toContain("from '../services/auth/passwordPolicyService.mjs'");
    expect(passwordRouteBlock).toContain('validatePasswordStrength(newPassword)');
    expect(passwordRouteBlock).toContain('passwordValidation.message');
  });
  it('uses the shared strong-password policy inside auth request validation', () => {
    const validationSource = readBackendFile('middleware/validationMiddleware.mjs');
    const changePasswordBlock = sliceFrom(
      validationSource,
      '  changePassword: [',
      '  forgotPassword: ['
    );
    const resetPasswordBlock = sliceFrom(
      validationSource,
      '  resetPassword: [',
      '  register: ['
    );
    const registerBlock = sliceFrom(
      validationSource,
      '  register: [',
      '  // Other validation schemas remain the same...'
    );

    expect(validationSource).toContain("from '../services/auth/passwordPolicyService.mjs'");
    expect(validationSource).toContain('validatePasswordStrength(value)');
    expect(changePasswordBlock).toContain("strongPassword('newPassword', 'New password is required')");
    expect(resetPasswordBlock).toContain("strongPassword('newPassword', 'New password is required')");
    expect(registerBlock).toContain("strongPassword('password', 'Password is required')");
    expect(changePasswordBlock).not.toContain('.matches(/[A-Z]/)');
    expect(resetPasswordBlock).not.toContain('.matches(/[A-Z]/)');
    expect(registerBlock).not.toContain('.matches(/[A-Z]/)');
  });
  it('uses the same strong-password policy for public claim-link activation', () => {
    const activateBlock = sliceFrom(
      claimSource,
      "router.post('/activate'",
      'export default router'
    );

    expect(claimSource).toContain("from '../services/auth/passwordPolicyService.mjs'");
    expect(activateBlock).toContain('validatePasswordStrength(password)');
    expect(activateBlock).toContain('passwordValidation.message');
    expect(activateBlock).not.toContain('password.length < 8');
  });

  it('keeps claim-link handoff login-ready by ignoring inactive clients', () => {
    const generateTokenBlock = sliceFrom(
      claimSource,
      "router.post('/generate-token'",
      "router.get('/verify/:token'"
    );
    const verifyBlock = sliceFrom(
      claimSource,
      "router.get('/verify/:token'",
      "router.post('/activate'"
    );
    const activateBlock = sliceFrom(
      claimSource,
      "router.post('/activate'",
      'export default router'
    );

    expect(generateTokenBlock).toContain('client.isActive === false');
    expect(generateTokenBlock).toContain('Reactivate the client before generating a claim link');
    expect(verifyBlock).toContain('isActive: true');
    expect(activateBlock).toContain('isActive: true');
  });

  it('treats password-reset links as completed credential handoff for forced-password accounts', () => {
    const resetPasswordBlock = authSource.slice(authSource.indexOf('export const resetPassword'));

    expect(resetPasswordBlock).toContain('resetPasswordToken: null');
    expect(resetPasswordBlock).toContain('refreshTokenHash: null');
    expect(resetPasswordBlock).toContain('forcePasswordChange: false');
    expect(resetPasswordBlock).toContain("accountStatus: 'active'");
    expect(resetPasswordBlock).toContain('claimTokenHash: null');
    expect(resetPasswordBlock).toContain('claimTokenExpires: null');
  });
  it('keeps direct onboarding handoff documentation on claim links, not temp passwords', () => {
    expect(onboardSource).toContain('Returns claim code + claim link');
    expect(onboardSource).not.toMatch(/temp password/i);
  });

  it('keeps inactive clients out of password-reset handoff links', () => {
    const forgotPasswordBlock = sliceFrom(
      authSource,
      'export const forgotPassword',
      'export const resetPassword'
    );
    const resetPasswordBlock = authSource.slice(authSource.indexOf('export const resetPassword'));

    expect(forgotPasswordBlock).toContain('user.isActive === false');
    expect(resetPasswordBlock).toContain('isActive: true');
  });
});
