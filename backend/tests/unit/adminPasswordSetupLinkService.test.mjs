/**
 * Admin password setup link service tests.
 * Locks the copy-and-text password link behind the owner-admin gate and
 * proves the issued token validates through the same mechanism the
 * public reset-password flow uses (HMAC hash + expiry window).
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  AdminPasswordSetupLinkError,
  PASSWORD_SETUP_LINK_TTL_MS,
  createPasswordSetupLink,
} from '../../services/admin/adminPasswordSetupLinkService.mjs';
import { hashPasswordResetToken } from '../../services/auth/passwordResetEmailService.mjs';

const owner = { id: 1, role: 'admin', email: 'owner@swanstudios.local' };
const ownerEnv = {
  OWNER_ADMIN_EMAILS: 'owner@swanstudios.local',
  FRONTEND_URL: 'https://app.example.test',
};
const RESET_SECRET = 'unit-test-reset-secret';

function makeUser(overrides = {}) {
  return {
    id: 44,
    role: 'client',
    email: 'client@example.com',
    isActive: true,
    ...overrides,
    updates: [],
    async update(payload) {
      this.updates.push(payload);
      Object.assign(this, payload);
      return this;
    },
  };
}

const modelFor = (target) => ({
  async findByPk() {
    return target;
  },
});

describe('adminPasswordSetupLinkService', () => {
  it('rejects generic admins that are not on the owner allowlist (403)', async () => {
    await expect(createPasswordSetupLink({
      actor: { id: 2, role: 'admin', email: 'helper@example.com' },
      targetUserId: 44,
      env: ownerEnv,
      UserModel: modelFor(makeUser()),
      resetSecret: RESET_SECRET,
    })).rejects.toMatchObject({ code: 'OWNER_GATE_DENIED', statusCode: 403 });
  });

  it('fails closed when the owner allowlist is not configured', async () => {
    await expect(createPasswordSetupLink({
      actor: owner,
      targetUserId: 44,
      env: { FRONTEND_URL: 'https://app.example.test' },
      UserModel: modelFor(makeUser()),
      resetSecret: RESET_SECRET,
    })).rejects.toMatchObject({ code: 'OWNER_GATE_NOT_CONFIGURED', statusCode: 503 });
  });

  it('returns a frontend reset link whose token validates via the reset flow hash', async () => {
    const target = makeUser();
    const now = Date.parse('2026-07-14T12:00:00.000Z');

    const result = await createPasswordSetupLink({
      actor: owner,
      targetUserId: target.id,
      env: ownerEnv,
      UserModel: modelFor(target),
      resetSecret: RESET_SECRET,
      now: () => now,
    });

    expect(result.link).toMatch(/^https:\/\/app\.example\.test\/reset-password\/[a-f0-9]{64}$/);
    expect(result.expiresInMinutes).toBe(1440);

    // The stored value must be the HMAC hash of the raw token — the exact
    // lookup POST /api/auth/reset-password performs (hash + expiry window).
    const rawToken = result.link.split('/reset-password/')[1];
    expect(target.resetPasswordToken).toBe(hashPasswordResetToken(rawToken, RESET_SECRET));
    expect(target.resetPasswordToken).not.toBe(rawToken);
    expect(target.resetPasswordExpires.getTime()).toBe(now + PASSWORD_SETUP_LINK_TTL_MS);
    // Relative to the MOCKED clock — comparing to the real Date.now() turned
    // this into a time bomb that detonated 24h after the pinned date.
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(now);
  });

  it('rejects missing target (404), admin target (403), and inactive target (409)', async () => {
    const base = { actor: owner, env: ownerEnv, resetSecret: RESET_SECRET };

    await expect(createPasswordSetupLink({
      ...base,
      targetUserId: 999,
      UserModel: { async findByPk() { return null; } },
    })).rejects.toMatchObject({ code: 'PASSWORD_SETUP_TARGET_NOT_FOUND', statusCode: 404 });

    await expect(createPasswordSetupLink({
      ...base,
      targetUserId: 3,
      UserModel: modelFor(makeUser({ id: 3, role: 'admin' })),
    })).rejects.toMatchObject({ code: 'PASSWORD_SETUP_TARGET_FORBIDDEN', statusCode: 403 });

    await expect(createPasswordSetupLink({
      ...base,
      targetUserId: 44,
      UserModel: modelFor(makeUser({ isActive: false })),
    })).rejects.toMatchObject({ code: 'PASSWORD_SETUP_TARGET_INACTIVE', statusCode: 409 });

    await expect(createPasswordSetupLink({
      ...base,
      targetUserId: '  ',
      UserModel: modelFor(makeUser()),
    })).rejects.toMatchObject({ code: 'PASSWORD_SETUP_TARGET_REQUIRED', statusCode: 400 });

    expect(new AdminPasswordSetupLinkError('x').name).toBe('AdminPasswordSetupLinkError');
  });

  it('route contract: endpoint is mounted with protect + adminOnly and the service owner-gates', () => {
    const routesSource = fs.readFileSync(
      path.resolve(__dirname, '../../routes/authRoutes.mjs'),
      'utf8'
    );
    const routeIdx = routesSource.indexOf("'/admin/password-setup-link'");
    expect(routeIdx).toBeGreaterThan(-1);
    const routeBlock = routesSource.slice(routeIdx, routeIdx + 220);
    expect(routeBlock).toContain('protect');
    expect(routeBlock).toContain('adminOnly');
    expect(routeBlock).toContain('createAdminPasswordSetupLink');

    const serviceSource = fs.readFileSync(
      path.resolve(__dirname, '../../services/admin/adminPasswordSetupLinkService.mjs'),
      'utf8'
    );
    expect(serviceSource).toContain('requireOwnerAdmin(actor, env)');
  });
});
