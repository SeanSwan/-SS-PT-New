import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'routes/userManagementRoutes.mjs'), 'utf8');

const routeSlice = (routeNeedle, length = 5200) => {
  const index = source.indexOf(routeNeedle);
  expect(index).toBeGreaterThan(-1);
  return source.slice(index, index + length);
};

describe('user management staff setup-link contract', () => {
  it('creates staff accounts with a reset/setup link instead of an admin-shared password', () => {
    const createRoute = routeSlice("router.post('/user'");

    expect(source).toContain('sendPasswordResetEmailForUser');
    expect(source).toContain('PasswordResetEmailDeliveryError');
    expect(source).toContain('generateServerSetupPassword');
    expect(source).toContain("crypto.randomBytes(STAFF_SETUP_PASSWORD_BYTES).toString('base64url')");
    expect(createRoute).toContain('sendSetupLink');
    expect(createRoute).toContain('const sendSetupLinkRequested = sendSetupLink === true');
    expect(createRoute).toContain('const setupPassword = sendSetupLinkRequested ? generateServerSetupPassword() : password');
    expect(createRoute).toContain('!sendSetupLinkRequested && !password');
    expect(createRoute).toContain('password: setupPassword');
    expect(createRoute).toContain('sendPasswordResetEmailForUser(user, { includeResetUrl: true })');
    expect(createRoute).toContain("credentialAction: resetEmailSent ? 'setup_link_sent' : 'setup_link_ready'");
    expect(createRoute).toContain('resetUrl: resetResult?.resetUrl');
    expect(createRoute).toContain('resetUrl: resetError.resetUrl');
    expect(createRoute).toContain('...(resetHandoff ? { data: resetHandoff } : {})');
    expect(createRoute).not.toMatch(/temporaryPassword|newPassword/);
  });

  it('requires owner admin when the generic user route creates or updates admin-role accounts', () => {
    expect(source).toContain('requireOwnerForAdminRolePayload');
    expect(routeSlice("router.post('/user'", 180)).toContain('requireOwnerForAdminRolePayload');
    expect(routeSlice("router.put('/user/:id'", 180)).toContain('requireOwnerForAdminRolePayload');
  });
});